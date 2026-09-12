import { Server, Socket } from 'socket.io';
import * as engine from './gameEngine.js';
import type { InternalGameState } from './gameEngine.js';
import { ClientToServerEvents, ServerToClientEvents, PLAYER_COLORS } from '../shared/types.js';
import { GAME_CONFIG } from '../shared/config.js';
import crypto from 'crypto';

// ─── State ────────────────────────────────────
let gameState: InternalGameState = engine.createGame('revolution-' + Date.now());

// Socket ID → Player ID
const socketToPlayer = new Map<string, string>();
// Player ID → Socket ID (for targeted sends)
const playerToSocket = new Map<string, string>();

// ─── Setup ────────────────────────────────────

export function setupSocketHandler(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ─── Join Game ────────────────────────────
    socket.on('joinGame', (data) => {
      const { name, sessionToken } = data;

      // Reconnect with existing session
      if (sessionToken) {
        const player = gameState.players.find((p) => p.sessionToken === sessionToken);
        if (player) {
          socketToPlayer.set(socket.id, player.id);
          playerToSocket.set(player.id, socket.id);
          // Mark as connected
          gameState = {
            ...gameState,
            players: gameState.players.map((p) =>
              p.id === player.id ? { ...p, connected: true } : p
            ),
          };
          socket.emit('joinedGame', { playerId: player.id, sessionToken: player.sessionToken });
          if (gameState.started && gameState.phase !== 'lobby') {
            sendPlayerView(socket, player.id);
          } else {
            broadcastLobbyUpdate(io);
          }
          console.log(`[Socket] Reconnected: ${player.name} (${player.id})`);
          return;
        }
      }

      // Validate
      if (!name || name.trim().length === 0) {
        socket.emit('error', 'Name cannot be empty.');
        return;
      }
      if (name.trim().length > 20) {
        socket.emit('error', 'Name must be 20 characters or fewer.');
        return;
      }
      if (gameState.players.some((p) => p.name.toLowerCase() === name.trim().toLowerCase())) {
        socket.emit('error', 'That name is already taken.');
        return;
      }
      if (gameState.players.length >= GAME_CONFIG.MAX_PLAYERS) {
        socket.emit('error', 'Game is full (max 4 players).');
        return;
      }
      if (gameState.phase !== 'lobby') {
        socket.emit('error', 'Game has already started.');
        return;
      }

      // Add player
      const newSessionToken = crypto.randomUUID();
      const result = engine.addPlayer(gameState, name.trim(), newSessionToken);
      gameState = result.state;
      const newPlayer = result.player;

      socketToPlayer.set(socket.id, newPlayer.id);
      playerToSocket.set(newPlayer.id, socket.id);

      socket.emit('joinedGame', { playerId: newPlayer.id, sessionToken: newSessionToken });
      broadcastLobbyUpdate(io);
      console.log(`[Socket] Joined: ${newPlayer.name} (${newPlayer.id})`);
    });

    // ─── Reconnect ────────────────────────────
    socket.on('reconnect', (data) => {
      const player = gameState.players.find((p) => p.sessionToken === data.sessionToken);
      if (player) {
        socketToPlayer.set(socket.id, player.id);
        playerToSocket.set(player.id, socket.id);
        gameState = {
          ...gameState,
          players: gameState.players.map((p) =>
            p.id === player.id ? { ...p, connected: true } : p
          ),
        };
        socket.emit('joinedGame', { playerId: player.id, sessionToken: player.sessionToken });
        if (gameState.started && gameState.phase !== 'lobby') {
          broadcastGameView(io);
        } else {
          broadcastLobbyUpdate(io);
        }
        console.log(`[Socket] Reconnected via explicit: ${player.name}`);
      } else {
        socket.emit('error', 'Session expired. Please rejoin.');
      }
    });

    // ─── Ready / Unready ──────────────────────
    socket.on('ready', () => {
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId || gameState.phase !== 'lobby') return;
      gameState = {
        ...gameState,
        players: gameState.players.map((p) =>
          p.id === playerId ? { ...p, ready: true } : p
        ),
      };
      broadcastLobbyUpdate(io);
    });

    socket.on('unready', () => {
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId || gameState.phase !== 'lobby') return;
      gameState = {
        ...gameState,
        players: gameState.players.map((p) =>
          p.id === playerId ? { ...p, ready: false } : p
        ),
      };
      broadcastLobbyUpdate(io);
    });

    // ─── Start Game ───────────────────────────
    socket.on('startGame', () => {
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId) return;
      const player = gameState.players.find((p) => p.id === playerId);
      if (!player || !player.isHost) {
        socket.emit('error', 'Only the host can start the game.');
        return;
      }
      if (gameState.players.length < GAME_CONFIG.MIN_PLAYERS) {
        socket.emit('error', `Need at least ${GAME_CONFIG.MIN_PLAYERS} players to start.`);
        return;
      }
      if (gameState.players.length > GAME_CONFIG.MAX_PLAYERS) {
        socket.emit('error', `Maximum ${GAME_CONFIG.MAX_PLAYERS} players.`);
        return;
      }
      if (!gameState.players.every((p) => p.ready)) {
        socket.emit('error', 'All players must be ready.');
        return;
      }

      // Send setup animation
      io.emit('setupAnimation' as any);

      // Start game after short delay for animation
      setTimeout(() => {
        gameState = engine.startGame(gameState);
        broadcastGameView(io);
      }, 1500);
    });

    // ─── Espionage Ready ──────────────────────
    socket.on('ready', () => {
      // During espionage, "ready" means ready to proceed to bidding
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId) return;

      if (gameState.phase === 'espionage') {
        gameState = {
          ...gameState,
          players: gameState.players.map((p) =>
            p.id === playerId ? { ...p, ready: true } : p
          ),
        };

        // Check if all players are ready to move to bidding
        if (gameState.players.every((p) => p.ready)) {
          gameState = engine.beginBidding(gameState);
        }
        broadcastGameView(io);
      }
    });

    // ─── Place Bid ────────────────────────────
    socket.on('placeBid', (data) => {
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId || gameState.phase !== 'bidding') return;

      if (gameState.lockedPlayers.includes(playerId)) {
        socket.emit('error', 'Your bids are already locked.');
        return;
      }

      const { characterId, force, blackmail, gold } = data;
      const validation = engine.validateBid(gameState, playerId, characterId, force, blackmail, gold);
      if (!validation.valid) {
        socket.emit('error', validation.error || 'Invalid bid.');
        return;
      }

      gameState = engine.placeBid(gameState, playerId, characterId, force, blackmail, gold);
      // ONLY send the view to this player (hidden information!)
      sendPlayerView(socket, playerId);
    });

    // ─── Clear Bid ────────────────────────────
    socket.on('clearBid', (data) => {
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId || gameState.phase !== 'bidding') return;
      if (gameState.lockedPlayers.includes(playerId)) return;

      gameState = engine.clearBid(gameState, playerId, data.characterId);
      sendPlayerView(socket, playerId);
    });

    // ─── Lock Bids ────────────────────────────
    socket.on('lockBids', () => {
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId || gameState.phase !== 'bidding') return;

      // Validate all bids are complete
      const validation = engine.validateAllBids(gameState, playerId);
      if (!validation.valid) {
        socket.emit('error', validation.error || 'Cannot lock bids.');
        return;
      }

      gameState = engine.lockPlayerBids(gameState, playerId);
      const playerName = gameState.players.find((p) => p.id === playerId)?.name || '';
      gameState = engine.addLog(gameState, `${playerName} locked bids.`, 'info', playerId);

      // Broadcast to everyone that this player locked (but don't reveal bids)
      broadcastGameView(io);

      // Check if all players are locked
      if (engine.allPlayersLocked(gameState)) {
        // Begin resolution after a short delay
        setTimeout(() => {
          gameState = engine.beginResolution(gameState);
          broadcastGameView(io);

          // Start stepping through resolution
          setTimeout(() => {
            stepResolution(io);
          }, 1500);
        }, 1000);
      }
    });

    // ─── Spy Action ───────────────────────────
    socket.on('spyAction', (data) => {
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId) return;

      const result = engine.executeSpy(gameState, playerId, data.targetAreaId, data.targetSpaceIndex);
      if (!result.success) {
        socket.emit('error', result.error || 'Invalid Spy action.');
        return;
      }

      gameState = result.state;
      broadcastGameView(io);

      // Continue resolution
      setTimeout(() => {
        stepResolution(io);
      }, 1500);
    });

    // ─── Apothecary Action ────────────────────
    socket.on('apothecaryAction', (data) => {
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId) return;

      const result = engine.executeApothecary(gameState, playerId, data.space1, data.space2);
      if (!result.success) {
        socket.emit('error', result.error || 'Invalid Apothecary action.');
        return;
      }

      gameState = result.state;
      broadcastGameView(io);

      setTimeout(() => {
        stepResolution(io);
      }, 1500);
    });

    // ─── Skip Action ──────────────────────────
    socket.on('skipAction', () => {
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId) return;
      if (!gameState.pendingAction || gameState.pendingAction.playerId !== playerId) return;

      gameState = engine.skipAction(gameState, playerId);
      broadcastGameView(io);

      setTimeout(() => {
        stepResolution(io);
      }, 1500);
    });

    // ─── Continue from Patronage ──────────────
    socket.on('continueFromPatronage', () => {
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId || gameState.phase !== 'patronage') return;

      gameState = {
        ...gameState,
        players: gameState.players.map((p) =>
          p.id === playerId ? { ...p, ready: true } : p
        ),
      };

      if (gameState.players.every((p) => p.ready)) {
        gameState = engine.startNextRound(gameState);
      }
      broadcastGameView(io);
    });

    // ─── Restart Game ─────────────────────────
    socket.on('restartGame', () => {
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId) return;
      const player = gameState.players.find((p) => p.id === playerId);
      if (!player || !player.isHost) return;

      const players = gameState.players.map((p) => ({
        ...p,
        ready: false,
        support: 0,
        resources: { force: 0, blackmail: 0, gold: 0 },
      }));
      gameState = engine.createGame('revolution-' + Date.now());
      gameState = { ...gameState, players };
      for (const p of players) {
        gameState.bids[p.id] = [];
      }
      broadcastLobbyUpdate(io);
    });

    // ─── Return to Lobby ──────────────────────
    socket.on('returnToLobby', () => {
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId) return;
      const player = gameState.players.find((p) => p.id === playerId);
      if (!player || !player.isHost) return;

      const players = gameState.players.map((p) => ({
        ...p,
        ready: false,
        support: 0,
        resources: { force: 0, blackmail: 0, gold: 0 },
      }));
      gameState = engine.createGame('revolution-' + Date.now());
      gameState = { ...gameState, players };
      for (const p of players) {
        gameState.bids[p.id] = [];
      }
      broadcastLobbyUpdate(io);
    });

    // ─── Kick Player ──────────────────────────
    socket.on('kickPlayer', (data) => {
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId) return;
      const player = gameState.players.find((p) => p.id === playerId);
      if (!player || !player.isHost) return;
      if (data.playerId === playerId) return; // Can't kick yourself

      // Find kicked player's socket and notify
      const kickedSocketId = playerToSocket.get(data.playerId);
      if (kickedSocketId) {
        const kickedSocket = io.sockets.sockets.get(kickedSocketId);
        if (kickedSocket) {
          kickedSocket.emit('kicked' as any);
        }
      }

      gameState = engine.removePlayer(gameState, data.playerId);
      playerToSocket.delete(data.playerId);
      broadcastLobbyUpdate(io);
    });

    // ─── Disconnect ───────────────────────────
    socket.on('disconnect', () => {
      const playerId = socketToPlayer.get(socket.id);
      console.log(`[Socket] Disconnected: ${socket.id} (player: ${playerId || 'none'})`);

      if (playerId) {
        const player = gameState.players.find((p) => p.id === playerId);
        if (player) {
          if (gameState.phase === 'lobby') {
            // Remove from lobby on disconnect
            gameState = engine.removePlayer(gameState, playerId);
            broadcastLobbyUpdate(io);
          } else {
            // Just mark disconnected during game
            gameState = {
              ...gameState,
              players: gameState.players.map((p) =>
                p.id === playerId ? { ...p, connected: false } : p
              ),
            };
            broadcastGameView(io);
          }
        }
        socketToPlayer.delete(socket.id);
        playerToSocket.delete(playerId);
      }
    });
  });
}

// ─── Resolution Stepping ──────────────────────

function stepResolution(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  if (gameState.phase !== 'resolution') return;
  if (gameState.pendingAction) return; // waiting for player action

  if (!engine.hasMoreCharactersToResolve(gameState)) {
    // Resolution complete
    setTimeout(() => {
      if (engine.checkGameEnd(gameState)) {
        gameState = engine.endGame(gameState);
      } else {
        gameState = engine.runPatronage(gameState);
      }
      broadcastGameView(io);
    }, 1000);
    return;
  }

  const result = engine.resolveCurrentCharacter(gameState);
  if (result === null) {
    // No more to resolve
    setTimeout(() => {
      if (engine.checkGameEnd(gameState)) {
        gameState = engine.endGame(gameState);
      } else {
        gameState = engine.runPatronage(gameState);
      }
      broadcastGameView(io);
    }, 1000);
    return;
  }

  gameState = result;
  broadcastGameView(io);

  // If there's a pending action, wait for the player
  if (gameState.pendingAction) return;

  // If more characters to resolve, schedule next step
  if (engine.hasMoreCharactersToResolve(gameState)) {
    setTimeout(() => {
      stepResolution(io);
    }, 1500);
  } else {
    // Done resolving all characters
    setTimeout(() => {
      if (engine.checkGameEnd(gameState)) {
        gameState = engine.endGame(gameState);
      } else {
        gameState = engine.runPatronage(gameState);
      }
      broadcastGameView(io);
    }, 1500);
  }
}

// ─── Broadcasting ─────────────────────────────

function broadcastLobbyUpdate(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  const lobby = {
    players: gameState.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      colorName: p.colorName,
      connected: p.connected,
      isHost: p.isHost,
      support: p.support,
      resources: p.resources,
      ready: p.ready,
    })),
    maxPlayers: GAME_CONFIG.MAX_PLAYERS,
    minPlayers: GAME_CONFIG.MIN_PLAYERS,
    gameStarted: gameState.started,
  };
  io.emit('lobbyUpdate', lobby);
}

function broadcastGameView(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  // Send personalized view to each connected player
  for (const [socketId, playerId] of socketToPlayer.entries()) {
    const s = io.sockets.sockets.get(socketId);
    if (s) {
      s.emit('gameView', engine.getClientView(gameState, playerId));
    }
  }
}

function sendPlayerView(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  playerId: string
): void {
  socket.emit('gameView', engine.getClientView(gameState, playerId));
}

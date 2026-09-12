import {
  GameState,
  Player,
  Bid,
  Resources,
  ResolutionResult,
  FinalScore,
  ClientGameView,
  GameLogEntry,
  PublicPlayer,
  PendingAction,
} from '../shared/types.js';
import { CHARACTERS } from '../shared/characters.js';
import { AREAS } from '../shared/areas.js';
import { GAME_CONFIG } from '../shared/config.js';
import { PLAYER_COLORS } from '../shared/types.js';

// ──────────────────────────────────────────────
// Internal type: GameState with plain objects
// (the shared types.ts uses Map/Set for documentation,
//  but we store everything as plain objects for serialization)
// ──────────────────────────────────────────────
export interface InternalGameState {
  gameId: string;
  phase: GameState['phase'];
  round: number;
  players: Player[];
  board: GameState['board'];
  bids: Record<string, Bid[]>;
  lockedPlayers: string[];
  resolutionIndex: number;
  resolutionResults: ResolutionResult[];
  gameLog: GameLogEntry[];
  winner: string | null;
  started: boolean;
  finished: boolean;
  pendingAction: PendingAction | null;
}

// ─── Game Lifecycle ───────────────────────────

export function createGame(gameId: string): InternalGameState {
  return {
    gameId,
    phase: 'lobby',
    round: 0,
    players: [],
    board: [],
    bids: {},
    lockedPlayers: [],
    resolutionIndex: 0,
    resolutionResults: [],
    gameLog: [],
    winner: null,
    started: false,
    finished: false,
    pendingAction: null,
  };
}

export function addPlayer(
  state: InternalGameState,
  name: string,
  sessionToken: string
): { state: InternalGameState; player: Player } {
  const colorIndex = state.players.length % PLAYER_COLORS.length;
  const colorInfo = PLAYER_COLORS[colorIndex];

  const newPlayer: Player = {
    id: `player_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    name,
    color: colorInfo.color,
    colorName: colorInfo.name,
    connected: true,
    isHost: state.players.length === 0,
    support: 0,
    resources: { force: 0, blackmail: 0, gold: 0 },
    ready: false,
    sessionToken,
  };

  const newState: InternalGameState = {
    ...state,
    players: [...state.players, newPlayer],
    bids: { ...state.bids, [newPlayer.id]: [] },
  };

  return { state: newState, player: newPlayer };
}

export function removePlayer(state: InternalGameState, playerId: string): InternalGameState {
  const newPlayers = state.players.filter((p) => p.id !== playerId);
  if (newPlayers.length > 0 && !newPlayers.some((p) => p.isHost)) {
    newPlayers[0] = { ...newPlayers[0], isHost: true };
  }
  const newBids = { ...state.bids };
  delete newBids[playerId];
  return {
    ...state,
    players: newPlayers,
    bids: newBids,
    lockedPlayers: state.lockedPlayers.filter((id) => id !== playerId),
  };
}

export function startGame(state: InternalGameState): InternalGameState {
  const newState: InternalGameState = {
    ...state,
    started: true,
    round: 1,
    players: state.players.map((p) => ({
      ...p,
      resources: { ...GAME_CONFIG.STARTING_RESOURCES },
      support: 0,
      ready: false,
    })),
    board: [],
    gameLog: [],
    bids: {},
    lockedPlayers: [],
    resolutionIndex: 0,
    resolutionResults: [],
    winner: null,
    finished: false,
    pendingAction: null,
  };
  // Initialize empty bids for each player
  for (const p of newState.players) {
    newState.bids[p.id] = [];
  }
  return beginEspionage(newState);
}

// ─── Phase Transitions ───────────────────────

export function beginEspionage(state: InternalGameState): InternalGameState {
  let s = addLog(state, `Round ${state.round} started.`, 'phase');
  s = addLog(s, `Espionage: All players' resources are visible.`, 'phase');
  return {
    ...s,
    phase: 'espionage',
    players: s.players.map((p) => ({ ...p, ready: false })),
  };
}

export function beginBidding(state: InternalGameState): InternalGameState {
  const newBids: Record<string, Bid[]> = {};
  for (const p of state.players) {
    newBids[p.id] = [];
  }
  let s = addLog(state, 'Bidding phase has started.', 'phase');
  return {
    ...s,
    phase: 'bidding',
    bids: newBids,
    lockedPlayers: [],
    resolutionIndex: 0,
    resolutionResults: [],
    pendingAction: null,
    players: s.players.map((p) => ({ ...p, ready: false })),
  };
}

// ─── Bidding ──────────────────────────────────

export function validateBid(
  state: InternalGameState,
  playerId: string,
  characterId: string,
  force: number,
  blackmail: number,
  gold: number
): { valid: boolean; error?: string } {
  if (state.phase !== 'bidding') return { valid: false, error: 'Not in bidding phase.' };
  if (state.lockedPlayers.includes(playerId)) return { valid: false, error: 'Your bids are already locked.' };
  if (force < 0 || blackmail < 0 || gold < 0) return { valid: false, error: 'Bid amounts must be non-negative.' };
  if (force === 0 && blackmail === 0 && gold === 0) return { valid: false, error: 'Bid must include at least one token.' };

  const character = CHARACTERS.find((c) => c.id === characterId);
  if (!character) return { valid: false, error: 'Invalid character.' };

  if (character.restrictions.includes('noForce') && force > 0)
    return { valid: false, error: `You cannot bid Force on the ${character.name}.` };
  if (character.restrictions.includes('noBlackmail') && blackmail > 0)
    return { valid: false, error: `You cannot bid Blackmail on the ${character.name}.` };

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { valid: false, error: 'Player not found.' };

  const currentBids = state.bids[playerId] || [];
  const otherBids = currentBids.filter((b) => b.characterId !== characterId);

  // Check character limit (other bids + this new one)
  if (otherBids.length >= GAME_CONFIG.MAX_BID_CHARACTERS)
    return { valid: false, error: `You may bid on a maximum of ${GAME_CONFIG.MAX_BID_CHARACTERS} characters.` };

  // Check resource availability
  const usedForce = otherBids.reduce((sum, b) => sum + b.force, 0) + force;
  const usedBlackmail = otherBids.reduce((sum, b) => sum + b.blackmail, 0) + blackmail;
  const usedGold = otherBids.reduce((sum, b) => sum + b.gold, 0) + gold;

  if (usedForce > player.resources.force) return { valid: false, error: 'Not enough Force tokens.' };
  if (usedBlackmail > player.resources.blackmail) return { valid: false, error: 'Not enough Blackmail tokens.' };
  if (usedGold > player.resources.gold) return { valid: false, error: 'Not enough Gold tokens.' };

  return { valid: true };
}

export function placeBid(
  state: InternalGameState,
  playerId: string,
  characterId: string,
  force: number,
  blackmail: number,
  gold: number
): InternalGameState {
  const currentBids = state.bids[playerId] || [];
  const otherBids = currentBids.filter((b) => b.characterId !== characterId);
  return {
    ...state,
    bids: {
      ...state.bids,
      [playerId]: [...otherBids, { characterId, force, blackmail, gold }],
    },
  };
}

export function clearBid(state: InternalGameState, playerId: string, characterId: string): InternalGameState {
  const currentBids = state.bids[playerId] || [];
  return {
    ...state,
    bids: {
      ...state.bids,
      [playerId]: currentBids.filter((b) => b.characterId !== characterId),
    },
  };
}

export function validateAllBids(state: InternalGameState, playerId: string): { valid: boolean; error?: string } {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { valid: false, error: 'Player not found.' };

  const currentBids = state.bids[playerId] || [];

  if (currentBids.length === 0) return { valid: false, error: 'You must place at least one bid.' };
  if (currentBids.length > GAME_CONFIG.MAX_BID_CHARACTERS)
    return { valid: false, error: `You may bid on a maximum of ${GAME_CONFIG.MAX_BID_CHARACTERS} characters.` };

  const totalForce = currentBids.reduce((sum, b) => sum + b.force, 0);
  const totalBlackmail = currentBids.reduce((sum, b) => sum + b.blackmail, 0);
  const totalGold = currentBids.reduce((sum, b) => sum + b.gold, 0);

  if (
    totalForce !== player.resources.force ||
    totalBlackmail !== player.resources.blackmail ||
    totalGold !== player.resources.gold
  ) {
    return { valid: false, error: 'You must use all available tokens before locking bids.' };
  }

  return { valid: true };
}

export function lockPlayerBids(state: InternalGameState, playerId: string): InternalGameState {
  if (state.lockedPlayers.includes(playerId)) return state;
  return {
    ...state,
    lockedPlayers: [...state.lockedPlayers, playerId],
  };
}

export function allPlayersLocked(state: InternalGameState): boolean {
  const connectedPlayers = state.players.filter((p) => p.connected);
  return connectedPlayers.length > 0 && state.lockedPlayers.length >= connectedPlayers.length;
}

// ─── Bid Comparison ───────────────────────────

/**
 * Compare two bids according to Revolution! rules.
 * Force > Blackmail > Gold hierarchy.
 * Returns negative if bid1 is stronger, positive if bid2 is stronger, 0 if tied.
 */
export function compareBids(bid1: Bid, bid2: Bid): number {
  // Force comparison first
  if (bid1.force > 0 || bid2.force > 0) {
    if (bid1.force !== bid2.force) return bid2.force - bid1.force;
  }
  // Blackmail comparison
  if (bid1.blackmail > 0 || bid2.blackmail > 0) {
    if (bid1.blackmail !== bid2.blackmail) return bid2.blackmail - bid1.blackmail;
  }
  // Gold comparison
  if (bid1.gold !== bid2.gold) return bid2.gold - bid1.gold;
  return 0;
}

// ─── Resolution ───────────────────────────────

export function beginResolution(state: InternalGameState): InternalGameState {
  let s = addLog(state, 'All bids are locked. Resolution begins!', 'phase');
  return {
    ...s,
    phase: 'resolution',
    resolutionIndex: 0,
    resolutionResults: [],
    pendingAction: null,
  };
}

/**
 * Resolve exactly ONE character at the current resolutionIndex.
 * Returns the updated state. Does NOT advance to the next character automatically.
 * The caller (socket handler) is responsible for stepping.
 * Returns null if there are no more characters to resolve.
 */
export function resolveCurrentCharacter(state: InternalGameState): InternalGameState | null {
  if (state.pendingAction) return state; // waiting for player action
  if (state.resolutionIndex >= CHARACTERS.length) return null; // done

  const character = CHARACTERS[state.resolutionIndex];

  // Collect all bids for this character
  const allCharBids: { playerId: string; playerName: string; bid: Bid }[] = [];
  for (const player of state.players) {
    const playerBids = state.bids[player.id] || [];
    const bidForChar = playerBids.find((b) => b.characterId === character.id);
    if (bidForChar) {
      allCharBids.push({ playerId: player.id, playerName: player.name, bid: bidForChar });
    }
  }

  let winnerId: string | null = null;
  let winnerName: string | null = null;
  let tied = false;

  if (allCharBids.length === 1) {
    winnerId = allCharBids[0].playerId;
    winnerName = allCharBids[0].playerName;
  } else if (allCharBids.length > 1) {
    const sorted = [...allCharBids].sort((a, b) => compareBids(a.bid, b.bid));
    if (compareBids(sorted[0].bid, sorted[1].bid) === 0) {
      tied = true;
    } else {
      winnerId = sorted[0].playerId;
      winnerName = sorted[0].playerName;
    }
  }

  const result: ResolutionResult = {
    characterId: character.id,
    characterName: character.name,
    winnerId,
    winnerName,
    allBids: allCharBids,
    tied,
    noBids: allCharBids.length === 0,
  };

  let s: InternalGameState = {
    ...state,
    resolutionResults: [...state.resolutionResults, result],
  };

  // Consume bid tokens from ALL players who bid on this character
  s = {
    ...s,
    players: s.players.map((p) => {
      const pBid = allCharBids.find((b) => b.playerId === p.id)?.bid;
      if (pBid) {
        return {
          ...p,
          resources: {
            force: p.resources.force - pBid.force,
            blackmail: p.resources.blackmail - pBid.blackmail,
            gold: p.resources.gold - pBid.gold,
          },
        };
      }
      return p;
    }),
  };

  if (winnerId && winnerName) {
    s = addLog(s, `${winnerName} won ${character.name}.`, 'resolution', winnerId);

    // Apply rewards to winner
    const winner = s.players.find((p) => p.id === winnerId)!;
    const updatedWinner = {
      ...winner,
      support: winner.support + (character.rewards.support || 0),
      resources: {
        force: winner.resources.force + (character.rewards.force || 0),
        blackmail: winner.resources.blackmail + (character.rewards.blackmail || 0),
        gold: winner.resources.gold + (character.rewards.gold || 0),
      },
    };

    s = { ...s, players: s.players.map((p) => (p.id === winnerId ? updatedWinner : p)) };

    // Log rewards
    if (character.rewards.support) s = addLog(s, `${winnerName} gained ${character.rewards.support} Support.`, 'reward', winnerId);
    if (character.rewards.force) s = addLog(s, `${winnerName} gained ${character.rewards.force} Force.`, 'reward', winnerId);
    if (character.rewards.blackmail) s = addLog(s, `${winnerName} gained ${character.rewards.blackmail} Blackmail.`, 'reward', winnerId);
    if (character.rewards.gold) s = addLog(s, `${winnerName} gained ${character.rewards.gold} Gold.`, 'reward', winnerId);

    // Place influence if applicable
    if (character.rewards.influence) {
      const area = AREAS.find((a) => a.id === character.rewards.influence);
      if (area) {
        const currentCubes = s.board.filter((c) => c.areaId === area.id);
        if (currentCubes.length < area.spaces) {
          const occupiedSpaces = new Set(currentCubes.map((c) => c.spaceIndex));
          let nextSpace = -1;
          for (let i = 0; i < area.spaces; i++) {
            if (!occupiedSpaces.has(i)) { nextSpace = i; break; }
          }
          if (nextSpace >= 0) {
            s = {
              ...s,
              board: [...s.board, { areaId: area.id, spaceIndex: nextSpace, playerId: winnerId }],
            };
            s = addLog(s, `${winnerName} placed influence in ${area.name}.`, 'action', winnerId);
          }
        } else {
          s = addLog(s, `${area.name} is full. ${winnerName} cannot place influence.`, 'info', winnerId);
        }
      }
    }

    // Check for special abilities
    if (character.ability === 'spy') {
      const validTargets = getValidSpyTargets(s, winnerId);
      if (validTargets.length > 0) {
        s = addLog(s, `${winnerName} must choose a Spy target.`, 'action', winnerId);
        return {
          ...s,
          pendingAction: { type: 'spy', playerId: winnerId, characterId: character.id },
        };
      } else {
        s = addLog(s, `${winnerName} won Spy but no valid targets available.`, 'info', winnerId);
      }
    } else if (character.ability === 'apothecary') {
      const validTargets = getValidApothecaryTargets(s);
      if (validTargets.length >= 2) {
        s = addLog(s, `${winnerName} must choose two spaces for Apothecary swap.`, 'action', winnerId);
        return {
          ...s,
          pendingAction: { type: 'apothecary', playerId: winnerId, characterId: character.id },
        };
      } else {
        s = addLog(s, `${winnerName} won Apothecary but not enough cubes to swap.`, 'info', winnerId);
      }
    }
  } else if (tied) {
    s = addLog(s, `${character.name}: Tie — nobody wins.`, 'resolution');
  } else {
    // noBids
    s = addLog(s, `${character.name}: No bids — nobody wins.`, 'resolution');
  }

  // Advance to next character
  s = { ...s, resolutionIndex: s.resolutionIndex + 1 };
  return s;
}

export function hasMoreCharactersToResolve(state: InternalGameState): boolean {
  return state.resolutionIndex < CHARACTERS.length;
}

// ─── Special Abilities ────────────────────────

export function executeSpy(
  state: InternalGameState,
  playerId: string,
  targetAreaId: string,
  targetSpaceIndex: number
): { state: InternalGameState; success: boolean; error?: string } {
  if (!state.pendingAction || state.pendingAction.type !== 'spy' || state.pendingAction.playerId !== playerId) {
    return { state, success: false, error: 'It is not your turn to use the Spy.' };
  }

  const targetIndex = state.board.findIndex((c) => c.areaId === targetAreaId && c.spaceIndex === targetSpaceIndex);
  if (targetIndex < 0) return { state, success: false, error: 'Invalid target space.' };

  const targetCube = state.board[targetIndex];
  if (targetCube.playerId === playerId) return { state, success: false, error: 'Cannot replace your own cube.' };

  const targetPlayerName = state.players.find((p) => p.id === targetCube.playerId)?.name || 'Unknown';
  const areaName = AREAS.find((a) => a.id === targetAreaId)?.name || targetAreaId;
  const playerName = state.players.find((p) => p.id === playerId)?.name || 'Unknown';

  const newBoard = [...state.board];
  newBoard[targetIndex] = { ...newBoard[targetIndex], playerId };

  let s: InternalGameState = {
    ...state,
    board: newBoard,
    pendingAction: null,
    resolutionIndex: state.resolutionIndex + 1,
  };
  s = addLog(s, `${playerName} used Spy to replace ${targetPlayerName}'s cube in ${areaName}.`, 'action', playerId);
  return { state: s, success: true };
}

export function executeApothecary(
  state: InternalGameState,
  playerId: string,
  space1: { areaId: string; spaceIndex: number },
  space2: { areaId: string; spaceIndex: number }
): { state: InternalGameState; success: boolean; error?: string } {
  if (!state.pendingAction || state.pendingAction.type !== 'apothecary' || state.pendingAction.playerId !== playerId) {
    return { state, success: false, error: 'It is not your turn to use the Apothecary.' };
  }

  const idx1 = state.board.findIndex((c) => c.areaId === space1.areaId && c.spaceIndex === space1.spaceIndex);
  const idx2 = state.board.findIndex((c) => c.areaId === space2.areaId && c.spaceIndex === space2.spaceIndex);

  if (idx1 < 0 || idx2 < 0) return { state, success: false, error: 'Invalid target spaces.' };
  if (idx1 === idx2) return { state, success: false, error: 'Must select two different spaces.' };

  const area1Name = AREAS.find((a) => a.id === space1.areaId)?.name || space1.areaId;
  const area2Name = AREAS.find((a) => a.id === space2.areaId)?.name || space2.areaId;
  const playerName = state.players.find((p) => p.id === playerId)?.name || 'Unknown';

  const newBoard = [...state.board];
  const p1 = newBoard[idx1].playerId;
  const p2 = newBoard[idx2].playerId;
  newBoard[idx1] = { ...newBoard[idx1], playerId: p2 };
  newBoard[idx2] = { ...newBoard[idx2], playerId: p1 };

  let s: InternalGameState = {
    ...state,
    board: newBoard,
    pendingAction: null,
    resolutionIndex: state.resolutionIndex + 1,
  };
  s = addLog(s, `${playerName} used Apothecary to swap cubes between ${area1Name} and ${area2Name}.`, 'action', playerId);
  return { state: s, success: true };
}

export function skipAction(state: InternalGameState, playerId: string): InternalGameState {
  if (!state.pendingAction || state.pendingAction.playerId !== playerId) return state;
  const playerName = state.players.find((p) => p.id === playerId)?.name || 'Unknown';
  let s: InternalGameState = {
    ...state,
    pendingAction: null,
    resolutionIndex: state.resolutionIndex + 1,
  };
  s = addLog(s, `${playerName} skipped their ${state.pendingAction.type} action.`, 'action', playerId);
  return s;
}

export function getValidSpyTargets(
  state: InternalGameState,
  playerId: string
): { areaId: string; spaceIndex: number; currentPlayerId: string }[] {
  return state.board
    .filter((c) => c.playerId !== playerId)
    .map((c) => ({ areaId: c.areaId, spaceIndex: c.spaceIndex, currentPlayerId: c.playerId }));
}

export function getValidApothecaryTargets(
  state: InternalGameState
): { areaId: string; spaceIndex: number; playerId: string }[] {
  return state.board.map((c) => ({ areaId: c.areaId, spaceIndex: c.spaceIndex, playerId: c.playerId }));
}

// ─── Patronage ────────────────────────────────

export function runPatronage(state: InternalGameState): InternalGameState {
  let s = addLog(state, 'Patronage phase.', 'phase');

  const newPlayers = s.players.map((p) => {
    const total = getTotalResources(p.resources);
    if (total < GAME_CONFIG.PATRONAGE_MIN_RESOURCES) {
      const diff = GAME_CONFIG.PATRONAGE_MIN_RESOURCES - total;
      s = addLog(s, `${p.name} received ${diff} Gold from Patronage.`, 'reward', p.id);
      return {
        ...p,
        resources: { ...p.resources, gold: p.resources.gold + diff },
      };
    }
    return p;
  });

  return {
    ...s,
    phase: 'patronage',
    players: newPlayers,
  };
}

export function startNextRound(state: InternalGameState): InternalGameState {
  return beginEspionage({
    ...state,
    round: state.round + 1,
  });
}

// ─── End Game ─────────────────────────────────

export function checkGameEnd(state: InternalGameState): boolean {
  const totalSpaces = AREAS.reduce((sum, a) => sum + a.spaces, 0);
  return state.board.length >= totalSpaces;
}

export function endGame(state: InternalGameState): InternalGameState {
  const scores = calculateFinalScores(state);
  const winner = scores.length > 0 ? scores[0].playerId : null;
  let s = addLog(state, 'All influence spaces are full. The game is over!', 'phase');
  if (winner) {
    const winnerName = state.players.find((p) => p.id === winner)?.name || 'Unknown';
    s = addLog(s, `${winnerName} wins the Revolution!`, 'system');
  }
  return {
    ...s,
    phase: 'gameOver',
    finished: true,
    winner,
  };
}

export function calculateFinalScores(state: InternalGameState): FinalScore[] {
  const scores: FinalScore[] = [];

  for (const player of state.players) {
    const forceValue = player.resources.force * GAME_CONFIG.FINAL_SCORING.FORCE_VALUE;
    const blackmailValue = player.resources.blackmail * GAME_CONFIG.FINAL_SCORING.BLACKMAIL_VALUE;
    const goldValue = player.resources.gold * GAME_CONFIG.FINAL_SCORING.GOLD_VALUE;

    let totalAreaBonus = 0;
    const areaBonuses: { areaId: string; areaName: string; bonus: number }[] = [];

    for (const area of AREAS) {
      const counts: Record<string, number> = {};
      for (const cube of state.board) {
        if (cube.areaId === area.id) {
          counts[cube.playerId] = (counts[cube.playerId] || 0) + 1;
        }
      }

      let max = 0;
      let maxPlayerIds: string[] = [];
      for (const [pid, count] of Object.entries(counts)) {
        if (count > max) {
          max = count;
          maxPlayerIds = [pid];
        } else if (count === max) {
          maxPlayerIds.push(pid);
        }
      }

      if (maxPlayerIds.length === 1 && maxPlayerIds[0] === player.id) {
        totalAreaBonus += area.bonus;
        areaBonuses.push({ areaId: area.id, areaName: area.name, bonus: area.bonus });
      }
    }

    scores.push({
      playerId: player.id,
      playerName: player.name,
      color: player.color,
      currentSupport: player.support,
      forceValue,
      blackmailValue,
      goldValue,
      areaBonuses,
      totalAreaBonus,
      finalSupport: player.support + forceValue + blackmailValue + goldValue + totalAreaBonus,
    });
  }

  return scores.sort((a, b) => b.finalSupport - a.finalSupport);
}

// ─── Client View (hidden-information-safe) ────

export function getClientView(state: InternalGameState, playerId: string): ClientGameView {
  const publicPlayers: PublicPlayer[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    colorName: p.colorName,
    connected: p.connected,
    isHost: p.isHost,
    support: p.support,
    resources: p.resources,
    ready: p.ready,
  }));

  // CRITICAL: Only send THIS player's bids during bidding, NEVER other players'
  const myBids = state.phase === 'bidding' ? (state.bids[playerId] || []) : [];
  const myLocked = state.lockedPlayers.includes(playerId);

  const view: ClientGameView = {
    gameId: state.gameId,
    phase: state.phase,
    round: state.round,
    players: publicPlayers,
    board: state.board,
    myBids,
    myLocked,
    allLocked: allPlayersLocked(state),
    lockedPlayerIds: [...state.lockedPlayers],
    resolutionIndex: state.resolutionIndex,
    resolutionResults: state.resolutionResults,
    gameLog: state.gameLog,
    winner: state.winner,
    started: state.started,
    finished: state.finished,
    pendingAction: state.pendingAction,
  };

  if (state.phase === 'gameOver') {
    view.finalScores = calculateFinalScores(state);
    if (view.finalScores.length > 0) {
      view.winner = view.finalScores[0].playerId;
    }
  }

  return view;
}

// ─── Helpers ──────────────────────────────────

export function getTotalResources(resources: Resources): number {
  return resources.force + resources.blackmail + resources.gold;
}

export function addLog(
  state: InternalGameState,
  message: string,
  type: GameLogEntry['type'],
  playerId?: string
): InternalGameState {
  return {
    ...state,
    gameLog: [
      ...state.gameLog,
      {
        round: state.round,
        phase: state.phase,
        message,
        type,
        playerId,
        timestamp: Date.now(),
      },
    ],
  };
}

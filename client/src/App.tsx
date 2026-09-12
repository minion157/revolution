import React, { useEffect, useState } from 'react';
import { socket } from './socket';
import { ClientGameView, LobbyState } from '@shared/types';
import Lobby from './components/Lobby';
import GameView from './components/GameView';
import SetupAnimation from './components/SetupAnimation';

const App: React.FC = () => {
  const [connected, setConnected] = useState(socket.connected);
  const [playerId, setPlayerId] = useState<string | null>(localStorage.getItem('revolution_playerId'));
  const [sessionToken, setSessionToken] = useState<string | null>(localStorage.getItem('revolution_sessionToken'));
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [gameView, setGameView] = useState<ClientGameView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSetupAnimation, setShowSetupAnimation] = useState(false);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
      setError(null);
      if (sessionToken) {
        socket.emit('reconnect', { sessionToken });
      }
    }

    if (socket.connected) {
      onConnect();
    }

    function onDisconnect() {
      setConnected(false);
    }

    function onLobbyUpdate(state: LobbyState) {
      setLobbyState(state);
      setGameView(null);
    }

    function onGameView(view: ClientGameView) {
      setGameView(view);
      setLobbyState(null);
    }

    function onJoinedGame({ playerId, sessionToken }: { playerId: string, sessionToken: string }) {
      setPlayerId(playerId);
      setSessionToken(sessionToken);
      localStorage.setItem('revolution_playerId', playerId);
      localStorage.setItem('revolution_sessionToken', sessionToken);
      setError(null);
    }

    function onError(message: string) {
      setError(message);
    }

    function onKicked() {
      setPlayerId(null);
      setSessionToken(null);
      localStorage.removeItem('revolution_playerId');
      localStorage.removeItem('revolution_sessionToken');
      setGameView(null);
      setLobbyState(null);
      setError("You have been kicked from the game.");
    }

    function onSetupAnimation() {
      setShowSetupAnimation(true);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('lobbyUpdate', onLobbyUpdate);
    socket.on('gameView', onGameView);
    socket.on('joinedGame', onJoinedGame);
    socket.on('error', onError);
    socket.on('kicked', onKicked);
    socket.on('setupAnimation', onSetupAnimation);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('lobbyUpdate', onLobbyUpdate);
      socket.off('gameView', onGameView);
      socket.off('joinedGame', onJoinedGame);
      socket.off('error', onError);
      socket.off('kicked', onKicked);
      socket.off('setupAnimation', onSetupAnimation);
    };
  }, [sessionToken]);

  const renderContent = () => {
    if (showSetupAnimation) {
      return <SetupAnimation onComplete={() => setShowSetupAnimation(false)} />;
    }

    if (gameView) {
      return <GameView view={gameView} playerId={playerId} />;
    }

    if (lobbyState) {
      return <Lobby lobbyState={lobbyState} playerId={playerId} error={error} />;
    }

    // Default loading or initial join state
    return <Lobby lobbyState={null} playerId={playerId} error={error} />;
  };

  return (
    <div className="app-container">
      {!connected && (
        <div className="connection-status disconnected">
          Disconnected from server. Reconnecting...
        </div>
      )}
      {renderContent()}
    </div>
  );
};

export default App;

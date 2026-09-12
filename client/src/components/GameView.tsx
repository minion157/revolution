import React from 'react';
import { ClientGameView } from '@shared/types';
import PhaseHeader from './PhaseHeader';
import PlayerPanel from './PlayerPanel';
import EspionagePhase from './EspionagePhase';
import BiddingPhase from './BiddingPhase';
import ResolutionPhase from './ResolutionPhase';
import PatronagePhase from './PatronagePhase';
import FinalScore from './FinalScore';
import GameLog from './GameLog';
import InfluenceBoard from './InfluenceBoard';
import { socket } from '../socket';

interface GameViewProps {
  view: ClientGameView;
  playerId: string | null;
}

const GameView: React.FC<GameViewProps> = ({ view, playerId }) => {
  const isHost = view.players.find(p => p.id === playerId)?.isHost;

  const renderPhase = () => {
    switch (view.phase) {
      case 'espionage': return <EspionagePhase view={view} playerId={playerId!} />;
      case 'bidding': return <BiddingPhase view={view} playerId={playerId!} />;
      case 'resolution': return <ResolutionPhase view={view} playerId={playerId!} />;
      case 'patronage': return <PatronagePhase view={view} playerId={playerId!} />;
      case 'gameOver': return <FinalScore view={view} playerId={playerId!} />;
      default: return <div>Unknown phase</div>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <PhaseHeader view={view} />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: window.innerWidth < 768 ? 'column' : 'row' }}>
        {/* Left Sidebar - Players & Log */}
        <div style={{ width: window.innerWidth < 768 ? '100%' : '25%', minWidth: '250px', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-panel)', overflowY: 'auto' }}>
          <PlayerPanel view={view} playerId={playerId} />
          <GameLog gameLog={view.gameLog} players={view.players} />
        </div>

        {/* Center - Main Action Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1rem', gap: '1rem' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {renderPhase()}
          </div>
        </div>

        {/* Right Sidebar - Board */}
        <div style={{ width: window.innerWidth < 1024 ? '100%' : '30%', minWidth: '300px', borderLeft: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'var(--bg-panel)', padding: '1rem', overflowY: 'auto' }}>
          <InfluenceBoard view={view} playerId={playerId} />
        </div>
      </div>
      
      {isHost && (
        <div style={{ padding: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '1rem', backgroundColor: 'var(--bg-dark)' }}>
          <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }} onClick={() => socket.emit('restartGame')}>Restart Game</button>
          <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }} onClick={() => socket.emit('returnToLobby')}>Return to Lobby</button>
        </div>
      )}
    </div>
  );
};

export default GameView;

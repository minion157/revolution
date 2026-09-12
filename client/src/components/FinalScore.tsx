import React from 'react';
import { ClientGameView } from '@shared/types';
import { socket } from '../socket';

interface FinalScoreProps {
  view: ClientGameView;
  playerId: string;
}

const FinalScore: React.FC<FinalScoreProps> = ({ view, playerId }) => {
  const myPlayer = view.players.find(p => p.id === playerId);
  const isHost = myPlayer?.isHost;
  const scores = view.finalScores || [];
  const winner = view.winner ? view.players.find(p => p.id === view.winner) : null;
  
  return (
    <div className="card fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: '3rem', color: 'var(--color-gold)', marginBottom: '0.5rem', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Game Over!</h1>
      
      {winner && (
        <div style={{ padding: '1rem 2rem', backgroundColor: winner.color, color: '#fff', borderRadius: '8px', marginBottom: '2rem', textAlign: 'center', border: '2px solid var(--color-gold)' }}>
          <h2 style={{ margin: 0, fontSize: '2rem' }}>{winner.name} Wins!</h2>
        </div>
      )}
      
      <div style={{ width: '100%', overflowX: 'auto', marginBottom: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-gold)' }}>
              <th style={{ padding: '1rem' }}>Player</th>
              <th style={{ padding: '1rem' }}>Support</th>
              <th style={{ padding: '1rem' }}>Force Value</th>
              <th style={{ padding: '1rem' }}>Blackmail Value</th>
              <th style={{ padding: '1rem' }}>Gold Value</th>
              <th style={{ padding: '1rem' }}>Area Bonuses</th>
              <th style={{ padding: '1rem', color: 'var(--color-gold)', fontSize: '1.2rem' }}>Final Score</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score, idx) => (
              <tr key={score.playerId} style={{ 
                borderBottom: '1px solid rgba(255,255,255,0.1)', 
                backgroundColor: score.playerId === view.winner ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                fontWeight: score.playerId === view.winner ? 'bold' : 'normal'
              }}>
                <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: score.color }} />
                  {score.playerName}
                </td>
                <td style={{ padding: '1rem' }}>{score.currentSupport}</td>
                <td style={{ padding: '1rem' }}>+{score.forceValue}</td>
                <td style={{ padding: '1rem' }}>+{score.blackmailValue}</td>
                <td style={{ padding: '1rem' }}>+{score.goldValue}</td>
                <td style={{ padding: '1rem' }}>
                  {score.totalAreaBonus > 0 ? (
                    <div style={{ fontSize: '0.9rem' }}>
                      <div style={{ fontWeight: 'bold' }}>+{score.totalAreaBonus}</div>
                      {score.areaBonuses.map(b => (
                        <div key={b.areaId} style={{ color: 'var(--color-text-muted)' }}>{b.areaName} (+{b.bonus})</div>
                      ))}
                    </div>
                  ) : '-'}
                </td>
                <td style={{ padding: '1rem', color: 'var(--color-gold)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {score.finalSupport}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {isHost ? (
        <button 
          className="btn-primary" 
          style={{ fontSize: '1.2rem', padding: '0.75rem 2rem' }}
          onClick={() => socket.emit('returnToLobby')}
        >
          Return to Lobby
        </button>
      ) : (
        <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          Waiting for host to return to lobby...
        </p>
      )}
    </div>
  );
};

export default FinalScore;

import React, { useEffect, useRef, useState } from 'react';
import { GameLogEntry, PublicPlayer } from '@shared/types';

interface GameLogProps {
  gameLog: GameLogEntry[];
  players: PublicPlayer[];
}

const GameLog: React.FC<GameLogProps> = ({ gameLog, players }) => {
  const logEndRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameLog]);
  
  const getPlayerColor = (playerId?: string) => {
    if (!playerId) return 'inherit';
    const player = players.find(p => p.id === playerId);
    return player ? player.color : 'inherit';
  };
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'phase': return 'var(--color-gold)';
      case 'resolution': return '#a78bfa'; // light purple
      case 'reward': return '#34d399'; // green
      case 'action': return '#60a5fa'; // blue
      case 'system': return '#f87171'; // red
      default: return 'var(--color-text-muted)';
    }
  };
  
  return (
    <div className="game-log-container parchment" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      maxHeight: '400px',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <div 
        className="log-header"
        style={{ 
          padding: '0.75rem 1rem', 
          backgroundColor: 'rgba(0,0,0,0.1)', 
          borderBottom: '1px solid rgba(0,0,0,0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer'
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Game Log</h3>
        <span>{collapsed ? '▲' : '▼'}</span>
      </div>
      
      {!collapsed && (
        <div 
          className="log-content custom-scrollbar" 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            backgroundColor: 'rgba(255,255,255,0.05)'
          }}
        >
          {gameLog.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', fontStyle: 'italic', marginTop: '2rem' }}>
              No history yet.
            </div>
          ) : (
            gameLog.map((log, index) => (
              <div 
                key={index} 
                className="log-entry"
                style={{ 
                  fontSize: '0.9rem',
                  lineHeight: '1.4',
                  paddingLeft: log.type === 'phase' ? '0' : '1rem',
                  fontWeight: log.type === 'phase' ? 'bold' : 'normal',
                  color: getTypeColor(log.type)
                }}
              >
                {log.playerId ? (
                  <span>
                    <strong style={{ color: getPlayerColor(log.playerId) }}>
                      {players.find(p => p.id === log.playerId)?.name || 'Unknown'}
                    </strong>
                    {' '}{log.message.replace(/.*? (won|used|skipped|gained|received|placed) /, '$1 ')}
                  </span>
                ) : (
                  <span>{log.message}</span>
                )}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      )}
    </div>
  );
};

export default GameLog;

import React from 'react';
import { ClientGameView } from '@shared/types';

interface PlayerPanelProps {
  view: ClientGameView;
  playerId: string | null;
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({ view, playerId }) => {
  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Players</h3>
      {view.players.map(p => (
        <div key={p.id} className="card parchment" style={{ position: 'relative', borderLeft: `6px solid ${p.color}`, opacity: p.connected ? 1 : 0.6 }}>
          {p.id === playerId && <div style={{ position: 'absolute', top: 0, right: 0, padding: '0.2rem 0.4rem', backgroundColor: 'var(--color-gold)', color: 'var(--bg-dark)', fontSize: '0.7rem', borderBottomLeftRadius: '4px' }}>YOU</div>}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
            <h4 style={{ margin: 0 }}>{p.name}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
              <span title="Support">⭐ {p.support}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className="token force" title="Force">{p.resources.force}</span>
            <span className="token blackmail" title="Blackmail">{p.resources.blackmail}</span>
            <span className="token gold" title="Gold">{p.resources.gold}</span>
          </div>

          {view.phase === 'bidding' && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', textAlign: 'right' }}>
              {view.lockedPlayerIds.includes(p.id) ? 
                <span style={{ color: 'var(--color-green)' }}>✓ Bids Locked</span> : 
                <span style={{ color: 'var(--color-orange)' }}>Bidding...</span>
              }
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PlayerPanel;

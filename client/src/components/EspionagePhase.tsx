import React from 'react';
import { ClientGameView } from '@shared/types';
import { socket } from '../socket';

interface EspionagePhaseProps {
  view: ClientGameView;
  playerId: string;
}

const EspionagePhase: React.FC<EspionagePhaseProps> = ({ view, playerId }) => {
  const myPlayer = view.players.find(p => p.id === playerId);
  const isReady = !!myPlayer?.ready;
  
  return (
    <div className="card fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
      <h2 style={{ fontSize: '2rem', color: 'var(--color-gold)', marginBottom: '1rem' }}>Espionage</h2>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem', maxWidth: '600px' }}>
        Observe your opponents' resources closely. This is the only time their totals are public information before the bidding begins.
      </p>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center', marginBottom: '3rem' }}>
        {view.players.map(p => (
          <div key={p.id} className="parchment" style={{ padding: '1rem', borderRadius: '8px', minWidth: '150px', borderTop: `4px solid ${p.color}` }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>{p.name}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className="token force" style={{ marginBottom: '0.5rem' }}>{p.resources.force}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className="token blackmail" style={{ marginBottom: '0.5rem' }}>{p.resources.blackmail}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className="token gold" style={{ marginBottom: '0.5rem' }}>{p.resources.gold}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <button 
          className={isReady ? "btn-outline" : "btn-primary"} 
          style={{ fontSize: '1.2rem', padding: '0.75rem 2rem' }}
          onClick={() => isReady ? socket.emit('unready') : socket.emit('ready')}
        >
          {isReady ? "Cancel Ready" : "I'm Ready to Bid"}
        </button>
        <div style={{ color: 'var(--color-text-muted)' }}>
          {view.players.filter(p => p.ready).length} / {view.players.length} players ready
        </div>
      </div>
    </div>
  );
};

export default EspionagePhase;

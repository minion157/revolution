import React from 'react';
import { ClientGameView } from '@shared/types';
import { socket } from '../socket';

interface PatronagePhaseProps {
  view: ClientGameView;
  playerId: string;
}

const PatronagePhase: React.FC<PatronagePhaseProps> = ({ view, playerId }) => {
  const myPlayer = view.players.find(p => p.id === playerId);
  const isReady = !!myPlayer?.ready;
  
  if (!myPlayer) return null;
  
  const totalResources = myPlayer.resources.force + myPlayer.resources.blackmail + myPlayer.resources.gold;
  
  return (
    <div className="card fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
      <h2 style={{ fontSize: '2rem', color: 'var(--color-gold)', marginBottom: '1rem' }}>Patronage Phase</h2>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem', maxWidth: '600px' }}>
        Players with fewer than 5 total resources receive gold to bring their total to 5.
      </p>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center', marginBottom: '3rem' }}>
        {view.players.map(p => {
          // Look for patronage rewards in the log for this round and phase
          const patronageLogs = view.gameLog.filter(l => l.round === view.round && l.phase === 'patronage' && l.type === 'reward' && l.playerId === p.id);
          const goldGained = patronageLogs.reduce((sum, log) => {
            const match = log.message.match(/received (\d+) Gold/);
            return sum + (match ? parseInt(match[1]) : 0);
          }, 0);
          
          return (
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
                  {goldGained > 0 && <span style={{ color: 'var(--color-gold)', fontSize: '0.8rem', fontWeight: 'bold' }}>+{goldGained}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>Your Current Resources: {totalResources}</h3>
        <p style={{ margin: 0 }}>
          Force: {myPlayer.resources.force} | Blackmail: {myPlayer.resources.blackmail} | Gold: {myPlayer.resources.gold}
        </p>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <button 
          className="btn-primary" 
          style={{ fontSize: '1.2rem', padding: '0.75rem 2rem', opacity: isReady ? 0.5 : 1, cursor: isReady ? 'not-allowed' : 'pointer' }}
          onClick={() => {
            if (!isReady) socket.emit('continueFromPatronage');
          }}
          disabled={isReady}
        >
          {isReady ? "Waiting for others..." : "Continue to Next Round"}
        </button>
        <div style={{ color: 'var(--color-text-muted)' }}>
          {view.lockedPlayerIds.length} / {view.players.length} players ready
        </div>
      </div>
    </div>
  );
};

export default PatronagePhase;

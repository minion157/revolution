import React, { useState } from 'react';
import { ClientGameView } from '@shared/types';
import { AREAS } from '@shared/areas';
import { socket } from '../socket';

interface SpyActionProps {
  view: ClientGameView;
  playerId: string;
}

const SpyAction: React.FC<SpyActionProps> = ({ view, playerId }) => {
  const isMyAction = view.pendingAction?.playerId === playerId;
  const [selectedTarget, setSelectedTarget] = useState<{ areaId: string, spaceIndex: number } | null>(null);

  if (!isMyAction) {
    const actingPlayer = view.players.find(p => p.id === view.pendingAction?.playerId);
    return (
      <div className="card fade-in" style={{ textAlign: 'center', padding: '2rem' }}>
        <h2 style={{ color: 'var(--color-gold)' }}>Spy Action</h2>
        <p>Waiting for {actingPlayer?.name} to choose a target...</p>
      </div>
    );
  }

  // Find valid targets (opponent cubes)
  const validTargets = view.board.filter(cube => cube.playerId !== playerId);

  const handleConfirm = () => {
    if (selectedTarget) {
      socket.emit('spyAction', { targetAreaId: selectedTarget.areaId, targetSpaceIndex: selectedTarget.spaceIndex });
    }
  };

  return (
    <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', padding: '1rem', height: '100%' }}>
      <h2 style={{ color: 'var(--color-gold)', textAlign: 'center' }}>Choose a Target</h2>
      <p style={{ textAlign: 'center', marginBottom: '1rem' }}>Select an opponent's cube to replace with your own.</p>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {AREAS.map(area => {
          const areaTargets = validTargets.filter(t => t.areaId === area.id);
          if (areaTargets.length === 0) return null;

          return (
            <div key={area.id} className="parchment" style={{ padding: '0.5rem', borderRadius: '4px' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', textAlign: 'center' }}>{area.name}</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                {areaTargets.map(target => {
                  const targetPlayer = view.players.find(p => p.id === target.playerId);
                  const isSelected = selectedTarget?.areaId === target.areaId && selectedTarget?.spaceIndex === target.spaceIndex;
                  return (
                    <div 
                      key={`${target.areaId}-${target.spaceIndex}`}
                      onClick={() => setSelectedTarget(target)}
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: targetPlayer?.color,
                        border: isSelected ? '3px solid var(--color-gold)' : '2px solid rgba(255,255,255,0.5)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'white',
                        fontWeight: 'bold',
                        transform: isSelected ? 'scale(1.1)' : 'none',
                        boxShadow: isSelected ? '0 0 10px var(--color-gold)' : 'none'
                      }}
                      title={`${targetPlayer?.name}'s cube in ${area.name}`}
                    >
                      {targetPlayer?.name.charAt(0).toUpperCase()}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {validTargets.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No valid targets available.</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button className="btn-outline" style={{ flex: 1 }} onClick={() => socket.emit('skipAction')}>Skip</button>
        <button className="btn-primary" style={{ flex: 2 }} disabled={!selectedTarget} onClick={handleConfirm}>Confirm Target</button>
      </div>
    </div>
  );
};

export default SpyAction;

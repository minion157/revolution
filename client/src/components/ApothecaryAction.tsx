import React, { useState } from 'react';
import { ClientGameView, InfluenceCube } from '@shared/types';
import { AREAS } from '@shared/areas';
import { socket } from '../socket';

interface ApothecaryActionProps {
  view: ClientGameView;
  playerId: string;
}

const ApothecaryAction: React.FC<ApothecaryActionProps> = ({ view, playerId }) => {
  const isMyAction = view.pendingAction?.playerId === playerId;
  const [selected1, setSelected1] = useState<InfluenceCube | null>(null);
  const [selected2, setSelected2] = useState<InfluenceCube | null>(null);

  if (!isMyAction) {
    const actingPlayer = view.players.find(p => p.id === view.pendingAction?.playerId);
    return (
      <div className="card fade-in" style={{ textAlign: 'center', padding: '2rem' }}>
        <h2 style={{ color: 'var(--color-gold)' }}>Apothecary Action</h2>
        <p>Waiting for {actingPlayer?.name} to swap two cubes...</p>
      </div>
    );
  }

  // Any occupied space is a valid target
  const validTargets = view.board;

  const handleSelect = (target: InfluenceCube) => {
    if (selected1 && selected1.areaId === target.areaId && selected1.spaceIndex === target.spaceIndex) {
      setSelected1(null);
      return;
    }
    if (selected2 && selected2.areaId === target.areaId && selected2.spaceIndex === target.spaceIndex) {
      setSelected2(null);
      return;
    }

    if (!selected1) {
      setSelected1(target);
    } else if (!selected2) {
      setSelected2(target);
    } else {
      setSelected1(target);
      setSelected2(null);
    }
  };

  const handleConfirm = () => {
    if (selected1 && selected2) {
      socket.emit('apothecaryAction', { 
        space1: { areaId: selected1.areaId, spaceIndex: selected1.spaceIndex }, 
        space2: { areaId: selected2.areaId, spaceIndex: selected2.spaceIndex } 
      });
    }
  };

  return (
    <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', padding: '1rem', height: '100%' }}>
      <h2 style={{ color: 'var(--color-gold)', textAlign: 'center' }}>Choose Two Spaces to Swap</h2>
      <p style={{ textAlign: 'center', marginBottom: '1rem' }}>
        {!selected1 ? "Select the first space." : !selected2 ? "Select the second space." : "Confirm the swap."}
      </p>

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
                  const isSelected1 = selected1?.areaId === target.areaId && selected1?.spaceIndex === target.spaceIndex;
                  const isSelected2 = selected2?.areaId === target.areaId && selected2?.spaceIndex === target.spaceIndex;
                  const isSelected = isSelected1 || isSelected2;
                  
                  return (
                    <div 
                      key={`${target.areaId}-${target.spaceIndex}`}
                      onClick={() => handleSelect(target)}
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: targetPlayer?.color,
                        border: isSelected1 ? '3px solid var(--color-gold)' : isSelected2 ? '3px solid var(--color-blue)' : '2px solid rgba(255,255,255,0.5)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'white',
                        fontWeight: 'bold',
                        transform: isSelected ? 'scale(1.1)' : 'none',
                        boxShadow: isSelected ? '0 0 10px rgba(255,255,255,0.5)' : 'none'
                      }}
                    >
                      {targetPlayer?.name.charAt(0).toUpperCase()}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {validTargets.length < 2 && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Not enough cubes on the board to swap.</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button className="btn-outline" style={{ flex: 1 }} onClick={() => socket.emit('skipAction')}>Skip</button>
        <button className="btn-primary" style={{ flex: 2 }} disabled={!selected1 || !selected2} onClick={handleConfirm}>Confirm Swap</button>
      </div>
    </div>
  );
};

export default ApothecaryAction;

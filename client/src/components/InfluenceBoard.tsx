import React from 'react';
import { ClientGameView } from '@shared/types';
import { AREAS } from '@shared/areas';

interface InfluenceBoardProps {
  view: ClientGameView;
  playerId: string | null;
}

const InfluenceBoard: React.FC<InfluenceBoardProps> = ({ view }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3 style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Influence Board</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        {AREAS.map(area => {
          const areaCubes = view.board.filter(c => c.areaId === area.id);
          
          return (
            <div key={area.id} className="parchment" style={{ padding: '0.5rem', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bg-parchment-dark)', marginBottom: '0.5rem', paddingBottom: '0.2rem' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{area.name}</span>
                <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--color-gold)', color: 'var(--bg-dark)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>{area.bonus}</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(24px, 1fr))', gap: '0.2rem', marginTop: 'auto' }}>
                {Array.from({ length: area.spaces }).map((_, i) => {
                  const cube = areaCubes.find(c => c.spaceIndex === i);
                  const player = cube ? view.players.find(p => p.id === cube.playerId) : null;
                  
                  return (
                    <div 
                      key={i}
                      style={{
                        aspectRatio: '1/1',
                        border: '1px solid var(--color-text-muted)',
                        borderRadius: '2px',
                        backgroundColor: player ? player.color : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        opacity: player ? 1 : 0.2
                      }}
                      title={player ? `${player.name}'s influence` : 'Empty space'}
                    >
                      {player ? player.name.charAt(0).toUpperCase() : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InfluenceBoard;

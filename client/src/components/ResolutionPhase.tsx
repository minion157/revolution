import React from 'react';
import { ClientGameView } from '@shared/types';
import { CHARACTERS } from '@shared/characters';
import SpyAction from './SpyAction';
import ApothecaryAction from './ApothecaryAction';

interface ResolutionPhaseProps {
  view: ClientGameView;
  playerId: string;
}

const ResolutionPhase: React.FC<ResolutionPhaseProps> = ({ view, playerId }) => {
  if (view.pendingAction) {
    if (view.pendingAction.type === 'spy') {
      return <SpyAction view={view} playerId={playerId} />;
    } else if (view.pendingAction.type === 'apothecary') {
      return <ApothecaryAction view={view} playerId={playerId} />;
    }
  }

  const renderBidTokens = (bid: any) => {
    return (
      <div style={{ display: 'flex', gap: '0.2rem' }}>
        {bid.force > 0 && <span className="token force" style={{ width: '16px', height: '16px', fontSize: '0.7rem' }}>{bid.force}</span>}
        {bid.blackmail > 0 && <span className="token blackmail" style={{ width: '16px', height: '16px', fontSize: '0.7rem' }}>{bid.blackmail}</span>}
        {bid.gold > 0 && <span className="token gold" style={{ width: '16px', height: '16px', fontSize: '0.7rem' }}>{bid.gold}</span>}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100%', overflowY: 'auto', paddingRight: '0.5rem' }}>
      <h2 style={{ color: 'var(--color-gold)', textAlign: 'center', marginBottom: '1rem' }}>Resolution</h2>
      
      {CHARACTERS.map((char, index) => {
        const result = view.resolutionResults.find(r => r.characterId === char.id);
        const isCurrent = index === view.resolutionIndex;
        const isResolved = index < view.resolutionIndex;
        const isPending = index > view.resolutionIndex;

        return (
          <div 
            key={char.id} 
            className={`card parchment ${isCurrent ? 'pulse' : ''}`}
            style={{ 
              opacity: isPending ? 0.5 : 1,
              borderLeft: isCurrent ? '4px solid var(--color-gold)' : (result?.winnerId ? `4px solid ${view.players.find(p => p.id === result.winnerId)?.color}` : '4px solid transparent'),
              padding: '0.75rem',
              transition: 'all 0.3s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{char.name}</h3>
              
              {result && (
                <div style={{ fontWeight: 'bold' }}>
                  {result.noBids ? (
                    <span style={{ color: 'var(--color-text-muted)' }}>No Bids</span>
                  ) : result.tied ? (
                    <span style={{ color: 'var(--color-orange)' }}>Tied</span>
                  ) : result.winnerName ? (
                    <span style={{ color: view.players.find(p => p.id === result.winnerId)?.color }}>{result.winnerName} Wins!</span>
                  ) : null}
                </div>
              )}
            </div>

            {result && result.allBids.length > 0 && (
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {result.allBids.map((b, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    <span style={{ color: view.players.find(p => p.id === b.playerId)?.color }}>{b.playerName}</span>
                    {renderBidTokens(b.bid)}
                  </div>
                ))}
              </div>
            )}
            
            {!result && !isPending && (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Resolving...
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ResolutionPhase;

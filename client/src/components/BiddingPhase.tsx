import React, { useState, useMemo } from 'react';
import { ClientGameView, Bid } from '@shared/types';
import { CHARACTERS } from '@shared/characters';
import { socket } from '../socket';
import { GAME_CONFIG } from '@shared/config';

interface BiddingPhaseProps {
  view: ClientGameView;
  playerId: string;
}

const BiddingPhase: React.FC<BiddingPhaseProps> = ({ view, playerId }) => {
  const myPlayer = view.players.find(p => p.id === playerId);
  const myResources = myPlayer?.resources || { force: 0, blackmail: 0, gold: 0 };
  
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);

  const getCharIcon = (id: string) => {
    switch (id) {
      case 'general': return '⚔️';
      case 'captain': return '⚓';
      case 'innkeeper': return '🍺';
      case 'magistrate': return '⚖️';
      case 'priest': return '✝️';
      case 'aristocrat': return '👑';
      case 'merchant': return '💰';
      case 'printer': return '📜';
      case 'rogue': return '🗡️';
      case 'spy': return '🕵️';
      case 'apothecary': return '🧪';
      case 'mercenary': return '💪';
      default: return '👤';
    }
  };

  const getBid = (charId: string) => view.myBids.find(b => b.characterId === charId) || { characterId: charId, force: 0, blackmail: 0, gold: 0 };
  
  const usedResources = useMemo(() => {
    return view.myBids.reduce((acc, bid) => ({
      force: acc.force + bid.force,
      blackmail: acc.blackmail + bid.blackmail,
      gold: acc.gold + bid.gold,
    }), { force: 0, blackmail: 0, gold: 0 });
  }, [view.myBids]);

  const remResources = {
    force: myResources.force - usedResources.force,
    blackmail: myResources.blackmail - usedResources.blackmail,
    gold: myResources.gold - usedResources.gold,
  };

  const allAllocated = remResources.force === 0 && remResources.blackmail === 0 && remResources.gold === 0;
  const numCharactersBid = view.myBids.filter(b => b.force > 0 || b.blackmail > 0 || b.gold > 0).length;
  const isValidNumChars = numCharactersBid <= GAME_CONFIG.MAX_BID_CHARACTERS;

  const handleAdjust = (charId: string, type: 'force' | 'blackmail' | 'gold', delta: number) => {
    if (view.myLocked) return;
    
    const currentBid = getBid(charId);
    const newVal = currentBid[type] + delta;
    
    if (newVal < 0) return;
    if (delta > 0 && remResources[type] < delta) return;
    
    const newBid = { ...currentBid, [type]: newVal };
    socket.emit('placeBid', newBid);
  };

  const handleLock = () => {
    if (allAllocated && isValidNumChars) {
      socket.emit('lockBids');
    }
  };

  if (view.myLocked) {
    return (
      <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-green)' }}>Bids Locked!</h2>
        <p>Waiting for other players...</p>
        <div style={{ marginTop: '2rem' }}>
          {view.lockedPlayerIds.length} / {view.players.length} players ready
        </div>
      </div>
    );
  }

  const selectedCharDef = CHARACTERS.find(c => c.id === selectedCharId);
  const selectedCharBid = selectedCharId ? getBid(selectedCharId) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top: Available Resources */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-around', padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ color: remResources.force > 0 ? 'var(--color-force)' : 'var(--color-text-muted)' }}>Force</span>
          <span className="token force" style={{ fontSize: '1.2rem', width: '32px', height: '32px' }}>{remResources.force}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ color: remResources.blackmail > 0 ? 'var(--color-blackmail)' : 'var(--color-text-muted)' }}>Blackmail</span>
          <span className="token blackmail" style={{ fontSize: '1.2rem', width: '32px', height: '32px' }}>{remResources.blackmail}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ color: remResources.gold > 0 ? 'var(--color-gold)' : 'var(--color-text-muted)' }}>Gold</span>
          <span className="token gold" style={{ fontSize: '1.2rem', width: '32px', height: '32px' }}>{remResources.gold}</span>
        </div>
      </div>

      {/* Center: Character Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
        {CHARACTERS.map(char => {
          const bid = getBid(char.id);
          const hasBid = bid.force > 0 || bid.blackmail > 0 || bid.gold > 0;
          const isSelected = char.id === selectedCharId;
          return (
            <div 
              key={char.id} 
              className={`card parchment ${isSelected ? 'selected' : ''}`}
              style={{ 
                cursor: 'pointer', 
                padding: '0.5rem', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                border: isSelected ? '2px solid var(--color-gold)' : (hasBid ? '2px solid var(--color-blue)' : '1px solid var(--bg-parchment-dark)'),
                transform: isSelected ? 'scale(1.05)' : 'none',
                transition: 'all 0.2s',
                opacity: (numCharactersBid >= GAME_CONFIG.MAX_BID_CHARACTERS && !hasBid) ? 0.5 : 1
              }}
              onClick={() => setSelectedCharId(char.id)}
            >
              <div style={{ fontSize: '2rem' }}>{getCharIcon(char.id)}</div>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'center', margin: '0.2rem 0' }}>{char.name}</div>
              
              <div style={{ display: 'flex', gap: '0.2rem', minHeight: '24px' }}>
                {bid.force > 0 && <span className="token force">{bid.force}</span>}
                {bid.blackmail > 0 && <span className="token blackmail">{bid.blackmail}</span>}
                {bid.gold > 0 && <span className="token gold">{bid.gold}</span>}
              </div>
              
              {char.restrictions.length > 0 && (
                <div style={{ display: 'flex', gap: '0.1rem', marginTop: 'auto', paddingTop: '0.2rem' }}>
                  {char.restrictions.includes('noForce') && <span style={{ fontSize: '0.7rem', color: 'var(--color-force)' }}>No 🔴</span>}
                  {char.restrictions.includes('noBlackmail') && <span style={{ fontSize: '0.7rem', color: 'var(--color-blackmail)' }}>No 🟣</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Sheet: Token Controls */}
      {selectedCharDef && selectedCharBid && (
        <div className="card" style={{ marginTop: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'var(--bg-dark)', borderTop: '2px solid var(--color-gold)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{getCharIcon(selectedCharDef.id)} {selectedCharDef.name}</h3>
            <button className="btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setSelectedCharId(null)}>Close</button>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{selectedCharDef.description}</p>
          
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '0.5rem' }}>
            {['force', 'blackmail', 'gold'].map(type => {
              const rType = type as 'force' | 'blackmail' | 'gold';
              const isRestricted = 
                (type === 'force' && selectedCharDef.restrictions.includes('noForce')) || 
                (type === 'blackmail' && selectedCharDef.restrictions.includes('noBlackmail'));
              
              return (
                <div key={type} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: isRestricted ? 0.3 : 1 }}>
                  <span className={`token ${type}`} style={{ marginBottom: '0.2rem' }}></span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button 
                      className="btn-outline" 
                      style={{ width: '30px', height: '30px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                      disabled={isRestricted || selectedCharBid[rType] === 0}
                      onClick={() => handleAdjust(selectedCharDef.id, rType, -1)}
                    >-</button>
                    <span style={{ fontSize: '1.2rem', width: '20px', textAlign: 'center' }}>{selectedCharBid[rType]}</span>
                    <button 
                      className="btn-outline" 
                      style={{ width: '30px', height: '30px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                      disabled={isRestricted || remResources[rType] === 0}
                      onClick={() => handleAdjust(selectedCharDef.id, rType, 1)}
                    >+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lock Button */}
      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
          <span style={{ color: isValidNumChars ? 'var(--color-text-muted)' : 'var(--color-force)' }}>
            Characters: {numCharactersBid} / {GAME_CONFIG.MAX_BID_CHARACTERS}
          </span>
          {!allAllocated && (
            <span style={{ color: 'var(--color-orange)' }}>
              Unallocated tokens remain
            </span>
          )}
        </div>
        <button 
          className="btn-primary" 
          style={{ width: '100%', padding: '1rem', fontSize: '1.2rem' }}
          disabled={!allAllocated || !isValidNumChars}
          onClick={handleLock}
        >
          Lock Bids
        </button>
      </div>
    </div>
  );
};

export default BiddingPhase;

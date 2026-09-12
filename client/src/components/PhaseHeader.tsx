import React from 'react';
import { ClientGameView } from '@shared/types';

interface PhaseHeaderProps {
  view: ClientGameView;
}

const PhaseHeader: React.FC<PhaseHeaderProps> = ({ view }) => {
  const phases = ['espionage', 'bidding', 'resolution', 'patronage'];
  
  const getPhaseName = (phase: string) => {
    switch (phase) {
      case 'espionage': return 'Espionage';
      case 'bidding': return 'Bidding';
      case 'resolution': return 'Resolution';
      case 'patronage': return 'Patronage';
      case 'gameOver': return 'Game Over';
      default: return phase;
    }
  };
  
  const getPhaseInstruction = (phase: string) => {
    switch (phase) {
      case 'espionage': return "Observe your opponents' resources.";
      case 'bidding': return "Secretly place your bids on characters.";
      case 'resolution': return "Revealing bids and resolving character abilities.";
      case 'patronage': return "Players with less than 5 resources receive gold.";
      case 'gameOver': return "Final scoring.";
      default: return "";
    }
  };

  return (
    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-dark)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '800px', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--color-gold)', margin: 0 }}>Round {view.round}</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flex: 1, justifyContent: 'center', maxWidth: '500px' }}>
          {phases.map(p => (
            <div 
              key={p} 
              style={{ 
                flex: 1, 
                textAlign: 'center', 
                padding: '0.25rem',
                fontSize: '0.8rem',
                fontWeight: view.phase === p ? 'bold' : 'normal',
                color: view.phase === p ? 'var(--bg-dark)' : 'var(--color-text-muted)',
                backgroundColor: view.phase === p ? 'var(--color-gold)' : 'transparent',
                borderBottom: view.phase === p ? 'none' : `2px solid ${phases.indexOf(view.phase) > phases.indexOf(p) ? 'var(--color-gold-dim)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: view.phase === p ? '4px' : '0'
              }}
            >
              {getPhaseName(p)}
            </div>
          ))}
        </div>
      </div>
      <p style={{ marginTop: '0.5rem', fontStyle: 'italic', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
        {getPhaseInstruction(view.phase)}
      </p>
    </div>
  );
};

export default PhaseHeader;

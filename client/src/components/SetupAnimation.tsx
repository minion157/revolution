import React, { useState, useEffect } from 'react';

interface SetupAnimationProps {
  onComplete: () => void;
}

const SetupAnimation: React.FC<SetupAnimationProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  
  const messages = [
    "Welcome to the Revolution.",
    "Spy on your rivals.",
    "Secretly bid for powerful townsfolk.",
    "Gain support and influence.",
    "Control the city before your rivals do."
  ];

  useEffect(() => {
    if (step >= messages.length) {
      const timer = setTimeout(() => {
        onComplete();
      }, 1000);
      return () => clearTimeout(timer);
    }
    
    const timer = setTimeout(() => {
      setStep(prev => prev + 1);
    }, 1500); // 1.5s per line
    
    return () => clearTimeout(timer);
  }, [step, onComplete, messages.length]);

  // Auto-dismiss safety timer (5 seconds total max if they don't click and animation hangs somehow)
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      onComplete();
    }, 8000);
    return () => clearTimeout(safetyTimer);
  }, [onComplete]);

  return (
    <div 
      className="setup-animation-overlay" 
      onClick={onComplete}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        cursor: 'pointer',
        padding: '2rem'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', textAlign: 'center' }}>
        {messages.map((msg, index) => (
          <h2 
            key={index}
            style={{ 
              color: index === messages.length - 1 ? 'var(--color-gold)' : 'white',
              fontSize: index === messages.length - 1 ? '2.5rem' : '1.8rem',
              margin: 0,
              opacity: step >= index ? 1 : 0,
              transform: step >= index ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 1s ease-out, transform 1s ease-out',
              textShadow: index === messages.length - 1 ? '0 0 10px rgba(255, 215, 0, 0.5)' : 'none'
            }}
          >
            {msg}
          </h2>
        ))}
      </div>
      
      <p style={{
        position: 'absolute',
        bottom: '2rem',
        color: 'rgba(255,255,255,0.5)',
        fontStyle: 'italic',
        opacity: step >= 2 ? 1 : 0,
        transition: 'opacity 1s ease-in'
      }}>
        Tap anywhere to skip
      </p>
    </div>
  );
};

export default SetupAnimation;

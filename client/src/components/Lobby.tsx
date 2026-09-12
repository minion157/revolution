import React, { useState } from 'react';
import { socket } from '../socket';
import { LobbyState } from '@shared/types';

interface LobbyProps {
  lobbyState: LobbyState | null;
  playerId: string | null;
  error: string | null;
}

const Lobby: React.FC<LobbyProps> = ({ lobbyState, playerId, error }) => {
  const [name, setName] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      socket.emit('joinGame', { name: name.trim() });
    }
  };

  const myPlayer = lobbyState?.players.find(p => p.id === playerId);
  const isHost = myPlayer?.isHost;
  const isJoined = !!myPlayer;
  
  const allReady = lobbyState?.players.every(p => p.ready);
  const canStart = isHost && allReady && !!lobbyState && lobbyState.players.length >= lobbyState.minPlayers && lobbyState.players.length <= lobbyState.maxPlayers;

  return (
    <div className="lobby-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      <h1 style={{ fontSize: '4rem', color: 'var(--color-gold)', marginBottom: '0.5rem', textAlign: 'center' }}>Revolution!</h1>
      <h2 style={{ fontSize: '1.5rem', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>LAN Board Game</h2>

      {error && <div style={{ color: 'var(--color-force)', marginBottom: '1rem', padding: '0.5rem', backgroundColor: 'rgba(198, 40, 40, 0.1)', borderRadius: '4px' }}>{error}</div>}

      {!isJoined ? (
        <form onSubmit={handleJoin} className="card" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3>Join Game</h3>
          <input 
            type="text" 
            placeholder="Enter your name..." 
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={15}
            required
            autoFocus
          />
          <button type="submit" className="btn-primary" disabled={!name.trim()}>Join</button>
        </form>
      ) : (
        <div className="card" style={{ width: '100%', maxWidth: '600px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Players ({lobbyState?.players.length}/{lobbyState?.maxPlayers})</h3>
            {isHost && (
              <button 
                className="btn-primary" 
                onClick={() => socket.emit('startGame')}
                disabled={!canStart}
              >
                Start Game
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {lobbyState?.players.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', borderLeft: `4px solid ${p.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: p.id === playerId ? 'bold' : 'normal', color: p.color }}>{p.name}</span>
                  {p.isHost && <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--color-gold)', color: 'var(--bg-dark)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>HOST</span>}
                  {p.id === playerId && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>(You)</span>}
                  {!p.connected && <span style={{ fontSize: '0.8rem', color: 'var(--color-force)' }}>(Disconnected)</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ color: p.ready ? 'var(--color-green)' : 'var(--color-text-muted)' }}>
                    {p.ready ? '✓ Ready' : 'Waiting...'}
                  </span>
                  {isHost && p.id !== playerId && (
                    <button className="btn-danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => socket.emit('kickPlayer', { playerId: p.id })}>
                      Kick
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
            <button 
              className={myPlayer.ready ? "btn-outline" : "btn-primary"}
              onClick={() => myPlayer.ready ? socket.emit('unready') : socket.emit('ready')}
              style={{ minWidth: '150px' }}
            >
              {myPlayer.ready ? 'Unready' : 'I am Ready'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lobby;

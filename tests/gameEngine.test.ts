import { describe, it, expect } from 'vitest';
import * as engine from '../server/gameEngine';
import { CHARACTERS } from '../shared/characters';
import { AREAS } from '../shared/areas';
import { GAME_CONFIG } from '../shared/config';
import { Bid } from '../shared/types';

function createGameWithPlayers(n: number) {
  let state = engine.createGame('test');
  const players = [];
  for (let i = 0; i < n; i++) {
    const result = engine.addPlayer(state, `Player${i+1}`, `token${i+1}`);
    state = result.state;
    players.push(result.player);
  }
  return { state, players };
}

function startedGame(n: number) {
  const { state, players } = createGameWithPlayers(n);
  // Mark all ready
  let s = state;
  for (const p of s.players) {
    s = { ...s, players: s.players.map(pl => pl.id === p.id ? { ...pl, ready: true } : pl) };
  }
  s = engine.startGame(s);
  return { state: s, players: s.players };
}

describe('Game Engine', () => {
  describe('Game Setup', () => {
    it('Starting resources are correct (1F, 1B, 3G)', () => {
      const { state, players } = startedGame(3);
      expect(state.players[0].resources).toEqual({ force: 1, blackmail: 1, gold: 3 });
    });

    it('3-player game setup works', () => {
      const { state, players } = startedGame(3);
      expect(state.players.length).toBe(3);
      expect(state.phase).toBe('espionage');
    });

    it('4-player game setup works', () => {
      const { state, players } = startedGame(4);
      expect(state.players.length).toBe(4);
    });

    it('Players get different colors', () => {
      const { state } = startedGame(4);
      const colors = state.players.map(p => p.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(4);
    });

    it('First player is host', () => {
      const { state } = createGameWithPlayers(3);
      expect(state.players[0].isHost).toBe(true);
      expect(state.players[1].isHost).toBe(false);
    });
  });

  describe('Bid Validation', () => {
    it('Illegal Force bids (noForce characters: General, Captain, Rogue, Spy, Apothecary)', () => {
      const { state, players } = startedGame(3);
      const s = engine.beginBidding(state);
      const pId = players[0].id;
      
      const noForceCharacters = ['general', 'captain', 'rogue', 'spy', 'apothecary'];
      for (const charId of noForceCharacters) {
        const result = engine.validateBid(s, pId, charId, 1, 0, 0);
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/cannot bid Force/i);
      }
    });

    it('Illegal Blackmail bids (noBlackmail characters: Innkeeper, Magistrate, Mercenary)', () => {
      const { state, players } = startedGame(3);
      const s = engine.beginBidding(state);
      const pId = players[0].id;
      
      const noBlackmailCharacters = ['innkeeper', 'magistrate', 'mercenary'];
      for (const charId of noBlackmailCharacters) {
        const result = engine.validateBid(s, pId, charId, 0, 1, 0);
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/cannot bid Blackmail/i);
      }
    });

    it('Maximum 6 character limit', () => {
      const { state, players } = startedGame(3);
      let s = engine.beginBidding(state);
      const pId = players[0].id;
      s.players[0].resources = { force: 10, blackmail: 10, gold: 10 };
      
      // place 6 valid bids
      const charsToBid = ['priest', 'aristocrat', 'merchant', 'printer', 'rogue', 'mercenary'];
      for (const c of charsToBid) {
        s = engine.placeBid(s, pId, c, 0, 0, 1);
      }
      
      const result = engine.validateBid(s, pId, 'general', 0, 0, 1);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/maximum/i);
    });

    it('Must allocate all resources to lock', () => {
      const { state, players } = startedGame(3);
      let s = engine.beginBidding(state);
      const pId = players[0].id;
      
      s = engine.placeBid(s, pId, 'priest', 1, 0, 0); // Need to place 1F, 1B, 3G
      const res = engine.validateAllBids(s, pId);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/use all available tokens/i);
    });

    it('Can\'t bid 0 tokens', () => {
      const { state, players } = startedGame(3);
      const s = engine.beginBidding(state);
      const result = engine.validateBid(s, players[0].id, 'priest', 0, 0, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/at least one token/i);
    });

    it('Can\'t exceed available resources', () => {
      const { state, players } = startedGame(3);
      const s = engine.beginBidding(state);
      const result = engine.validateBid(s, players[0].id, 'priest', 2, 0, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Not enough/i);
    });
  });

  describe('Bid Comparison', () => {
    it('Force beats Blackmail', () => {
      const b1: Bid = { characterId: 'c', force: 1, blackmail: 0, gold: 0 };
      const b2: Bid = { characterId: 'c', force: 0, blackmail: 1, gold: 0 };
      expect(engine.compareBids(b1, b2)).toBeLessThan(0); // b1 wins
    });

    it('Force beats Gold', () => {
      const b1: Bid = { characterId: 'c', force: 1, blackmail: 0, gold: 0 };
      const b2: Bid = { characterId: 'c', force: 0, blackmail: 0, gold: 1 };
      expect(engine.compareBids(b1, b2)).toBeLessThan(0);
    });

    it('Blackmail beats Gold', () => {
      const b1: Bid = { characterId: 'c', force: 0, blackmail: 1, gold: 0 };
      const b2: Bid = { characterId: 'c', force: 0, blackmail: 0, gold: 1 };
      expect(engine.compareBids(b1, b2)).toBeLessThan(0);
    });

    it('1 Force beats 10 Blackmail (hierarchy test)', () => {
      const b1: Bid = { characterId: 'c', force: 1, blackmail: 0, gold: 0 };
      const b2: Bid = { characterId: 'c', force: 0, blackmail: 10, gold: 0 };
      expect(engine.compareBids(b1, b2)).toBeLessThan(0);
    });

    it('1 Blackmail beats 10 Gold (hierarchy test)', () => {
      const b1: Bid = { characterId: 'c', force: 0, blackmail: 1, gold: 0 };
      const b2: Bid = { characterId: 'c', force: 0, blackmail: 0, gold: 10 };
      expect(engine.compareBids(b1, b2)).toBeLessThan(0);
    });

    it('Multiple Force comparison (2F > 1F)', () => {
      const b1: Bid = { characterId: 'c', force: 2, blackmail: 0, gold: 0 };
      const b2: Bid = { characterId: 'c', force: 1, blackmail: 5, gold: 5 };
      expect(engine.compareBids(b1, b2)).toBeLessThan(0);
    });

    it('Multiple Blackmail comparison (2B > 1B)', () => {
      const b1: Bid = { characterId: 'c', force: 0, blackmail: 2, gold: 0 };
      const b2: Bid = { characterId: 'c', force: 0, blackmail: 1, gold: 10 };
      expect(engine.compareBids(b1, b2)).toBeLessThan(0);
    });

    it('Tie detection (same bids)', () => {
      const b1: Bid = { characterId: 'c', force: 1, blackmail: 1, gold: 1 };
      const b2: Bid = { characterId: 'c', force: 1, blackmail: 1, gold: 1 };
      expect(engine.compareBids(b1, b2)).toBe(0);
    });

    it('Mixed bids comparison', () => {
      const b1: Bid = { characterId: 'c', force: 1, blackmail: 2, gold: 0 };
      const b2: Bid = { characterId: 'c', force: 1, blackmail: 1, gold: 5 };
      // same force, b1 has more blackmail
      expect(engine.compareBids(b1, b2)).toBeLessThan(0);
    });
  });

  describe('Resolution', () => {
    it('Correct resolution order (General first, Mercenary last)', () => {
      expect(CHARACTERS[0].id).toBe('general');
      expect(CHARACTERS[CHARACTERS.length - 1].id).toBe('mercenary');
    });

    it('Tie results in no winner', () => {
      const { state, players } = startedGame(3);
      let s = engine.beginBidding(state);
      s = engine.placeBid(s, players[0].id, 'priest', 1, 0, 0);
      s = engine.placeBid(s, players[1].id, 'priest', 1, 0, 0);
      s = engine.beginResolution(s);
      
      s.resolutionIndex = CHARACTERS.findIndex(c => c.id === 'priest');
      const nextS = engine.resolveCurrentCharacter(s);
      const res = nextS!.resolutionResults[nextS!.resolutionResults.length - 1];
      
      expect(res.tied).toBe(true);
      expect(res.winnerId).toBe(null);
    });

    it('Single bidder wins', () => {
      const { state, players } = startedGame(3);
      let s = engine.beginBidding(state);
      s = engine.placeBid(s, players[0].id, 'priest', 1, 0, 0);
      s = engine.beginResolution(s);
      
      s.resolutionIndex = CHARACTERS.findIndex(c => c.id === 'priest');
      const nextS = engine.resolveCurrentCharacter(s);
      const res = nextS!.resolutionResults[nextS!.resolutionResults.length - 1];
      
      expect(res.winnerId).toBe(players[0].id);
    });

    it('Earned resources retained and spent resources consumed', () => {
      const { state, players } = startedGame(3);
      let s = engine.beginBidding(state);
      // Give initial state
      s.players[0].resources = { force: 2, blackmail: 2, gold: 2 };
      
      s = engine.placeBid(s, players[0].id, 'priest', 1, 0, 0);
      s = engine.beginResolution(s);
      
      s.resolutionIndex = CHARACTERS.findIndex(c => c.id === 'priest');
      const nextS = engine.resolveCurrentCharacter(s);
      // Priest gives 3 support.
      expect(nextS!.players[0].support).toBe(3);
      // Spent 1 force.
      expect(nextS!.players[0].resources.force).toBe(1);
    });

    it('Influence placed correctly', () => {
      const { state, players } = startedGame(3);
      let s = engine.beginBidding(state);
      s = engine.placeBid(s, players[0].id, 'general', 0, 1, 0); // 1 Blackmail
      s = engine.beginResolution(s);
      
      s.resolutionIndex = CHARACTERS.findIndex(c => c.id === 'general');
      const nextS = engine.resolveCurrentCharacter(s);
      
      expect(nextS!.board.length).toBe(1);
      expect(nextS!.board[0].playerId).toBe(players[0].id);
      expect(nextS!.board[0].areaId).toBe('fortress');
    });

    it('Full area prevents placement', () => {
      const { state, players } = startedGame(3);
      let s = engine.beginBidding(state);
      // fill fortress
      const area = AREAS.find(a => a.id === 'fortress')!;
      for (let i = 0; i < area.spaces; i++) {
        s.board.push({ areaId: 'fortress', spaceIndex: i, playerId: players[1].id });
      }
      
      s = engine.placeBid(s, players[0].id, 'general', 0, 1, 0);
      s = engine.beginResolution(s);
      s.resolutionIndex = CHARACTERS.findIndex(c => c.id === 'general');
      
      const nextS = engine.resolveCurrentCharacter(s);
      expect(nextS!.board.filter(c => c.playerId === players[0].id).length).toBe(0); // couldn't place
    });
  });

  describe('Patronage', () => {
    it('Gives Gold up to 5 total resources', () => {
      const { state, players } = startedGame(3);
      let s = state;
      s.players[0].resources = { force: 0, blackmail: 0, gold: 0 };
      s.players[1].resources = { force: 1, blackmail: 1, gold: 1 };
      
      s = engine.runPatronage(s);
      expect(s.players[0].resources.gold).toBe(5);
      expect(s.players[1].resources.gold).toBe(3); // 1+1+1 + 2 = 5
    });

    it('Doesn\'t give if already >= 5', () => {
      const { state, players } = startedGame(3);
      let s = state;
      s.players[0].resources = { force: 2, blackmail: 2, gold: 2 };
      
      s = engine.runPatronage(s);
      expect(s.players[0].resources.gold).toBe(2);
    });

    it('Only gives Gold, not Force or Blackmail', () => {
      const { state, players } = startedGame(3);
      let s = state;
      s.players[0].resources = { force: 0, blackmail: 0, gold: 0 };
      
      s = engine.runPatronage(s);
      expect(s.players[0].resources.force).toBe(0);
      expect(s.players[0].resources.blackmail).toBe(0);
    });
  });

  describe('Special Abilities', () => {
    it('Spy replaces opponent cube', () => {
      const { state, players } = startedGame(3);
      let s = state;
      s.board.push({ areaId: 'fortress', spaceIndex: 0, playerId: players[1].id });
      
      s.pendingAction = { type: 'spy', playerId: players[0].id, characterId: 'spy' };
      const res = engine.executeSpy(s, players[0].id, 'fortress', 0);
      expect(res.success).toBe(true);
      expect(res.state.board[0].playerId).toBe(players[0].id);
    });

    it('Spy can\'t target own cube', () => {
      const { state, players } = startedGame(3);
      let s = state;
      s.board.push({ areaId: 'fortress', spaceIndex: 0, playerId: players[0].id });
      
      s.pendingAction = { type: 'spy', playerId: players[0].id, characterId: 'spy' };
      const res = engine.executeSpy(s, players[0].id, 'fortress', 0);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/own/);
    });

    it('Apothecary swaps two cubes', () => {
      const { state, players } = startedGame(3);
      let s = state;
      s.board.push({ areaId: 'fortress', spaceIndex: 0, playerId: players[1].id });
      s.board.push({ areaId: 'harbor', spaceIndex: 0, playerId: players[2].id });
      
      s.pendingAction = { type: 'apothecary', playerId: players[0].id, characterId: 'apothecary' };
      const res = engine.executeApothecary(s, players[0].id, { areaId: 'fortress', spaceIndex: 0 }, { areaId: 'harbor', spaceIndex: 0 });
      expect(res.success).toBe(true);
      expect(res.state.board.find(c => c.areaId === 'fortress')!.playerId).toBe(players[2].id);
      expect(res.state.board.find(c => c.areaId === 'harbor')!.playerId).toBe(players[1].id);
    });

    it('Skip action works', () => {
      const { state, players } = startedGame(3);
      let s = state;
      s.pendingAction = { type: 'spy', playerId: players[0].id, characterId: 'spy' };
      s.resolutionIndex = 0;
      
      const res = engine.skipAction(s, players[0].id);
      expect(res.pendingAction).toBe(null);
      expect(res.resolutionIndex).toBe(1);
    });
  });

  describe('End Game', () => {
    it('Game ends when board is full', () => {
      const { state, players } = startedGame(3);
      let s = state;
      
      expect(engine.checkGameEnd(s)).toBe(false);
      
      for (const area of AREAS) {
        for (let i = 0; i < area.spaces; i++) {
          s.board.push({ areaId: area.id, spaceIndex: i, playerId: players[0].id });
        }
      }
      expect(engine.checkGameEnd(s)).toBe(true);
    });

    it('Final resource scoring (F=5, B=3, G=1)', () => {
      const { state, players } = startedGame(3);
      let s = state;
      s.players[0].resources = { force: 1, blackmail: 1, gold: 1 };
      
      const scores = engine.calculateFinalScores(s);
      const score = scores.find(sc => sc.playerId === players[0].id);
      expect(score!.forceValue).toBe(5);
      expect(score!.blackmailValue).toBe(3);
      expect(score!.goldValue).toBe(1);
    });

    it('Area majority bonus', () => {
      const { state, players } = startedGame(3);
      let s = state;
      
      s.board.push({ areaId: 'fortress', spaceIndex: 0, playerId: players[0].id });
      s.board.push({ areaId: 'fortress', spaceIndex: 1, playerId: players[0].id });
      s.board.push({ areaId: 'fortress', spaceIndex: 2, playerId: players[1].id });
      
      const scores = engine.calculateFinalScores(s);
      const p1Score = scores.find(sc => sc.playerId === players[0].id);
      const bonus = AREAS.find(a => a.id === 'fortress')!.bonus;
      
      expect(p1Score!.totalAreaBonus).toBe(bonus);
    });

    it('Tied area = no bonus', () => {
      const { state, players } = startedGame(3);
      let s = state;
      
      s.board.push({ areaId: 'fortress', spaceIndex: 0, playerId: players[0].id });
      s.board.push({ areaId: 'fortress', spaceIndex: 1, playerId: players[1].id });
      
      const scores = engine.calculateFinalScores(s);
      const p1Score = scores.find(sc => sc.playerId === players[0].id);
      const p2Score = scores.find(sc => sc.playerId === players[1].id);
      
      expect(p1Score!.totalAreaBonus).toBe(0);
      expect(p2Score!.totalAreaBonus).toBe(0);
    });
  });

  describe('Hidden Information', () => {
    it('getClientView doesn\'t expose other players\' bids', () => {
      const { state, players } = startedGame(3);
      let s = engine.beginBidding(state);
      
      s = engine.placeBid(s, players[0].id, 'priest', 1, 0, 0);
      s = engine.placeBid(s, players[1].id, 'general', 0, 1, 0);
      
      const view0 = engine.getClientView(s, players[0].id);
      expect(view0.myBids.length).toBe(1);
      expect(view0.myBids[0].characterId).toBe('priest');
      
      // Should not contain player 1's bid
      const generalBid = view0.myBids.find(b => b.characterId === 'general');
      expect(generalBid).toBeUndefined();
    });

    it('Each player only sees their own bids', () => {
      const { state, players } = startedGame(3);
      let s = engine.beginBidding(state);
      
      s = engine.placeBid(s, players[0].id, 'priest', 1, 0, 0);
      s = engine.placeBid(s, players[1].id, 'general', 0, 1, 0);
      
      const view1 = engine.getClientView(s, players[1].id);
      expect(view1.myBids.length).toBe(1);
      expect(view1.myBids[0].characterId).toBe('general');
    });
  });
});

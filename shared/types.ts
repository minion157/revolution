// Resource types
export type ResourceType = 'force' | 'blackmail' | 'gold';

export interface Resources {
  force: number;
  blackmail: number;
  gold: number;
}

// Restriction on what tokens can be used to bid
export type BidRestriction = 'noForce' | 'noBlackmail';

// Character reward types
export interface CharacterReward {
  support?: number;
  force?: number;
  blackmail?: number;
  gold?: number;
  influence?: string; // area id
}

// Special abilities
export type AbilityType = 'none' | 'spy' | 'apothecary';

export interface CharacterDef {
  id: string;
  name: string;
  row: number;
  column: number;
  restrictions: BidRestriction[];
  rewards: CharacterReward;
  ability: AbilityType;
  description: string;
}

export interface AreaDef {
  id: string;
  name: string;
  spaces: number; // number of influence spaces
  bonus: number; // end-game area control bonus
}

export type GamePhase = 'lobby' | 'espionage' | 'bidding' | 'resolution' | 'patronage' | 'gameOver';

export interface Bid {
  characterId: string;
  force: number;
  blackmail: number;
  gold: number;
}

export interface PlayerBids {
  playerId: string;
  bids: Bid[];
  locked: boolean;
}

export interface InfluenceCube {
  areaId: string;
  spaceIndex: number;
  playerId: string;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  colorName: string;
  connected: boolean;
  isHost: boolean;
  support: number;
  resources: Resources;
  ready: boolean;
  sessionToken: string;
}

// What a player sees of another player (no secrets)
export interface PublicPlayer {
  id: string;
  name: string;
  color: string;
  colorName: string;
  connected: boolean;
  isHost: boolean;
  support: number;
  resources: Resources;
  ready: boolean;
}

export interface GameState {
  gameId: string;
  phase: GamePhase;
  round: number;
  players: Player[];
  board: InfluenceCube[];
  bids: Map<string, Bid[]>; // playerId -> bids (server only)
  lockedPlayers: Set<string>;
  resolutionIndex: number;
  resolutionResults: ResolutionResult[];
  gameLog: GameLogEntry[];
  winner: string | null;
  started: boolean;
  finished: boolean;
  pendingAction: PendingAction | null;
}

export interface ResolutionResult {
  characterId: string;
  characterName: string;
  winnerId: string | null;
  winnerName: string | null;
  allBids: { playerId: string; playerName: string; bid: Bid }[];
  tied: boolean;
  noBids: boolean;
}

export interface PendingAction {
  type: 'spy' | 'apothecary';
  playerId: string;
  characterId: string;
}

export interface GameLogEntry {
  round: number;
  phase: GamePhase;
  message: string;
  type: 'info' | 'action' | 'reward' | 'resolution' | 'phase' | 'system';
  playerId?: string;
  timestamp: number;
}

// Client-safe game view (no hidden info)
export interface ClientGameView {
  gameId: string;
  phase: GamePhase;
  round: number;
  players: PublicPlayer[];
  board: InfluenceCube[];
  myBids: Bid[];
  myLocked: boolean;
  allLocked: boolean;
  lockedPlayerIds: string[];
  resolutionIndex: number;
  resolutionResults: ResolutionResult[];
  gameLog: GameLogEntry[];
  winner: string | null;
  started: boolean;
  finished: boolean;
  pendingAction: PendingAction | null;
  finalScores?: FinalScore[];
}

export interface FinalScore {
  playerId: string;
  playerName: string;
  color: string;
  currentSupport: number;
  forceValue: number;
  blackmailValue: number;
  goldValue: number;
  areaBonuses: { areaId: string; areaName: string; bonus: number }[];
  totalAreaBonus: number;
  finalSupport: number;
}

// Socket events
export interface ServerToClientEvents {
  gameView: (view: ClientGameView) => void;
  error: (message: string) => void;
  lobbyUpdate: (lobby: LobbyState) => void;
  joinedGame: (data: { playerId: string; sessionToken: string }) => void;
  kicked: () => void;
  setupAnimation: () => void;
}

export interface ClientToServerEvents {
  joinGame: (data: { name: string; sessionToken?: string }) => void;
  ready: () => void;
  unready: () => void;
  startGame: () => void;
  placeBid: (data: { characterId: string; force: number; blackmail: number; gold: number }) => void;
  clearBid: (data: { characterId: string }) => void;
  lockBids: () => void;
  spyAction: (data: { targetAreaId: string; targetSpaceIndex: number }) => void;
  apothecaryAction: (data: { space1: { areaId: string; spaceIndex: number }; space2: { areaId: string; spaceIndex: number } }) => void;
  skipAction: () => void;
  continueFromPatronage: () => void;
  restartGame: () => void;
  returnToLobby: () => void;
  kickPlayer: (data: { playerId: string }) => void;
  reconnect: (data: { sessionToken: string }) => void;
}

export interface LobbyState {
  players: PublicPlayer[];
  maxPlayers: number;
  minPlayers: number;
  gameStarted: boolean;
}

export const PLAYER_COLORS = [
  { color: '#C62828', name: 'Red', pattern: 'solid' },
  { color: '#1565C0', name: 'Blue', pattern: 'striped' },
  { color: '#2E7D32', name: 'Green', pattern: 'dotted' },
  { color: '#F57F17', name: 'Gold', pattern: 'checkered' },
] as const;

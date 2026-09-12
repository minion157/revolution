import { CharacterDef } from './types';

export const CHARACTERS: CharacterDef[] = [
  // Row 1
  {
    id: 'general',
    name: 'General',
    row: 1,
    column: 1,
    restrictions: ['noForce'],
    rewards: { support: 1, force: 1, influence: 'fortress' },
    ability: 'none',
    description: '1 Support, 1 Force, 1 influence in Fortress. No Force bids allowed.'
  },
  {
    id: 'captain',
    name: 'Captain',
    row: 1,
    column: 2,
    restrictions: ['noForce'],
    rewards: { support: 1, force: 1, influence: 'harbor' },
    ability: 'none',
    description: '1 Support, 1 Force, 1 influence in Harbor. No Force bids allowed.'
  },
  {
    id: 'innkeeper',
    name: 'Innkeeper',
    row: 1,
    column: 3,
    restrictions: ['noBlackmail'],
    rewards: { support: 1, blackmail: 1, influence: 'tavern' },
    ability: 'none',
    description: '1 Support, 1 Blackmail, 1 influence in Tavern. No Blackmail bids allowed.'
  },
  {
    id: 'magistrate',
    name: 'Magistrate',
    row: 1,
    column: 4,
    restrictions: ['noBlackmail'],
    rewards: { support: 1, blackmail: 1, influence: 'townHall' },
    ability: 'none',
    description: '1 Support, 1 Blackmail, 1 influence in Town Hall. No Blackmail bids allowed.'
  },
  {
    id: 'priest',
    name: 'Priest',
    row: 1,
    column: 5,
    restrictions: [],
    rewards: { support: 3, influence: 'cathedral' },
    ability: 'none',
    description: '3 Support, 1 influence in Cathedral. No restrictions.'
  },
  {
    id: 'aristocrat',
    name: 'Aristocrat',
    row: 1,
    column: 6,
    restrictions: [],
    rewards: { support: 5, gold: 3, influence: 'plantation' },
    ability: 'none',
    description: '5 Support, 3 Gold, 1 influence in Plantation. No restrictions.'
  },
  // Row 2
  {
    id: 'merchant',
    name: 'Merchant',
    row: 2,
    column: 1,
    restrictions: [],
    rewards: { support: 3, gold: 5, influence: 'market' },
    ability: 'none',
    description: '3 Support, 5 Gold, 1 influence in Market. No restrictions.'
  },
  {
    id: 'printer',
    name: 'Printer',
    row: 2,
    column: 2,
    restrictions: [],
    rewards: { support: 10 },
    ability: 'none',
    description: '10 Support. No restrictions. No influence.'
  },
  {
    id: 'rogue',
    name: 'Rogue',
    row: 2,
    column: 3,
    restrictions: ['noForce'],
    rewards: { support: 0, blackmail: 1 },
    ability: 'none',
    description: '0 Support, 1 Blackmail. No Force bids allowed. No influence.'
  },
  {
    id: 'spy',
    name: 'Spy',
    row: 2,
    column: 4,
    restrictions: ['noForce'],
    rewards: { support: 0 },
    ability: 'spy',
    description: '0 Support. Spy ability (replace one opponent\'s cube). No Force bids allowed. No influence directly.'
  },
  {
    id: 'apothecary',
    name: 'Apothecary',
    row: 2,
    column: 5,
    restrictions: ['noForce'],
    rewards: { support: 0 },
    ability: 'apothecary',
    description: '0 Support. Apothecary ability (swap cubes in two spaces). No Force bids allowed. No influence directly.'
  },
  {
    id: 'mercenary',
    name: 'Mercenary',
    row: 2,
    column: 6,
    restrictions: ['noBlackmail'],
    rewards: { support: 1, force: 1 },
    ability: 'none',
    description: '1 Support, 1 Force. No Blackmail bids allowed. No influence.'
  }
];

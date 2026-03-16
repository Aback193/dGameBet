export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ?? '0x0000000000000000000000000000000000000000') as `0x${string}`;

export const BET_FACTORY_ABI = [
  {
    type: 'function',
    name: 'createMatch',
    inputs: [
      { name: 'teamA', type: 'string' },
      { name: 'teamB', type: 'string' },
      { name: 'matchStartTime', type: 'uint256' },
      { name: 'betAmount', type: 'uint256' },
    ],
    outputs: [{ name: 'matchContract', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getActiveMatches',
    inputs: [],
    outputs: [
      {
        name: 'activeMatches',
        type: 'tuple[]',
        components: [
          { name: 'matchContract', type: 'address' },
          { name: 'organizer', type: 'address' },
          { name: 'teamA', type: 'string' },
          { name: 'teamB', type: 'string' },
          { name: 'matchStartTime', type: 'uint256' },
          { name: 'betAmount', type: 'uint256' },
          { name: 'isCompleted', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCompletedMatches',
    inputs: [],
    outputs: [
      {
        name: 'completedMatches',
        type: 'tuple[]',
        components: [
          { name: 'matchContract', type: 'address' },
          { name: 'organizer', type: 'address' },
          { name: 'teamA', type: 'string' },
          { name: 'teamB', type: 'string' },
          { name: 'matchStartTime', type: 'uint256' },
          { name: 'betAmount', type: 'uint256' },
          { name: 'isCompleted', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAllMatches',
    inputs: [],
    outputs: [
      {
        name: 'allMatches',
        type: 'tuple[]',
        components: [
          { name: 'matchContract', type: 'address' },
          { name: 'organizer', type: 'address' },
          { name: 'teamA', type: 'string' },
          { name: 'teamB', type: 'string' },
          { name: 'matchStartTime', type: 'uint256' },
          { name: 'betAmount', type: 'uint256' },
          { name: 'isCompleted', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMatchCount',
    inputs: [],
    outputs: [{ name: 'count', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMatch',
    inputs: [{ name: 'matchId', type: 'uint256' }],
    outputs: [
      {
        name: 'info',
        type: 'tuple',
        components: [
          { name: 'matchContract', type: 'address' },
          { name: 'organizer', type: 'address' },
          { name: 'teamA', type: 'string' },
          { name: 'teamB', type: 'string' },
          { name: 'matchStartTime', type: 'uint256' },
          { name: 'betAmount', type: 'uint256' },
          { name: 'isCompleted', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'rateOrganizer',
    inputs: [
      { name: 'matchId', type: 'uint256' },
      { name: 'rating', type: 'uint8' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getOrganizerRating',
    inputs: [{ name: 'organizer', type: 'address' }],
    outputs: [
      { name: 'average', type: 'uint256' },
      { name: 'count', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'deployBlock',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'hasRated',
    inputs: [
      { name: '', type: 'address' },
      { name: '', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'MatchCreated',
    inputs: [
      { name: 'matchId', type: 'uint256', indexed: true },
      { name: 'matchContract', type: 'address', indexed: true },
      { name: 'organizer', type: 'address', indexed: true },
      { name: 'teamA', type: 'string', indexed: false },
      { name: 'teamB', type: 'string', indexed: false },
      { name: 'matchStartTime', type: 'uint256', indexed: false },
      { name: 'betAmount', type: 'uint256', indexed: false },
    ],
  },
] as const;

export const BET_MATCH_ABI = [
  {
    type: 'function',
    name: 'placeBet',
    inputs: [{ name: 'team', type: 'uint8' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'setResult',
    inputs: [{ name: '_result', type: 'uint8' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimPrize',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimRefund',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getMatchInfo',
    inputs: [],
    outputs: [
      { name: '_organizer', type: 'address' },
      { name: '_teamA', type: 'string' },
      { name: '_teamB', type: 'string' },
      { name: '_matchStartTime', type: 'uint256' },
      { name: '_betAmount', type: 'uint256' },
      { name: '_result', type: 'uint8' },
      { name: '_totalPoolTeamA', type: 'uint256' },
      { name: '_totalPoolTeamB', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getUserBets',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'teamABets', type: 'uint256' },
      { name: 'teamBBets', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'calculatePrize',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: 'prize', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'organizer',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'matchId',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'result',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'hasClaimed',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'BetPlaced',
    inputs: [
      { name: 'bettor', type: 'address', indexed: true },
      { name: 'team', type: 'uint8', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ResultSet',
    inputs: [{ name: 'result', type: 'uint8', indexed: false }],
  },
  {
    type: 'event',
    name: 'PrizeClaimed',
    inputs: [
      { name: 'winner', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'RefundClaimed',
    inputs: [
      { name: 'bettor', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'OrganizerPaid',
    inputs: [
      { name: 'organizer', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'OrganizerPaymentFailed',
    inputs: [
      { name: 'organizer', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

export interface Match {
  contractAddress: string;
  organizer: string;
  teamA: string;
  teamB: string;
  matchStartTime: bigint;
  betAmount: bigint;
  isCompleted: boolean;
}

export interface MatchInfo {
  organizer: string;
  teamA: string;
  teamB: string;
  matchStartTime: bigint;
  betAmount: bigint;
  result: number;
  totalPoolTeamA: bigint;
  totalPoolTeamB: bigint;
}

export enum MatchResult {
  Pending = 0,
  TeamAWins = 1,
  TeamBWins = 2,
  Draw = 3,
}

export enum Team {
  TeamA = 0,
  TeamB = 1,
}

export type BetOutcome = 'won' | 'lost' | 'draw' | 'pending';

export interface UserBetMatch {
  contractAddress: string;
  organizer: string;
  teamA: string;
  teamB: string;
  matchStartTime: bigint;
  betAmount: bigint;
  isCompleted: boolean;
  /** viem decodes Solidity uint8 as number; compare with MatchResult enum values */
  result: number;
  teamABet: bigint;
  teamBBet: bigint;
  totalPoolTeamA: bigint;
  totalPoolTeamB: bigint;
  prize: bigint;
  hasClaimed: boolean;
  outcome: BetOutcome;
}

export interface PortfolioEntry {
  contractAddress: string;
  teamA: string;
  teamB: string;
  matchStartTime: number;
  wagered: bigint;
  /** ETH actually received back (only counted after claiming) */
  returned: bigint;
  /** ETH entitled but not yet claimed on-chain */
  unclaimed: bigint;
  netPnL: bigint;
  outcome: 'won' | 'lost' | 'draw';
  hasClaimed: boolean;
  /** Organizer fee earned on this match (non-zero when user is the organizer) */
  organizerFeeOffset: bigint;
  /** Total gas spent on this match (bet placement + claim), 0n if unknown */
  gasCost: bigint;
}

export interface PortfolioChartPoint {
  date: number;
  label: string;
  cumulativePnL: number;
}

export interface PortfolioSummary {
  totalBets: number;
  wins: number;
  losses: number;
  draws: number;
  totalWagered: bigint;
  totalReturned: bigint;
  /** Prizes / refunds entitled but not yet claimed */
  totalUnclaimed: bigint;
  totalPnL: bigint;
  /** Realized net position: only counts claimed returns + organizer fees - gas */
  netPosition: bigint;
  winRate: string;
}

export interface OrganizerEarnings {
  totalFees: bigint;
  matchCount: number;
  feePerMatch: OrganizerFeeEntry[];
}

export interface OrganizerFeeEntry {
  contractAddress: string;
  teamA: string;
  teamB: string;
  totalPool: bigint;
  fee: bigint;
}

/** Discriminator for each kind of on-chain money-flow event */
export type MoneyFlowType =
  | 'create_match'
  | 'place_bet'
  | 'set_result'
  | 'organizer_fee'
  | 'organizer_fee_failed'
  | 'claim_prize'
  | 'claim_refund';

/** Single chronological entry in the money-flow timeline */
export interface MoneyFlowEntry {
  /** Unique key for React rendering: `${txHash}-${logIndex}` */
  id: string;
  /** Transaction hash on-chain */
  txHash: `0x${string}`;
  /** Block number for ordering */
  blockNumber: bigint;
  /** Log index within the block (for sub-block ordering) */
  logIndex: number;
  /** Block timestamp (unix seconds) for display */
  timestamp: number;
  /** Type of event */
  type: MoneyFlowType;
  /**
   * BetMatch contract address for ALL types (including create_match).
   * For create_match: use the `matchContract` field from the MatchCreated event args,
   * NOT the Factory address. This ensures the matchLabelMap lookup works consistently.
   */
  contractAddress: string;
  /** Match label */
  teamA: string;
  teamB: string;
  /**
   * Optional detail string for contextual display.
   * For place_bet: the name of the team bet on (e.g. "Real Madrid").
   * For other types: undefined.
   */
  detail?: string;
  /**
   * Net ETH value transferred (positive = money in, negative = money out).
   * For place_bet: negative (the bet amount sent to the contract).
   * For claim_prize: positive (prize received).
   * For create_match: 0n (no value, only gas).
   * For set_result: 0n (gas out, but organizer_fee is a separate entry).
   * For organizer_fee: positive (fee received by organizer).
   * For organizer_fee_failed: 0n (transfer failed, nothing received).
   * For claim_refund: positive (refund received).
   *
   * NOTE: BetPlaced.amount is uint256 (always positive on-chain).
   * The mapping code MUST negate it when assigning to this field.
   */
  value: bigint;
  /** Gas cost in wei (always positive, always money-out) */
  gasCost: bigint;
  /**
   * Net cash impact of this event: value - gasCost.
   * Negative means money left the wallet. Positive means money entered.
   */
  netImpact: bigint;
}

/** Summary computed from the full timeline */
export interface MoneyFlowSummary {
  /** Sum of all gasCost fields across all entries */
  totalGasSpent: bigint;
  /** Sum of positive value fields (prizes, refunds, organizer fees received) */
  totalValueIn: bigint;
  /** Sum of absolute values of negative value fields (bets placed) */
  totalValueOut: bigint;
  /** True wallet delta: totalValueIn - totalValueOut - totalGasSpent (equals sum of all netImpact) */
  netPosition: bigint;
  entryCount: number;
}

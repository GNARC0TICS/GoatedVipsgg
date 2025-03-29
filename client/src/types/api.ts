/**
 * Shared type definitions for API responses and data structures
 */

// Time periods for leaderboard and wager race data
export type TimePeriod = "today" | "weekly" | "monthly" | "all_time";
export type Period = TimePeriod;

// Base wager stats structure
export interface WagerStats {
  today: number;
  this_week: number;
  this_month: number;
  all_time: number;
  previous?: number;
}

// User stats from the API
export interface UserStats {
  winRate: number;
  totalGames: number;
  favoriteGame: string;
}

// Base user entry in leaderboard
export interface LeaderboardEntry {
  uid: string;
  name: string;
  wagered: WagerStats;
  stats?: UserStats;
  lastWager?: string;
  isWagering?: boolean;
  wagerChange?: number;
}

// Period-specific data structure
export interface PeriodData {
  data: LeaderboardEntry[];
}

// Race metadata
export interface RaceMetadata {
  id: string;
  status: 'upcoming' | 'live' | 'completed';
  startDate: string;
  endDate: string;
  prizePool: number;
  totalWagered: number;
}

// Full leaderboard data structure
export interface LeaderboardData {
  status: string;
  metadata: {
    totalUsers: number;
    lastUpdated: string;
    currentRace?: RaceMetadata;
  };
  data: {
    today: PeriodData;
    weekly: PeriodData;
    monthly: PeriodData;
    all_time: PeriodData;
  };
}

// Wager race position data
export interface RacePosition {
  position: number;
  totalParticipants: number;
  wagerAmount: number;
  previousPosition: number | null;
  raceType: "daily" | "weekly" | "monthly";
  raceTitle: string;
  endDate: string;
}

// API error response
export interface APIError {
  status: "error";
  message: string;
  details?: string;
  code?: string;
}

// API success response
export interface APISuccess<T> {
  status: "success";
  data: T;
}

// Generic API response type
export type APIResponse<T> = APISuccess<T> | APIError;

// MVP data structure
export interface MVPData {
  username: string;
  wagerAmount: number;
  rank: number;
  lastWagerChange: number | null;
  stats: UserStats;
}

// MVP periods data
export interface MVPPeriodsData {
  daily?: MVPData;
  weekly?: MVPData;
  monthly?: MVPData;
}

// Wager race entry
export interface WagerRaceEntry {
  position: number;
  uid: string;
  name: string;
  wager: number;
}

// Active wager race data
export interface ActiveWagerRace {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  prizePool: number;
  participants: WagerRaceEntry[];
}

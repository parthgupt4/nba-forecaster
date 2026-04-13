// ─── BallDontLie API Types ────────────────────────────────────────────────────

export interface BDLTeam {
  id: number;
  abbreviation: string;
  city: string;
  conference: string;
  division: string;
  full_name: string;
  name: string;
}

export interface BDLPlayer {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  height_feet: number | null;
  height_inches: number | null;
  weight_pounds: number | null;
  team: BDLTeam;
  jersey_number?: string;
}

export interface BDLGame {
  id: number;
  date: string;
  home_team: BDLTeam;
  visitor_team: BDLTeam;
  home_team_score: number;
  visitor_team_score: number;
  period: number;
  postseason: boolean;
  season: number;
  status: string;
  time: string;
}

export interface BDLStat {
  id: number;
  ast: number;
  blk: number;
  dreb: number;
  fg3_pct: number | null;
  fg3a: number;
  fg3m: number;
  fg_pct: number | null;
  fga: number;
  fgm: number;
  ft_pct: number | null;
  fta: number;
  ftm: number;
  game: BDLGame;
  min: string;
  oreb: number;
  pf: number;
  player: BDLPlayer;
  pts: number;
  reb: number;
  stl: number;
  team: BDLTeam;
  turnover: number;
}

export interface BDLSeasonAverage {
  player_id: number;
  season: number;
  min: string;
  fgm: number;
  fga: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  turnover: number;
  pf: number;
  pts: number;
  fg_pct: number;
  fg3_pct: number;
  ft_pct: number;
  games_played: number;
}

export interface BDLPaginatedResponse<T> {
  data: T[];
  meta: {
    total_pages: number;
    current_page: number;
    next_page: number | null;
    per_page: number;
    total_count: number;
  };
}

// ─── Processed Game Log ────────────────────────────────────────────────────────

export interface GameLog {
  date: string;
  opponent: string;
  isHome: boolean;
  pts: number;
  reb: number;
  ast: number;
  blk: number;
  stl: number;
  fg3m: number;
  min: string;
  fgm: number;
  fga: number;
  fg3a: number;
  fg_pct: number | null;
  turnover: number;
}

// ─── Opponent Defensive Stats ──────────────────────────────────────────────────

export interface OpponentDefStats {
  ptsAllowed: number;
  rebAllowed: number;
  astAllowed: number;
  fg3mAllowed: number;
  blkAllowed: number;
  stlAllowed: number;
  pace: number;
  defRating: number;
}

// ─── Forecast Types ─────────────────────────────────────────────────────────────

export type Trend = 'up' | 'down' | 'neutral';

export interface StatRange {
  low: number;
  mid: number;
  high: number;
  trend?: Trend;
}

export interface KeyFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  detail: string;
}

export interface ForecastResponse {
  player: {
    name: string;
    team: string;
    position: string;
  };
  game: {
    opponent: string;
    date: string;
    isHome: boolean;
    vegasTotal: number | null;
  };
  forecasts: {
    points: StatRange & { trend: Trend };
    rebounds: StatRange & { trend: Trend };
    assists: StatRange & { trend: Trend };
    blocks: StatRange & { trend: Trend };
    steals: StatRange & { trend: Trend };
    threesMade: StatRange & { trend: Trend };
    turnovers: StatRange & { trend: Trend };
    minutesProjected: StatRange;
    pointsAssists: StatRange;
    pointsRebounds: StatRange;
    reboundsAssists: StatRange;
    pra: StatRange;
    stocks: StatRange;
    fantasyScore: StatRange & { scoringSystem: string };
    doubleDouble: { probability: number };
    tripleDouble: { probability: number };
  };
  confidence: number;
  keyFactors: KeyFactor[];
  analysis: string;
  minutesNote: string;
  bettingContext: string;
}

export interface ForecastApiResponse {
  forecast: ForecastResponse;
  playerInfo: BDLPlayer;
  gameLogs: GameLog[];
  seasonAverages: BDLSeasonAverage | null;
  nextGame: BDLGame | null;
}

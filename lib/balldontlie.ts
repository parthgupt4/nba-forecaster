/**
 * NBA data client
 * - BallDontLie API v1 (https://api.balldontlie.io/v1)  — player search, player info, schedules
 * - NBA Stats API   (https://stats.nba.com/stats)        — game logs, season averages, opponent stats
 *
 * BallDontLie free tier does not support the /stats endpoint.
 * All per-game and season stat fetching uses the unofficial NBA Stats API instead.
 */

import type {
  BDLPlayer,
  BDLGame,
  BDLSeasonAverage,
  GameLog,
  OpponentDefStats,
} from './types';

// ─── BallDontLie client ────────────────────────────────────────────────────────

const BDL_BASE = 'https://api.balldontlie.io/v1';
const BDL_SEASON = 2025; // 2025-26 season in BDL's numbering

async function bdlFetch<T>(
  path: string,
  params?: Record<string, string | string[]>
): Promise<T> {
  const url = new URL(`${BDL_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(key, v);
      } else {
        url.searchParams.set(key, value);
      }
    }
  }

  const apiKey = process.env.BALLDONTLIE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'BALLDONTLIE_API_KEY is not set. Add it to .env.local and restart the dev server.'
    );
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)');
    throw new Error(
      `BallDontLie API error: ${res.status} ${url}\n${body.slice(0, 500)}`
    );
  }
  return res.json() as Promise<T>;
}

// ─── NBA Stats client ──────────────────────────────────────────────────────────

const NBA_STATS_BASE = 'https://stats.nba.com/stats';
const NBA_SEASON = '2025-26';

const NBA_HEADERS: HeadersInit = {
  'User-Agent': 'Mozilla/5.0',
  'Referer': 'https://www.nba.com',
  'Origin': 'https://www.nba.com',
  'Accept': 'application/json, text/plain, */*',
};

interface NBAResultSet {
  name: string;
  headers: string[];
  rowSet: (string | number | null)[][];
}

interface NBAStatsResponse {
  resource: string;
  resultSets: NBAResultSet[];
}

async function nbaFetch<T extends NBAStatsResponse>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: NBA_HEADERS,
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)');
    throw new Error(
      `NBA Stats API error: ${res.status} ${url}\n${body.slice(0, 500)}`
    );
  }
  return res.json() as Promise<T>;
}

function parseResultSet(
  data: NBAStatsResponse,
  name?: string
): Record<string, string | number | null>[] {
  const rs = name
    ? data.resultSets.find((r) => r.name === name)
    : data.resultSets[0];
  if (!rs) return [];
  return rs.rowSet.map((row) => {
    const obj: Record<string, string | number | null> = {};
    rs.headers.forEach((h, i) => {
      obj[h] = row[i] as string | number | null;
    });
    return obj;
  });
}

function num(v: string | number | null | undefined, fallback = 0): number {
  if (v == null) return fallback;
  const n = parseFloat(String(v));
  return isNaN(n) ? fallback : n;
}

function str(v: string | number | null | undefined): string {
  return v == null ? '' : String(v);
}

// ─── NBA Stats player ID lookup ────────────────────────────────────────────────
// BallDontLie player IDs differ from NBA Stats player IDs. After finding a player
// via BDL search, resolve their NBA Stats ID by matching on display name.

let _nbaPlayerIdMap: Map<string, number> | null = null;

async function getNbaPlayerIdMap(): Promise<Map<string, number>> {
  if (_nbaPlayerIdMap) return _nbaPlayerIdMap;

  const data = await nbaFetch<NBAStatsResponse>(
    `${NBA_STATS_BASE}/commonallplayers?LeagueID=00&Season=${NBA_SEASON}&IsOnlyCurrentSeason=1`
  );
  const rows = parseResultSet(data, 'CommonAllPlayers');

  console.log(
    `[commonallplayers] season=${NBA_SEASON} | total players: ${rows.length}`,
    '| sample names:',
    rows.slice(0, 5).map((r) => r['DISPLAY_FIRST_LAST'])
  );

  const map = new Map<string, number>();
  for (const r of rows) {
    const name = str(r['DISPLAY_FIRST_LAST']).toLowerCase().trim();
    const id = num(r['PERSON_ID']);
    if (name && id) map.set(name, id);
  }

  _nbaPlayerIdMap = map;
  return map;
}

/**
 * Resolve the NBA Stats player ID for a player found via BallDontLie.
 * Matching is case-insensitive. If an exact name match fails, falls back to
 * finding a map entry whose name contains both the first and last name tokens,
 * which handles middle names / suffixes (e.g. "Jaren Jackson Jr.").
 */
export async function getNbaStatsPlayerId(
  firstName: string,
  lastName: string
): Promise<number> {
  const map = await getNbaPlayerIdMap();
  const fullName = `${firstName} ${lastName}`.toLowerCase().trim();

  // 1. Exact match (fast path)
  const exact = map.get(fullName);
  if (exact) return exact;

  // 2. Partial match: map entry contains both first and last name tokens
  const first = firstName.toLowerCase().trim();
  const last = lastName.toLowerCase().trim();
  for (const [name, id] of map) {
    if (name.includes(first) && name.includes(last)) return id;
  }

  console.error(
    `[getNbaStatsPlayerId] no match for "${fullName}". ` +
      `Sample map entries: ${[...map.keys()].slice(0, 10).join(', ')}`
  );
  throw new Error(`NBA Stats player ID not found for: "${fullName}"`);
}

// ─── Player Search (BallDontLie — free tier) ───────────────────────────────────

export async function searchPlayers(query: string): Promise<BDLPlayer[]> {
  const { data } = await bdlFetch<{ data: BDLPlayer[] }>('/players', {
    search: query,
    per_page: '10',
  });
  return data;
}

// ─── Player Info (BallDontLie — free tier) ────────────────────────────────────

export async function getPlayer(id: number): Promise<BDLPlayer> {
  const { data } = await bdlFetch<{ data: BDLPlayer }>(`/players/${id}`);
  return data;
}

// ─── Game Logs (NBA Stats) ────────────────────────────────────────────────────

export async function getGameLogs(nbaStatsPlayerId: number): Promise<GameLog[]> {
  const data = await nbaFetch<NBAStatsResponse>(
    `${NBA_STATS_BASE}/playergamelog?PlayerID=${nbaStatsPlayerId}&Season=${NBA_SEASON}&SeasonType=Regular+Season`
  );
  const rows = parseResultSet(data, 'PlayerGameLog');

  return rows.slice(0, 15).map((r): GameLog => {
    const matchup = str(r['MATCHUP']);
    const isHome = matchup.includes('vs.');
    const opponentAbbr = matchup.split(/vs\.|@/)[1]?.trim() ?? '';
    const fgm = num(r['FGM']);
    const fga = num(r['FGA']);
    return {
      date: str(r['GAME_DATE']),
      opponent: opponentAbbr,
      isHome,
      pts: num(r['PTS']),
      reb: num(r['REB']),
      ast: num(r['AST']),
      blk: num(r['BLK']),
      stl: num(r['STL']),
      fg3m: num(r['FG3M']),
      min: str(r['MIN']),
      fgm,
      fga,
      fg3a: num(r['FG3A']),
      fg_pct: fga > 0 ? fgm / fga : null,
      turnover: num(r['TOV']),
    };
  });
}

// ─── Season Averages (NBA Stats) ──────────────────────────────────────────────

export async function getSeasonAverages(
  nbaStatsPlayerId: number
): Promise<BDLSeasonAverage | null> {
  const data = await nbaFetch<NBAStatsResponse>(
    `${NBA_STATS_BASE}/playercareerstats?PlayerID=${nbaStatsPlayerId}&PerMode=PerGame`
  );
  const rows = parseResultSet(data, 'SeasonTotalsRegularSeason');
  if (rows.length === 0) return null;

  // Prefer the explicit 2025-26 row; fall back to the most recent row
  const row =
    rows.find((r) => str(r['SEASON_ID']) === NBA_SEASON) ??
    rows[rows.length - 1];
  if (!row) return null;

  const fgm = num(row['FGM']);
  const fga = num(row['FGA']);
  const fg3m = num(row['FG3M']);
  const fg3a = num(row['FG3A']);
  const ftm = num(row['FTM']);
  const fta = num(row['FTA']);

  return {
    player_id: nbaStatsPlayerId,
    season: 2024,
    min: str(row['MIN']),
    fgm,
    fga,
    fg3m,
    fg3a,
    ftm,
    fta,
    oreb: num(row['OREB']),
    dreb: num(row['DREB']),
    reb: num(row['REB']),
    ast: num(row['AST']),
    stl: num(row['STL']),
    blk: num(row['BLK']),
    turnover: num(row['TOV']),
    pf: num(row['PF']),
    pts: num(row['PTS']),
    fg_pct: num(row['FG_PCT']),
    fg3_pct: num(row['FG3_PCT']),
    ft_pct: num(row['FT_PCT']),
    games_played: num(row['GP']),
  };
}

// ─── Next Game (BallDontLie — free tier) ──────────────────────────────────────

export async function getNextGame(teamId: number): Promise<BDLGame | null> {
  const today = new Date()
    .toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
    .slice(0, 10);

  const { data } = await bdlFetch<{ data: BDLGame[] }>('/games', {
    'team_ids[]': [String(teamId)],
    start_date: today,
    per_page: '5',
    'seasons[]': [String(BDL_SEASON)],
  });

  // Return the earliest upcoming game
  const sorted = data.slice().sort((a, b) => a.date.localeCompare(b.date));
  return sorted[0] ?? null;
}

// ─── League-wide team stats (NBA Stats) ───────────────────────────────────────
// Returns raw rows from leaguedashteamstats for use in the statistical forecast engine.

export type TeamStatsRow = Record<string, string | number | null>;

export async function getAllTeamsOpponentStats(): Promise<TeamStatsRow[]> {
  const data = await nbaFetch<NBAStatsResponse>(
    `${NBA_STATS_BASE}/leaguedashteamstats?Season=${NBA_SEASON}&SeasonType=Regular+Season&PerMode=PerGame&MeasureType=Opponent`
  );
  return parseResultSet(data, 'LeagueDashTeamStats');
}

export async function getAllTeamsPaceStats(): Promise<TeamStatsRow[]> {
  const data = await nbaFetch<NBAStatsResponse>(
    `${NBA_STATS_BASE}/leaguedashteamstats?Season=${NBA_SEASON}&SeasonType=Regular+Season&PerMode=PerGame&MeasureType=Base`
  );
  return parseResultSet(data, 'LeagueDashTeamStats');
}

// ─── Opponent Defensive Stats (NBA Stats) ─────────────────────────────────────

export async function getOpponentDefStats(
  opponentTeamId: number
): Promise<OpponentDefStats> {
  try {
    const data = await nbaFetch<NBAStatsResponse>(
      `${NBA_STATS_BASE}/leaguedashteamstats?Season=${NBA_SEASON}&SeasonType=Regular+Season&PerMode=PerGame&MeasureType=Opponent`
    );
    const rows = parseResultSet(data, 'LeagueDashTeamStats');
    const row = rows.find((r) => num(r['TEAM_ID']) === opponentTeamId);
    if (!row) return defaultDefStats();

    const ptsAllowed = num(row['OPP_PTS']);
    return {
      ptsAllowed,
      rebAllowed: num(row['OPP_REB']),
      astAllowed: num(row['OPP_AST']),
      fg3mAllowed: num(row['OPP_FG3M']),
      blkAllowed: num(row['OPP_BLK']),
      stlAllowed: num(row['OPP_STL']),
      pace: 99.0,
      defRating: ptsAllowed,
    };
  } catch {
    return defaultDefStats();
  }
}

function defaultDefStats(): OpponentDefStats {
  return {
    ptsAllowed: 113.5,
    rebAllowed: 44.0,
    astAllowed: 24.0,
    fg3mAllowed: 13.0,
    blkAllowed: 4.5,
    stlAllowed: 7.5,
    pace: 99.0,
    defRating: 113.5,
  };
}

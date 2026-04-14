/**
 * NBA data client using the BallDontLie API v1
 * https://api.balldontlie.io/v1/
 */

import type {
  BDLPlayer,
  BDLGame,
  BDLStat,
  BDLSeasonAverage,
  GameLog,
  OpponentDefStats,
} from './types';

const BDL_BASE = 'https://api.balldontlie.io/v1';
const CURRENT_SEASON = 2025;

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
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.BALLDONTLIE_API_KEY}`,
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

// ─── Player Search ─────────────────────────────────────────────────────────────

export async function searchPlayers(query: string): Promise<BDLPlayer[]> {
  const { data } = await bdlFetch<{ data: BDLPlayer[] }>('/players', {
    search: query,
    per_page: '10',
  });
  return data;
}

// ─── Player Info ───────────────────────────────────────────────────────────────

export async function getPlayer(id: number): Promise<BDLPlayer> {
  const { data } = await bdlFetch<{ data: BDLPlayer }>(`/players/${id}`);
  return data;
}

// ─── Game Logs ────────────────────────────────────────────────────────────────

export async function getGameLogs(playerId: number): Promise<GameLog[]> {
  const { data } = await bdlFetch<{ data: BDLStat[] }>('/stats', {
    'player_ids[]': [String(playerId)],
    'seasons[]': [String(CURRENT_SEASON)],
    per_page: '15',
  });

  return data.map((stat): GameLog => {
    const isHome = stat.game.home_team.id === stat.team.id;
    const opponent = isHome
      ? stat.game.visitor_team.abbreviation
      : stat.game.home_team.abbreviation;
    return {
      date: stat.game.date,
      opponent,
      isHome,
      pts: stat.pts,
      reb: stat.reb,
      ast: stat.ast,
      blk: stat.blk,
      stl: stat.stl,
      fg3m: stat.fg3m,
      min: stat.min,
      fgm: stat.fgm,
      fga: stat.fga,
      fg3a: stat.fg3a,
      fg_pct: stat.fg_pct,
      turnover: stat.turnover,
    };
  });
}

// ─── Season Averages ──────────────────────────────────────────────────────────

export async function getSeasonAverages(
  playerId: number
): Promise<BDLSeasonAverage | null> {
  const { data } = await bdlFetch<{ data: BDLSeasonAverage[] }>(
    '/season_averages',
    {
      'player_ids[]': [String(playerId)],
      season: String(CURRENT_SEASON),
    }
  );
  return data[0] ?? null;
}

// ─── Next Game ────────────────────────────────────────────────────────────────

export async function getNextGame(teamId: number): Promise<BDLGame | null> {
  const today = new Date()
    .toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
    .slice(0, 10);

  const { data } = await bdlFetch<{ data: BDLGame[] }>('/games', {
    'team_ids[]': [String(teamId)],
    start_date: today,
    per_page: '5',
    'seasons[]': [String(CURRENT_SEASON)],
  });

  // Return the earliest upcoming game
  const sorted = data.slice().sort((a, b) => a.date.localeCompare(b.date));
  return sorted[0] ?? null;
}

// ─── Opponent Defensive Stats ─────────────────────────────────────────────────

export async function getOpponentDefStats(
  opponentTeamId: number
): Promise<OpponentDefStats> {
  try {
    // Get recent completed games for the opponent team
    const { data: games } = await bdlFetch<{ data: BDLGame[] }>('/games', {
      'team_ids[]': [String(opponentTeamId)],
      'seasons[]': [String(CURRENT_SEASON)],
      per_page: '10',
    });

    if (games.length === 0) return defaultDefStats();

    // Compute pts allowed per game from scores
    const ptsAllowed =
      games.reduce((sum, g) => {
        const allowed =
          g.home_team.id === opponentTeamId
            ? g.visitor_team_score
            : g.home_team_score;
        return sum + allowed;
      }, 0) / games.length;

    // Get stats for the teams that played *against* opponentTeamId
    const gameIds = games.map((g) => String(g.id));
    const opposingTeamIds = [
      ...new Set(
        games.map((g) =>
          String(
            g.home_team.id === opponentTeamId
              ? g.visitor_team.id
              : g.home_team.id
          )
        )
      ),
    ];

    const { data: stats } = await bdlFetch<{ data: BDLStat[] }>('/stats', {
      'game_ids[]': gameIds,
      'team_ids[]': opposingTeamIds,
      per_page: '200',
    });

    // Aggregate per-game totals then average across games
    const perGame = new Map<
      number,
      { reb: number; ast: number; fg3m: number; blk: number; stl: number }
    >();
    for (const stat of stats) {
      const gid = stat.game.id;
      if (!perGame.has(gid)) {
        perGame.set(gid, { reb: 0, ast: 0, fg3m: 0, blk: 0, stl: 0 });
      }
      const entry = perGame.get(gid)!;
      entry.reb += stat.reb;
      entry.ast += stat.ast;
      entry.fg3m += stat.fg3m;
      entry.blk += stat.blk;
      entry.stl += stat.stl;
    }

    const n = perGame.size;
    if (n === 0) return { ...defaultDefStats(), ptsAllowed };

    function avgKey(key: keyof (typeof perGame extends Map<number, infer V> ? V : never)): number {
      let total = 0;
      for (const v of perGame.values()) total += v[key];
      return total / n;
    }

    return {
      ptsAllowed,
      rebAllowed: avgKey('reb'),
      astAllowed: avgKey('ast'),
      fg3mAllowed: avgKey('fg3m'),
      blkAllowed: avgKey('blk'),
      stlAllowed: avgKey('stl'),
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

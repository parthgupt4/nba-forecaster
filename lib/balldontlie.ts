/**
 * NBA data client using:
 * - stats.nba.com/stats  — player search, game logs
 * - cdn.nba.com          — schedule, boxscores (faster, no rate limits)
 */

import type {
  BDLPlayer,
  BDLTeam,
  BDLGame,
  BDLSeasonAverage,
  GameLog,
  OpponentDefStats,
} from './types';

const NBA_BASE = 'https://stats.nba.com/stats';
const CDN_BASE = 'https://cdn.nba.com';
const CURRENT_SEASON = '2025-26';
const CURRENT_SEASON_SHORT = 2025;

const NBA_HEADERS: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://www.nba.com/',
  'x-nba-stats-origin': 'stats',
  'x-nba-stats-token': 'true',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
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
    console.error(`[nbaFetch] ${res.status} ${url}\nBody: ${body.slice(0, 500)}`);
    throw new Error(`NBA stats API error: ${res.status} ${url}`);
  }
  return res.json() as Promise<T>;
}

async function cdnFetch<T>(url: string, cache = true): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    ...(cache ? { next: { revalidate: 300 } } : { cache: 'no-store' }),
  });
  if (!res.ok) throw new Error(`NBA CDN error: ${res.status} ${url}`);
  return res.json() as Promise<T>;
}

// Module-level schedule cache to avoid re-fetching the 10MB JSON on each request
let _scheduleCache: CDNSchedule | null = null;
let _scheduleCachedAt = 0;
const SCHEDULE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

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

// ─── Player Search ─────────────────────────────────────────────────────────────

let _playersCache: BDLPlayer[] | null = null;

async function getAllPlayers(): Promise<BDLPlayer[]> {
  if (_playersCache) return _playersCache;

  const url = `${NBA_BASE}/commonallplayers?LeagueID=00&Season=${CURRENT_SEASON}&IsOnlyCurrentSeason=1`;
  console.log('[getAllPlayers] fetching:', url);
  const data = await nbaFetch<NBAStatsResponse>(url);
  console.log('[getAllPlayers] resultSets:', data.resultSets?.map((r) => `${r.name}(${r.rowSet?.length ?? 0} rows)`));
  const rows = parseResultSet(data, 'CommonAllPlayers');
  console.log('[getAllPlayers] parsed rows:', rows.length);

  const sampleRow = rows[0];
  console.log('[getAllPlayers] sample row keys:', sampleRow ? Object.keys(sampleRow) : 'no rows');
  console.log('[getAllPlayers] sample row:', sampleRow);

  _playersCache = rows
    .filter(
      (r) =>
        num(r['ROSTERSTATUS']) === 1 || str(r['GAMES_PLAYED_FLAG']) === 'Y'
    )
    .map((r): BDLPlayer => {
      const fullName = str(r['DISPLAY_FIRST_LAST']);
      const parts = fullName.split(' ');
      const firstName = parts[0] ?? '';
      const lastName = parts.slice(1).join(' ');
      const teamId = num(r['TEAM_ID']);
      const team: BDLTeam = {
        id: teamId,
        abbreviation: str(r['TEAM_ABBREVIATION']),
        city: str(r['TEAM_CITY']),
        conference: '',
        division: '',
        full_name: `${str(r['TEAM_CITY'])} ${str(r['TEAM_NAME'])}`.trim(),
        name: str(r['TEAM_NAME']),
      };
      return {
        id: num(r['PERSON_ID']),
        first_name: firstName,
        last_name: lastName,
        position: '',
        height_feet: null,
        height_inches: null,
        weight_pounds: null,
        team,
      };
    });

  console.log('[getAllPlayers] cached', _playersCache.length, 'active players, sample:', _playersCache[0]);
  return _playersCache;
}

export async function searchPlayers(query: string): Promise<BDLPlayer[]> {
  const all = await getAllPlayers();
  const q = query.toLowerCase();
  const matches = all
    .filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q))
    .slice(0, 10);
  console.log('[searchPlayers] query:', q, '→', matches.length, 'matches');
  return matches;
}

// ─── Player Info ───────────────────────────────────────────────────────────────

export async function getPlayer(id: number): Promise<BDLPlayer> {
  const data = await nbaFetch<NBAStatsResponse>(
    `${NBA_BASE}/commonplayerinfo?PlayerID=${id}&LeagueID=00`
  );
  const rows = parseResultSet(data, 'CommonPlayerInfo');
  const r = rows[0];
  if (!r) throw new Error(`Player ${id} not found`);

  const teamCity = str(r['TEAM_CITY']);
  const teamName = str(r['TEAM_NAME']);
  const team: BDLTeam = {
    id: num(r['TEAM_ID']),
    abbreviation: str(r['TEAM_ABBREVIATION']),
    city: teamCity,
    conference: '',
    division: '',
    full_name: `${teamCity} ${teamName}`.trim(),
    name: teamName,
  };

  return {
    id,
    first_name: str(r['FIRST_NAME']),
    last_name: str(r['LAST_NAME']),
    position: str(r['POSITION']),
    height_feet: null,
    height_inches: null,
    weight_pounds: null,
    team,
    jersey_number: str(r['JERSEY']) || undefined,
  };
}

// ─── Game Logs ────────────────────────────────────────────────────────────────

export async function getGameLogs(playerId: number): Promise<GameLog[]> {
  const data = await nbaFetch<NBAStatsResponse>(
    `${NBA_BASE}/playergamelog?PlayerID=${playerId}&Season=${CURRENT_SEASON}&SeasonType=Regular+Season&LeagueID=00&direction=DESC`
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

// ─── Season Averages (computed from full season game log) ─────────────────────

export async function getSeasonAverages(
  playerId: number
): Promise<BDLSeasonAverage | null> {
  const data = await nbaFetch<NBAStatsResponse>(
    `${NBA_BASE}/playergamelog?PlayerID=${playerId}&Season=${CURRENT_SEASON}&SeasonType=Regular+Season&LeagueID=00&direction=DESC`
  );
  const rows = parseResultSet(data, 'PlayerGameLog');

  if (rows.length === 0) return null;

  const gp = rows.length;
  function seasonAvg(key: string) {
    return rows.reduce((s, r) => s + num(r[key]), 0) / gp;
  }

  const fgm = seasonAvg('FGM');
  const fga = seasonAvg('FGA');
  const fg3m = seasonAvg('FG3M');
  const fg3a = seasonAvg('FG3A');
  const ftm = seasonAvg('FTM');
  const fta = seasonAvg('FTA');
  const minAvg = seasonAvg('MIN');

  return {
    player_id: playerId,
    season: CURRENT_SEASON_SHORT,
    min: minAvg.toFixed(0),
    fgm,
    fga,
    fg3m,
    fg3a,
    ftm,
    fta,
    oreb: seasonAvg('OREB'),
    dreb: seasonAvg('DREB'),
    reb: seasonAvg('REB'),
    ast: seasonAvg('AST'),
    stl: seasonAvg('STL'),
    blk: seasonAvg('BLK'),
    turnover: seasonAvg('TOV'),
    pf: seasonAvg('PF'),
    pts: seasonAvg('PTS'),
    fg_pct: fga > 0 ? fgm / fga : 0,
    fg3_pct: fg3a > 0 ? fg3m / fg3a : 0,
    ft_pct: fta > 0 ? ftm / fta : 0,
    games_played: gp,
  };
}

// ─── Next Game (from NBA CDN schedule) ────────────────────────────────────────

interface CDNSchedule {
  leagueSchedule: {
    gameDates: Array<{
      gameDate: string; // "MM/DD/YYYY HH:MM:SS"
      games: Array<{
        gameId: string;
        gameDateEst: string;
        gameStatus: number;
        gameStatusText: string;
        homeTeam: CDNTeam;
        awayTeam: CDNTeam;
      }>;
    }>;
  };
}

interface CDNTeam {
  teamId: number;
  teamName: string;
  teamCity: string;
  teamTricode: string;
  wins: number;
  losses: number;
}

function cdnTeamToTeam(t: CDNTeam): BDLTeam {
  return {
    id: t.teamId,
    abbreviation: t.teamTricode,
    city: t.teamCity,
    conference: '',
    division: '',
    full_name: `${t.teamCity} ${t.teamName}`,
    name: t.teamName,
  };
}

function parseScheduleDate(dateStr: string): string {
  // "MM/DD/YYYY HH:MM:SS" → "YYYY-MM-DD"
  const [datePart] = dateStr.split(' ');
  const [m, d, y] = datePart.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

export async function getNextGame(teamId: number): Promise<BDLGame | null> {
  const now = Date.now();
  if (!_scheduleCache || now - _scheduleCachedAt > SCHEDULE_CACHE_TTL) {
    _scheduleCache = await cdnFetch<CDNSchedule>(
      `${CDN_BASE}/static/json/staticData/scheduleLeagueV2_1.json`,
      false // don't use Next.js fetch cache — file is 10MB+
    );
    _scheduleCachedAt = now;
  }
  const schedule = _scheduleCache;

  // Use YYYY-MM-DD string comparison to avoid timezone issues
  const todayStr = new Date()
    .toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
    .slice(0, 10); // "YYYY-MM-DD"

  for (const gd of schedule.leagueSchedule.gameDates) {
    const gameDate = parseScheduleDate(gd.gameDate);
    if (gameDate < todayStr) continue;

    for (const g of gd.games) {
      if (
        g.homeTeam.teamId === teamId ||
        g.awayTeam.teamId === teamId
      ) {
        return {
          id: parseInt(g.gameId, 10) || 0,
          date: gameDate,
          home_team: cdnTeamToTeam(g.homeTeam),
          visitor_team: cdnTeamToTeam(g.awayTeam),
          home_team_score: 0,
          visitor_team_score: 0,
          period: 0,
          postseason: false,
          season: CURRENT_SEASON_SHORT,
          status: g.gameStatusText,
          time: '',
        };
      }
    }
  }

  return null;
}

// ─── Opponent Defensive Stats (from CDN boxscores) ────────────────────────────

interface CDNBoxscore {
  game: {
    homeTeam: CDNBoxTeam;
    awayTeam: CDNBoxTeam;
  };
}

interface CDNBoxTeam {
  teamId: number;
  teamTricode: string;
  statistics: {
    points: number;
    reboundsTotal: number;
    assists: number;
    blocks: number;
    steals: number;
    threePointersMade: number;
    [key: string]: number;
  };
}

export async function getOpponentDefStats(
  opponentTeamId: number
): Promise<OpponentDefStats> {
  try {
    // Get recent game IDs for the opponent team
    const data = await nbaFetch<NBAStatsResponse>(
      `${NBA_BASE}/teamgamelog?TeamID=${opponentTeamId}&Season=${CURRENT_SEASON}&SeasonType=Regular+Season&LeagueID=00`
    );
    const rows = parseResultSet(data, 'TeamGameLog');
    if (rows.length === 0) return defaultDefStats();

    // Take last 10 games
    const recent = rows.slice(0, 10);
    const gameIds = recent.map((r) => str(r['GAME_ID']));

    // Fetch CDN boxscores in parallel (limit to 5 to avoid overload)
    const boxscorePromises = gameIds.slice(0, 5).map((gid) =>
      cdnFetch<CDNBoxscore>(
        `${CDN_BASE}/static/json/liveData/boxscore/boxscore_${gid}.json`
      ).catch(() => null)
    );

    const boxscores = (await Promise.all(boxscorePromises)).filter(Boolean) as CDNBoxscore[];

    if (boxscores.length === 0) return defaultDefStats();

    // For each game, find the OPPONENT team's stats (not opponentTeamId)
    const oppStatsList: CDNBoxTeam['statistics'][] = [];
    for (const bs of boxscores) {
      const { homeTeam, awayTeam } = bs.game;
      const oppTeam =
        homeTeam.teamId === opponentTeamId ? awayTeam : homeTeam;
      if (oppTeam.statistics) oppStatsList.push(oppTeam.statistics);
    }

    if (oppStatsList.length === 0) return defaultDefStats();

    function avgStat(key: keyof CDNBoxTeam['statistics']): number {
      return (
        oppStatsList.reduce((s, st) => s + (st[key] ?? 0), 0) /
        oppStatsList.length
      );
    }

    const ptsAllowed = avgStat('points');

    return {
      ptsAllowed,
      rebAllowed: avgStat('reboundsTotal'),
      astAllowed: avgStat('assists'),
      fg3mAllowed: avgStat('threePointersMade'),
      blkAllowed: avgStat('blocks'),
      stlAllowed: avgStat('steals'),
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

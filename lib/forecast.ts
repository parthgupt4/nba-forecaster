import type {
  BDLPlayer,
  BDLSeasonAverage,
  BDLGame,
  GameLog,
  OpponentDefStats,
  ForecastResponse,
} from './types';

function formatMin(min: string): number {
  if (!min) return 0;
  if (min.includes(':')) {
    const [m, s] = min.split(':');
    return parseInt(m) + parseInt(s || '0') / 60;
  }
  return parseFloat(min) || 0;
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function buildForecastPrompt(
  player: BDLPlayer,
  seasonAvg: BDLSeasonAverage | null,
  gameLogs: GameLog[],
  nextGame: BDLGame,
  opponentDefStats: OpponentDefStats,
  vegasTotal: number | null
): { system: string; user: string } {
  const playerName = `${player.first_name} ${player.last_name}`;
  const isHome = nextGame.home_team.id === player.team.id;
  const opponent = isHome
    ? nextGame.visitor_team.abbreviation
    : nextGame.home_team.abbreviation;
  const gameDate = nextGame.date.split('T')[0];
  const homeAway = isHome ? 'HOME' : 'AWAY';

  // Compute usage proxy from season averages
  const usageProxy = seasonAvg
    ? ((seasonAvg.fga + 0.44 * seasonAvg.fta + seasonAvg.turnover) /
        (seasonAvg.games_played || 1)).toFixed(1)
    : 'N/A';

  const seasonAvgStr = seasonAvg
    ? `pts: ${seasonAvg.pts}, reb: ${seasonAvg.reb}, ast: ${seasonAvg.ast}, blk: ${seasonAvg.blk}, stl: ${seasonAvg.stl}, 3pm: ${seasonAvg.fg3m}, min: ${seasonAvg.min}, fg%: ${(seasonAvg.fg_pct * 100).toFixed(1)}%, 3p%: ${(seasonAvg.fg3_pct * 100).toFixed(1)}%, usage proxy: ${usageProxy}`
    : 'Not available';

  const gameLogsStr = gameLogs
    .map(
      (g) =>
        `${g.date} vs ${g.opponent} (${g.isHome ? 'HOME' : 'AWAY'}): ${g.min}min, ${g.pts}pts, ${g.reb}reb, ${g.ast}ast, ${g.blk}blk, ${g.stl}stl, ${g.fg3m}3pm, FG: ${g.fgm}/${g.fga} (${g.fg_pct != null ? (g.fg_pct * 100).toFixed(0) : '?'}%)`
    )
    .join('\n');

  // Recent vs this opponent
  const vsOpponent = gameLogs.filter((g) => g.opponent === opponent);
  const vsOppStr =
    vsOpponent.length > 0
      ? vsOpponent
          .map((g) => `${g.date}: ${g.pts}pts/${g.reb}reb/${g.ast}ast`)
          .join(', ')
      : 'No recent data in last 15 games';

  // Home vs away splits from logs
  const homeLogs = gameLogs.filter((g) => g.isHome);
  const awayLogs = gameLogs.filter((g) => !g.isHome);
  const homeAvgPts = homeLogs.length ? avg(homeLogs.map((g) => g.pts)).toFixed(1) : 'N/A';
  const awayAvgPts = awayLogs.length ? avg(awayLogs.map((g) => g.pts)).toFixed(1) : 'N/A';

  // Trend over last 5
  const last5 = gameLogs.slice(0, 5);
  const last5Avg = last5.length ? avg(last5.map((g) => g.pts)).toFixed(1) : 'N/A';

  const defStatsStr = `pts allowed/game: ${opponentDefStats.ptsAllowed.toFixed(1)}, reb allowed: ${opponentDefStats.rebAllowed.toFixed(1)}, ast allowed: ${opponentDefStats.astAllowed.toFixed(1)}, 3pm allowed: ${opponentDefStats.fg3mAllowed.toFixed(1)}, blk allowed: ${opponentDefStats.blkAllowed.toFixed(1)}, stl allowed: ${opponentDefStats.stlAllowed.toFixed(1)}, def rating proxy: ${opponentDefStats.defRating.toFixed(1)}`;

  const veString = vegasTotal != null ? `${vegasTotal}` : 'unavailable';

  const system = `You are an expert NBA statistical analyst and forecaster. You will be given data about an NBA player and their upcoming game. Your job is to produce a precise, well-reasoned statistical forecast. Always respond with valid JSON only, no markdown, no explanation outside the JSON.`;

  const user = `Forecast stats for ${playerName} (${player.position || 'F'}, ${player.team.abbreviation}) for their upcoming game vs ${opponent} on ${gameDate} (${homeAway}).

PLAYER SEASON AVERAGES:
${seasonAvgStr}

LAST 15 GAME LOGS (most recent first):
${gameLogsStr}

HOME AVERAGE (last 15): ${homeAvgPts} pts | AWAY AVERAGE: ${awayAvgPts} pts
LAST 5 GAMES AVG PTS: ${last5Avg}
VS ${opponent} IN LAST 15 GAMES: ${vsOppStr}

OPPONENT DEFENSIVE STATS (per game allowed, last ~12 games):
${defStatsStr}

VEGAS GAME TOTAL: ${veString}

Consider ALL of the following factors in your analysis:
1. Recent form — last 5 and last 10 game trends
2. Minutes projection — estimated minutes based on recent trends and rest
3. Usage rate — how involved in the offense
4. Opponent defense — how they rank vs this player's position
5. Positional matchup — likely primary defender quality
6. Pace of game — Vegas total and team pace stats as proxies
7. Injuries and absences — note if key teammates are listed as out (infer from context)
8. Home vs away split — use game logs to compute home/away averages
9. Back-to-back and rest — flag if applicable based on schedule
10. Blowout risk — infer from team records and Vegas line
11. Coaching and rotations — note any known tendencies
12. Foul trouble risk — relevant for bigs and aggressive defenders
13. Game script — projected pace, closeness, scoring environment
14. Motivation and context — rivalry, playoff race, revenge game, milestone
15. Stat-specific logic — points depends on usage/efficiency, rebounds on matchup/missed shots, assists on teammate shooting
16. Recent history vs this specific opponent — pull from game logs
17. Shooting efficiency trends — FG% and 3P% trending up or down
18. Time of season — load management risk, playoff implications (it is ${gameDate})

Return ONLY this JSON structure (no markdown, no backticks):
{
  "player": { "name": "${playerName}", "team": "${player.team.abbreviation}", "position": "${player.position || 'F'}" },
  "game": { "opponent": "${opponent}", "date": "${gameDate}", "isHome": ${isHome}, "vegasTotal": ${vegasTotal ?? 'null'} },
  "forecasts": {
    "points": { "low": number, "mid": number, "high": number, "trend": "up"|"down"|"neutral" },
    "rebounds": { "low": number, "mid": number, "high": number, "trend": "up"|"down"|"neutral" },
    "assists": { "low": number, "mid": number, "high": number, "trend": "up"|"down"|"neutral" },
    "blocks": { "low": number, "mid": number, "high": number, "trend": "up"|"down"|"neutral" },
    "steals": { "low": number, "mid": number, "high": number, "trend": "up"|"down"|"neutral" },
    "threesMade": { "low": number, "mid": number, "high": number, "trend": "up"|"down"|"neutral" },
    "turnovers": { "low": number, "mid": number, "high": number, "trend": "up"|"down"|"neutral" },
    "minutesProjected": { "low": number, "mid": number, "high": number },
    "pointsAssists": { "low": number, "mid": number, "high": number },
    "pointsRebounds": { "low": number, "mid": number, "high": number },
    "reboundsAssists": { "low": number, "mid": number, "high": number },
    "pra": { "low": number, "mid": number, "high": number },
    "stocks": { "low": number, "mid": number, "high": number },
    "fantasyScore": { "low": number, "mid": number, "high": number, "scoringSystem": "DraftKings" },
    "doubleDouble": { "probability": number },
    "tripleDouble": { "probability": number }
  },
  "confidence": number,
  "keyFactors": [
    { "factor": string, "impact": "positive"|"negative"|"neutral", "detail": string }
  ],
  "analysis": string,
  "minutesNote": string,
  "bettingContext": string
}`;

  return { system, user };
}

export function parseForecastJson(raw: string): ForecastResponse {
  // Strip any accidental markdown fences
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  return JSON.parse(cleaned) as ForecastResponse;
}

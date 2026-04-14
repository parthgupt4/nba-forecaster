/**
 * Statistical forecasting engine.
 *
 * computeForecast()   — pure math, no API calls, produces all numbers
 * buildAnalysisPrompt() — lean Claude prompt (~300-500 tokens) for text fields only
 *
 * Claude is NOT responsible for generating projection numbers. It only writes
 * the analysis paragraph, minutesNote, and bettingContext strings.
 */

import type {
  BDLPlayer,
  BDLSeasonAverage,
  BDLGame,
  GameLog,
  ForecastResponse,
  KeyFactor,
  Trend,
} from './types';
import type { TeamStatsRow } from './balldontlie';

// ─── Math helpers ─────────────────────────────────────────────────────────────

function n(v: string | number | null | undefined, fallback = 0): number {
  if (v == null) return fallback;
  const x = parseFloat(String(v));
  return isNaN(x) ? fallback : x;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Round to 1 decimal place */
function r1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Exponential weights: index 0 (most recent game) gets weight N, index N-1 gets 1.
 */
function weightedAvg(values: number[]): number {
  if (!values.length) return 0;
  let weightSum = 0;
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    const w = values.length - i;
    total += values[i] * w;
    weightSum += w;
  }
  return weightSum > 0 ? total / weightSum : 0;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function simpleAvg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function parseGameDate(d: string): Date {
  // BDL schedule: "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d + 'T12:00:00Z');
  // NBA Stats game logs: "APR 05, 2025" or similar
  return new Date(d);
}

function formatMin(min: string): number {
  if (!min) return 0;
  if (min.includes(':')) {
    const [m, s] = min.split(':');
    return parseInt(m) + parseInt(s || '0') / 60;
  }
  return parseFloat(min) || 0;
}

// ─── League-row helpers ────────────────────────────────────────────────────────

function findTeamRow(rows: TeamStatsRow[], abbr: string): TeamStatsRow | undefined {
  return rows.find(
    (r) => String(r['TEAM_ABBREVIATION']).toUpperCase() === abbr.toUpperCase()
  );
}

function leagueAvg(rows: TeamStatsRow[], col: string): number {
  const vals = rows.map((r) => n(r[col])).filter((v) => v > 0);
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ─── Per-stat projection ──────────────────────────────────────────────────────

interface StatProjection {
  low: number;
  mid: number;
  high: number;
  trend: Trend;
}

type LogStatKey = 'pts' | 'reb' | 'ast' | 'blk' | 'stl' | 'fg3m' | 'tov';

const LOG_FIELDS: Record<LogStatKey, (g: GameLog) => number> = {
  pts: (g) => g.pts,
  reb: (g) => g.reb,
  ast: (g) => g.ast,
  blk: (g) => g.blk,
  stl: (g) => g.stl,
  fg3m: (g) => g.fg3m,
  tov: (g) => g.turnover,
};

// Columns in leaguedashteamstats?MeasureType=Opponent
const OPP_COLS: Record<LogStatKey, string> = {
  pts: 'OPP_PTS',
  reb: 'OPP_REB',
  ast: 'OPP_AST',
  blk: 'OPP_BLK',
  stl: 'OPP_STL',
  fg3m: 'OPP_FG3M',
  tov: 'OPP_TOV',
};

// ─── Main statistical forecast ────────────────────────────────────────────────

export function computeForecast(
  player: BDLPlayer,
  gameLogs: GameLog[],
  seasonAvg: BDLSeasonAverage | null,
  nextGame: BDLGame,
  opponentRows: TeamStatsRow[],
  paceRows: TeamStatsRow[],
  vegasTotal: number | null
): ForecastResponse {
  const logs = gameLogs.slice(0, 15);
  const isHome = nextGame.home_team.id === player.team.id;
  const opponentAbbr = isHome
    ? nextGame.visitor_team.abbreviation
    : nextGame.home_team.abbreviation;
  const playerTeamAbbr = player.team.abbreviation;
  const gameDate = nextGame.date.split('T')[0];

  // ── 1. Rest adjustment ────────────────────────────────────────────────────
  let restFactor = 1.02; // default: well-rested
  let isBackToBack = false;
  let restDays = 3;
  if (logs.length > 0) {
    const lastGameDate = parseGameDate(logs[0].date);
    const nextGameDate = parseGameDate(gameDate);
    const diffDays = Math.round(
      (nextGameDate.getTime() - lastGameDate.getTime()) / 86_400_000
    );
    restDays = diffDays;
    if (diffDays <= 1) {
      isBackToBack = true;
      restFactor = 0.94;
    } else if (diffDays >= 2) {
      restFactor = 1.02;
    }
  }

  // ── 2. Pace adjustment ────────────────────────────────────────────────────
  let paceFactor = 1.0;
  let hasPaceData = false;
  const playerPaceRow = findTeamRow(paceRows, playerTeamAbbr);
  const opponentPaceRow = findTeamRow(paceRows, opponentAbbr);
  if (playerPaceRow && opponentPaceRow) {
    const playerPace = n(playerPaceRow['PACE']);
    const opponentPace = n(opponentPaceRow['PACE']);
    if (playerPace > 0 && opponentPace > 0) {
      const expectedPace = (playerPace + opponentPace) / 2;
      paceFactor = clamp(expectedPace / playerPace, 0.85, 1.15);
      hasPaceData = true;
    }
  }

  // ── 3. Opponent adjustment helpers ────────────────────────────────────────
  const oppRow = findTeamRow(opponentRows, opponentAbbr);
  const hasOppData = oppRow != null;

  function oppFactor(statKey: LogStatKey): number {
    if (!oppRow) return 1.0;
    const col = OPP_COLS[statKey];
    const oppVal = n(oppRow[col]);
    const lgAvg = leagueAvg(opponentRows, col);
    if (lgAvg <= 0) return 1.0;
    return clamp(oppVal / lgAvg, 0.75, 1.35);
  }

  // ── 4. Minutes projection + scaling ──────────────────────────────────────
  const minValues = logs.map((g) => formatMin(g.min));
  const projMin = weightedAvg(minValues);
  const seasonAvgMin = seasonAvg ? n(formatMin(String(seasonAvg.min))) : projMin;
  const minScaleFactor =
    Math.abs(projMin - seasonAvgMin) > 3 && seasonAvgMin > 0
      ? projMin / seasonAvgMin
      : 1.0;

  // ── 5. Home/away split ────────────────────────────────────────────────────
  const homeLogs = logs.filter((g) => g.isHome);
  const awayLogs = logs.filter((g) => !g.isHome);
  const hasHomeAwaySplit = homeLogs.length >= 3 && awayLogs.length >= 3;

  function homeAwayFactor(statKey: LogStatKey): number {
    if (!hasHomeAwaySplit) return 1.0;
    const extract = LOG_FIELDS[statKey];
    const overallAvg = simpleAvg(logs.map(extract));
    if (overallAvg <= 0) return 1.0;
    const splitAvg = simpleAvg(
      (isHome ? homeLogs : awayLogs).map(extract)
    );
    return clamp(splitAvg / overallAvg, 0.85, 1.15);
  }

  // ── 6. Project each counting stat ────────────────────────────────────────
  function projectStat(statKey: LogStatKey): StatProjection {
    const values = logs.map(LOG_FIELDS[statKey]);
    const wa = weightedAvg(values);
    const sd = stdDev(values);

    let mid = wa;
    mid *= oppFactor(statKey);
    mid *= paceFactor;
    mid *= homeAwayFactor(statKey);
    mid *= restFactor;
    mid *= minScaleFactor;

    const halfRange = 0.75 * sd;
    const low = r1(Math.max(0, mid - halfRange));
    const high = r1(mid + halfRange);

    // Trend: weighted avg of last 5 vs games 6–15
    const wa5 = weightedAvg(values.slice(0, 5));
    const waOld = weightedAvg(values.slice(5));
    let trend: Trend = 'neutral';
    if (waOld > 0) {
      const pct = (wa5 - waOld) / waOld;
      if (pct > 0.08) trend = 'up';
      else if (pct < -0.08) trend = 'down';
    }

    return { low, mid: r1(mid), high, trend };
  }

  const pts  = projectStat('pts');
  const reb  = projectStat('reb');
  const ast  = projectStat('ast');
  const blk  = projectStat('blk');
  const stl  = projectStat('stl');
  const fg3m = projectStat('fg3m');
  const tov  = projectStat('tov');

  // Minutes range (same method, no opponent/pace adjustment)
  const minSd = stdDev(minValues);
  const minutesProjected = {
    low:  r1(Math.max(0, projMin - 0.75 * minSd)),
    mid:  r1(projMin),
    high: r1(projMin + 0.75 * minSd),
  };

  // ── 7. Combo stats ────────────────────────────────────────────────────────
  function add2(
    a: StatProjection,
    b: StatProjection
  ): { low: number; mid: number; high: number } {
    return { low: r1(a.low + b.low), mid: r1(a.mid + b.mid), high: r1(a.high + b.high) };
  }

  function add3(
    a: StatProjection,
    b: StatProjection,
    c: StatProjection
  ): { low: number; mid: number; high: number } {
    return {
      low:  r1(a.low  + b.low  + c.low),
      mid:  r1(a.mid  + b.mid  + c.mid),
      high: r1(a.high + b.high + c.high),
    };
  }

  const fantasyScore = {
    low:  r1(pts.low  * 1 + reb.low  * 1.25 + ast.low  * 1.5 + stl.low  * 2 + blk.low  * 2 + tov.low  * -0.5 + fg3m.low  * 0.5),
    mid:  r1(pts.mid  * 1 + reb.mid  * 1.25 + ast.mid  * 1.5 + stl.mid  * 2 + blk.mid  * 2 + tov.mid  * -0.5 + fg3m.mid  * 0.5),
    high: r1(pts.high * 1 + reb.high * 1.25 + ast.high * 1.5 + stl.high * 2 + blk.high * 2 + tov.high * -0.5 + fg3m.high * 0.5),
    scoringSystem: 'DraftKings',
  };

  // ── 8. Double-double / triple-double probability ──────────────────────────
  let ddCount = 0;
  let tdCount = 0;
  for (const g of logs) {
    const doubles = [g.pts, g.reb, g.ast, g.blk, g.stl].filter((s) => s >= 10).length;
    if (doubles >= 2) ddCount++;
    if (doubles >= 3) tdCount++;
  }
  const ddProb = logs.length > 0 ? ddCount / logs.length : 0;
  const tdProb = logs.length > 0 ? tdCount / logs.length : 0;

  // ── 9. Confidence ─────────────────────────────────────────────────────────
  let confidence = 70;
  if (logs.length >= 15)     confidence += 5;
  else if (logs.length < 10) confidence -= 5;
  if (hasOppData)            confidence += 5;
  if (hasPaceData)           confidence += 3;
  if (hasHomeAwaySplit)      confidence += 3;
  if (isBackToBack)          confidence -= 5;
  confidence = clamp(confidence, 40, 95);

  // ── 10. Key factors ───────────────────────────────────────────────────────
  const keyFactors: KeyFactor[] = [];

  const ptsOppF = oppFactor('pts');
  if (ptsOppF > 1.1) {
    keyFactors.push({
      factor: 'Favorable defensive matchup',
      impact: 'positive',
      detail: `${opponentAbbr} allows ${r1((ptsOppF - 1) * 100)}% more points than league average`,
    });
  } else if (ptsOppF < 0.9) {
    keyFactors.push({
      factor: 'Tough defensive matchup',
      impact: 'negative',
      detail: `${opponentAbbr} holds opponents to ${r1((1 - ptsOppF) * 100)}% below league average scoring`,
    });
  }

  if (paceFactor > 1.05) {
    keyFactors.push({
      factor: 'Fast-paced game environment',
      impact: 'positive',
      detail: `Expected pace is ${r1((paceFactor - 1) * 100)}% faster than ${playerTeamAbbr}'s typical pace`,
    });
  } else if (paceFactor < 0.95) {
    keyFactors.push({
      factor: 'Slow-paced game environment',
      impact: 'negative',
      detail: `Expected pace is ${r1((1 - paceFactor) * 100)}% slower than ${playerTeamAbbr}'s typical pace`,
    });
  }

  if (isBackToBack) {
    keyFactors.push({
      factor: 'Back-to-back fatigue',
      impact: 'negative',
      detail: `Playing on ${restDays <= 1 ? 'no' : 'minimal'} rest — output typically dips ~6%`,
    });
  }

  if (hasHomeAwaySplit) {
    const homeAvg = simpleAvg(homeLogs.map((g) => g.pts));
    const awayAvg = simpleAvg(awayLogs.map((g) => g.pts));
    if (isHome && homeAvg > awayAvg * 1.1) {
      keyFactors.push({
        factor: 'Strong home performance',
        impact: 'positive',
        detail: `Averages ${r1(homeAvg)} pts at home vs ${r1(awayAvg)} pts away`,
      });
    }
  }

  if (pts.trend === 'up') {
    keyFactors.push({
      factor: 'Hot recent form',
      impact: 'positive',
      detail: 'Scoring trend is up significantly over the last 5 games vs prior 10',
    });
  } else if (pts.trend === 'down') {
    keyFactors.push({
      factor: 'Cold recent form',
      impact: 'negative',
      detail: 'Scoring trend is down significantly over the last 5 games vs prior 10',
    });
  }

  // ── Assemble response (analysis/minutesNote/bettingContext filled by Claude) ─
  return {
    player: {
      name:     `${player.first_name} ${player.last_name}`,
      team:     player.team.abbreviation,
      position: player.position || 'F',
    },
    game: {
      opponent:   opponentAbbr,
      date:       gameDate,
      isHome,
      vegasTotal,
    },
    forecasts: {
      points:          pts,
      rebounds:        reb,
      assists:         ast,
      blocks:          blk,
      steals:          stl,
      threesMade:      fg3m,
      turnovers:       tov,
      minutesProjected,
      pointsAssists:   add2(pts, ast),
      pointsRebounds:  add2(pts, reb),
      reboundsAssists: add2(reb, ast),
      pra:             add3(pts, reb, ast),
      stocks:          add2(blk, stl),
      fantasyScore,
      doubleDouble:    { probability: ddProb },
      tripleDouble:    { probability: tdProb },
    },
    confidence,
    keyFactors,
    analysis:       '',
    minutesNote:    '',
    bettingContext: '',
  };
}

// ─── Lean Claude prompt — text fields only ────────────────────────────────────

export function buildAnalysisPrompt(
  player: BDLPlayer,
  forecast: ForecastResponse,
  seasonAvg: BDLSeasonAverage | null,
  nextGame: BDLGame
): string {
  const f = forecast.forecasts;
  const homeAway = forecast.game.isHome ? 'home' : 'away';
  const saStr = seasonAvg
    ? `${seasonAvg.pts} pts / ${seasonAvg.reb} reb / ${seasonAvg.ast} ast / ${seasonAvg.fg3m} 3PM`
    : 'N/A';

  const factorLines = forecast.keyFactors.length
    ? forecast.keyFactors
        .map((kf) => `  • [${kf.impact}] ${kf.factor}: ${kf.detail}`)
        .join('\n')
    : '  • No significant factors';

  return `You are a concise NBA analyst. Write 3-4 sentences of analysis and 1-2 sentences of betting context for this forecast. Reply ONLY with valid JSON (no markdown): {"analysis":"...","minutesNote":"...","bettingContext":"..."}

Player: ${player.first_name} ${player.last_name} (${player.team.abbreviation}, ${player.position || 'F'})
Game: ${homeAway} vs ${forecast.game.opponent} on ${forecast.game.date} | Vegas total: ${forecast.game.vegasTotal ?? 'N/A'}
Season averages: ${saStr}
Confidence: ${forecast.confidence}/100

Projected stats:
  Points   ${f.points.low}–${f.points.mid}–${f.points.high}  (trend: ${f.points.trend})
  Rebounds ${f.rebounds.low}–${f.rebounds.mid}–${f.rebounds.high}  (trend: ${f.rebounds.trend})
  Assists  ${f.assists.low}–${f.assists.mid}–${f.assists.high}  (trend: ${f.assists.trend})
  3PM      ${f.threesMade.low}–${f.threesMade.mid}–${f.threesMade.high}
  Minutes  ${f.minutesProjected.low}–${f.minutesProjected.mid}–${f.minutesProjected.high}
  DK Score ${f.fantasyScore.low}–${f.fantasyScore.mid}–${f.fantasyScore.high}

Key factors:
${factorLines}`;
}

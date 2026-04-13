'use client';

import type { ForecastApiResponse } from '@/lib/types';
import StatCard from './StatCard';
import Sparkline from './Sparkline';

interface Props {
  data: ForecastApiResponse;
}

function ImpactDot({ impact }: { impact: 'positive' | 'negative' | 'neutral' }) {
  const color =
    impact === 'positive'
      ? 'bg-emerald-400'
      : impact === 'negative'
      ? 'bg-rose-400'
      : 'bg-slate-400';
  return <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${color}`} />;
}

function ProbabilityPill({ label, probability }: { label: string; probability: number }) {
  // Normalize: Claude may return 0–1 or 0–100
  const pct = Math.round(probability <= 1 ? probability * 100 : probability);
  const color =
    pct >= 50 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
    pct >= 25 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
    'bg-slate-700 text-slate-400 border-slate-600';

  return (
    <div className={`flex flex-col items-center gap-1 px-6 py-4 rounded-2xl border ${color}`}>
      <span className="text-2xl font-bold">{pct}%</span>
      <span className="text-xs font-medium uppercase tracking-wider opacity-80">{label}</span>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  // Claude may return 0–1 or 0–100; normalize to 0–100
  const pct = Math.round(value <= 1 ? value * 100 : value);
  const color =
    pct >= 75 ? 'bg-emerald-500' : pct >= 55 ? 'bg-yellow-500' : 'bg-rose-500';
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400 font-medium">Forecast Confidence</span>
        <span className="text-white font-bold">{pct}%</span>
      </div>
      <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ForecastView({ data }: Props) {
  const { forecast, playerInfo, gameLogs, seasonAverages, nextGame } = data;
  const { forecasts, keyFactors, analysis, bettingContext, minutesNote } = forecast;

  const playerName = `${playerInfo.first_name} ${playerInfo.last_name}`;
  const isHome = nextGame ? nextGame.home_team.id === playerInfo.team.id : forecast.game.isHome;
  const opponent = forecast.game.opponent;
  const gameDate = forecast.game.date;

  // Sparkline data
  const ptsHistory = gameLogs.slice(0, 10).map((g) => g.pts);
  const rebHistory = gameLogs.slice(0, 10).map((g) => g.reb);
  const astHistory = gameLogs.slice(0, 10).map((g) => g.ast);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Player Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-2xl font-black text-white shrink-0">
            {playerInfo.first_name[0]}{playerInfo.last_name[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-black text-white tracking-tight">{playerName}</h1>
            <p className="text-slate-400 mt-1">
              {playerInfo.team.full_name}
              {playerInfo.position && ` · ${playerInfo.position}`}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-300 font-medium">
                Next: vs{' '}
                <span className="text-white font-bold">{opponent}</span>
                {' '}on{' '}
                <span className="text-white">{gameDate}</span>
              </span>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                  isHome
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-slate-700 text-slate-300 border border-slate-600'
                }`}
              >
                {isHome ? 'Home' : 'Away'}
              </span>
              {forecast.game.vegasTotal != null && (
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  O/U {forecast.game.vegasTotal}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0">
            <ConfidenceBar value={forecast.confidence} />
          </div>
        </div>
      </div>

      {/* Minutes Projected */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Minutes Projected</span>
            <div className="flex items-baseline gap-2">
              <span className="text-white text-2xl font-bold">{forecasts.minutesProjected.mid}</span>
              <span className="text-slate-500 text-sm">{forecasts.minutesProjected.low}–{forecasts.minutesProjected.high} min</span>
            </div>
          </div>
        </div>
        {minutesNote && (
          <p className="text-slate-400 text-sm sm:ml-4 sm:border-l sm:border-slate-700 sm:pl-4">{minutesNote}</p>
        )}
      </div>

      {/* Primary Stat Cards */}
      <section>
        <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wider mb-4">Primary Stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard label="Points" mid={forecasts.points.mid} low={forecasts.points.low} high={forecasts.points.high} trend={forecasts.points.trend} seasonAvg={seasonAverages?.pts} />
          <StatCard label="Rebounds" mid={forecasts.rebounds.mid} low={forecasts.rebounds.low} high={forecasts.rebounds.high} trend={forecasts.rebounds.trend} seasonAvg={seasonAverages?.reb} />
          <StatCard label="Assists" mid={forecasts.assists.mid} low={forecasts.assists.low} high={forecasts.assists.high} trend={forecasts.assists.trend} seasonAvg={seasonAverages?.ast} />
          <StatCard label="Blocks" mid={forecasts.blocks.mid} low={forecasts.blocks.low} high={forecasts.blocks.high} trend={forecasts.blocks.trend} seasonAvg={seasonAverages?.blk} />
          <StatCard label="Steals" mid={forecasts.steals.mid} low={forecasts.steals.low} high={forecasts.steals.high} trend={forecasts.steals.trend} seasonAvg={seasonAverages?.stl} />
          <StatCard label="3PM" mid={forecasts.threesMade.mid} low={forecasts.threesMade.low} high={forecasts.threesMade.high} trend={forecasts.threesMade.trend} seasonAvg={seasonAverages?.fg3m} />
          <StatCard label="Turnovers" mid={forecasts.turnovers.mid} low={forecasts.turnovers.low} high={forecasts.turnovers.high} trend={forecasts.turnovers.trend} seasonAvg={seasonAverages?.turnover} />
        </div>
      </section>

      {/* Combo Stat Cards */}
      <section>
        <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wider mb-4">Combo Stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="PRA" mid={forecasts.pra.mid} low={forecasts.pra.low} high={forecasts.pra.high} compact />
          <StatCard label="Pts+Ast" mid={forecasts.pointsAssists.mid} low={forecasts.pointsAssists.low} high={forecasts.pointsAssists.high} compact />
          <StatCard label="Pts+Reb" mid={forecasts.pointsRebounds.mid} low={forecasts.pointsRebounds.low} high={forecasts.pointsRebounds.high} compact />
          <StatCard label="Reb+Ast" mid={forecasts.reboundsAssists.mid} low={forecasts.reboundsAssists.low} high={forecasts.reboundsAssists.high} compact />
          <StatCard label="Stocks" mid={forecasts.stocks.mid} low={forecasts.stocks.low} high={forecasts.stocks.high} compact />
          <StatCard label="DK Score" mid={forecasts.fantasyScore.mid} low={forecasts.fantasyScore.low} high={forecasts.fantasyScore.high} compact />
        </div>
      </section>

      {/* Special Props */}
      <section>
        <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wider mb-4">Special Props</h2>
        <div className="flex flex-wrap gap-3">
          <ProbabilityPill label="Double-Double" probability={forecasts.doubleDouble.probability} />
          <ProbabilityPill label="Triple-Double" probability={forecasts.tripleDouble.probability} />
        </div>
      </section>

      {/* Sparklines */}
      {gameLogs.length > 0 && (
        <section>
          <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wider mb-4">Recent Form</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Sparkline label="Points" values={ptsHistory} forecastMid={forecasts.points.mid} />
            <Sparkline label="Rebounds" values={rebHistory} forecastMid={forecasts.rebounds.mid} />
            <Sparkline label="Assists" values={astHistory} forecastMid={forecasts.assists.mid} />
          </div>
        </section>
      )}

      {/* Key Factors */}
      {keyFactors.length > 0 && (
        <section className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-4">Key Factors</h2>
          <div className="space-y-3">
            {keyFactors.map((factor, i) => (
              <div key={i} className="flex items-start gap-3">
                <ImpactDot impact={factor.impact} />
                <div>
                  <span className="text-white text-sm font-semibold">{factor.factor}: </span>
                  <span className="text-slate-400 text-sm">{factor.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI Analysis */}
      {analysis && (
        <section className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-white font-bold text-lg">AI Analysis</h2>
          </div>
          <p className="text-slate-300 leading-relaxed text-sm">{analysis}</p>
        </section>
      )}

      {/* Betting Context */}
      {bettingContext && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-slate-400 font-semibold text-sm uppercase tracking-wider mb-2">Prop Context</h2>
          <p className="text-slate-400 text-sm leading-relaxed">{bettingContext}</p>
        </section>
      )}
    </div>
  );
}

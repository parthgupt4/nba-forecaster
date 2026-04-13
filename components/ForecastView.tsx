'use client';

import type { ForecastApiResponse } from '@/lib/types';
import StatCard from './StatCard';
import Sparkline from './Sparkline';
import PlayerAvatar from './PlayerAvatar';

interface Props {
  data: ForecastApiResponse;
}

function ImpactDot({ impact }: { impact: 'positive' | 'negative' | 'neutral' }) {
  const color =
    impact === 'positive'
      ? 'bg-emerald-400'
      : impact === 'negative'
      ? 'bg-rose-400'
      : 'bg-slate-500';
  return <div className={`w-2 h-2 shrink-0 mt-1.5 ${color}`} />;
}

function ProbabilityPill({ label, probability }: { label: string; probability: number }) {
  const pct = Math.round(probability <= 1 ? probability * 100 : probability);
  const color =
    pct >= 50
      ? 'border-emerald-700 text-emerald-400'
      : pct >= 25
      ? 'border-yellow-700 text-yellow-400'
      : 'border-slate-700 text-slate-400';

  return (
    <div className={`flex flex-col items-center gap-0.5 px-8 py-4 border ${color} bg-slate-800/60`}>
      <span className="text-2xl font-bold tabular-nums">{pct}%</span>
      <span className="text-[11px] font-medium uppercase tracking-widest opacity-70">{label}</span>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value <= 1 ? value * 100 : value);
  const color =
    pct >= 75 ? 'bg-emerald-500' : pct >= 55 ? 'bg-yellow-500' : 'bg-rose-500';
  return (
    <div className="space-y-1.5 min-w-48">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500 uppercase tracking-wider font-medium">Confidence</span>
        <span className="text-white font-bold tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-700 overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-700`}
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

  const ptsHistory = gameLogs.slice(0, 10).map((g) => g.pts);
  const rebHistory = gameLogs.slice(0, 10).map((g) => g.reb);
  const astHistory = gameLogs.slice(0, 10).map((g) => g.ast);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Player Header */}
      <div className="bg-slate-800 border border-slate-700 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <PlayerAvatar
            playerId={playerInfo.id}
            firstName={playerInfo.first_name}
            lastName={playerInfo.last_name}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white tracking-tight leading-none">{playerName}</h1>
            <p className="text-slate-400 text-sm mt-1">
              {playerInfo.team.full_name}
              {playerInfo.position && (
                <span className="text-slate-600 mx-1.5">·</span>
              )}
              {playerInfo.position && <span>{playerInfo.position}</span>}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-300">
                vs{' '}
                <span className="text-white font-semibold">{opponent}</span>
                <span className="text-slate-600 mx-1.5">·</span>
                <span className="text-slate-400">{gameDate}</span>
              </span>
              <span
                className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider border ${
                  isHome
                    ? 'border-blue-700 text-blue-400 bg-blue-500/10'
                    : 'border-slate-600 text-slate-400'
                }`}
              >
                {isHome ? 'Home' : 'Away'}
              </span>
              {forecast.game.vegasTotal != null && (
                <span className="px-2 py-0.5 text-xs font-bold border border-slate-600 text-slate-400 bg-slate-700/50">
                  O/U {forecast.game.vegasTotal}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 self-start sm:self-center">
            <ConfidenceBar value={forecast.confidence} />
          </div>
        </div>
      </div>

      {/* Minutes Projected */}
      <div className="bg-slate-800 border border-slate-700 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest block">Minutes Projected</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-white text-2xl font-bold tabular-nums">{forecasts.minutesProjected.mid}</span>
              <span className="text-slate-500 text-sm tabular-nums">
                {forecasts.minutesProjected.low}–{forecasts.minutesProjected.high}
              </span>
            </div>
          </div>
        </div>
        {minutesNote && (
          <p className="text-slate-500 text-sm sm:ml-4 sm:border-l sm:border-slate-700 sm:pl-4 leading-relaxed">{minutesNote}</p>
        )}
      </div>

      {/* Primary Stat Cards */}
      <section>
        <h2 className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-3">Primary Stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-slate-700">
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
        <h2 className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-3">Combo Stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-slate-700">
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
        <h2 className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-3">Special Props</h2>
        <div className="flex flex-wrap gap-px bg-slate-700 w-fit">
          <ProbabilityPill label="Double-Double" probability={forecasts.doubleDouble.probability} />
          <ProbabilityPill label="Triple-Double" probability={forecasts.tripleDouble.probability} />
        </div>
      </section>

      {/* Sparklines */}
      {gameLogs.length > 0 && (
        <section>
          <h2 className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-3">Recent Form</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-700">
            <Sparkline label="Points" values={ptsHistory} forecastMid={forecasts.points.mid} />
            <Sparkline label="Rebounds" values={rebHistory} forecastMid={forecasts.rebounds.mid} />
            <Sparkline label="Assists" values={astHistory} forecastMid={forecasts.assists.mid} />
          </div>
        </section>
      )}

      {/* Key Factors */}
      {keyFactors.length > 0 && (
        <section className="bg-slate-800 border border-slate-700 p-6">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Key Factors</h2>
          <div className="space-y-3">
            {keyFactors.map((factor, i) => (
              <div key={i} className="flex items-start gap-3">
                <ImpactDot impact={factor.impact} />
                <div>
                  <span className="text-slate-200 text-sm font-semibold">{factor.factor}: </span>
                  <span className="text-slate-400 text-sm">{factor.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI Analysis */}
      {analysis && (
        <section className="bg-slate-800 border border-slate-700 p-6">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">AI Analysis</h2>
          <p className="text-slate-400 leading-relaxed text-sm">{analysis}</p>
        </section>
      )}

      {/* Betting Context */}
      {bettingContext && (
        <section className="border border-slate-800 p-5 bg-slate-900">
          <h2 className="text-slate-500 font-semibold text-[11px] uppercase tracking-widest mb-2">Prop Context</h2>
          <p className="text-slate-500 text-sm leading-relaxed">{bettingContext}</p>
        </section>
      )}
    </div>
  );
}

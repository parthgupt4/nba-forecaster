'use client';

interface SparklineProps {
  label: string;
  values: number[];
  forecastMid: number;
}

export default function Sparkline({ label, values, forecastMid }: SparklineProps) {
  if (!values || values.length === 0) return null;

  const displayVals = [...values].reverse(); // oldest → newest
  const allVals = [...displayVals, forecastMid];
  const maxVal = Math.max(...allVals) * 1.15;
  const range = maxVal || 1;

  const forecastPct = (forecastMid / range) * 100;

  return (
    <div className="bg-slate-800 px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-blue-400 text-xs tabular-nums">proj {forecastMid.toFixed(1)}</span>
      </div>

      <div className="relative">
        {/* Forecast dotted line */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-blue-500/40 pointer-events-none"
          style={{ bottom: `${forecastPct}%`, height: 0 }}
        />

        {/* Bars */}
        <div className="flex items-end gap-1 h-16">
          {displayVals.map((v, i) => {
            const heightPct = Math.max((v / range) * 100, 3);
            const isHigh = v / range > 0.7;
            return (
              <div key={i} className="flex-1">
                <div
                  className={`w-full ${isHigh ? 'bg-blue-500' : 'bg-slate-600'}`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1 mt-1 border-t border-slate-700 pt-1">
          {displayVals.map((v, i) => (
            <div key={i} className="flex-1 text-center">
              <span className="text-slate-600 text-[9px] tabular-nums">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
  const minVal = 0;
  const range = maxVal - minVal || 1;

  const barColor = (v: number) => {
    const ratio = (v - minVal) / range;
    if (ratio > 0.7) return 'bg-blue-500';
    if (ratio > 0.4) return 'bg-blue-400';
    return 'bg-slate-500';
  };

  const forecastPct = ((forecastMid - minVal) / range) * 100;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-300 text-sm font-semibold">{label} — Last 10 Games</span>
        <span className="text-blue-400 text-xs font-medium">Forecast: {forecastMid.toFixed(1)}</span>
      </div>

      <div className="relative">
        {/* Forecast dotted line */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-blue-400/60 pointer-events-none"
          style={{ bottom: `${forecastPct}%`, height: 0 }}
        />

        {/* Bars */}
        <div className="flex items-end gap-1.5 h-20">
          {displayVals.map((v, i) => {
            const heightPct = Math.max(((v - minVal) / range) * 100, 4);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t ${barColor(v)} transition-all`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex items-center gap-1.5 mt-1">
          {displayVals.map((_, i) => (
            <div key={i} className="flex-1 text-center">
              <span className="text-slate-600 text-[9px]">
                {displayVals.length - i}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

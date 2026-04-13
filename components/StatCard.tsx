import type { Trend } from '@/lib/types';

interface StatCardProps {
  label: string;
  mid: number;
  low: number;
  high: number;
  trend?: Trend;
  seasonAvg?: number;
  compact?: boolean;
}

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === 'up') {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-400 text-xs font-semibold">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        </svg>
        HOT
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="inline-flex items-center gap-0.5 text-rose-400 text-xs font-semibold">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
        COLD
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-slate-400 text-xs font-semibold">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
      </svg>
      STEADY
    </span>
  );
}

export default function StatCard({
  label,
  mid,
  low,
  high,
  trend,
  seasonAvg,
  compact = false,
}: StatCardProps) {
  const diff = seasonAvg != null ? mid - seasonAvg : null;
  const diffStr =
    diff != null
      ? (diff >= 0 ? '+' : '') + diff.toFixed(1) + ' vs avg'
      : null;
  const diffColor =
    diff != null && diff > 0
      ? 'text-emerald-400'
      : diff != null && diff < 0
      ? 'text-rose-400'
      : 'text-slate-400';

  return (
    <div
      className={`bg-slate-800 border border-slate-700 rounded-2xl flex flex-col gap-1 ${
        compact ? 'px-4 py-3' : 'px-5 py-4'
      } hover:border-slate-600 transition-colors`}
    >
      <div className="flex items-center justify-between">
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
          {label}
        </span>
        {trend && <TrendIcon trend={trend} />}
      </div>

      <div className={`font-bold text-white ${compact ? 'text-3xl' : 'text-4xl'}`}>
        {mid.toFixed(1)}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-slate-500 text-xs">
          {low.toFixed(1)} – {high.toFixed(1)}
        </span>
        {diffStr && (
          <span className={`text-xs font-medium ${diffColor}`}>{diffStr}</span>
        )}
      </div>
    </div>
  );
}

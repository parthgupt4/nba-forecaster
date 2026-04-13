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
      <span className="inline-flex items-center gap-0.5 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        </svg>
        Hot
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="inline-flex items-center gap-0.5 text-rose-400 text-[10px] font-bold uppercase tracking-widest">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
        Cold
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
      </svg>
      Avg
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
      ? (diff >= 0 ? '+' : '') + diff.toFixed(1)
      : null;
  const diffColor =
    diff != null && diff > 0.05
      ? 'text-emerald-400'
      : diff != null && diff < -0.05
      ? 'text-rose-400'
      : 'text-slate-500';

  return (
    <div
      className={`bg-slate-800 flex flex-col gap-1 ${
        compact ? 'px-4 py-3' : 'px-5 py-4'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest">
          {label}
        </span>
        {trend && <TrendIcon trend={trend} />}
      </div>

      <div className={`font-bold text-white tabular-nums leading-none ${compact ? 'text-3xl' : 'text-4xl'}`}>
        {mid.toFixed(1)}
      </div>

      <div className="flex items-center justify-between mt-0.5">
        <span className="text-slate-600 text-xs tabular-nums">
          {low.toFixed(1)}–{high.toFixed(1)}
        </span>
        {diffStr && (
          <span className={`text-[10px] font-semibold tabular-nums ${diffColor}`}>
            {diffStr} vs avg
          </span>
        )}
      </div>
    </div>
  );
}

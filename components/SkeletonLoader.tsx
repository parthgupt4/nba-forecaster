export default function SkeletonLoader() {
  return (
    <div className="min-h-screen bg-slate-900 text-white animate-pulse">
      {/* Header skeleton */}
      <div className="border-b border-slate-800 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="h-6 w-32 bg-slate-700 rounded" />
          <div className="h-4 w-24 bg-slate-700 rounded" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Player header skeleton */}
        <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-slate-700" />
            <div className="space-y-2">
              <div className="h-8 w-56 bg-slate-700 rounded" />
              <div className="h-4 w-40 bg-slate-700 rounded" />
              <div className="h-4 w-48 bg-slate-700 rounded" />
            </div>
          </div>
        </div>

        {/* Primary stat cards skeleton */}
        <div>
          <div className="h-5 w-40 bg-slate-700 rounded mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 space-y-3">
                <div className="h-3 w-16 bg-slate-700 rounded" />
                <div className="h-10 w-20 bg-slate-700 rounded" />
                <div className="h-3 w-24 bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Combo cards skeleton */}
        <div>
          <div className="h-5 w-36 bg-slate-700 rounded mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 space-y-2">
                <div className="h-3 w-12 bg-slate-700 rounded" />
                <div className="h-8 w-14 bg-slate-700 rounded" />
                <div className="h-3 w-20 bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Sparklines skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 space-y-3">
              <div className="h-4 w-40 bg-slate-700 rounded" />
              <div className="h-20 bg-slate-700 rounded" />
            </div>
          ))}
        </div>

        {/* Analysis skeleton */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-3">
          <div className="h-5 w-32 bg-slate-700 rounded" />
          <div className="space-y-2">
            {[92, 100, 87, 95, 79].map((w, i) => (
              <div key={i} className="h-4 bg-slate-700 rounded" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

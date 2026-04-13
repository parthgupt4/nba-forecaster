export default function SkeletonLoader() {
  return (
    <div className="min-h-screen bg-slate-900 text-white animate-pulse">
      <div className="border-b border-slate-800 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="h-5 w-28 bg-slate-800" />
          <div className="h-4 w-16 bg-slate-800" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Player header */}
        <div className="bg-slate-800 p-6 border border-slate-700">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-slate-700 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-52 bg-slate-700" />
              <div className="h-4 w-36 bg-slate-700" />
              <div className="h-4 w-48 bg-slate-700" />
            </div>
            <div className="w-44 space-y-2">
              <div className="h-3 w-full bg-slate-700" />
              <div className="h-1.5 w-full bg-slate-700" />
            </div>
          </div>
        </div>

        {/* Minutes bar */}
        <div className="bg-slate-800 border border-slate-700 px-5 py-4 h-16" />

        {/* Primary stat cards */}
        <div>
          <div className="h-3 w-24 bg-slate-800 mb-3" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-slate-700">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="bg-slate-800 px-5 py-4 space-y-2">
                <div className="h-2.5 w-14 bg-slate-700" />
                <div className="h-10 w-16 bg-slate-700" />
                <div className="h-2.5 w-20 bg-slate-700" />
              </div>
            ))}
          </div>
        </div>

        {/* Combo cards */}
        <div>
          <div className="h-3 w-20 bg-slate-800 mb-3" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-slate-700">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-slate-800 px-4 py-3 space-y-2">
                <div className="h-2.5 w-10 bg-slate-700" />
                <div className="h-8 w-12 bg-slate-700" />
                <div className="h-2.5 w-16 bg-slate-700" />
              </div>
            ))}
          </div>
        </div>

        {/* Sparklines */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-700">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-800 px-5 py-4 space-y-3">
              <div className="h-3 w-32 bg-slate-700" />
              <div className="h-16 bg-slate-700" />
            </div>
          ))}
        </div>

        {/* Analysis */}
        <div className="bg-slate-800 border border-slate-700 p-6 space-y-3">
          <div className="h-3 w-24 bg-slate-700" />
          <div className="space-y-2">
            {[92, 100, 87, 95, 79].map((w, i) => (
              <div key={i} className="h-3.5 bg-slate-700" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

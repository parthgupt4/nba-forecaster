import SearchBar from '@/components/SearchBar';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-slate-900 min-h-screen">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <span className="text-white font-bold text-xl tracking-tight">
            Stat<span className="text-blue-400">Cast</span>
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-slate-700 text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">
            <div className="w-1.5 h-1.5 bg-blue-400" />
            AI-Powered NBA Forecasts
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-white tracking-tight">
            Stat<span className="text-blue-400">Cast</span>
          </h1>
          <p className="text-slate-500 text-base max-w-md mx-auto leading-relaxed">
            AI-powered stat projections for any NBA player&apos;s next game, built on real data and Claude.
          </p>
        </div>

        <SearchBar />

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-px bg-slate-800 max-w-3xl w-full border border-slate-800">
          {[
            { label: 'Data-Rich', desc: 'Last 15 game logs, season averages, and opponent defensive stats' },
            { label: 'Vegas Context', desc: 'Game totals integrated for pace and scoring environment' },
            { label: 'Claude AI', desc: '18 factors analyzed to produce ranges and combo props' },
          ].map((f) => (
            <div key={f.label} className="bg-slate-900 p-5">
              <h3 className="text-slate-300 text-sm font-semibold mb-1">{f.label}</h3>
              <p className="text-slate-600 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-800 px-6 py-4">
        <p className="text-center text-slate-700 text-xs">
          Forecasts are AI-generated estimates for entertainment purposes. Not financial advice.
        </p>
      </footer>
    </div>
  );
}

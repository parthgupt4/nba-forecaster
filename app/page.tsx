import SearchBar from '@/components/SearchBar';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-slate-900 min-h-screen">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <span className="text-white font-black text-xl tracking-tight">
            Stat<span className="text-blue-400">Cast</span>
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            AI-Powered NBA Forecasts
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight">
            Stat<span className="text-blue-400">Cast</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            Get AI-powered stat projections for any NBA player&apos;s next game, powered by real data and Claude.
          </p>
        </div>

        <SearchBar />

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
          {[
            { icon: '📊', title: 'Data-Rich', desc: 'Last 15 game logs, season averages, and opponent defensive stats' },
            { icon: '🎰', title: 'Vegas Context', desc: 'Vegas game totals integrated for pace and scoring environment' },
            { icon: '🤖', title: 'Claude AI', desc: '18 factors analyzed to produce point ranges and combo props' },
          ].map((f) => (
            <div key={f.title} className="bg-slate-800/50 border border-slate-800 rounded-2xl p-5 text-center">
              <div className="text-3xl mb-2">{f.icon}</div>
              <h3 className="text-white font-bold mb-1">{f.title}</h3>
              <p className="text-slate-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-800 px-6 py-4">
        <p className="text-center text-slate-600 text-xs">
          Forecasts are AI-generated estimates for entertainment purposes. Not financial advice.
        </p>
      </footer>
    </div>
  );
}

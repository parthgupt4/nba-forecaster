'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { BDLPlayer } from '@/lib/types';

interface RecentPlayer {
  id: number;
  name: string;
  team: string;
  position: string;
}

const RECENT_KEY = 'statcast_recent_players';

function getRecentPlayers(): RecentPlayer[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveRecentPlayer(player: BDLPlayer) {
  if (typeof window === 'undefined') return;
  const recent = getRecentPlayers().filter((p) => p.id !== player.id);
  const entry: RecentPlayer = {
    id: player.id,
    name: `${player.first_name} ${player.last_name}`,
    team: player.team?.full_name ?? '',
    position: player.position ?? '',
  };
  const updated = [entry, ...recent].slice(0, 5);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BDLPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<RecentPlayer[]>([]);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecent(getRecentPlayers());
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data: BDLPlayer[] = await res.json();
      setResults(data);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  }

  function handleSelect(player: BDLPlayer) {
    saveRecentPlayer(player);
    setQuery('');
    setOpen(false);
    setResults([]);
    router.push(`/player/${player.id}`);
  }

  function handleRecentSelect(p: RecentPlayer) {
    setOpen(false);
    router.push(`/player/${p.id}`);
  }

  const showDropdown = open && (results.length > 0 || loading);
  const showRecent = !open && recent.length > 0;

  return (
    <div className="relative w-full max-w-2xl" ref={containerRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder="Search any NBA player..."
          className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-lg focus:outline-none focus:border-blue-600 transition-colors"
          autoComplete="off"
        />
        {loading && (
          <div className="absolute inset-y-0 right-4 flex items-center">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-px w-full bg-slate-800 border border-slate-700 overflow-hidden">
          {results.map((player) => (
            <button
              key={player.id}
              onClick={() => handleSelect(player)}
              className="w-full text-left px-5 py-3 hover:bg-slate-700 flex items-center gap-3 transition-colors border-b border-slate-700/60 last:border-0"
            >
              <div className="w-8 h-8 bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                {player.first_name[0]}{player.last_name[0]}
              </div>
              <div>
                <div className="text-white text-sm font-semibold">
                  {player.first_name} {player.last_name}
                </div>
                <div className="text-slate-500 text-xs">
                  {player.team?.full_name}{player.position ? ` · ${player.position}` : ''}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showRecent && (
        <div className="mt-8">
          <p className="text-slate-600 text-[11px] font-semibold mb-3 uppercase tracking-widest">Recent</p>
          <div className="flex flex-wrap gap-2">
            {recent.map((p) => (
              <button
                key={p.id}
                onClick={() => handleRecentSelect(p)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 text-sm transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import type { ForecastApiResponse } from '@/lib/types';
import ForecastView from '@/components/ForecastView';
import SkeletonLoader from '@/components/SkeletonLoader';
import { saveRecentPlayer } from '@/components/SearchBar';

export default function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<ForecastApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchForecast() {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const res = await fetch(`/api/player/${id}/forecast`);
        const json = await res.json();
        if (!cancelled) {
          if (!res.ok) {
            setError(json.error ?? 'Failed to load forecast.');
          } else {
            setData(json as ForecastApiResponse);
            // Save to recent searches
            saveRecentPlayer(json.playerInfo);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Network error.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchForecast();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <SkeletonLoader />;

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <header className="border-b border-slate-800 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-white font-black text-xl tracking-tight">
              Stat<span className="text-blue-400">Cast</span>
            </Link>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-4">
          <div className="text-center max-w-md space-y-4">
            <div className="text-6xl">🏀</div>
            <h2 className="text-white text-2xl font-bold">No Game Found</h2>
            <p className="text-slate-400">{error}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors"
            >
              ← Search Another Player
            </Link>
          </div>
        </div>

        <footer className="border-t border-slate-800 px-6 py-4">
          <p className="text-center text-slate-600 text-xs">
            Forecasts are AI-generated estimates for entertainment purposes. Not financial advice.
          </p>
        </footer>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="border-b border-slate-800 px-6 py-4 sticky top-0 z-40 bg-slate-900/95 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-white font-black text-xl tracking-tight">
            Stat<span className="text-blue-400">Cast</span>
          </Link>
          <Link
            href="/"
            className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Search
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <ForecastView data={data} />
      </main>

      <footer className="border-t border-slate-800 px-6 py-4 mt-8">
        <p className="text-center text-slate-600 text-xs">
          Forecasts are AI-generated estimates for entertainment purposes. Not financial advice.
        </p>
      </footer>
    </div>
  );
}

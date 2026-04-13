import { searchPlayers } from '@/lib/balldontlie';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query || query.trim().length < 2) {
    return Response.json([]);
  }

  console.log('[/api/search] query:', query);
  try {
    const players = await searchPlayers(query.trim());
    console.log('[/api/search] returning', players.length, 'players');
    return Response.json(players);
  } catch (err) {
    console.error('[/api/search] error:', err);
    return Response.json({ error: 'Search failed', detail: String(err) }, { status: 500 });
  }
}

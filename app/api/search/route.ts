import { searchPlayers } from '@/lib/balldontlie';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query || query.trim().length < 2) {
    return Response.json([]);
  }

  try {
    const players = await searchPlayers(query.trim());
    return Response.json(players);
  } catch (err) {
    console.error('Search error:', err);
    return Response.json({ error: 'Search failed' }, { status: 500 });
  }
}

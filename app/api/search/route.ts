import { searchPlayers } from '@/lib/balldontlie';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query || query.trim().length < 2) {
    return Response.json([]);
  }

  // BDL search breaks on multi-word queries (e.g. "Stephen Curry" returns 0).
  // Send only the last typed word so partial and full-name queries both work,
  // then filter results to entries that match every typed token.
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const searchTerm = tokens[tokens.length - 1];

  console.log('[/api/search] query:', query, '→ BDL term:', searchTerm);
  try {
    const players = await searchPlayers(searchTerm);
    const filtered =
      tokens.length > 1
        ? players.filter((p) => {
            const full = `${p.first_name} ${p.last_name}`.toLowerCase();
            return tokens.every((t) => full.includes(t));
          })
        : players;
    console.log('[/api/search] returning', filtered.length, 'players');
    return Response.json(filtered);
  } catch (err) {
    console.error('[/api/search] error:', err);
    return Response.json({ error: 'Search failed', detail: String(err) }, { status: 500 });
  }
}

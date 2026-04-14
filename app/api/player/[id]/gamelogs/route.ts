import { getPlayer, getNbaStatsPlayerId, getGameLogs } from '@/lib/balldontlie';
import type { NextRequest } from 'next/server';

type Params = { id: string };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  const playerId = parseInt(id, 10);
  if (isNaN(playerId)) {
    return Response.json({ error: 'Invalid player ID' }, { status: 400 });
  }

  try {
    const playerInfo = await getPlayer(playerId);
    const nbaStatsId = await getNbaStatsPlayerId(
      playerInfo.first_name,
      playerInfo.last_name
    );
    const logs = await getGameLogs(nbaStatsId);
    return Response.json(logs);
  } catch (err) {
    console.error('Game logs error:', err);
    return Response.json({ error: 'Failed to fetch game logs' }, { status: 500 });
  }
}

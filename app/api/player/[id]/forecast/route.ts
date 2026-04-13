import Anthropic from '@anthropic-ai/sdk';
import {
  getPlayer,
  getGameLogs,
  getSeasonAverages,
  getNextGame,
  getOpponentDefStats,
} from '@/lib/balldontlie';
import { getVegasTotal } from '@/lib/odds';
import { buildForecastPrompt, parseForecastJson } from '@/lib/forecast';
import type { NextRequest } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
    // 1. Fetch player info, game logs, and season averages in parallel
    const [playerInfo, gameLogs, seasonAverages] = await Promise.all([
      getPlayer(playerId),
      getGameLogs(playerId),
      getSeasonAverages(playerId),
    ]);

    // 2. Find next scheduled game
    const nextGame = await getNextGame(playerInfo.team.id);
    if (!nextGame) {
      return Response.json(
        { error: 'No upcoming game found for this player.' },
        { status: 404 }
      );
    }

    // 3. Determine opponent team ID
    const isHome = nextGame.home_team.id === playerInfo.team.id;
    const opponentTeam = isHome ? nextGame.visitor_team : nextGame.home_team;

    // 4. Fetch opponent def stats and Vegas total in parallel
    const [opponentDefStats, vegasTotal] = await Promise.all([
      getOpponentDefStats(opponentTeam.id),
      getVegasTotal(
        nextGame.home_team.abbreviation,
        nextGame.visitor_team.abbreviation
      ),
    ]);

    // 5. Build prompt
    const { system, user } = buildForecastPrompt(
      playerInfo,
      seasonAverages,
      gameLogs,
      nextGame,
      opponentDefStats,
      vegasTotal
    );

    // 6. Call Claude with prompt caching on the system prompt
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: [
        {
          type: 'text',
          text: system,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: user }],
    });

    const rawContent = message.content[0];
    if (rawContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // 7. Parse and return
    const forecast = parseForecastJson(rawContent.text);

    return Response.json({
      forecast,
      playerInfo,
      gameLogs,
      seasonAverages,
      nextGame,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Forecast error:', message);

    if (message === 'No upcoming game found for this player.') {
      return Response.json({ error: message }, { status: 404 });
    }
    return Response.json(
      { error: `Forecast generation failed: ${message}` },
      { status: 500 }
    );
  }
}

import Anthropic from '@anthropic-ai/sdk';
import {
  getPlayer,
  getNbaStatsPlayerId,
  getGameLogs,
  getSeasonAverages,
  getNextGame,
  getAllTeamsOpponentStats,
  getAllTeamsPaceStats,
} from '@/lib/balldontlie';
import { getVegasTotal } from '@/lib/odds';
import { computeForecast, buildAnalysisPrompt } from '@/lib/forecast';
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
    // 1. Fetch player info and league-wide team stats in parallel (no dependencies)
    const [playerInfo, opponentRows, paceRows] = await Promise.all([
      getPlayer(playerId),
      getAllTeamsOpponentStats(),
      getAllTeamsPaceStats(),
    ]);

    // 2. Resolve the NBA Stats player ID from the player's name
    const nbaStatsId = await getNbaStatsPlayerId(
      playerInfo.first_name,
      playerInfo.last_name
    );

    // 3. Fetch per-player data and schedule in parallel
    const [gameLogs, seasonAverages, nextGame] = await Promise.all([
      getGameLogs(nbaStatsId),
      getSeasonAverages(nbaStatsId),
      getNextGame(playerInfo.team.id),
    ]);

    if (!nextGame) {
      return Response.json(
        { error: 'No upcoming game found for this player.' },
        { status: 404 }
      );
    }

    // 4. Fetch Vegas total (needs team abbreviations from nextGame)
    const vegasTotal = await getVegasTotal(
      nextGame.home_team.abbreviation,
      nextGame.visitor_team.abbreviation
    );

    // 5. Compute the full statistical forecast (pure math, no API calls)
    const forecast = computeForecast(
      playerInfo,
      gameLogs,
      seasonAverages,
      nextGame,
      opponentRows,
      paceRows,
      vegasTotal
    );

    // 6. Call Claude for analysis text only (~300-500 tokens)
    const analysisPrompt = buildAnalysisPrompt(
      playerInfo,
      forecast,
      seasonAverages,
      nextGame
    );

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: analysisPrompt }],
    });

    const rawText =
      message.content[0].type === 'text' ? message.content[0].text : '{}';

    let analysisFields: {
      analysis?: string;
      minutesNote?: string;
      bettingContext?: string;
    } = {};
    try {
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      analysisFields = JSON.parse(cleaned);
    } catch {
      // If Claude returns unexpected output, leave text fields empty
      console.error('[forecast] failed to parse Claude analysis JSON:', rawText.slice(0, 200));
    }

    // 7. Merge analysis text into the computed forecast
    const finalForecast = {
      ...forecast,
      analysis:       analysisFields.analysis       ?? '',
      minutesNote:    analysisFields.minutesNote    ?? '',
      bettingContext: analysisFields.bettingContext ?? '',
    };

    return Response.json({
      forecast: finalForecast,
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

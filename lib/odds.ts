const ODDS_BASE = 'https://api.the-odds-api.com/v4';

interface OddsOutcome {
  name: string;
  price: number;
  point?: number;
}

interface OddsMarket {
  key: string;
  outcomes: OddsOutcome[];
}

interface OddsBookmaker {
  key: string;
  title: string;
  markets: OddsMarket[];
}

interface OddsGame {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsBookmaker[];
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

function teamsMatch(bdlAbbr: string, oddsName: string): boolean {
  // Map BDL abbreviations to common team name fragments
  const abbrevMap: Record<string, string[]> = {
    ATL: ['hawks', 'atlanta'],
    BOS: ['celtics', 'boston'],
    BKN: ['nets', 'brooklyn'],
    CHA: ['hornets', 'charlotte'],
    CHI: ['bulls', 'chicago'],
    CLE: ['cavaliers', 'cleveland'],
    DAL: ['mavericks', 'dallas'],
    DEN: ['nuggets', 'denver'],
    DET: ['pistons', 'detroit'],
    GSW: ['warriors', 'golden'],
    HOU: ['rockets', 'houston'],
    IND: ['pacers', 'indiana'],
    LAC: ['clippers', 'clippers'],
    LAL: ['lakers', 'angeles'],
    MEM: ['grizzlies', 'memphis'],
    MIA: ['heat', 'miami'],
    MIL: ['bucks', 'milwaukee'],
    MIN: ['timberwolves', 'minnesota'],
    NOP: ['pelicans', 'orleans'],
    NYK: ['knicks', 'knicks'],
    OKC: ['thunder', 'oklahoma'],
    ORL: ['magic', 'orlando'],
    PHI: ['76ers', 'philadelphia'],
    PHX: ['suns', 'phoenix'],
    POR: ['blazers', 'portland'],
    SAC: ['kings', 'sacramento'],
    SAS: ['spurs', 'antonio'],
    TOR: ['raptors', 'toronto'],
    UTA: ['jazz', 'utah'],
    WAS: ['wizards', 'washington'],
  };

  const fragments = abbrevMap[bdlAbbr.toUpperCase()] ?? [];
  const normalizedOdds = normalize(oddsName);
  return fragments.some((f) => normalizedOdds.includes(normalize(f)));
}

export async function getVegasTotal(
  homeTeamAbbr: string,
  awayTeamAbbr: string
): Promise<number | null> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `${ODDS_BASE}/sports/basketball_nba/odds/?apiKey=${apiKey}&regions=us&markets=totals&bookmakers=draftkings,fanduel`,
      { next: { revalidate: 1800 } }
    );

    if (!res.ok) return null;

    const games: OddsGame[] = await res.json();

    const match = games.find((g) => {
      const homeMatch = teamsMatch(homeTeamAbbr, g.home_team);
      const awayMatch = teamsMatch(awayTeamAbbr, g.away_team);
      const crossHomeMatch = teamsMatch(awayTeamAbbr, g.home_team);
      const crossAwayMatch = teamsMatch(homeTeamAbbr, g.away_team);
      return (homeMatch && awayMatch) || (crossHomeMatch && crossAwayMatch);
    });

    if (!match) return null;

    for (const bookmaker of match.bookmakers) {
      const totalsMarket = bookmaker.markets.find((m) => m.key === 'totals');
      if (!totalsMarket) continue;
      const overOutcome = totalsMarket.outcomes.find((o) => o.name === 'Over');
      if (overOutcome?.point != null) return overOutcome.point;
    }

    return null;
  } catch {
    return null;
  }
}

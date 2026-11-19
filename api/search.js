// GET /api/search?q=lebron
// Searches ESPN for PLAYERS ONLY (teams, leagues, articles are filtered out).

const SUPPORTED = new Set([
  'nba', 'wnba', 'mens-college-basketball', 'womens-college-basketball',
  'nfl', 'college-football',
  'mlb',
  'nhl',
]);

module.exports = async function handler(req, res) {
  const q = String((req.query && req.query.q) || '').trim();
  if (q.length < 2) {
    return res.status(400).json({ error: 'Type at least 2 letters of a player name.' });
  }

  try {
    const url =
      'https://site.web.api.espn.com/apis/search/v2?limit=25&type=player&query=' +
      encodeURIComponent(q);
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) throw new Error('ESPN search returned ' + r.status);
    const data = await r.json();

    const players = [];
    for (const group of data.results || []) {
      if (group.type !== 'player') continue; // players only
      for (const c of group.contents || []) {
        const league = c.defaultLeagueSlug;
        if (!SUPPORTED.has(league)) continue;
        const m = /~a:(\d+)/.exec(c.uid || '');
        if (!m) continue;
        players.push({
          id: m[1],
          name: c.displayName,
          sport: c.sport,
          league,
          leagueName: c.description || league.toUpperCase(),
          team: c.subtitle || '',
          headshot: (c.image && c.image.default) || '',
        });
      }
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ players });
  } catch (err) {
    return res.status(502).json({ error: 'Could not reach the stats service. Try again.' });
  }
};

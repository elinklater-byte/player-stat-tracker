// GET /api/player?sport=basketball&league=nba&id=1035
// Returns bio (joined league / retired year) plus every season and career totals.

const ALLOWED_SPORTS = new Set(['basketball', 'football', 'baseball', 'hockey']);

async function getJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(url + ' -> ' + r.status);
  return r.json();
}

module.exports = async function handler(req, res) {
  const { sport, league, id } = req.query || {};
  if (!ALLOWED_SPORTS.has(sport) || !/^[a-z-]+$/.test(league || '') || !/^\d+$/.test(id || '')) {
    return res.status(400).json({ error: 'Bad player request.' });
  }

  const base = `https://site.web.api.espn.com/apis/common/v3/sports/${sport}/${league}/athletes/${id}`;

  try {
    const [bio, stats] = await Promise.all([
      getJson(base).catch(() => null),
      getJson(base + '/stats').catch(() => null),
    ]);
    if (!bio || !bio.athlete) return res.status(404).json({ error: 'Player not found.' });

    const a = bio.athlete;
    const teams = (stats && stats.teams) || {};
    const teamName = (slug) => (teams[slug] && teams[slug].abbreviation) || '';

    const categories = [];
    const seasonMap = new Map();

    for (const c of (stats && stats.categories) || []) {
      const rows = (c.statistics || []).map((s) => {
        const year = s.season && s.season.year;
        const label = (s.season && s.season.displayName) || String(year);
        if (year && !seasonMap.has(year)) seasonMap.set(year, label);
        return { year, label, team: teamName(s.teamSlug), stats: s.stats || [] };
      });
      if (!rows.length) continue;
      categories.push({
        name: c.name,
        title: (c.displayName || c.name || '').trim(),
        labels: c.labels || [],
        fullNames: c.displayNames || c.labels || [],
        rows,
        career: c.totals || [],
      });
    }

    const seasons = [...seasonMap.entries()]
      .map(([year, label]) => ({ year, label }))
      .sort((x, y) => x.year - y.year);

    const active = a.active !== false && !(a.status && a.status.type === 'inactive');
    const firstSeason = seasons[0];
    const lastSeason = seasons[seasons.length - 1];

    const out = {
      id,
      sport,
      league,
      name: a.displayName || a.fullName,
      team: (a.team && a.team.displayName) || '',
      position: (a.position && a.position.displayName) || '',
      headshot: (a.headshot && a.headshot.href) || '',
      active,
      joinedYear: a.debutYear || (firstSeason ? firstSeason.year : null),
      retiredYear: active ? null : lastSeason ? lastSeason.year : null,
      lastSeasonLabel: lastSeason ? lastSeason.label : null,
      draft: a.displayDraft || null,
      seasons,
      categories,
    };

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(out);
  } catch (err) {
    return res.status(502).json({ error: 'Could not reach the stats service. Try again.' });
  }
};

# Stat Tracker

Search any pro player (NBA, WNBA, NFL, MLB, NHL, college basketball and football) and see:

- a specific year or career stats (you type which)
- the year they joined the league and the year they retired
- a specific stat if you want one (you type which)

The **My Stats** tab lets you track your own games. You must pick a sport first; stats are saved in your browser.

## How it works
- `index.html` is the whole front end (no build step).
- `api/search.js` and `api/player.js` are Vercel serverless functions that pull from ESPN's public stats data.

Deploys on Vercel with zero config.

# Chronicle of Crashes (1998–2026)

An interactive archive of landmark software crashes, cloud outages, and cyberattacks from **1998 through 2026**, featuring year-by-year and month-by-month trend charts, root-cause pattern filtering, and technical postmortems.

## Features

- **Interactive Yearly & Monthly Chart** — Toggle between Bar and Line views (`1998–2026`), click any year to filter the timeline, and drill down into monthly distributions.
- **How Failures Evolved (Story Modal)** — Animated 3-era walkthrough (*Worms & Legacy Limits* → *Mega-Breaches & Wipers* → *Cloud Monoculture & Supply Chain*) with auto-play, playback controls, and blast-radius comparisons.
- **Top Impact Spotlight** — Quick-access KPI cards for landmark incidents (NotPetya, CrowdStrike, AWS US-East-1, Microsoft 365, Yahoo Breach, Log4Shell).
- **Multi-Facet Filtering & Search** — Filter by category (`Crash`, `Cyberattack`), severity, source feed, root-cause pattern (e.g., DNS/BGP, Supply Chain, Memory/Integer Bug), year, or era, with dismissible active-filter chips.
- **Postmortem Inspector** — Detailed incident modal with root cause, impact, prevention takeaways, source links, and a **Copy link** button for shareable URLs.
- **Keyboard Shortcuts & Discovery** — Press `/` to focus search, `←` / `→` to step between incidents inside a postmortem, or click **🎲 Random** in the header.
- **Export & Theme** — Export filtered results as **CSV** or **JSON**, and switch between light and dark themes.

## Data Sources

- **Curated** — Hand-researched landmark incidents covering every year from 1998 to 2026.
- **CISA KEV** — Known Exploited Vulnerabilities catalog (`scripts/sync-cisa-kev.mjs`).
- **HIBP** — Have I Been Pwned verified data breaches (`scripts/sync-hibp-breaches.mjs`).
- **Outage Feeds** — Statuspage, GCP Status, and engineering postmortems (`scripts/sync-outages.mjs`).

A GitHub Action (`.github/workflows/sync.yml`) runs monthly (and via `workflow_dispatch`) to keep the external feeds up to date.

## Local Development

```bash
npm install
npm run dev
```

### Other Scripts

| Command | Description |
| --- | --- |
| `npm run build` | Type-check (`tsc -b`) and build production bundle (`vite build`) |
| `npm run preview` | Preview the production build locally |
| `npm run sync:all` | Refresh CISA KEV, HIBP, and outage JSON feeds |
| `npm run sync:kev` | Refresh only `src/data/cisa-kev.json` |
| `npm run sync:hibp` | Refresh only `src/data/hibp-breaches.json` |
| `npm run sync:outages` | Refresh only `src/data/outages.json` |

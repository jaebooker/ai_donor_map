# AI Safety Donor Map

An interactive map of AI safety nonprofits, projects and funds that accept donations.

- Filter by subfield (technical research, evals & forecasting, policy, advocacy, field-building, funds)
- Search by name, city or keyword; filter by type or "has donate page"
- Clustered markers for dense hubs (Berkeley, London, DC); remote orgs appear in the list
- Deep links: `/#metr` opens a specific org
- Light and dark mode

## Editing the data

All listings live in `data/orgs.json`. Each entry:

```json
{
  "id": "slug", "name": "...", "type": "Organization | Fund | Project",
  "categories": ["research"], "city": "Berkeley, CA", "lat": 37.87, "lng": -122.27,
  "remote": false, "description": "...", "website": "https://...",
  "donateUrl": "https://... or null", "taxStatus": "optional", "extraLinks": [{"label": "...", "url": "..."}]
}
```

The first category sets the marker colour. Set `"remote": true` (and omit lat/lng) for orgs with no single location.

## Running locally

Static site, no build step: `npx serve .` then open http://localhost:3000.

## Deploying

Deployed on Vercel as a static site (no framework, no build command).

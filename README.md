# AI Safety Donor Map

An interactive map of AI safety nonprofits, projects and funds that accept donations.

- Filter by subfield (technical research, evals & forecasting, policy, advocacy, field-building, funds)
- Search by name, city or keyword; filter by type or "has donate page"
- Clustered markers for dense hubs (Berkeley, London, DC); remote orgs appear in the list
- Deep links: `/#metr` opens a specific org
- **By problem** view (`/problems`): a visual landscape of 11 problems in 6 colored zones, with each org placed in its main problem and dashed links to the others it works on. For donors who start from what they want to fix. Deep links like `/problems#legislation` or `/problems#metr`
- Light and dark mode

## Editing the data

All listings live in `data/orgs.json`. Each entry:

```json
{
  "id": "slug", "name": "...", "type": "Organization | Fund | Project",
  "categories": ["research"], "city": "Berkeley, CA", "lat": 37.87, "lng": -122.27,
  "problems": ["alignment", "talent"], "approach": "One line on how they tackle it",
  "remote": false, "description": "...", "website": "https://...",
  "donateUrl": "https://... or null", "taxStatus": "optional", "extraLinks": [{"label": "...", "url": "..."}]
}
```

The first category sets the marker colour. `problems` uses ids from the top-level `problems` list (each problem belongs to one of the `zones`); the first one is the org's main focus, the rest show under "Also working on this". Set `"remote": true` (and omit lat/lng) for orgs with no single location.

## Running locally

Static site, no build step: `npx serve .` then open http://localhost:3000..

## Deploying

Deployed on Vercel as a static site (no framework, no build command).

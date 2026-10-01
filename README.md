# AI Safety Donor Map

A visual guide to AI safety nonprofits, projects and funds that accept donations, organized by the problem each one works on rather than by location. Built for donors deciding where to give.

- **Problem landscape**: 11 problems in 6 colored zones. Each org sits in its main problem; selecting a problem or org draws dashed links to everything else it works on.
- **Find my match quiz**: six questions about what worries you and how you like to give, then ranked suggestions with the reasons they matched. Answers stay in the visitor's browser (localStorage); nothing is sent anywhere.
- Deep links: `/#legislation` opens a problem, `/#metr` an org, `/#matches` the visitor's saved quiz results. The old `/problems` URL redirects to `/`.
- Light and dark mode

## Editing the data

All listings live in `data/orgs.json`. Each entry:

```json
{
  "id": "slug", "name": "...", "type": "Organization | Fund | Project",
  "problems": ["alignment", "talent"], "approach": "One line on how they tackle it",
  "city": "Berkeley, CA", "remote": false, "description": "...", "website": "https://...",
  "donateUrl": "https://... or null", "taxStatus": "optional", "extraLinks": [{"label": "...", "url": "..."}]
}
```

`problems` uses ids from the top-level `problems` list (each problem belongs to one of the `zones`); the first one is the org's main focus, the rest show under "Also working on this". `categories`, `lat` and `lng` are left over from the earlier geographic map and are not used.

## The quiz

Questions live in `data/quiz.json`. Each option adds points to problem ids; a few options set flags:

- `avoidLobbying`: hides orgs whose main problem is `legislation`, and labels others that do some lobbying.
- `needsDeduction`: hides orgs whose `taxStatus` says "not tax-deductible" and shows tax status on every suggestion.
- `pick` / `mixed` / `delegate`: how many orgs to suggest and whether funds come first.
- `earlyStage`: marks funds whose description mentions early-stage or individual projects.

An org's fit is its main problem's score plus half of its best other problem's score. Suggestions start with the best-fitting org for each of the visitor's top three problems, so different worries all get represented, then continue by fit. Orgs without a public donate page are discounted. Funds are always listed alphabetically rather than ranked.

## Running locally

Static site, no build step: `npx serve .` then open http://localhost:3000.

## Deploying

Deployed on Vercel as a static site (no framework, no build command).

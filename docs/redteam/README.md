# Tutor red-team battery

Adversarial regression suite for the `/api/acca/tutor` conversational tutor (all papers).

- `scripts/redteam-probes.ts` — the probe MATRIX (45 probes × 14 classes) + the judge rubric.
- `scripts/redteam-tutor.ts` — DRIVER: mints free/paid sessions, fires the matrix at the real route, runs machine auto-checks, writes `run-*-transcripts.json` + `run-*-autoscan.md`.
- `scripts/redteam-judge.ts` — reviewer-model JUDGE: reads transcripts (or real prod transcripts) against the rubric, writes FLAGGED-ONLY.

## Usage
```
npm run redteam -- --list                         # print matrix + cost, fire NOTHING
npm run redteam -- --target local                 # drive a local dev server (next dev -p 3111)
npm run redteam -- --target prod --yes-production  # HITS PRODUCTION (guarded; requires the confirm flag)
npm run redteam:judge -- docs/redteam/run-XXXX-transcripts.json   # judge a captured run
npm run redteam:judge -- --prod-sample 7          # WEEKLY HABIT: judge the last 7 days of real transcripts
```

## Standing rules (GENERATOR_DOCTRINE)
- **Regression:** re-run the battery after ANY change to a tutor prompt / persona / leg.
- **Weekly habit:** run `--prod-sample` weekly over `acca_drill_messages` — real student behaviour is the probe source no matrix invents.

Run artifacts (`run-*`, `prod-sample-*`) are gitignored; the scripts + this README are committed.

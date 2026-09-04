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

## Captures do not travel — SUMMARIES DO

`docs/redteam/*.json` is gitignored and stays that way. **`docs/redteam/summaries/` is tracked.**
Any measurement cited in `GENERATOR_DOCTRINE.md`, or used as a baseline in `AFM_SURFACED.md`, MUST
have a summary there — counts, the rubric verbatim, target ids, n, and the arm's SHA. Skipping one
cost a full 40-leg BEFORE re-run on 2026-08-24. See `summaries/README.md`.

## Standing rules (GENERATOR_DOCTRINE)
- **Regression:** re-run the battery after ANY change to a tutor prompt / persona / leg.
- **Production judge:** run `--prod-sample` when **25 genuine student turns** have accrued since
  the last run — a TRAFFIC threshold, not a calendar. Real student behaviour is the probe source
  no matrix invents; there is just very little of it yet.

### ⚠️ `--prod-sample` — corrected 2026-09-04, read before trusting anything it says

Three facts, all measured, none of them previously written down:

1. **It has never produced an artefact.** In the ~7 weeks from the table's creation (2026-07-11)
   to 2026-09-01 there is no `prod-sample-*` file on disk, none tracked, none in git history. It
   was documented as a weekly habit in three places and the habit produced nothing. **A run that
   writes nothing looks exactly like a run that never happened** — which is why nobody noticed.
2. **Its pairing was broken before first use.** It sorted by `created_at` and scanned backwards
   for the nearest student row — but the route writes both rows of a turn in ONE insert, so every
   pair shares an identical timestamp (1063 groups, exactly 2 rows and both roles, zero
   exceptions) and a tie has no defined order. The error rate is whatever the tie-break happens
   to be: **51%** by `id`, **2%** in fetch order, **100%** by `role` — same data, same algorithm.
   Fixed: it now pairs by `turn_id` when present and by `(user_id, drill_id, created_at)`
   identity otherwise, and **never sorts and scans**.
3. **The mispairing skewed toward FALSE FLAGS.** A correct reply judged against the *previous*
   turn's question reads as answering the wrong thing, leaking an unrelated figure, or revealing
   unprompted — every one a rubric hit. So a clean report would have been the *surprising*
   outcome, not the reassuring one.

**The sample must exclude non-student accounts** (`NOT_A_STUDENT` in the script). The harness holds
962 of 1063 turns — 90.5% — so an unfiltered run judges the red-team's own traffic and calls it
production, and an unfiltered threshold is met within one session.

Run artifacts (`run-*`, `prod-sample-*`) are gitignored; the scripts + this README are committed.

Run artifacts (`run-*`, `prod-sample-*`) are gitignored; the scripts + this README are committed.

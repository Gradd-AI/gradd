# Funnel Design — Free/Paid Cap (locked 06/06/2026)

## Model
- FREE forever: unlimited questions + marking (matches market norm; marking accuracy is our edge).
- PAID: the driven, structured teach-through to mastery (the moat — competitors are reactive/notes, not driven curriculum teaching).

## The cap mechanism — "the burn"
The free tier includes a recurring TEACHING TEASE. Mia starts a deep teach-through and walls at the peak — the "burn." The unfinished-at-peak moment is the conversion trigger.

### Teach-shape (the 4 steps, mapped to TEACHING_PRINCIPLES.md)
1. Retrieval — student attempts/recalls (free, the hook).
2. Mark + name the gap — scored, specific (free, table stakes).
3. Begin teach-through — Mia names the REAL misconception (not surface error) and begins the re-frame; step 3 must be RICH enough to demonstrate insight ("she sees why I'm confused"), not just restating the answer. This is where the wow lives.
4. THE BURN — right as the re-frame is about to resolve into mastery, it walls: "This is where I take you from 'sort of get it' to 'got it.' Subscribe to finish." Sells UNDERSTANDING, not information.

Burn fires at the 3→4 boundary (peak-end / Zeigarnik — unfinished at maximum want).

### Cadence
- FIRST tease: EARLY — ~question 2-3, first session. Hook while fresh. NOT on the recurring counter. (A new user who does 20 pure-marking questions forms "just a question bank" and leaves.)
- RECURRING teases: every ~N questions thereafter. N = config constant, START 15-20, TUNE BY DATA. N is a hypothesis, not a truth — nobody knows it pre-launch.

### A/B/C buckets (DB already built: cap_bucket, free_units_used)
- Bucket A: burn AFTER step 4 (full teach, satisfied — generous, weak pull).
- Bucket B: burn at 3→4 (the peak — LEAD HYPOTHESIS, build first).
- Bucket C: burn after step 2 (marking only — shortest, hardest sell).
Build B first, instrument conversion per bucket, let data adjudicate.

## What was wrong before
The dormant cap counts MESSAGES, which can't tell marking from teaching. Rebuild: cap fires on the TEACH_BACK signal at the burn point, not on message count.

## Build order
1. TEACH_BACK signal: Mia emits it at the 3→4 boundary (prompt + parser + handler, same commit — Rule 5).
2. Cap logic: on TEACH_BACK, if free AND tease-not-due → burn (paywall); if paid → continue; count questions for cadence.
3. Wire paywall modal to the burn (modal already built).
4. First-tease-early + recurring-N cadence (config).
5. Instrument: log bucket, questions-done, burn-shown, converted.
6. Free-questions destination: confirm a capped user lands back in questions+marking, not a dead end.

## Status
Design locked. Build not started. Cap currently dormant (MAX_FREE_UNITS 9999).

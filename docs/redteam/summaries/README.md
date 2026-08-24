# Classified measurement summaries — these TRAVEL

The raw captures (`docs/redteam/*.json`) are gitignored and stay that way: large, prose-heavy, and
only meaningful to whoever ran them. **The classified summary is tracked.**

## Why this exists

On **2026-08-24** the stage-6 arm needed a BEFORE baseline. The recorded figures (14 inversion /
5 endorse / 0 clean, 2026-08-23) were in `AFM_SURFACED.md`, but the **transcripts they were
classified from were on the other machine**, so there was no way to apply one rubric across both
arms — the only honest option was to **re-run the entire BEFORE arm**, 40 extra legs of model
spend, to get a comparable baseline.

That cost was avoidable. A summary is a few hundred bytes and contains everything a later
comparison needs.

## The rule

**Any measurement cited in `GENERATOR_DOCTRINE.md` or used as a baseline in `AFM_SURFACED.md` MUST
have a summary file here.** A figure quoted in doctrine with no summary is a figure nobody can
re-derive or compare against, and it will cost a re-run the first time someone tries.

Filename: `YYYY-MM-DD-<short-slug>.md`.

## What a summary must carry

The five that make a later comparison possible, and the two that stop it being misread:

1. **Target ids** — the exact rows measured (`case_id` / `requirement_id` / `drill_id`). A label is
   not an id; labels get reworded.
2. **n, and what n counts** — repeats × legs, and WHICH leg was read.
3. **The arm** — commit SHA per arm, plus any env-selected prompt variant. A capture that cannot
   name its arm cannot be read against another.
4. **The rubric, VERBATIM** — the category definitions as applied. Counts without the rubric are
   uncomparable, because the boundary is where classifiers actually differ.
5. **The counts** — per category, per target, per arm.
6. **Significance** — or an explicit statement that none was computed.
7. **The claim ceiling** — what the numbers do NOT support.

⚠️ **Record the rubric even when it matches a previous one, and especially when it does not.**
2026-08-24's Orlen A/B split is not comparable to 2026-08-23's because the later pass counted
vacuous task-identification credits as inventions and the earlier one did not (5/20 vs 1/20). The
CLEAN counts were comparable and both ~0. **Had the rubric not been written down, that difference
would have read as a real movement.**

⚠️ **Name the capture files even though they do not travel.** If the machine that produced them
still has them, a re-classification is possible; if the summary does not name them, nobody knows
what to look for.

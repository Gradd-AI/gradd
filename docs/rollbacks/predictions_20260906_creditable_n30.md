# Banked before the run — creditable-seed n=30, and the §1 wire that cannot land

Written 2026-09-06, on `main` at `8ab08cf`, BEFORE the run. Nothing below is edited after the
result is read.

---

## §1 — THE WIRE IS BLOCKED ON THE MEASURED SURFACE. Finding, not a prediction.

The task was: wire `renderResolvableTopics(grounding)` into the case engine's `call4_reveal`, as
the drill route's `call4_reveal` already does (`app/api/acca/tutor/route.ts:1077`).

**It does not require grounding the case engine cannot build.** `renderResolvableTopics` reads
exactly one field, `GroundingPack.resolvableTopics`, and `buildGroundingPack` builds that field
from `resolvableAreas` ALONE — it never touches the drill row. So the case engine could produce
it from `paper` with no new data and no new query.

**But `resolvableAreas` is AFM-only, and always has been.** The drill route's source, in full
(`route.ts:1293`):

```ts
const resolvableAreas = paper === 'AFM' ? ['B1', 'B2', 'B3', 'B4', 'B5'] : [];
```

and the comment above it says so: *"empty for APM (resolvableAreas is AFM-only for now)"*. The
July INVENTED-INVENTORY fix has never applied to APM on the drill route either.

**Measured assembly diff — real builders, real rows, zero model calls:**

| surface | `resolvableAreas` | `resolvableTopics` | reveal user prompt | pointer beat |
|---|---|---|---|---|
| APM — Vesla Retail (i), D2g, **the measured seed** | `[]` | `[]` | 2819 → 2819 bytes, **byte-identical** | LIST (6 sections) |
| AFM — Aldebrino SpA, E3a | `['B1'..'B5']` | 5 drill-area phrases | 1170 → 1912 bytes (+742) | **OMITTED** (0 sections) |

System prompt unchanged on both papers (APM 1002 bytes, AFM 913 bytes) — this wire touches the
user prompt only.

**So on APM the wire is a no-op**, and APM is the whole of §2 and §3. Running 90 model calls to
measure a byte-identical prompt would report the seed's own variance as the wire's effect.

**Making it fire on APM requires an APM area→label inventory that exists nowhere in this
codebase.** `AFM_AREA_LABELS` (`tutor-grounding.ts:70`) holds five AFM entries and no APM
entries; no other area-label map exists anywhere (`grep -rn AREA_LABELS` → one hit, that file).
Building one is constructing a substitute, which the task forbids. **Stopped, per §1's own
clause.**

**Three further facts the diff surfaced, which bear on whether the faithful wire is even right
for this surface:**

1. The list is **drill** inventory — *"another investment appraisal and risk drill"*. The case
   surface's inventory is case requirements. Pointing a case student at a drill is an inventory
   claim about a different product surface.
2. The list is a **fixed B1–B5 regardless of requirement**. Measured against the live corpus: of
   the 20 published AFM case requirements, **9 sit in E1/E2/E3/A1** — areas the label map does
   not cover and the fixed list does not contain. An E3a hedging requirement would be told the
   only onward areas it may name are five B-section drill topics, none of them its own.
3. **The two fixes are disjoint across the corpus.** APM: 18/18 published requirements carry
   `## ` headings (pointer beat fires) and topics are empty (wire inert). AFM: 0/20 carry
   headings (pointer beat omitted) and topics are non-empty (wire would fire). **No published
   requirement gets both.**

---

## §2 — the creditable seed, n = 30

**Seed: `CASE_SEED=b`, byte-identical to `case_reveal_n10_seedB_spread_20260906.json`.** It is
the spread control from the last run and it is the right seed on the merits: correct on the
accuracy claim (§1 of the answer — base-rate trap named and worked) and on
app-usage-as-correlation (§2), confidently wrong on the training data (§3) and on treating the
model as complete (§5). Holding it byte-frozen makes the n=10 and n=30 runs comparable. No new
seed was constructed — a new one would have moved two variables at once.

Prior n=10 on this seed: pointer 10/10 in-list on **#3 Training-data limitations**, `creditable`
`[1,1]` every run, suppression correctly NOT armed 0/10, unsourced-figure log flagged 4/10.

### Grant's predictions, verbatim

- Fabricated quotation **3–6/30**. *"I expect this to FAIL the gate — the 2/10 sighting is the
  same shape as the drill leg's 8/10, and nothing in this branch addresses it."*
- Attribution **≤4/30**, credits accurate.
- Closing-beat figures **≤4/30** — *"the wire is the proven fix from the drill route, so I am
  confident here."*
- Pointer spread: **at least three different sections named across the 30.**

### The gate as set (§4)

| axis | gate |
|---|---|
| fabricated quotation, creditable seed | ≤2/30 |
| attribution, creditable seed | ≤3/30 |
| credit accuracy | every credit names something the student wrote |
| closing-beat unsourced figures | ≤6/30 (from 23/30) |
| wrong-answer tripwire | 0/10 |

### What the §1 finding does to two of these, stated before the numbers are in

- **The closing-beat gate cannot be read as a test of the wire.** The wire is not in the run.
  Whatever this arm produces is the seed's own rate on unchanged code. A pass would mean seed B
  differs from seed A, not that the fix works; a fail would be the defect unmoved, as expected.
- **The wrong-answer tripwire (§3) is moot and is NOT run.** It exists to prove the wire did not
  move the 0/30. There is no wire.

### My predictions, where they differ from Grant's

- **Closing-beat unsourced figures: 10–20/30 — the gate FAILS.** Seed A ran 23/30 on the
  identical prompt. Seed B's n=10 flagged 4/10 (12/30 scaled), on a sample P-M6 says cannot be
  separated from seed A. I predict it lands between the two and nearer seed B's, because seed B's
  answer already contains the correct base-rate reasoning, so the closing beat has less headroom
  to invent a fresh imbalanced-data hypothetical. **Not evidence about the wire either way.**
- **Pointer spread: it does NOT reach three sections. 25–30 of 30 on #3.** Seed B's diagnosis is
  close to single-valued too — its dominant surviving error is the training-data claim, and #3 is
  where that is resolved. 10/10 on #3 at n=10 is the prior. A concentrated pointer on a
  single-valued diagnosis is the criterion working, not failing; the spread question was already
  answered by seed B moving OFF #1, which it did.
- **Suppression arms 0/30.** `creditable` was `[1,1]` on all 10 prior runs and seed B earns real
  credit on two heads. Any arming here is a false positive and a blocker in its own right.
- **Fabricated quotation: I agree with Grant — 3–6/30, gate fails.** The credit beat now has
  something true to name, which should help; but the wrapper is asked to credit *"specifically"*,
  and specific-plus-unquoted is exactly the shape that produced the invention.

---

## What this run does NOT claim

It measures ONE requirement (Vesla Retail (i), D2g) on ONE seed answer, on APM. It says nothing
about AFM cases, where the pointer beat is omitted on all 20 published requirements and the wire
— if it were ever built — would be the only thing that changed.

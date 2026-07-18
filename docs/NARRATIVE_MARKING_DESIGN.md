# NARRATIVE_MARKING_DESIGN.md — the second pipeline (discursive/prose drills)

**Canonical design for AFM narrative-marking drills. The FIRST narrative-marking build (B narrative cluster, 2026-07-18) is the pilot; every future narrative-heavy surface (C/D/A narrative, other papers) inherits this contract. Read this before touching any narrative drill or the marker.**

Companion evidence: `docs/evidence/AFM_NARRATIVE_EVIDENCE.md` (§1a syllabus marking basis; §1b F1–F11 examiner failure modes — the detection targets).

---

## 0. THE CLAIM CEILING (do NOT overclaim — Grant-ruled 2026-07-18)

The calculator families earn **"code owns every figure and every figure-vs-figure verdict."** Narrative marking does **NOT** earn that claim and must never be described as if it does.

> **Narrative marking = constrained-model marking with a CODE-OWNED rubric + CODE-OWNED aggregation + DETERMINISTIC copy/anchor/coverage checks + Rule-23 consistency. The per-criterion QUALITY judgment (is the point developed? applied to the scenario?) is MODEL-graded under constraint — it is not deterministic and code does not own it.**

Every doc, UI string, and marketing line about narrative marking must state exactly that split. **Never write "code owns the marks"** for narrative. The honest verb is *structured/consistency-checked*, not *deterministic*, for the criterion-quality layer. (GRADD_SELLING_BIBLE binds: no coverage/tier/ads claim on narrative until §1b is VERIFIED and the pipeline is walked — see §7.)

---

## 1. WHAT CODE OWNS vs WHAT THE MODEL OWNS

| Layer | Owner | Content |
|---|---|---|
| The **rubric** (criteria, marks, required points, scenario anchors, disqualifiers) | **CODE / authored** | the per-drill `answer_schema` narrative variant — the marking contract |
| **Deterministic detectors** | **CODE** | F1 scenario-copy (n-gram overlap), anchor-presence, requirement-part coverage (F7), breadth/has-a-conclusion (F11) — no model |
| **Per-criterion quality verdict** | **MODEL (constrained)** | for each criterion: `{ met: 'no'\|'partial'\|'yes', evidence_span (a quote FROM the answer), failure_flags: [F…] }` — the model NEVER emits a score or the overall verdict |
| **Aggregation → marks → band → verdict** | **CODE** | met→marks mapping (partial credit), disqualifier logic (an F-flag caps/voids a criterion), summation, band→verdict, consistency |
| **Verifier-of-the-verifier (Rule 23)** | **CODE** | golden BAD/GOOD meta-tests validate the model layer + the aggregation |

**OFR analog (ruling 2):** there is no figure to carry. The analog is **per-criterion partial credit** — graduated **0 / ½ / full** per criterion, code-owned mapping. Where a drill supplies data, F9 applies (the answer must USE it in the discussion, not just restate it).

---

## 2. THE NARRATIVE `answer_schema` (jsonb variant — ruling 7, no new column)

`acca_drills.answer_schema` carries a narrative shape distinguished by `mode: 'narrative'` (numeric drills keep their `components[]` shape). The marker and the gates branch on it.

```jsonc
{
  "mode": "narrative",
  "requirement_parts": ["<part (i)>", "<part (ii)>", …],   // F7 — every part must map to ≥1 criterion
  "scenario_facts": [                                        // the named facts the answer must USE (F5)
    { "id": "fact_growth", "text": "the 4% assumed growth rate", "kind": "figure|entity|constraint" }
  ],
  "criteria": [
    {
      "id": "c1",
      "requirement_part": "<part (i)>",
      "lo": "B3i",                                           // maps to a §1a LO / evidence quote
      "required_point": "<the point a full-marks answer makes>",
      "marks": 2,
      "anchor_facts": ["fact_growth"],                       // scenario facts this point must USE
      "disqualifiers": ["F1", "F5"],                          // F-modes that void/cap this criterion
      "development_required": true                            // claim→because→implication (F2/F3/F6)
    }
  ],
  "total_marks": 15,
  "bands": [ { "min": 0, "label": "fail" }, { "min": 0.5, "label": "pass" }, … ]  // code owns band→verdict
}
```

The **reveal** (`model_answer`) is authored AGAINST this rubric: every `required_point` present, every `anchor_fact` used, a committed verdict where the requirement asks for one (F4), issue→action where the LO demands it (F8). It is the golden-GOOD standard.

---

## 3. THE MARKER (authoring-time gate component — live wiring OUT of scope for v1, ruling 3)

`lib/acca/narrative-marker.ts` (planned). **v1 is an AUTHORING-TIME component** — it validates rubrics + reveals + golden pairs; it is **NOT wired into the live tutor serve.** Live per-student model marking is a Horizon-2 build (journalled; the cost/latency/second-pass architecture is deferred).

Shape:
- **Deterministic detectors** (pure, no model): `scenarioCopyOverlap(answer, scenario)`, `anchorsPresent(answer, rubric)`, `requirementCoverage(rubric)`, `hasConclusion(answer)`.
- **Model layer as an injected interface** (so fixtures use a mock, authoring uses a real grader, and NO live wiring exists in v1):
  `type CriterionGrader = (c: Criterion, answer: string, scenario: string) => Promise<CriterionVerdict>`.
- **Aggregation** (pure, code-owned): `aggregate(rubric, verdicts, deterministicFlags) → { per_criterion_marks, awarded, total, band, verdict }`. Applies partial credit + disqualifier caps.

## 4. GATES (N1–N5, authoring-time; run before any narrative-drill insert)
- **N1 rubric-coverage:** the reveal satisfies every criterion; every `requirement_part` maps to ≥1 criterion (F7).
- **N2 scenario-anchor:** every `anchor_fact` exists in the scenario AND is used in the reveal (F5); a rubric whose anchors aren't in the scenario is rejected.
- **N3 generic/copy lint:** the reveal is not scenario-restating (F1 n-gram overlap under threshold) and not generic boilerplate (F5/F6) — it adds analysis beyond the scenario tokens.
- **N4 Rule-23 consistency (load-bearing):** each drill ships a **golden BAD** (exhibits named F-modes) and a **golden GOOD**; the marker must score BAD below band flagging the intended F-modes on the right criteria, and GOOD in band. This is what makes the model layer trustworthy — the verifier-of-the-verifier.
- **N5 committed-verdict + structure:** the reveal ends with a conclusion/recommendation where the requirement asks for one (F4/F11).

## 5. RULE 23 — golden BAD/GOOD harness
Per drill, two authored answers stored with the drill (authoring artefacts, not served): a **GOOD** (full-marks, all criteria met, scenario-anchored) and a **BAD** (deliberately exhibits specific F1–F11 modes — copies the scenario, lists without developing, sits on the fence, generic, ignores a requirement part). N4 asserts the marker's deterministic layer + aggregation separate them correctly; when a real grader is used, its per-criterion flags must match the BAD's designed F-modes.

## 6. EZRA SERVE — rubric-in-context (persona-hardening, narrative-first)
The tutor's discursive legs serve Ezra a **rubric-in-context**: the criteria + required points + scenario anchors + the F1–F11 detection targets, so the persona coaches AGAINST the failure modes (challenge the scenario, develop the point, commit to a verdict) rather than accepting a generic/restating answer. This is the persona-hardening mechanism, built narrative-first (ties to the surfaced convention-softening / false-complete / invented-inventory slot).

## 7. STANDING RULES
- **Live marking OUT of scope (v1).** The marker is an authoring-time gate. Live per-student narrative marking is Horizon-2 (journalled).
- **Provenance gate.** §1b evidence is co-founder-read, not page-verified (J24/SD24 pending). Authoring may proceed on the provisional evidence, but **NO coverage claim / ads / tier-complete flip on narrative until §1b is VERIFIED and the pipeline is walked.**
- **Claim ceiling (§0) binds every surface.** Never "code owns the marks" for narrative.
- **CONVENTIONS ARE FETCHED, NOT REMEMBERED** applies: the failure modes are the examiner reports' own words (§1b), never invented.
- **Map-before-close:** narrative drills add new `AREA_ENTRY_RANK` headings ranked AFTER each area's calculator entry (a narrative drill never becomes an area's zero-attempt entry); the CODE MAP gets the marker/gate entry at batch close.

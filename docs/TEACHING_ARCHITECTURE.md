# TEACHING_ARCHITECTURE.md
**Purpose:** Gradd-wide implementation primitives for AI teaching products. These are architectural patterns — how the system is built — distinct from the pedagogical principles in `TEACHING_PRINCIPLES.md` (what makes teaching effective). Both must hold; this document governs the former.

---

## STRUCTURAL WITHHOLDING (proven 19/06/2026)

### The principle

To make a teaching AI withhold an answer, **architect its absence — never instruct it.**

Instructing a model to "not reveal the answer" while the answer sits in its context does not work reliably. The model has the answer, and it leaks: through restatement, paraphrase, or diagnostic output that contains the correct fact. This has been demonstrated empirically twice in Gradd development and is consistent with how language models operate — they cannot reliably suppress information they hold.

The only reliable fix is structural: **the answer must never exist in the context of the call that teaches.** If call 3 has never seen the answer, it is physically impossible for it to leak the answer. No instruction required.

### The three-call shape

```
CALL 1 — GENERATE
  Input:  question
  Output: full model answer
  Fate:   stored server-side ONLY; never sent onward

CALL 2 — DIAGNOSE
  Input:  question + student attempt + model answer (reference only)
  Output: a SHORT GAP LABEL — the student's error pattern named in their own
          error terms, max ~15 words, FORBIDDEN from stating the correct answer
  Rule:   the label names what the student DID wrong, not what is correct
          GOOD: "applied normal-good income logic to an inferior good"
          BAD:  "demand falls when income rises"   ← leaks the answer
  Fate:   passed to call 3

CALL 3 — TEACH
  Input:  question + student attempt + call-2 gap label (model answer: ABSENT)
  Output: hint (first miss) or diagnosis-led teach-through (second miss)
  Cannot leak the answer — it was never in context
```

### The key invariant

Two boundaries must both hold:

1. **Call 1 → Call 3 boundary:** the model answer never reaches call 3's context.
2. **Call 2 output discipline:** the gap label must not contain the correct answer. A leaky diagnosis reintroduces the leak through call 2 even if the model answer itself is absent.

If either boundary fails, the withhold fails. The diagnosis-label discipline is the crux.

### Model split (portable default)

| Call | Role | Model | Reason |
|------|------|-------|--------|
| Call 1 | Generate model answer | claude-haiku-4-5 | Straightforward generation; Haiku sufficient |
| Call 2 | Diagnose → gap label | claude-sonnet-4-6 | **Precision step — do not downgrade.** Haiku produced answer-bearing labels; Sonnet produced clean gap-labels on the first attempt. This is the call that makes or breaks the architecture. |
| Call 3 | Teach from label | claude-haiku-4-5 | Teaches well from a short label; Sonnet not required |

### Applicability across Gradd products

This is a Gradd-wide primitive. Any Gradd teaching product that needs to guide a student without revealing the answer uses this pattern:

- **APM tutor (ACCA)** — first implementation; architecture proven here (see `docs/APM_BUILD_CONTRACT.md` § CONVERSATIONAL TUTOR ARCHITECTURE)
- **Mia — IB Economics and IB Business Management** — the parked two-call withhold in Mia's architecture is resolved by this. Replace the two-call pattern (which put the answer in call 2's context alongside the teaching) with this three-call structure. The diagnosis-label sits cleanly between generation and teaching.
- **Aoife — Leaving Certificate** — same pattern applies when Aoife needs to guide without revealing marking-scheme content.

When rebuilding Mia or Aoife on this architecture: the call 2 system prompt discipline (label naming the error pattern, not the correct answer) is the only non-obvious constraint. The rest is context routing.

### What was proven in the spike

- Case A (clean inversion — demand curve shift vs movement-along): call 2 label → `"confused shift of the demand curve with movement along the demand curve"`. Call 3 taught from the label alone, correctly, without having seen the model answer.
- Case B (subtle partial-right — inferior good income effect): call 2 label → `"applied normal-good income logic to an inferior good"`. Call 3 derived the mechanism (affordability of substitutes) and a useful student heuristic, from the label only.

Both cases: structural withholding holds. The model answer was absent from call 3's context in both runs.

---

*This document is the authoritative record of proven Gradd teaching architecture. Cross-referenced by: `docs/APM_BUILD_CONTRACT.md`.*

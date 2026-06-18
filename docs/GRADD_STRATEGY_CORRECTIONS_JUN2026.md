# STRATEGY CORRECTIONS — 16/06/2026

These supersede stale guidance in PHASE_2_DEMAND_TEST.md and the "demand test before build" sections of the strategy docs. Where they conflict, THIS doc wins.

## 1. NO PRE-BUILD DEMAND TEST — build on conviction

The €0 demand-test gate (PHASE_2_DEMAND_TEST.md: "<5 signups stop / 30+ build", r/ACCA + OpenTuition) is DEAD. It assumed forum/ads channels Grant will not use:

- r/ACCA Rule 3 bans all self-promotion → read-only research feed, not a channel.
- Grant will not grind forums/communities for organic reach, and will NOT pay to advertise a signup form to test demand.

The gate is therefore unrunnable AND unnecessary for the actual model.

**Real model:** build on conviction → launch → pay to advertise ONCE HAPPY THE PRODUCT CONVERTS (paid traffic is an accelerant on something proven, NOT a pre-build demand test). Word-of-mouth runs underneath; no hurry.

## 2. PORTFOLIO STRATEGY — several modest products, slow growth to job-freedom

The goal is NOT one big product. It's a PORTFOLIO of several quality products, each maybe ~300–400 subscribers, growing slowly. The AGGREGATE replaces the salary, not any single product. At ~€300 ARPU (monthly teaching), ~3–4 products × ~350 subs ≈ salary replacement — far less fragile than one product needing 1,000+. Build, stabilise, launch, advertise-when-happy, then start the next. No rush.

## 3. PRODUCTS ARE TIME-GATED, NOT EXPERTISE-GATED

Grant does NOT need personal subject expertise to build a product. Content accuracy is established by ADVERSARIAL AI-CHECKS-AI: Grant runs other AI models against the build to keep Claude honest AND to independently verify subject content is strong/accurate, against the official examining-body guide (the ground truth).

- Any subject with an official guide is buildable — viability is TIME, not Grant's knowledge.
- "APM first because Grant can QA finance" is a CONVENIENCE, not a constraint. APM-first stands on its own merits (acute application-pain, low pass rates, weakest free alternatives) — NOT because Grant must know the subject. Future products are NOT limited to domains Grant knows.

## APM SEQUENCE (corrected)

1. Finish IB (proof of pipeline).
2. BUILD APM on conviction — Grant QA's via AI cross-check + finance background (convenience). APM build state (audited 18/06): ONLY scripts/apm-framework.ts exists (73 LOs A–D, typed, source-cited to ACCA 2026–27 guide, clean DrillSpec interface). The generator, drills table migration, /app/api/acca/drill route, and ACCA tutor prompt are ALL UNBUILT (not scaffolded). The '6 seed drills live in DB' claim was false — no generator, no table, so none exist. Honest scope: one strong asset + four full builds, ~3–4 weeks on the IB rails. (Note: validator.ts has a live tsc error referencing the never-created acca/drill route.js — clears when the route is built.)
3. Launch drill + paid tutoring TOGETHER (chicken-and-egg).
4. Advertise once converting.
5. Repeat pattern for next product.

### Competitive recon COMPLETE + positioning locked — 22/06/2026

THREE PRODUCT TYPES (full map):
1. ACCAly (FLATERZ LTD): cheap/broad/thin. €13.99/mo, €89.99/yr, €27.99 3-mo pack, per-week framing. AI tutor dumps full model answer on demand, then stalls. Flaky.
2. LEARNSIGNAL (Signal Education Ltd): PREMIUM comprehensive COURSE. ACCA Gold-approved, 100k students. APM = £549 one-off (pass guarantee "free until you pass") OR subscription €49.99-199.99/mo all-15-papers (from £24.99). 293 materials, 13 chapters, recorded video lectures from real tutors, quizzes, CBE practice, MODEL-ANSWER self-review (student self-grades — no AI marking), tutor-marked mocks (async, ~3-day turnaround), summary notes, WhatsApp groups. Textbook+video+human-async-marking. THOROUGH and CREDIBLE.
3. US (Gradd APM): narrow, LIVE, adaptive AI coaching on the student's OWN answer, in the moment.

THE STRUCTURAL DISTINCTION (the whole strategy): Learnsignal's humans are in RECORDED videos (not live) and ASYNC marking (submit→wait→feedback). Their live human help is rationed/async because humans don't scale. NO competitor coaches a student live, in-the-moment, on their specific gap, as they attempt. OUR AI does exactly that — instant, adaptive, infinitely scalable, for the cost of an API call not a human's time. That's not "less than" their human tutors; it's a different model that delivers in-the-moment coaching their economics can't give every student in real time.

POSITIONING LOCKED: We are NOT competing with Learnsignal on breadth/content/human-credibility (we lose, and shouldn't try). We are the LIVE COACH that works through YOUR answer with you, NOW, on the apply/evaluate jump that wins APM marks. Learnsignal = learn the syllabus + get mocks marked eventually. Us = get coached through your own answer instantly. Could even be complementary (use both). For "knowing-frameworks → scoring-marks under exam conditions," our live loop beats their recorded-video + async-marking.

BORROW FROM LEARNSIGNAL (packaging, not engine): "5 minutes to pass" orientation, failure-mode→corrective-move matching, exam-focus boxes, clean "what loses marks" framing. Good scaffolding to adapt. We already have the better engine.

PRICING (sharpened by £549 anchor): Learnsignal APM = £549 one-off course. Against THAT, our €49.99/mo or ~€69-79 exam-pass is EXCEPTIONAL value, not expensive. We're the affordable, focused, always-available coach vs a £549 course. Two anchors both make our price look small: the £270 resit AND the £549 course. This RESOLVES the morning's "are we too expensive" worry — we're not; we're the value option that does the one thing neither competitor does. Hold premium-but-accessible; shape = focused APM coaching (monthly or exam-pass), anchored to resit cost + course cost, never to ACCAly's €13.99.

### FINAL pricing decision — triple-checked, evidence-based — 22/06/2026
MODEL: Hybrid, pass-led. Research (getmonetizely, dodopayments, fastspring) is clear: (a) one-time/per-project pricing converts better for INFREQUENT/project-based buyers — APM candidate is exactly this (one sitting then gone/resit-once); (b) pure one-time struggles to fund ongoing dev/support — the highest-success model is a HYBRID offering both, converting one-time buyers into subscribers over time; (c) one-time = immediate earned revenue (good for solo-founder cash flow); subscription = max LTV. So: lead with the pass, keep a real positioned subscription.

HERO: €99 — 90-day APM exam-pass. What the funnel/wall pushes. Matches project-based buyer, converts better for infrequent use, immediate revenue, dodges the Learnsignal monthly-platform comparison entirely.
SECONDARY (deliberate, not afterthought): €49/month — for multi-paper/long-haul students AND as the conversion path to recurring revenue once AFM/AAA exist.
FRAMING: present pass anchored against the monthly — "€99 for 90 days, or €49/month" — so a 3-month student sees €49×3=€147 vs €99 and the pass is the obvious choice. Subscription makes the pass look smart (hybrid framing the research rewards).
EXTERNAL ANCHORS (always, never ACCAly's €13.99): the £270 resit (+6 months) and Learnsignal's £549 APM course. €99 = less than half a resit, ~6× cheaper than the course. We're the focused-value option, not the dear one.
NO per-week framing (ACCAly's discount tell). NO pass-guarantee at launch (Learnsignal device — powerful risk-reversal but exposes early-loss risk and we have ZERO outcome data; bank as post-launch lever once pass evidence exists).
LAUNCH PRICE = €99 pass / €49 mo. Raise pass to €129-149 once conversion proven + a few outcomes to cite (raising easy, cutting painful).
FREE TIER unchanged: unlimited drills + 3 teach-throughs (the felt-teaching proof) before the wall.

Stripe objects to create: one 90-day pass price (€99, one-time) + one monthly sub price (€49/mo). Named APM (not "ACCA all papers").

---

### PER-PAPER ENTITLEMENT — LIVE IN CODE — 03/08/2026

**RULING (Grant): pricing is per paper.** APM and AFM are sold separately, €99 sitting-dated
pass and €49/month **each**. Bundle-wide access ends. Four live Stripe prices: APM pass/monthly
(ids unchanged) + AFM pass/monthly (new).

**Nothing was at commercial risk when this shipped.** Measured before the change: **zero
customers have ever paid for ACCA** — no ACCA subscription has ever existed
(`apm_stripe_subscription_id` null on all 11 profiles, `apm_subscription_status` `'inactive'`
on all 11), and the only three entitlement holders are manual comps.

**Shipped on `main` at `cccbc95`** (branch `feat/per-paper-entitlement`, 4 commits). Two
migrations accompany it, both P-DB2, applied by hand.

#### The mechanism

`hasPaperAccess(supabase, userId, paper, legacyProfile?)` — **dual-read, table first**:

1. `acca_entitlements` for `(user, paper)`. Any active row → **granted**.
2. Rows exist but none active → **DENIED**. The table is authoritative once it has spoken
   about a paper. Falling back here would let a legacy bundle column rescue an expired
   per-paper row — grandfathering as a code branch, which the ruling forbids.
3. **No rows at all, or no table yet** → fall back to the legacy `profiles.apm_*` columns.

Step 3 is what made the code shippable **before** the SQL ran: until the table existed the
query errored, and every caller resolved exactly as it had. **Grandfathering is DATA** — the
three comp holders are backfilled with a row per paper, so they keep both papers for the life
of their entitlement without a single `if` in the predicate. No legacy-bundle tier.

`hasActiveAPMAccess` was **deleted, not re-pointed**: it and `hasActiveACCAAccess` were the
same function object (11 call sites imported one name, 9 the other). Deleting it made every
call site a compile error until it had been given a paper — there is no way to half-migrate
this. The paper is a **required argument with no default**; `resolvePaper()`'s 'APM' fallback
is correct for content scoping and fatal in a gate, so gates use `strictPaper()` and refuse
on null.

#### ⚠️ TWO CONSTRAINTS THAT COULD NOT BE BUILT AS SPECCED

**1. `unique (user_id, paper_code) where active` is not creatable.** A partial index predicate
must be **IMMUTABLE**; "active" depends on `now()`, which is **STABLE**. Postgres rejects
`where expires_at > now()` outright. Replaced by an immutable predicate on an explicit
revocation column — one open SUBSCRIPTION per paper, `where kind = 'subscription' and
revoked_at is null` — the same shape `acca_weak_areas` already uses for its open rows. This is
why `revoked_at` exists at all, and why cancellation writes it as well as the status: the
status is what the predicate reads, `revoked_at` is what frees the index so the same student
can resubscribe to that paper later.

**2. PASSES ARE DELIBERATELY NOT UNIQUE per (user, paper).** A student who buys APM for the
June sitting and again for September must end up with **two rows** — that is the purchase
history the table exists to hold, and a uniqueness constraint would **reject the second,
entirely legitimate purchase**. Multiple live passes are harmless: the predicate grants when
ANY row is active. **The real risk is double-charging, and it is prevented at source** by a
unique index on `stripe_event_id` (the checkout session id, stable across Stripe's retries),
so a retried webhook is a no-op instead of a second entitlement.

#### ⚠️ THE SITTINGS INTERLOCK — NOTHING IS SELLABLE UNTIL A HUMAN CHECKS THE DATES

`acca_sittings` ships six seeded sittings (MAR26 → JUN27) and **every one carries
`dates_verified = false`**. The `acca_sittings_open` view computes
`is_open = dates_verified AND now() < late_entry_deadline`, so **`select count(*) from
acca_sittings_open where is_open` returns 0** — no sitting can be offered at checkout. That is
the correct post-migration state, not a bug.

**This is deliberate.** The seeded dates follow ACCA's usual pattern (exams in the first full
week of the month, late entry ~2 weeks out, results ~5 weeks after) but were **NOT read off
ACCA's published calendar**. Inventing authoritative dates that gate real purchases is a
failure class this project has already banked twice — selling a pass for a sitting the student
cannot enter is the concrete harm. The interlock makes it structurally impossible rather than
relying on anyone remembering.

**To open a sitting:** verify against ACCA's calendar, correct the dates, re-derive
`access_until = exam_end + 7`, then set `dates_verified = true`.

Rulings encoded: **`access_until = exam_end + 7 days`**, stored as its own column so the rule
can change per sitting without a deploy. **The purchase + 30-day floor is NOT stored** — it
depends on when the student buys, which the sitting cannot know; the grant applies
`max(access_until, purchase + 30d)`. **`late_entry_deadline` is the real cutoff** for
`is_open` (early/standard only change ACCA's own price; late is the door closing).

#### Transition state — the legacy columns are still written

Both the legacy `profiles.apm_*` write and the new `acca_entitlements` row are maintained on
every purchase. A rollback cannot strand a customer who paid meanwhile: the legacy columns
alone still grant access (bundle-wide — generous rather than wrong), and the table alone grants
the paper actually bought. **Dropping the legacy write is the LAST step**, after the dual-read
has been verified to agree for all three holders (verification query #4 in the entitlements
migration).

A Stripe object created **before** this deploy carries no `paper` in its metadata. Those write
the legacy column ONLY and never guess a paper — a pre-split purchase was made under the
bundled offer, so bundle-wide is the correct reading, and guessing 'APM' would silently grant
an AFM buyer the wrong paper.

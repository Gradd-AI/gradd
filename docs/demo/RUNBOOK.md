# KPMG demo — the hour, as the room will see it

**Status: REHEARSED 2026-09-06 on production. Four blockers, all recorded below. No screenshots — see the last section.** Written as the document the presenter reads on
the day, not as a test result. Every wait is a real measured wait on production
(`https://www.gradd.ai`), not an estimate. Where a leg could not be rehearsed, it says so in
the leg's own section rather than in a footnote.

---

# 🔴 BLOCKER 1 — SIGNING IN THE DEMO ACCOUNTS FAILS SILENTLY, AND THE FAILURE LOOKS LIKE SUCCESS

**Found 2026-09-06 while setting up the rehearsal. Read this before touching the browser on
the day.**

## What happens

An **admin-generated magic link** — the kind you get from the Supabase dashboard's
"Generate link", or from `auth.admin.generateLink()` in a script — **does not sign you into
the app.** It is an *implicit-flow* link: the token comes back in the URL **fragment**
(`https://www.gradd.ai/acca#access_token=eyJhbGci…`).

`app/auth/callback/route.ts` reads **only** `?code=` — the PKCE parameter. There is no
fragment handler anywhere on `/acca`. So the token in the address bar is read by nothing.

## Why it is dangerous rather than merely broken

**There is no error.** The browser lands on a fully-rendered, signed-in `/acca` dashboard, and
the session it is showing is **whoever was signed in before**. Observed in rehearsal: the URL
carried demo account `01afea07`'s access token while every API call on the page authenticated
as `grant@live.ie`. Nothing on screen said so.

On the day that means **presenting on the wrong account without knowing** — most likely on
Grant's own account, which currently has **no ACCA entitlement** and shows the amber
*"All 3 free teach-throughs used"* banner. Leg 2 and leg 3 would both hit an upsell wall in
front of the room, and the natural on-the-spot diagnosis ("the entitlement didn't apply") would
be wrong, so the natural fix (re-grant the entitlement) would not work either.

## The sign-in step, in the order it must be done

Do this **before the room sits down**, once per account you intend to use.

1. **Sign out first.** Click **Sign out** in the `/acca` header. It lands you on the public
   landing page at `/` — *not* on a login screen. That is correct behaviour, not a fault
   (`PRODUCT_PUBLIC_HOME.ACCA = '/'`).
2. **Go to `https://www.gradd.ai/acca/auth`** by typing it in the address bar. Nothing on the
   landing page routes you there directly.
3. Type the demo address into the single email field and press **Send me a link**. The screen
   changes to *"Check your email"*.
4. Open the mail, click the link in it. **Use the link from the email and nothing else.** It
   is a `?code=` link and it is the only kind that works.
5. You land back on `/acca`, signed in.

## How to verify WHICH account is live, on screen, before anything else

⚠️ **No ACCA surface displays the signed-in email address.** This was checked: the only pages
in the whole app that render `user.email` are under `/admin`. So there is no glance-at-the-
header confirmation, and you need one of the two checks below.

**Check A — entitlement, on screen, no developer tools.** Go to
`https://www.gradd.ai/acca/cases?paper=AFM`. Look at the case cards:

| What you see on the cards | What it means |
|---|---|
| **`Start case →`** | ✅ You are on an entitled demo account. Proceed. |
| **`🔒 Subscribe to unlock`** | ❌ Wrong account — almost certainly still Grant's. Go back to step 1. |

**Check A does not distinguish demo1 from demo2 from demo3** — all three are entitled and look
identical. For leg 3, where the spare matters, use check B.

**Check B — identity, definitive.** Pre-flight only; never with the room watching. Open
DevTools (`F12`) → Console, on any `www.gradd.ai` page, and paste:

```js
(() => { const p = document.cookie.split(';').map(c => c.trim())
  .filter(c => c.startsWith('sb-uomxsbagekubfvkukokj-auth-token')).sort();
  let r = p.map(c => c.slice(c.indexOf('=') + 1)).join('');
  if (r.startsWith('base64-')) r = r.slice(7);
  return JSON.parse(atob(JSON.parse(atob(r)).access_token.split('.')[1])).email; })()
```

It prints the signed-in email. Close DevTools afterwards.

## Two side effects of pre-authenticating, so they don't surprise you

- **Each first sign-in fires a "new signup" alert to Grant's inbox** and appends `?signup=1`
  to the URL (`isNewSignup` in the auth callback keys on `last_sign_in_at − created_at < 10min`,
  and these accounts were created minutes before). Three accounts, three alerts. Harmless, but
  don't read them as real signups.
- The `?signup=1` is visible in the address bar after sign-in. Navigate once more before
  presenting so the URL reads cleanly.

---

# 🔴 BLOCKER 3 — THERE IS NO DEMO ACCOUNT ANYONE CAN SIGN INTO YET

**This is unresolved and it gates the whole hour.** Sign-in is magic-link only
(`app/acca/auth/page.tsx` calls `signInWithOtp`, and Blocker 1 above rules out every other
route), so **a demo account is only usable if someone can open the mailbox it emails.** Two
address schemes were tried during the rehearsal and neither is usable:

| Tried | Why it fails |
|---|---|
| `demo-rehearsal-*@gradd.ai` | `gradd.ai`'s MX points at Zoho (`mx.zoho.eu`). Mail is only deliverable to mailboxes or aliases that actually exist there; a made-up local part bounces unless catch-all is on, which could not be confirmed. **Minted, found unusable, torn down.** |
| `grant+demo1..3@live.ie` | Assumed Outlook sub-addressing would land in `grant@live.ie`. **Grant reports he does not have these addresses.** Not verified before the accounts were minted — that was the error. |

## What to do instead

**Create real mailboxes or aliases on `gradd.ai` in Zoho** — you administer that domain, so
`demo1@gradd.ai`, `demo2@gradd.ai`, `demo3@gradd.ai` as aliases onto an inbox you already open
is a two-minute job and it is the clean answer: the address is on the product's own domain,
it is reachable, and it does not put a personal address on screen if a URL or a header is ever
visible during the demo.

Then mint the accounts against those addresses and grant the entitlements. The mechanism is
proven and takes seconds:

```
npx tsx --env-file=.env.local scripts/_demo_rehearsal_setup.ts mint demo1@gradd.ai demo2@gradd.ai demo3@gradd.ai
```

(That script is a throwaway under `scripts/_*`, so it is gitignored — recreate it or grant the
two `acca_entitlements` rows by hand. It does exactly two writes per account:
`auth.admin.createUser` and one comped `pass` row per paper, which is what
`scripts/seed-demo-sit.ts` already documents as the only legitimate account-setup writes.)

**Verify each one signs in before the day**, using Check A in Blocker 1 — the case cards must
read `Start case →`, not `🔒 Subscribe to unlock`.

## How many accounts, and why

**Three, and the third is not optional.**

A sit is **one per account, permanently.** Submissions are immutable server-side —
`app/api/acca/case/turn` refuses to overwrite a recorded answer and returns 409
`already_submitted` — so a second sit on the same account fails on every requirement. If leg 3
goes wrong mid-run **you cannot retry on the same account**; you switch to the spare.

| # | Role on the day |
|---|---|
| 1 | Leg 2 — the practice case |
| 2 | Leg 3 — the marked sit |
| 3 | Spare for leg 3 |

Leg 1 needs a **fourth**, separate account: the one carrying the seeded sit (below). Do not
put the seeded paper on an account you also intend to sit live, for the same immutability
reason.

⚠️ **Never rehearse leg 3 on `grant@live.ie`.** It would spend your own account's AFM mock for
good, and that account is also the one currently signed into the presenting browser with **no
ACCA entitlement** and the amber *"All 3 free teach-throughs used"* banner showing.

## Accounts created during this rehearsal

Left in place so the seeded sit survives; delete when you no longer want them.

| Account | State |
|---|---|
| `grant+demo4@live.ie` | **Carries the seeded AFM sit.** Do not delete until leg 1 has been walked. |
| `grant+demo1@live.ie` | Clean apart from a warm-up turn on Kestrel Foods (i). |
| `grant+demo3@live.ie` | Halvard Marine (i) spent by the leg-2 probe. |
| `grant+demo2@live.ie`, `grant+demo5@live.ie`, `grant+demo6@live.ie` | **AFM Mock 1 spent** — deleted at the end of the rehearsal. |

---

# 🔴 BLOCKER 2 — LEG 3 ENDS IN AN ERROR MESSAGE, AND THE MARKING ACTUALLY WORKED

**This is the most serious thing found in the rehearsal. It is on the path of leg 3, every
time, and it is not intermittent.**

## What happens

At the end of a sat AFM paper the client POSTs `/api/acca/sit/results` to mark it. Measured on
production, 2026-09-06, on a real 8-requirement sitting with real answers:

```
POST /api/acca/sit/results   →  HTTP 524, empty body, after 125 seconds
```

**524 is Cloudflare's origin-timeout.** `www.gradd.ai` runs Cloudflare in front of Vercel
(`Server: cloudflare` + `x-vercel-id` on the same response), and Cloudflare cuts a connection
when the origin has been silent for ~100 s. It is not configurable below Enterprise.

**The Vercel function does not stop when Cloudflare hangs up.** It keeps marking. Timestamps
from `acca_case_marking`, same run:

| | |
|---|---|
| Paper finished | 20:21:43 |
| Case 1 marked | 20:23:10 |
| Case 2 marked | 20:23:57 |
| **Cloudflare returns 524** | **~20:23:49** |
| Case 3 marked | **20:24:46** — *57 seconds after the browser was told it failed* |

**So marking succeeds and the student is told it failed.** Three cases at roughly 45–50 s each
is ~150 s of work against a ~100 s ceiling; the paper is structurally over the limit, not
marginally.

## ⚠️ IT IS MUCH WORSE ON A REAL PAPER — THE BETTER THE ANSWERS, THE SLOWER THE MARKING

Reproduced independently the same night on the **seeded** sitting, whose eight answers are
full exam length (960–1,867 characters each) rather than the short paragraphs above:

| | |
|---|---|
| Paper finished | 22:08:53 |
| Case 1 marked | 22:10:34 — **101 s for one case** |
| **Cloudflare returns 524** | **22:10:58** |
| Case 2 marked | 22:11:23 |
| Case 3 marked | **22:12:33** |

**Total marking: 3 minutes 40 seconds — 220 seconds against a ~100 second ceiling.** The
earlier 125 s figure came from a paper of short paragraphs and *understates* the problem.

Two consequences worth being precise about:

- **A good paper is the slow case.** Marking time scales with how much the candidate wrote, so
  the demo condition — a properly answered paper — is the one furthest over the limit. You
  cannot escape this by writing better answers; that makes it worse.
- **The recovery is not the same every time.** On the short paper the function had finished all
  three cases 57 s after the cut. On the full paper only case 1 was done at the cut, case 2
  landed 25 s later and case 3 a further 70 s after that. **A retry pressed immediately after
  the error can find one, two or three cases marked**, so the intermediate "Not yet marked."
  state is not a fixed screen — it depends on when the button is pressed.

## What the presenter will see, in order

`resultsOutcomeFor(status, code)` maps anything that is not 2xx/402/409 to `failed`, so a
524 with an empty body lands on the error arm.

| # | On screen | Wait | Reality |
|---|---|---|---|
| 1 | *"Marking your paper…"* | **125 s** | Working correctly |
| 2 | **"Marking did not complete… try again"** + a **Try marking again** button | — | It is completing |
| 3 | Press retry → the debrief loads in **3 s**, but **Q3 (i) and Q3 (ii) read "Not yet marked."** and the case total reads **`—/20`** | 3 s | The third case is still being marked by the first request |
| 4 | Press retry again a minute later → **the complete, correct debrief** | 2 s | Everything was marked at 20:24:46 |

**Roughly three minutes from the last answer to a correct band, two of them spent looking at an
error message, with a partially-marked paper in between.** That is the moment the hour exists
to reach.

## Three things that are working, and should not be confused with the fault

- **The system never lies.** `claimCase` writes the claim row with `technical_marks_available`
  NULL, so a claim can never read as a result; the intermediate debrief says **"Not yet
  marked."** per requirement and returns `marked: false`, `skipped_concurrent: 1`. It reports a
  partial paper as partial.
- **Nothing is lost and nothing is double-billed.** The retry at step 3 marked *nothing*
  (`marked_now: 0`) — it correctly refused to re-mark a case another request was working on.
- **The claim self-heals.** `CLAIM_STALE_MS` is 5 minutes, so a genuinely crashed run is taken
  over by the next request rather than blocking the case forever.

The defect is entirely that **the front door gives up before the kitchen does**, and the UI has
no way to know the difference.

## On the day

**Do not sit the paper live.** Sit it before the room arrives, get the debrief to a correct
state, and open it from `/acca/results`. If leg 3 must be live, say into the wait: *"marking a
full paper is three cases and six model passes — it takes a couple of minutes"*, and **expect
to press retry twice.** Do not let the first retry's `—/20` be the screen anyone reads.

**Do not "fix" this by shortening the answers.** A shorter paper marks faster and hides it. The
condition is a full paper, which is the product.

---

# 🔴 BLOCKER 4 — THE SEED THAT PRODUCES LEG 1's DATA CANNOT SURVIVE ITS OWN RUNTIME

**Found by running it. `scripts/seed-demo-sit.ts` had never been executed before tonight, and
this is why leg 1 has never had data.**

## What happened

Started 19:19 UTC. R1–R4 submitted correctly at 19:53, 20:35, 20:56 and 21:09. At **21:33**,
2h14m into a 2h47m run, R5 failed:

```
✖ FAILED: turn → 401 Unauthorised
  State is in the DB — re-run the same command to resume from where it stopped.
```

## Why

`mintCookie()` mints **one** session at startup and the script then sends that same static
cookie string on every request for the next three hours. A Supabase access token lives one
hour. After it expires the route's own `createServerClient` refreshes using the refresh token
inside the cookie and **rotates it**, setting new cookies on the response — which the script
discards, because it never reads `set-cookie` back into its jar.

So from roughly the one-hour mark the script is replaying an already-consumed refresh token.
GoTrue's reuse-interval tolerates that for a while, which is why R2 (76 minutes in), R3 and R4
all succeeded. Then the grace ran out and the token was rejected.

**Any run longer than about two hours will hit this.** The script's own header says the 2h47m
duration is unavoidable — the pacing has to be performed — so the failure is on the path every
single time.

## The dangerous part is the recovery, not the failure

The script resumes correctly: it reads which requirements already carry a `final_answer` and
skips them without re-waiting. **But the pacing intervals are wall-clock gaps between HTTP
requests, so every minute the run is down is added to the next requirement's interval.**

R4 landed at 21:09:42. R5's budget is 23.4 minutes and `RATIO_FLAG_BAND` is ±25%, so R5 had to
be submitted between **17.6 and 29.3 minutes** after R4 — a hard deadline of **21:39:00** —
or its flag would flip from `on budget` to `over`.

**R5 is one of the two requirements the narration walks.** The plan's whole point is that R5
reads `on budget 1.03` and R7 reads `under 0.51` — the same candidate, holding pace and then
losing it. An `over` at R5 destroys that contrast and there is no way to re-take it, because
submissions are immutable.

It was recovered with about four minutes to spare: R5 was submitted by hand at **21:34:59**,
25.3 minutes after R4 → **ratio 1.08, `on_budget`**. The plan wanted 1.03. Inside the band,
and pure luck that the failure was noticed in time.

## What this means for anyone re-running it

- **Do not start the seed unattended and walk away.** Watch it, or the first 401 silently
  costs you the pacing profile that is the entire reason for the 2h47m.
- **If it dies, the clock on the next requirement is already running.** Work out the deadline
  before doing anything else: budget = `marks × 1.95` minutes, and you have ±25% of that from
  the last successful submission.
- **The real fix is small**: read `set-cookie` off each response back into the jar, or re-mint
  the cookie before every submission (`mintCookie` is cheap — one `generateLink` plus one
  `verifyOtp`). Re-minting per requirement is the simpler of the two and has no downside here.
  **Not done — this rehearsal fixes nothing.**

---

# SETUP — before the room sits down

## The warm-up, measured

Measured on production, real routes, real model calls, 2026-09-06 19:22 UTC.

| Call | Wait | What it is |
|---|---|---|
| `GET /api/acca/case` (load a case) | **2.1 s** | Page + scenario + exhibits |
| `POST /api/acca/case/turn` #1 | **6.7 s** | First coached turn — returned a `hint` |
| `POST /api/acca/case/turn` #2 | **8.1 s** | `teaching` |
| `POST /api/acca/case/turn` #3 | **7.0 s** | `teaching` |

**There is no cold-start cliff to warm away.** Turn #1 was the *fastest* of the three, so the
6–8 seconds is the model thinking, not the platform waking up. Warming up does not shorten the
waits — **it only confirms the room's network reaches production.** Do it anyway, on the
throwaway case (below), five minutes before you start.

⚠️ **PLAN YOUR NARRATION AROUND 6–8 SECONDS OF SILENCE PER TURN.** Leg 2 is three turns plus a
reveal — call it **30 seconds of dead air across the leg**, in four chunks. That is a long time
in a room. The per-screen sections below give you a line to say into each wait.

**Warm up on `Kestrel Foods plc`, never on the case you are about to demo.** A coached turn
spends the requirement's first-miss state, and the first miss is what produces the *hint* —
demo the same case you warmed on and the tutor opens in `teaching`, skipping the beat leg 2
exists to show.

## 🟠 The window is the single biggest visual problem, and it is fixable in two seconds

**Measured on the presenting machine (3840×2160 screen, browser maximised → 2560 CSS px wide):**

| | |
|---|---|
| Content column | **860 px** |
| Empty margin to its left | **850 px** |
| Share of screen used | **34%** |
| Body text | **16 px** |

Maximised on this machine, the product renders as a **narrow strip down the middle of a large
beige field**, with 16px body copy. On a projector at the back of a meeting room that is small
text in a third of the frame, and it reads as an unfinished web page rather than a product.

**The layout is capped at 860px and will not grow.** So do not maximise. Do one of these before
you present, and check it on the actual projector:

- **Preferred — resize the window to about 1400 px wide.** The column then fills ~60% of the
  frame with balanced margins.
- **Or zoom to 150–175%** (`Ctrl` `+`). Same effect on the text, and it scales the 16px body
  copy to something legible from the back of the room.

Do it once at the start and leave it. Changing zoom mid-demo is visible and looks like fumbling.

---

# LEG 1 — THE MOCK DEBRIEF

**✅ The data now exists.** It did not before tonight. `scripts/seed-demo-sit.ts` — written for
exactly this and never previously run — performed a full AFM Mock Paper 1 sitting on
production between **19:19 and 22:08 UTC** on `grant+demo4@live.ie`, and it is marked.

**Open it at `https://www.gradd.ai/acca/results` → the AFM Mock Paper 1 sitting.**

## Why it took 2h47m, and why it could not be faked

`submitted_at` and `started_at` are both server-set. The pacing view reports the real
wall-clock gaps between HTTP requests, so a pacing profile cannot be authored — it can only be
performed. The seed writes **no timestamp of its own**; its only direct writes are account
setup. That is also why a failure mid-run is expensive (Blocker 4).

## The plan against what actually happened — all eight flags match

| # | Requirement | Marks | Plan | Actual | Flag |
|---|---|---|---|---|---|
| 1 | Solenne (i) B3e | 10/10 | 34m, no ratio | 34m | `reading + Q1` |
| 2 | Solenne (ii) B5b | 8/16 | 1.35 | 42m, **1.35** | over |
| 3 | Solenne (iii) E2b | 4/8 | 1.35 | 21m, **1.35** | over |
| 4 | Solenne (iv) E1a | 5/6 | 1.11 | 13m, 1.12 | on budget |
| **5** | **Brecon (i) B1a** | **12/12** | 1.03 | 25m, **1.08** | **on budget** |
| 6 | Brecon (ii) B1b | 6/8 | 0.96 | 15m, 1.01 | on budget |
| **7** | **Aldebrino (i) E3a** | **3/12** | 0.51 | 12m, **0.52** | **under** |
| 8 | Aldebrino (ii) E2a | 4/8 | 0.38 | 6m, 0.39 | under |

**Paper: 52/80 technical, 10/20 professional skills — 62/100.**

R5's 1.08 against a planned 1.03 is the scar from Blocker 4's recovery; it is inside the ±25%
band and the flag is the one the plan wanted. Everything else is within 0.05 of plan.

**The headline fires as designed:**

> **End-of-paper collapse.** Between submitting Q2 (ii) and finishing, 18 minutes elapsed
> across Q3 (i)–Q3 (ii), against a combined budget of 39 minutes.

## Requirements 5 and 7 — this is the best material in the hour

The pair was engineered to contrast and it delivers: **the same candidate, on budget and
exemplary at R5, at half budget and weak at R7.**

### R5 — Brecon (i), `exemplary`, **12/12**, 25 minutes against a 23-minute budget

The marker's own words, verbatim on screen (`l.why` is never paraphrased):

> Your discount factor arithmetic is correct throughout, producing scenario NPVs of +253.2m
> (strong), +19.2m (base) and −208.6m (weak) […] Your ENPV of +43.9m and the probability of a
> negative NPV of 20% are both correct. The advice goes well beyond the bare decision rule: you
> correctly identify that the base case — the most probable single outcome — is only marginally
> positive at 19m on a 500m commitment […] and that a one-shot project cannot rely on the law
> of large numbers in the way an expected-value calculation implicitly assumes. […] There is
> nothing missing or incorrect here.

Next action: *"Nothing to change here — this is the approach to repeat."*

**Say:** *"It's quoting her own figures back at her. It isn't saying 'good work' — it's saying
which of her numbers it checked."*

### R7 — Aldebrino (i), `weak`, **3/12**, 12 minutes against a 23-minute budget

Three named errors, with the arithmetic:

> **First, the number of contracts:** because the loan runs for six months but the futures
> contract is a three-month instrument, you must scale up by 6/3. The correct number is
> 48,000,000 ÷ 1,000,000 × 6/3 = 96 contracts, not 48. Using 48 contracts means you are only
> half-hedged.
>
> **Second, the direction:** a borrower faces the risk of rising rates, so you need to SELL
> futures now and buy them back later. […] You stated you would buy futures, which is the wrong
> direction […]
>
> **Third, no basis calculation is performed.** […] Basis today = (100 − 4.00) − 95.55 = 0.45.
> With 3 months of the contract's 9-month life remaining, unexpired basis = 0.45 × 3/9 = 0.15.

and then the thing that ties it back to the pacing: *"Your correct computation of the
money-market interest figures (EUR 1,320,000 and EUR 888,000) earns some credit, but the
overall calculation is largely incorrect."*

**Say:** *"Twelve minutes on a twenty-three-minute requirement, and it cost her nine marks —
and the debrief can tell her which nine and why. That's the whole product in one row."*

**This is the narration.** Walk R5 first — on budget, full marks, the marker quoting her own
figures. Then R7 — half the time, three specific errors, nine marks gone. Then the pacing
panel, where the same story is visible as two rows.

## What is still owed on this leg

**It has not been looked at.** Everything above was fetched through
`GET /api/acca/sit/results` (which never marks and never spends), not read off the screen.
What is known about the rendering comes from the code:

- The pacing panel is a **7-column table** — Requirement · Marks · Elapsed · Budget · Ratio ·
  Flag · Awarded. Seven numeric columns inside an **860 px** content column is the layout risk
  to check first, and the reason the window advice in SETUP matters more here than anywhere.
- The flag cell renders `p.flag.replace('_',' ')`, so it reads `on budget`, `over`, `under`,
  and `no_ratio` is specially rendered as **`reading + Q1`**.
- The headline sits **above** the pacing panel in the totals panel. Whether it is comfortably
  scrollable past is **unverified** — R7's marker feedback alone is ~1,900 characters, and
  there are eight requirements, each with three collapsed `<details>` beneath it.

**Walk it once before presenting.** The content is now proven; the screen is not.

---

# LEG 2 — THE KEYBOARD, PRACTICE CASE

**Case: `Halvard Marine ASA` (AFM, Section B, 25 marks), requirement (i), 13 marks.**
`https://www.gradd.ai/acca/cases?paper=AFM` → **Halvard Marine ASA** → **Start case →**

Chosen because it is a two-requirement Section B case (short enough to walk in the hour) and
because requirement (i) is numeric — so a wrong figure is unarguably wrong, and the tutor
either catches it or does not. Requirement (i) asks for the expected NPV of a NOK 900m vessel
across three probability-weighted demand scenarios, plus the probability of a negative NPV,
plus advice to the board.

## The answer to paste — and why this one

The brief's condition: **genuinely strong on one head, clearly wrong on another.** This is the
answer a KPMG reviewer produces, and it is the condition that has failed every time it has been
measured.

The answer below is **right about the judgement and wrong about one number.** It reads the
central-case NPV as **+NOK 6m** when it is **−NOK 2.7m**, which carries into a stated
probability of a negative NPV of **25%** when the true figure is **70%**. Everything else — the
one-shot critique, the weights being the commercial director's own judgement, the fact that
only commissioning pace was flexed — is the model answer's own reasoning, correctly reached.

> Expected NPV of the vessel
>
> Discounting each scenario's own net operating cash flows at 9% against the NOK 900m outlay at t0:
>
> - Strong build-out: NPV NOK 331m (p = 0.30)
> - Central case: NPV NOK 6m (p = 0.45)
> - Delayed build-out: NPV NOK (320)m (p = 0.25)
>
> ENPV = (0.30 x 331) + (0.45 x 6) + (0.25 x -320) = NOK 22m. That exceeds zero, so on the board's stated acceptance rule the vessel is acceptable. Only the delayed scenario is loss-making, so the probability of a negative NPV is 25%.
>
> I would not put that in front of the board as a recommendation to order, though. An expected value is a repeated-game figure and Halvard will buy this vessel once: it will be chartered into a strong, a central or a delayed build-out, not into the average of the three. The weights are also the commercial director's own judgement rather than observed frequencies, informed by the published pipeline and two developer conversations, with no independent forecast commissioned. And only commissioning pace was flexed between the scenarios — day rates were held at her central assumption and operating costs assumed unaffected, which is not how the spot market behaves in a delay. The board should ask what the probabilities would have to become for the conclusion to reverse.

Have it on the clipboard. **Do not type it live** — it is 250 words and the room will watch a
cursor for two minutes.

## What happened when it was run

Run on production, 2026-09-06, three turns, full transcript in
`docs/rollbacks/demo_leg2_probe_20260906.json`. **n = 1.**

### Turn 1 — the hint. ✅ This is the product working, and it is the beat to demo.

**Click:** paste, then **Submit attempt**. **Wait: 8.5 s.**
**Say into the wait:** *"It's reading the whole answer against the marking schema now — it isn't
looking for keywords, it's checking the figures."*

What came back, in full (466 characters):

> Right — you've caught the key weakness in the commercial director's case and you've done the
> arithmetic, but there's a calculation error that's flipped the sign on one of your scenario
> NPVs, which pushes your ENPV figure in the wrong direction. Run the central-case discounting
> again and watch the present value of those four cash flows: once you land on the correct
> figure, tell me in one sentence whether it changes whether you'd recommend this order to the
> board.

**This is the moment the hour is selling.** It credits the head the candidate got right, names
the error *class* and the *scenario* — and gives away neither the figure nor the direction. It
also refuses to let them stop at the arithmetic: the follow-up question is about the
recommendation, not the number.

**Say:** *"It hasn't told them the answer. It's told them which of their three numbers to go
back to, and then asked the question a reviewer would ask."*

### Turn 2 — the teach. 🔴 IT TELLS THE CANDIDATE THEY HAVEN'T SHOWN THEIR WORKING. THEY HAVE.

**Wait: 8.7 s.** Sent: *"I think my figures are right — the cash flows are stated in the exhibit
and I discounted them at 9%. Which one are you saying is wrong?"*

> I need to see your working before we can move forward. […] the "which one are you saying is
> wrong" tells me you haven't written down the numbers yet.
>
> Here's what I need from you now: **Show me the three NPV figures** — one for each scenario
> (Strong, Central, Delayed) — with the discounting arithmetic visible.

**The candidate's answer opens with exactly that** — three scenario NPVs, labelled Strong,
Central and Delayed, each with its probability, followed by the weighting arithmetic written
out in full. The tutor asks for a thing that is on screen, four inches above its own reply, and
justifies the ask by asserting the candidate has not done it.

**On the day this is the worst thing in the hour.** A reviewer who has just written a careful
answer is told they have not written it. It does not read as a wrong hint — it reads as the
model not having read the answer, which is the single objection the product exists to defeat.

### Turn 3 — the earned reveal. 🔴 IT DESCRIBES A DIFFERENT CANDIDATE'S ANSWER.

**Wait: 8.6 s.** Sent: *"I've had another go at the central case but I'm not getting a different
answer. Can you just show me the model answer?"* — the reveal fires on the **second** miss, so
three turns is all it takes to reach it.

> […] you've computed an expected net present value and stopped there, and then concluded the
> board should approve. […] What you're missing is the companion output: the probability
> distribution of outcomes across the scenarios themselves. To unlock this, you need to discount
> each scenario's full cash flows separately so each scenario gets its own NPV figure […]

Four assertions, all false against the answer on screen:

| It says | The answer actually |
|---|---|
| *"stopped there"* | ran three further paragraphs of critique |
| *"concluded the board should approve"* | said **"I would not put that in front of the board as a recommendation to order"** |
| *"what you're missing is […] the probability"* | **stated a probability of a negative NPV — 25%.** Wrong, but not missing |
| *"you need to discount each scenario […] separately"* | did exactly that, and got two of the three right |

**And because it diagnoses an omission, it never addresses the actual error.** The candidate's
one real mistake — the central case is negative, not positive — is not named anywhere in the
wrapper. The correct figures appear only in the worked answer pasted underneath it.

This is the **fabricated-blame** mode already on the board (`AFM_SURFACED.md`, the attribution
rubric work of 05/09). What is new here is that it is reproduced **on the case surface** and
**on a strong answer** — which is what that work predicted would draw the blame form, and what
a KPMG reviewer will produce by construction.

### Three cosmetic faults in the same reply

1. 🟠 **The separator between the wrapper and the worked answer is invisible.** It renders as a
   **1 px line in `#ddd5c5` on a `#f7f3ec` ground — a contrast ratio of 1.32:1**
   (`components/chat/MessageRenderer.tsx:315`). WCAG asks 3:1 for a non-text UI element, and
   this is the boundary between *the tutor talking to you* and *the model answer*. On a
   projector it is not there at all. **This is the item flagged in the brief and it is real and
   measurable.** The two halves of the reveal read as one continuous block of prose.
2. 🟠 **A copyright footer lands in the middle of the message.** `REVEAL_FOOTER`
   (`lib/acca/tutor-personas.ts:1046`) is appended to the wrapper *before* `assembleAfmReveal`
   appends the worked answer, so every reveal reads *"…and you'll see how the two outputs work
   together. © Gradd — for your personal exam preparation."* and **then** the answer. It is
   structural, not a one-off.
3. 🟠 **The closing beat invents a question that does not exist.** *"Try the same structure on a
   fresh three-scenario problem…"* — there is no such thing to click. This is the known
   invented-inventory item: `call4_reveal` is handed no grounding pack on the case surface, so
   the fix that grounded the drill route never reached this one.

### If it has to be demoed tomorrow

**Stop at the hint.** Turn 1 is excellent, self-contained, and it is the claim the hour makes.
Turns 2 and 3 currently argue against it. If the reveal must be shown, show it on a **weak**
answer rather than a partly-right one — the credit-shaped fabrication that mode draws is far
less visible than telling a good candidate they wrote nothing.

---

# LEG 3 — THE KEYBOARD, MARKED

**`https://www.gradd.ai/acca/afm/mock` → Start.** AFM Mock Paper 1: three cases, eight
requirements, 100 marks, a **195-minute countdown** set once at start and
server-authoritative.

## Route timings, measured

| Step | Wait |
|---|---|
| `GET /api/acca/sit` — load the paper | **1.4–3.7 s** |
| `POST action=start` | **0.9–1.7 s** |
| Each answer submitted (×8) | **1.2–2.1 s** |
| `POST action=finish` | **0.7 s** |
| `POST /api/acca/sit/results` — marking | **see Blocker 2** |

The submissions are fast because a sit write does no model work — it records `final_answer`
and returns. **All the time in leg 3 is typing time plus the marking pass at the end.**

## ⚠️ Eight native browser dialogs, and they are ugly

Every submit fires a **`window.confirm`** (`components/acca/SitRunner.tsx:490`):

> Submit this answer and move on?
> This is final — you cannot come back to it.

and on the last one, *"Submit this answer and finish the paper?"*. These are **Chrome system
dialogs**, so they render as a grey OS-styled box captioned **"www.gradd.ai says"**, centred
on screen, in the browser's font rather than the product's. Eight of them, in the most
polished part of the demo.

They are also load-bearing and correct — the submission genuinely is irreversible, because
`app/api/acca/case/turn` refuses to overwrite a recorded answer (409 `already_submitted`).
**The warning is right; only its dress is wrong.** Worth knowing before the room sees it, and
worth a sentence: *"that's a real one-way door — the server refuses to take a second answer."*

## What the marks looked like

Eight short paragraphs, deliberately uneven in quality:

| Requirement | Band | Marks |
|---|---|---|
| Q1 (i) discount rate | weak | 3/10 |
| Q1 (ii) NPV in EUR | weak | 4/16 |
| Q1 (iii) forward vs money-market | weak | 2/8 |
| Q1 (iv) group treasury | weak | 1/6 |
| Q2 (i) ENPV | weak | 3/12 |
| Q2 (ii) Monte Carlo / VaR | weak | 2/8 |
| Q3 (i) interest-rate futures | **nothing** | 0/12 |
| Q3 (ii) FX exposures | **competent** | 4/8 |
| **Paper** | | **19/80 technical, 5/20 PS** |

**The marking discriminates, and that is the thing to show.** Q3 (ii) — the one answer that
named all three exposure types and said how each is managed — is the only one that reached
`competent`. Q3 (i), which asserted the right direction but produced no figures, banded
`nothing`. The marker's own reasoning on Q1 (i) is quoted verbatim in the debrief and is
correct: *"You correctly identify the right method… However, you produce no numbers at any
step, which is where the bulk of the marks lie."*

**Say:** *"Every one of these was a paragraph of plausible prose. It gave marks for the one
that did the work and zero for the one that gestured at it."*

## 🟠 The pacing headline mis-fires on a fast paper

Every run in this rehearsal produced the same headline:

> **End-of-paper collapse.** Between submitting Q2 (ii) and finishing, under a minute elapsed
> across Q3 (i)–Q3 (ii), against a combined budget of 39 minutes.

That is literally true of a paper submitted in twelve seconds, and it is the *only* headline
available, so a fast run always looks like a collapse. **It does not affect a real sitting**
(the seeded paper is paced to produce a genuine collapse at exactly this point, which is the
narration). But it means **you cannot demonstrate leg 3 by rattling through the paper** — the
debrief will accuse the candidate of collapsing at the end regardless of how they did.

A blank paper produces the same headline naming **all eight** requirements as the "final"
ones, which reads oddly: a paper nobody started is reported as a paper that collapsed at
the end.

---

# WHAT THIS REHEARSAL DID NOT COVER

Said plainly, because a runbook that hides its gaps is worse than no runbook.

**No screenshots were taken.** Every screen in this document is measured through the production
routes — real requests, real model calls, real timings, real marks — and **none of it was
photographed.** Sign-in to a demo account was not possible (Blocker 3), and the presenting
browser is signed in as `grant@live.ie`, which has no ACCA entitlement.

**Consequences, specifically:**

- **Everything visual is unverified except what could be measured from the DOM.** The 860 px /
  34%-of-screen geometry and the 1.32:1 separator contrast are real measurements taken on the
  live page. Everything else about how these screens *look* is inferred from the code.
- **The eight `window.confirm` dialogs were not seen.** Their text is quoted from source and is
  certain; their appearance on a projector is not.
- **Leg 1's content is proven; its screen is not.** The sitting exists, is marked, and its
  pacing matches the plan on all eight flags — all read through `GET /api/acca/sit/results`.
  **Nobody has looked at the results page.** The 7-column pacing table in an 860 px column and
  the scrollability of the headline are the two things to check first.
- **Leg 2's screens were not seen** — the transcript is real and complete, but the rendering of
  the reveal, and in particular how invisible that separator actually is at projector scale,
  was not photographed. That was item 4c in the brief and it is **measured but not seen**.

**What would close it:** three reachable addresses (Blocker 3), ten minutes of sign-in, and a
second pass. Nothing else in this document depends on it.

---

# WHAT THE REHEARSAL PROVED WORKS

Four blockers is the headline, so this needs saying separately: **the product itself performed,
and the two moments the hour is sold on are both strong.**

- **The hint on a partly-right answer** (leg 2, turn 1) credited the sceptical reasoning, named
  the error class and the scenario, and gave away neither the figure nor the direction.
- **The marking discriminates, and explains itself.** On the seeded paper: `exemplary` 12/12 on
  the requirement done at pace, `weak` 3/12 on the rushed one — with three specific errors named
  and the correct arithmetic shown. On the throwaway paper: `nothing` for a paragraph that
  asserted the right direction with no figures, `competent` for the one answer that did the work.
- **The pacing engine reproduced an engineered profile to within 0.05 on seven of eight
  ratios**, and the collapse headline fired exactly where it was designed to.
- **Nothing lied under failure.** Through a gateway timeout, a partially-marked paper and a
  concurrent retry, the system reported `marked: false`, showed *"Not yet marked."* per
  requirement, refused to re-mark a case another request held, and did not double-bill.

The defects are in the seams — the front door, the sign-in, the seed's session, and two of the
tutor's four turns. **None of them is in the teaching or the marking.**

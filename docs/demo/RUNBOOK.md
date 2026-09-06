# KPMG demo — the hour, as the room will see it

**Status: REHEARSAL IN PROGRESS, 2026-09-06.** Written as the document the presenter reads on
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

# SETUP — the accounts

Three accounts, all on **`grant@live.ie` sub-addressing**, so they land in an inbox that is
definitely reachable.

⚠️ **`demo-rehearsal-*@gradd.ai` was tried first and abandoned.** `gradd.ai`'s MX points at
Zoho (`mx.zoho.eu`), so mail to that domain is only deliverable to mailboxes or aliases that
actually exist there — a made-up local part bounces unless catch-all is switched on, which
could not be confirmed. Those three accounts were minted, found unusable, and torn down (users
and entitlement rows deleted). **Do not put a demo account on an address nobody can open.**

| # | Address | Role on the day | User id |
|---|---|---|---|
| 1 | `grant+demo1@live.ie` | Legs 1 and 2 — the debrief and the practice case | `806469db` |
| 2 | `grant+demo2@live.ie` | Leg 3 — the marked sit | `0ba6e8b3` |
| 3 | `grant+demo3@live.ie` | Spare for leg 3 | `e56bb01b` |

All three carry **comped AFM and APM `pass` entitlements** valid for three days
(`acca_entitlements`, `source: 'comp'`, noted as rehearsal accounts).

**Why two accounts for one leg.** A sit is **one per account, permanently**. Submissions are
immutable server-side — `app/api/acca/case/turn` refuses to overwrite a recorded answer and
returns 409 `already_submitted` — so a second sit on the same account fails on every
requirement. If leg 3 goes wrong mid-run, **you cannot retry on the same account**; you switch
to the spare. That is also why leg 3 must not be rehearsed on `grant@live.ie`: it would spend
your own account's AFM mock for good.

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

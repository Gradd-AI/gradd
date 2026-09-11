# KPMG demo — the hour

Two legs, one account, sixty minutes. Every wait below is measured on production.

---

## BEFORE THE ROOM ARRIVES

### The account — one, for the whole hour

**`grant+demo1@gradd.ai`** · coordinator of `demo-advisory` · AFM + APM to 31/12/2026 · virgin.
Mail goes to **`grant@gradd.ai`** (plus-addressing).

Spares if turn 1 goes wrong: `grant+demo2@gradd.ai`, `grant+demo3@gradd.ai` (entitled, not coordinators).
Fallback for the coordinator view only: `grant@live.ie`.

### Sign in — do this before anyone sits down, not the night before

Sessions drop after about an hour idle.

1. **Sign out** in the `/acca` header. It lands on `/`, not a login screen. That's correct.
2. Type **`https://www.gradd.ai/acca/auth`** in the address bar. Nothing on the landing page routes there.
3. Enter the address → **`Send sign-in link →`**.
4. Open the mail in `grant@gradd.ai` and click **that link and nothing else**.
5. **Confirm it took:** go to `https://www.gradd.ai/acca/cases?paper=AFM`.
   - Cards read **`Start case →`** → right account.
   - Cards read **`🔒 Subscribe to unlock`** → wrong account. Go back to step 1.

⚠️ Never use an admin-generated link from the Supabase dashboard. It does not sign you in, and it can leave you on the previous account with no error.

### Warm up

Open **`Kestrel Foods plc`** and send one throwaway turn. Never warm up on Halvard Marine — a coached turn spends the first-miss state, and the first miss is what produces the hint.

The first call after a long idle takes ~14s against ~5s warm. This is what the warm-up is for.

### The window

- **Zoom to 125–150%** (`Ctrl` `+`) and leave it. Body copy is 16px and that's what fails from the back of a room.
- `F11` for full screen, bookmarks bar hidden.
- Make the window **taller** if you can — the transcript pane is sized off viewport height.
- Set the window by hand and confirm on the actual projector. Don't assume a resize landed.

---

## THE FIVE THINGS NOT TO DO

1. **Never press `F5` during leg 2.** It destroys the conversation and the worked answer.
2. **Open the case from the case list, not by URL.** A deep link shows a bare cream *"Loading case…"* page for several seconds.
3. **Don't show the readiness panel** on Aubrey's page. Land on Mock Paper and scroll down only.
4. **Don't promise the room a tone.** The tutor's opening register is bimodal — it credits the student on some runs and opens on the error on others.
5. **Never sit a paper on `grant@live.ie`.** A sit is one per account, permanently.

---

## LEG 1 — THE COORDINATOR VIEW AND A REAL MARKED PAPER

Four screens, in this order.

### 1 · The cohort heatmap — say the words BEFORE the screen goes up

**`https://www.gradd.ai/org/demo-advisory/d82aa14f-12ab-4807-9001-3658272b5093`** → **Sept-26 APM**

> *"The trainees in this cohort are **demonstration data**. Every screenshot we show you is labelled as such."*

That's the one-pager's own commitment, verbatim. Say it before the screen, not after someone asks.

**Point at three things, in order:**

- **The D2 column** — a wall at 0.9 across thirteen people. *"That's not thirteen individual problems, that's one teaching problem."*
- **Priya Nair's empty row**, banded RED. *"And this one hasn't started — which is the thing a coordinator finds out too late."*
- **The Cohort average row** along the bottom.

### 2 · Aubrey's page, opened scrolled to **Mock paper**

**`https://www.gradd.ai/org/demo-advisory/48b0b9db-cad8-4c61-ae0d-32984af40b03/dd786100-7d5d-4e1b-a0af-62f5ac8686e1`**

> *"This one is a real trainee, sat on our clock in September, shown with her consent. Her name isn't on it — the product never displays it."*

⚠️ **Scroll to Mock paper before the screen is visible, or land there and scroll down only.** The readiness panel at the top is the one thing on the page we don't stand behind.

### 3 · The pacing table

Under **Mock paper**, below `Technical 38/80` · `Professional skills 7/20` · `Paper 45/100`.

Each requirement named, real wall-clock minutes against budget, `over` in red and `under` in amber. **She sat the full 3h 15m** — this is not a reconstruction.

### 4 · **Q1 (i)**, `COMPETENT`, with **"Show Trainee's answer"** expanded

Scroll to **`Q1 — Halworth Hotels`** → **`(i) The benchmarking exercise`**.

Band **`COMPETENT`** · **8/16** — the biggest single requirement on the paper · her answer **3,570 characters**.

**Click `Show Trainee's answer` and leave it open.** Then **read one sentence of the marker's prose aloud** and point at it — it's the only unlabelled block on the requirement, so the room won't find it on its own.

⚠️ `COMPETENT` is a tan chip on near-white and is the hardest band to read from the back. Say the word as you point at it.

---

## LEG 2 — THE KEYBOARD

**`Halvard Marine ASA`** (AFM, Section B, 25 marks), **requirement (i)**, 13 marks.
`https://www.gradd.ai/acca/cases?paper=AFM` → **Halvard Marine ASA** → **Start case →**

### The answer to paste

Have it on the clipboard. **Do not type it live.**

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

It is **right about the judgement and wrong about one number** — the central case reads +NOK 6m when it is −NOK 2.7m, which carries into a stated 25% probability of a negative NPV when the true figure is 70%.

### Turn 2 — what to send

> *"I've had another go at the central case but I'm not getting a different answer. Can you just show me the model answer?"*

The reveal fires on the **second miss**, so three turns is all it takes.

### The click path to the worked answer

1. In the reveal message, below the wrapper, a rule carries **`WORKED ANSWER`** on the left and a pill **`Open full width ↗`** on the right. **Click the pill.**
2. The worked answer opens **over** the case as a document. The conversation stays behind it, dimmed.
3. **Back: `Escape`, `Close` (top right), browser Back, or click the dim backdrop.** All four return you to the conversation with the transcript intact — the case is never unmounted.

**At the document, point at the central-case row:**

| Scenario | Probability | NPV |
|---|---|---|
| Strong build-out | 0.30 | NOK 331.1m |
| Central case | 0.45 | **NOK −2.7m** |
| Delayed build-out | 0.25 | NOK −320.0m |

> *"She had that at plus six. It's minus two point seven, and that's the whole difference between her answer and the model's."*

**And at the last line** — `Reconciliation: Σ(p×NPV) = NOK 18.1m; P(NPV<0) = 70% ✓`:

> *"Every figure in that is computed by code, not written by the model. That last line is the code checking itself."*

### What to narrate, and what never to promise

**Say only what's structurally guaranteed:** the figure is withheld until it's earned, the worked answer is code-owned, the document is the stored row reproduced rather than regenerated. All three are true on every run.

**The line that's held on every run:**

> *"It hasn't told them the answer — it's told them which of their three numbers to go back to, and then asked the question a reviewer would ask."*

**Never say** *"notice it starts by telling her what she got right."* That fires about half the time.

**If the wrapper fabricates something and the room reads it**, say so plainly:

> *"That paragraph has invented a mistake she didn't make. It's a known failure and it's the one we're working on — the marking underneath it is the part that's verified."*

---

## THE NARRATION, PER BEAT, WITH THE SECONDS

**Budget every wait at 10s and carry a hold line to 25s.** Say these *over* the wait, starting as you press the key.

**BEAT 0 · Case load** — click `Start case →` → composer.

| | |
|---|---|
| 0–3s | *"This is the practice case — scenario and exhibits on the left, the requirement and the tutor on the right."* |
| 3–10s | *"She's answering the same thing she'd answer in the exam. Nothing here is multiple choice."* |
| hold | *"It's pulling the scenario, five exhibits and the requirement in one go — that's the whole paper's worth of context, and it only does it once."* |

**BEAT 1 · Turn 1, the hint.** Paste, press send, start talking immediately.

| | |
|---|---|
| 0–4s | *"That's a strong answer with one thing wrong in it — which is exactly what a reviewer writes."* |
| 4–10s | *"Two calls go out on every turn. One reads her answer against the model answer and names the gap. The other decides what to say about it."* |
| hold | *"The first of those is the only place we reach for the bigger model — naming what's wrong is the judgement, so that's where the money goes."* |

**BEAT 2 · Turn 2, the teach.** 🔴 **This is the long one.** Have all four lines ready.

| | |
|---|---|
| 0–5s | *"She's pushed back — she's re-run it and she still makes it 6m."* |
| 5–12s | *"It's re-reading her whole answer, not just her last line. That's a fix that went in this week, and it's the reason it won't tell her she hasn't shown working she's shown."* |
| hold 12–25s | *"It's carrying the previous turn as well now, so there's more to hold than there was a minute ago."* |
| hold 25–40s | *"I'll be honest — this is slower than it should be. Nothing is cached between turns yet, so it re-reads the whole scenario every time. That's a known one and it's on the list."* |

⚠️ Say the last line rather than standing in silence. A room told a wait is a known engineering item forgives it. A room watching an unexplained spinner concludes it's frozen.

**BEAT 3 · Turn 3, the earned reveal.**

| | |
|---|---|
| 0–4s | *"She's attempted twice and missed twice — that's what unlocks this. She can't ask for it cold."* |
| 4–10s | *"This is the only turn where it stops withholding."* |
| hold | *"What it's writing is the framing. The worked answer underneath it is authored — we wrote it, the model doesn't generate it, and it's the same one every time."* |

**BEAT 4 · The expand click.** ~9–10 seconds. Say the line *while* clicking.

| | |
|---|---|
| 0–4s | *"Full width — the answer's a document, not a chat bubble."* |
| 4–10s | *"And it re-checks she earned it before it will render. You can't get to that page by guessing the URL, even signed in as her."* |

---

## THE THREE QUESTIONS THAT WILL COME, AND THE HONEST ANSWERS

### "Would a real cohort look like this?"

The true answer is better for us than a deflection, and it's the pilot's own argument.

> *"No — and I'd rather tell you that than have you find it. Those green cells are written by our seeder, not earned by anybody. The check that decides whether an answer is right is the one thing in here we haven't been able to calibrate, because calibrating it needs a real cohort answering real questions — and right now it is far too strict: it has never passed a real student once. So a live board would run redder than this until we've tuned it. **That is what we want the pilot for.** The shape of the screen is real — it's computed from attempts exactly the way it would be from yours. What we can't hand you yet is the threshold."*

Three things **not** to say:

- Don't say *"the data is synthetic"* and stop. Concede the outcomes, keep the arithmetic — the miss-rates are the part that survives a pilot.
- Don't offer any ratio as a correction factor. It isn't one.
- Don't defend the gate. Name it, then go to the D2 column, which doesn't depend on a single green cell.

### "What's the red band on her page?" (if someone scrolls up)

> *"That's a readiness score we're still calibrating, and we don't put weight on it yet. It only credits a topic once our automatic marker calls an answer correct, and that check is currently far too strict — it reads near-zero for everyone, so it tells you nothing about her. The marks underneath it are the marked paper, and those we do stand behind."*

Then go back down the page. Don't defend the number.

### "Do trainees sit the paper in the product?"

> *"They sit it on our clock, three hours fifteen, and it marks as one paper. What you're looking at is the output of one of those. We're not going to sit a three-hour paper in a half-hour meeting."*

⚠️ **Don't improvise a shortened sit.** A fast paper always produces the *End-of-paper collapse* headline regardless of how it went — so a rattled-through paper gets accused of collapsing, in front of the room, on the screen whose whole point is that the diagnosis is trustworthy.

---

## IF A REVIEWER ASKS WHETHER THE ANSWERS SIT AT A URL

No, and you can say it flatly. The document lives at `/acca/cases/<case>/answer/<requirement>` and the gate is re-checked server-side on every load. Confirmed live: **unearned → 404**, **lapsed subscription → 404**, **reserved mock content → 404**, and 200 only for a student who has earned it and is paying.

---

## KNOWN COSMETIC FAULTS — so they don't surprise you

- **`⌘↵ to send`** renders under the composer's send button on Windows.
- **A `© Gradd` footer lands mid-message** in the transcript, between the wrapper and the worked answer. On the expanded document it's a proper page footer, so the view you're presenting from doesn't have it.
- **The closing "fresh question" beat sometimes invents a scenario that doesn't exist.** It sits *below* the expand bar, so narrating from the document steps over it.
- **Case cards carry `B1`/`B5`/`E2` badges** — syllabus codes that read as internal.
- **Scrolling with the cursor over the left scenario pane scrolls the page, not the transcript.** Put the cursor over the transcript first.
- **The composer relabels after turn 1** — `Submit attempt →` becomes `Send →`. There's a **`Move on without finishing →`** button beside it; know it's there so you don't hit it.

---

## STILL UNCHECKED

- **The projector.** Every measurement here is from a desktop screen. The item most likely to change is the 16px body copy.
- **The waits, on the room's network.** Re-time the three leg-2 turns on the presenting machine before the day.
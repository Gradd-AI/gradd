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


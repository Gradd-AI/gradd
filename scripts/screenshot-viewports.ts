/**
 * screenshot-viewports.ts — the viewport harness behind TOP PREVENTION RULE 36.
 * ============================================================================
 *
 * WHAT IT IS. A one-command check that renders a page at several viewport widths
 * at once, MEASURES a small set of properties in each, prints a PASS/FAIL report
 * and writes a PNG. It exists to make the 390 / 412 / 430 mobile standard runnable
 * rather than remembered, and to make the check assert a PROPERTY rather than a
 * look (docs/GRADD_BUILD_HARDENING.md, rule 36).
 *
 * HOW TO CALL IT
 * --------------
 *   npx tsx scripts/screenshot-viewports.ts \
 *     --url /acca/afm \
 *     --widths 390,412,430 \
 *     --variant afm-mobile \
 *     --lh ".final-cta .h-display" \
 *     --shot ./shots
 *
 *   --url      REQUIRED. Path of the page to check, e.g. /acca/afm.
 *   --widths   Comma-separated viewport widths. Default 390,412,430 — the mobile
 *              standard. Pass 1440 for the desktop pass.
 *   --variant  Label for the PNG and the on-page heading. Default derived from
 *              --url. Two variants of one page can coexist (mobile / desktop).
 *   --lh       OPTIONAL, repeatable. A CSS selector whose COMPUTED LINE-HEIGHT is
 *              reported as a ratio of its own font-size, at every width. Use it to
 *              pin a value a screenshot cannot prove — e.g. the closing heading's
 *              1.06. REPORTED, NEVER ASSERTED: the tool does not know your target,
 *              and inventing one here would be a second place to keep it in step.
 *   --shot     Directory to write <variant>.png into. Omit to just serve the
 *              harness and print its URL for you to open yourself.
 *   --focus    OPTIONAL. A CSS selector; each framed page is scrolled so that
 *              element sits at the top of its frame. Measurement happens BEFORE
 *              the scroll, so focusing never changes what was measured.
 *   --frame-h  Frame height in px when shooting. Default 900. Without --shot the
 *              frames expand to the framed page's full height.
 *   --cookie   OPTIONAL. A full Cookie header value, forwarded to the UPSTREAM on
 *              every proxied request. Without it the authed surfaces (dashboard,
 *              tutor, cases, progress, sit, org) all 307 to /acca/auth and the
 *              harness can only shoot the four public pages.
 *              PREFER THE ENV FORM — `SHOT_COOKIE=... npx tsx …` — because process
 *              arguments are readable by other processes on the machine and
 *              environment is not. SHOT_COOKIE wins if both are given.
 *              The value is never logged, never drawn into the PNG and never
 *              persisted; a 3xx on a framed page while a cookie is set is reported
 *              as a warning, so a shot of the sign-in page cannot pass for a result.
 *              The cookie must come from the SAME origin as --origin: a session for
 *              gradd.ai is not valid for localhost:3000.
 *   --origin   Upstream to proxy. Default http://localhost:3000.
 *   --port     Port for this tool's own server. Default 4311.
 *   --chrome   Path to chrome.exe. Default: the usual install locations.
 *
 * POINT IT AT `npm start`, NEVER `next dev`. Rule 36 is explicit: the check is
 * against the BUILT output. Dev-mode CSS ordering and overlays are not what ships.
 *
 * WHAT IT ASSERTS (always on; both are FAIL conditions)
 * ----------------------------------------------------
 *   OVERFLOW    No element's rendered right edge exceeds the viewport, and none
 *               starts left of 0. Elements inside a deliberate `overflow-x:auto`
 *               ancestor (e.g. `.cmp-scroll`) are EXCLUDED — a scroller is not a
 *               defect.
 *   LINK WRAP   Every <a> renders at its single-line height. This is the harder
 *               half of rule 36 and the reason the tool exists. A flex row of text
 *               links does NOT overflow when its items stop fitting: flex items
 *               default to shrink:1 and a link's min-content width is its longest
 *               word, so the LABELS break mid-word while scrollWidth === clientWidth
 *               throughout. The overflow assertion everyone reaches for is exactly
 *               the one that passes. A wrapped label is 2x its line-height, so
 *               HEIGHT is the property that actually moves.
 *
 * WHY IT RUNS ITS OWN SERVER, AND WHY THAT IS NOT INCIDENTAL
 * ----------------------------------------------------------
 * The measurement needs a SAME-ORIGIN iframe: an iframe establishes its own
 * viewport, so media queries and `clamp()` resolve for real at 390px inside a
 * 1440px window (`resize_window` cannot take a real browser below desktop width),
 * and same-origin is what allows reading `iframe.contentDocument` at all. Serving
 * the harness from `public/` does NOT work — Next 16 snapshots `public/` at build
 * time, so a file written after `next build` 404s under `next start`. So this tool
 * serves the harness itself on its own port and PROXIES everything else to
 * --origin: harness and page then share one origin by construction, and nothing is
 * written into the repo.
 *
 * SCROLLBAR COMPENSATION. The iframe is widened by the host's scrollbar width
 * (`target - iframe.contentDocument.documentElement.clientWidth`) so the CONTENT
 * box lands on the target. Without it every measurement is 6-17px narrow and can
 * sit on the wrong side of a breakpoint. The shot path passes --hide-scrollbars,
 * which makes the compensation a no-op and the measurement exact. Note `vw` units
 * resolve against the iframe's OUTER width, so a `clamp()` read back here differs
 * slightly from a real phone with overlay scrollbars.
 *
 * THE SHOT PATH uses Chrome's built-in `--headless --screenshot`. No dependency is
 * added to package.json, and it does not need the Claude browser extension to be
 * connected. The report renders at the top of the PNG and is also emitted to the
 * console as one line prefixed `[viewports]`.
 *
 * EXIT CODE is non-zero when any width reports a defect, so this can gate a build
 * later if that is ever wanted. It is NOT in the contract gate today: it needs a
 * running server and a browser, which is exactly what `scripts/run-contracts.ts`
 * excludes.
 *
 * PROVENANCE. Promoted out of `scripts/_shots.ts` (2026-08-06, Grant's ruling,
 * P-DB6). This repo has already lost one authoring script to the `scripts/_*`
 * convention and nearly lost a second; a tool that verifies a shipped standard is
 * not a scratch file.
 */

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── args ────────────────────────────────────────────────────────────────────
function argList(flag: string): string[] {
  const out: string[] = [];
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === flag && argv[i + 1] !== undefined) out.push(argv[++i]);
  }
  return out;
}
const arg = (flag: string, fallback?: string) => argList(flag)[0] ?? fallback;

// ── SESSION COOKIE ──────────────────────────────────────────────────────────
// Every authed ACCA surface 307s to /acca/auth without one, so the harness could only ever
// shoot the four public pages. This forwards a real session to the UPSTREAM on every proxied
// request, which is why it works at all: Chrome runs headless against a throwaway
// --user-data-dir and holds no cookies of its own, and the frames load from THIS origin
// (127.0.0.1:<port>), not from the app's — so a cookie set for localhost:3000 would never be
// sent by the browser even if it had one. Injecting server-side sidesteps both.
//
// ⚠️ THIS IS A LIVE SESSION TOKEN. It is never logged, never written to the PNG, never put in
// the on-page meta line, and never persisted. Prefer the ENV form: process arguments are
// visible to other processes on the machine (`ps`, Task Manager details, shell history),
// environment is not. --cookie exists because it is convenient for a one-off.
const cookie = process.env.SHOT_COOKIE ?? arg('--cookie') ?? '';
const cookieSource = process.env.SHOT_COOKIE ? 'SHOT_COOKIE env' : (arg('--cookie') ? '--cookie flag' : null);

const rawUrl = arg('--url');
if (!rawUrl) {
  console.error(
    'screenshot-viewports: --url is required.\n' +
      '  npx tsx scripts/screenshot-viewports.ts --url /acca/afm --widths 390,412,430 \\\n' +
      '    --variant afm-mobile --lh ".final-cta .h-display" --shot ./shots',
  );
  process.exit(1);
}

let upstream = arg('--origin', 'http://localhost:3000')!.replace(/\/$/, '');
let path = rawUrl;
if (/^https?:\/\//.test(rawUrl)) {
  const u = new URL(rawUrl);
  upstream = u.origin;
  path = u.pathname + u.search;
}
if (!path.startsWith('/')) path = '/' + path;

const widths = (arg('--widths', '390,412,430') as string)
  .split(',')
  .map((w) => Number(w.trim()))
  .filter((w) => Number.isFinite(w) && w > 0);
if (widths.length === 0) throw new Error('--widths parsed to nothing');

const variant =
  arg('--variant') ??
  (path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'page');

const lhSelectors = argList('--lh');
const shotDir = arg('--shot');
const focus = arg('--focus', '')!;
const frameH = Number(arg('--frame-h', '900'));
const port = Number(arg('--port', '4311'));

// ── the harness ─────────────────────────────────────────────────────────────
// Everything inside this string runs IN THE BROWSER. It is a string on purpose:
// the measuring has to happen in the document that owns the iframes.
const harness = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>viewports — ${variant}</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; background: #1b1b1b; color: #eee;
         font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  header { padding: 14px 18px; background: #111; border-bottom: 1px solid #333; }
  h1 { margin: 0 0 8px; font-size: 14px; font-weight: 600; letter-spacing: .02em; }
  .meta { color: #888; }
  #report { margin: 10px 0 0; white-space: pre-wrap; }
  .pass { color: #6ee7a8; } .fail { color: #ff8a7a; } .info { color: #9ecbff; }
  .rack { display: flex; align-items: flex-start; gap: 24px; padding: 24px; }
  .col { flex: 0 0 auto; }
  .cap { padding: 6px 0; color: #aaa; }
  iframe { border: 0; background: #fff; display: block; box-shadow: 0 0 0 1px #444; }
</style>
</head>
<body>
<header>
  <h1>viewports — ${variant}</h1>
  <div class="meta">${path} &middot; widths ${widths.join(' / ')} &middot; built output (npm start) via proxy</div>
  <pre id="report">measuring&hellip;</pre>
</header>
<div class="rack" id="rack"></div>
<script>
(function () {
  var TARGET = ${JSON.stringify(path)};
  var WIDTHS = ${JSON.stringify(widths)};
  var LH = ${JSON.stringify(lhSelectors)};
  var FOCUS = ${JSON.stringify(focus)};
  // 0 = let each frame grow to the framed page's full height. Non-zero = clip to a
  // readable window, which is what a shot wants.
  var FRAME_H = ${shotDir ? String(Number.isFinite(frameH) ? frameH : 900) : '0'};
  var rack = document.getElementById('rack');
  var reportEl = document.getElementById('report');

  function mk(width) {
    var col = document.createElement('div');
    col.className = 'col';
    var cap = document.createElement('div');
    cap.className = 'cap';
    cap.textContent = width + 'px';
    var f = document.createElement('iframe');
    f.width = width;            // corrected after load for the scrollbar
    f.height = 900;
    f.src = TARGET;
    col.appendChild(cap); col.appendChild(f); rack.appendChild(col);
    return { width: width, frame: f, cap: cap };
  }

  function loaded(f) {
    return new Promise(function (res) {
      f.addEventListener('load', function () { res(); }, { once: true });
    });
  }

  // An element inside a deliberate horizontal scroller is not an overflow defect.
  function inScroller(el, root) {
    for (var n = el.parentElement; n && n !== root; n = n.parentElement) {
      var ox = n.ownerDocument.defaultView.getComputedStyle(n).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
    return false;
  }

  function label(el) {
    var s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    var cls = (el.getAttribute('class') || '').trim();
    if (cls) s += '.' + cls.split(/\\s+/).slice(0, 3).join('.');
    return s;
  }

  function measure(doc, win, width) {
    var res = { overflow: [], linkwrap: [], lh: [] };
    var root = doc.documentElement;

    var all = doc.body.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (inScroller(el, root)) continue;
      if (r.right > width + 0.5 || r.left < -0.5) {
        if (res.overflow.length < 12) {
          res.overflow.push({
            sel: label(el),
            left: Math.round(r.left * 10) / 10,
            right: Math.round(r.right * 10) / 10
          });
        }
      }
    }

    // A wrapped label is 2x its line-height. Height is the property that moves.
    var links = doc.querySelectorAll('a');
    for (var j = 0; j < links.length; j++) {
      var a = links[j];
      var ar = a.getBoundingClientRect();
      if (ar.height === 0) continue;
      var cs = win.getComputedStyle(a);
      if (cs.display === 'none') continue;
      var lh = parseFloat(cs.lineHeight);
      if (!isFinite(lh)) lh = parseFloat(cs.fontSize) * 1.2;
      var padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
               + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
      var lines = Math.round((ar.height - padY) / lh);
      if (lines > 1 && res.linkwrap.length < 12) {
        res.linkwrap.push({
          sel: label(a),
          text: (a.textContent || '').trim().slice(0, 40),
          lines: lines,
          height: Math.round(ar.height * 10) / 10,
          lineHeight: Math.round(lh * 10) / 10
        });
      }
    }

    for (var k = 0; k < LH.length; k++) {
      var nodes = doc.querySelectorAll(LH[k]);
      for (var m = 0; m < nodes.length; m++) {
        var s = win.getComputedStyle(nodes[m]);
        var fs = parseFloat(s.fontSize);
        var l = parseFloat(s.lineHeight);
        res.lh.push({
          sel: LH[k],
          fontSize: Math.round(fs * 100) / 100,
          lineHeight: isFinite(l) ? Math.round(l * 100) / 100 : s.lineHeight,
          ratio: isFinite(l) ? Math.round((l / fs) * 1000) / 1000 : null
        });
      }
    }
    return res;
  }

  var cols = WIDTHS.map(mk);

  Promise.all(cols.map(function (c) { return loaded(c.frame); }))
    .then(function () {
      // SCROLLBAR COMPENSATION — widen by the difference, or every measurement is
      // 6-17px narrow and can land on the wrong side of a breakpoint.
      cols.forEach(function (c) {
        var d = c.frame.contentDocument;
        var delta = c.width - d.documentElement.clientWidth;
        if (delta > 0) c.frame.width = String(c.width + delta);
        c.frame.height = String(FRAME_H || Math.max(900, d.documentElement.scrollHeight));
      });
      return new Promise(function (r) { setTimeout(r, 500); });
    })
    .then(function () {
      return Promise.all(cols.map(function (c) {
        var d = c.frame.contentDocument;
        return (d.fonts ? d.fonts.ready : Promise.resolve()).then(function () { return c; });
      }));
    })
    .then(function (ready) {
      var out = ready.map(function (c) {
        var d = c.frame.contentDocument;
        var w = c.frame.contentWindow;
        var actual = d.documentElement.clientWidth;
        var r = measure(d, w, actual);
        r.requested = c.width;
        r.actual = actual;
        c.cap.textContent = c.width + 'px  (content ' + actual + 'px)';
        c.frame.height = String(FRAME_H || Math.max(900, d.documentElement.scrollHeight));
        // Measure first, THEN scroll — a focus scroll must not move what was measured.
        if (FOCUS) {
          var t = d.querySelector(FOCUS);
          if (t) w.scrollTo(0, t.getBoundingClientRect().top + w.scrollY - 8);
          else c.cap.textContent += '  [focus "' + FOCUS + '" not found]';
        }
        return r;
      });

      var fails = 0, lines = [];
      out.forEach(function (r) {
        var bad = r.overflow.length + r.linkwrap.length;
        fails += bad;
        lines.push((bad ? 'FAIL ' : 'PASS ') + r.requested + 'px (content ' + r.actual + 'px)');
        r.overflow.forEach(function (o) {
          lines.push('   OVERFLOW  ' + o.sel + '  left ' + o.left + ' right ' + o.right);
        });
        r.linkwrap.forEach(function (l) {
          lines.push('   LINK WRAP ' + l.sel + '  "' + l.text + '"  ' + l.lines +
                     ' lines  h=' + l.height + ' lh=' + l.lineHeight);
        });
        r.lh.forEach(function (p) {
          lines.push('   line-height ' + p.sel + '  ' + p.lineHeight + 'px / ' +
                     p.fontSize + 'px = ' + p.ratio);
        });
      });

      var head = fails === 0
        ? '<span class="pass">PASS</span>  ' + out.length + ' width(s), 0 defects'
        : '<span class="fail">FAIL</span>  ' + fails + ' defect(s)';
      reportEl.innerHTML = head + '\\n' + lines.join('\\n')
        .replace(/^(FAIL .*)$/gm, '<span class="fail">$1</span>')
        .replace(/^(PASS .*)$/gm, '<span class="pass">$1</span>')
        .replace(/^(   line-height .*)$/gm, '<span class="info">$1</span>');

      console.log('[viewports] ' + JSON.stringify({
        variant: ${JSON.stringify(variant)}, target: TARGET, fails: fails, widths: out }));
      document.title = (fails === 0 ? 'PASS' : 'FAIL ' + fails) + ' — ${variant}';
    })
    .catch(function (e) {
      reportEl.innerHTML = '<span class="fail">HARNESS ERROR</span> ' + (e && e.message ? e.message : e);
      console.log('[viewports] ' + JSON.stringify({ error: String(e) }));
      document.title = 'ERROR — ${variant}';
    });
})();
</script>
</body>
</html>
`;

// ── the server: harness on this origin, everything else proxied ─────────────
const HARNESS_PATH = `/__viewports/${variant}.html`;

const server = createServer(async (req, res) => {
  const url = req.url || '/';
  if (url === HARNESS_PATH) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(harness);
    return;
  }
  try {
    // The injected cookie REPLACES rather than appends: headless Chrome on a throwaway
    // profile sends none of its own, so there is nothing to merge, and appending would risk
    // sending two Cookie headers on a retry.
    const upstreamHeaders: Record<string, string> = {
      ...(req.headers as Record<string, string>),
      host: new URL(upstream).host,
    };
    if (cookie) upstreamHeaders.cookie = cookie;

    const upstreamRes = await fetch(upstream + url, {
      method: req.method,
      headers: upstreamHeaders,
      redirect: 'manual',
    });

    // A 3xx on the FRAMED page with a cookie supplied is the signal that the session did not
    // take — an expired token, or one copied from a different origin than --origin. Said once,
    // here, because the alternative is a screenshot of the sign-in page that looks like a
    // finished job. The Location is printed; the cookie never is.
    if (cookie && upstreamRes.status >= 300 && upstreamRes.status < 400 && !url.startsWith('/__viewports')) {
      console.error(
        `  ⚠ ${url} → ${upstreamRes.status} ${upstreamRes.headers.get('location') ?? ''}` +
        `  (session not accepted — is the cookie current, and copied from ${upstream}?)`,
      );
    }
    const headers: Record<string, string> = {};
    upstreamRes.headers.forEach((v, k) => {
      // fetch has already decoded the body; forwarding these would lie about it.
      if (k === 'content-encoding' || k === 'content-length' || k === 'transfer-encoding') return;
      headers[k] = v;
    });
    res.writeHead(upstreamRes.status, headers);
    const buf = Buffer.from(await upstreamRes.arrayBuffer());
    res.end(buf);
  } catch (e) {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(`proxy error for ${url}: ${String(e)}\nIs ${upstream} up? Run: npm start`);
  }
});

server.listen(port, '127.0.0.1', async () => {
  const harnessUrl = `http://127.0.0.1:${port}${HARNESS_PATH}`;
  console.log(`serving ${harnessUrl}`);
  console.log(`frames  ${path}  (proxied from ${upstream}) at ${widths.join(' / ')}px`);
  // Presence and SOURCE only — never the value, and never its length, which is a fingerprint.
  if (cookieSource) console.log(`session forwarded to upstream (from ${cookieSource})`);
  if (lhSelectors.length) console.log(`probe   line-height of ${lhSelectors.join(', ')}`);

  if (!shotDir) {
    console.log('\nno --shot: open the URL above. Ctrl-C to stop.');
    return;
  }

  const candidates = [
    arg('--chrome'),
    `${process.env['ProgramFiles']}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['LOCALAPPDATA']}\\Google\\Chrome\\Application\\chrome.exe`,
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter((p): p is string => Boolean(p));
  const chrome = candidates.find((p) => existsSync(p));
  if (!chrome) {
    console.error(`--shot: no chrome found. Tried:\n  ${candidates.join('\n  ')}\nPass --chrome <path>.`);
    server.close();
    process.exitCode = 1;
    return;
  }

  mkdirSync(shotDir, { recursive: true });
  const png = join(shotDir, `${variant}.png`);
  // A stale PNG from a previous run would otherwise be indistinguishable from a
  // fresh one, and would be reported as this run's result.
  try { rmSync(png); } catch { /* not there — fine */ }

  // The rack lays the frames out in a row: sum of widths + 24px gaps + 24px
  // padding each side. Height is the header block plus one frame.
  const winW = widths.reduce((a, b) => a + b, 0) + 24 * (widths.length - 1) + 48 + 20;
  const winH = (Number.isFinite(frameH) ? frameH : 900) + 220;

  // SPAWN-POLL-KILL, not execFileSync. Headless Chrome does not reliably exit
  // after `--screenshot` here (it writes the file and keeps running), so waiting
  // on the process hangs forever. Wait on the ARTEFACT instead. The isolated
  // --user-data-dir keeps this off the user's real profile, so a running Chrome
  // cannot swallow the launch by adopting it as a new tab.
  const profile = mkdtempSync(join(tmpdir(), 'viewports-'));
  const child = spawn(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--no-first-run',
      '--no-default-browser-check',
      '--virtual-time-budget=15000',
      `--user-data-dir=${profile}`,
      `--window-size=${winW},${winH}`,
      `--screenshot=${png}`,
      harnessUrl,
    ],
    { stdio: 'ignore' },
  );

  const deadline = Date.now() + 60_000;
  while (!existsSync(png) && Date.now() < deadline) await sleep(250);
  // The file appears before the last bytes land; let the write settle.
  if (existsSync(png)) await sleep(750);

  try {
    if (process.platform === 'win32' && child.pid) {
      execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill('SIGKILL');
    }
  } catch { /* already gone */ }
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* leave it */ }

  if (existsSync(png)) {
    console.log(`shot    ${png}  (${winW}x${winH})`);
  } else {
    console.error(`--shot: chrome wrote no PNG within 60s. Is ${upstream} up? Run: npm start`);
    process.exitCode = 1;
  }
  server.close();
});

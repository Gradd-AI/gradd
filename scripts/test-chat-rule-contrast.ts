// scripts/test-chat-rule-contrast.ts
// Fixtures for the ONE horizontal rule MessageRenderer draws. PURE — reads source files off
// disk, no env, DB, model or network.
//   npm run test:chat-rule-contrast
//
// WHY THIS EXISTS. Measured on the served case surface 2026-09-07: the rule that separates
// the tutor's wrapper from the worked answer in an earned reveal rendered as
// `1px solid #ddd5c5` on a `#ffffff` message bubble — a contrast ratio of 1.46:1, where WCAG
// asks 3:1 of a non-text UI element. That rule is the boundary between *the tutor talking to
// you* and *the model answer*, and at projector gamma it was not there at all.
//
// ⚠️ CLAIM CEILING, verbatim: this proves the DECLARED TOKEN clears 3:1 against the two
// grounds this repo declares. It does NOT prove the rule is visible — a browser, a projector
// and a room's light all sit between the token and a reader's eye, and none of them is here.
// It also cannot prove the token is the one that REACHES the element at runtime; the cascade
// does that, and the closest this file gets is asserting that the <hr> asks for it (T3) and
// that nothing else does (T4).
//
// P-G3: every branch is driven. T5 pins the shipped-wrong value as MUST-FAIL against both
// grounds, and T6 pins a value that clears the WHITE ground but fails the page ground — which
// is the check that would silently pass if this file only ever tested against white.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
function ok(name: string, cond: boolean, detail = '') {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}${detail ? `  — ${detail}` : ''}`);
}

const ROOT = join(__dirname, '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

// ── WCAG 2.x relative luminance and contrast ─────────────────────────────────
function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`not a 6-digit hex colour: ${hex}`);
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}
function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a) + 0.05, luminance(b) + 0.05];
  return Math.round((Math.max(la, lb) / Math.min(la, lb)) * 100) / 100;
}

// WCAG 1.4.11 Non-text Contrast. A separator is a UI component boundary, not text.
const FLOOR = 3;

// ── The two grounds, READ FROM THE PALETTE rather than transcribed ───────────
// If the palette moves, this check moves with it. Transcribing the hexes here would let the
// ground drift out from under a rule that still reports green.
const globals = read('app/globals.css');
function rootToken(name: string): string {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(globals);
  if (!m) throw new Error(`--${name} not found as a hex literal in app/globals.css`);
  return m[1];
}
const WHITE_BUBBLE = rootToken('surface'); // the message bubble on the case + drill surfaces
const PAGE_GROUND = rootToken('bg');       // the page behind it

console.log('-- the two grounds, read from app/globals.css --');
ok('--surface is the white message bubble', WHITE_BUBBLE.toLowerCase() === '#ffffff', WHITE_BUBBLE);
ok('--bg is the warm page ground', PAGE_GROUND.toLowerCase() === '#f7f3ec', PAGE_GROUND);

// ── T1/T2 — every surface that declares the token clears 3:1 on BOTH grounds ──
// These are the light ACCA surfaces. The LC/IB chat theme is dark and deliberately declares
// no --chat-rule (it falls back to --chat-border and keeps today's behaviour); a value chosen
// for a light ground would be wrong there in the other direction.
const SURFACES = [
  { file: 'app/acca/cases/[id]/CaseSession.tsx', label: 'case surface (leg 2)' },
  { file: 'app/acca/tutor/TutorChat.tsx', label: 'drill tutor' },
  { file: 'app/acca/afm/proof/page.tsx', label: 'AFM proof page' },
];

console.log('\n-- T1/T2: the declared rule colour, per light surface --');
for (const s of SURFACES) {
  const src = read(s.file);
  const m = /--chat-rule:\s*(#[0-9a-fA-F]{6})\s*;/.exec(src);
  ok(`${s.label} declares --chat-rule as a hex literal`, m !== null, s.file);
  if (!m) continue;
  const rule = m[1];
  const onBubble = contrast(rule, WHITE_BUBBLE);
  const onPage = contrast(rule, PAGE_GROUND);
  ok(`${s.label}: ${rule} clears ${FLOOR}:1 on the white bubble`, onBubble >= FLOOR, `${onBubble}:1`);
  ok(`${s.label}: ${rule} clears ${FLOOR}:1 on the page ground`, onPage >= FLOOR, `${onPage}:1`);
}

// ── T3 — the <hr> actually asks for the token ────────────────────────────────
// A token nothing reads is decoration. This is the only <hr> path in the renderer, which is
// what makes ONE fix cover BOTH rules a reader sees: the one the model writes inside an
// ordinary reply, and the one assembleAfmReveal puts before the worked answer.
console.log('\n-- T3/T4: the token reaches the rule, and reaches nothing else --');
const renderer = read('components/chat/MessageRenderer.tsx');
const hrBlocks = renderer.match(/<hr\b[\s\S]{0,400}?\/>/g) ?? [];
ok('MessageRenderer draws exactly ONE <hr>', hrBlocks.length === 1, `${hrBlocks.length} found`);
ok('that <hr> takes its colour from --chat-rule',
  hrBlocks.length === 1 && /var\(--chat-rule/.test(hrBlocks[0]), hrBlocks[0]?.slice(0, 120) ?? '');
ok('it falls back to --chat-border, so an unmeasured surface is unchanged',
  hrBlocks.length === 1 && /var\(--chat-rule,\s*var\(--chat-border\)\)/.test(hrBlocks[0]));

// ── T4 — darkening the rule cannot leak into borders ─────────────────────────
// The whole reason for a second token is that --chat-border also draws table cells, card
// outlines and button strokes, where the light value is correct. If --chat-rule ever appears
// on anything but the rule, that separation is gone and this file's claim with it.
// Counts `var(--chat-rule…)` — the USE form. A bare mention in a comment is prose, and this
// file must not go red because the reasoning above the <hr> names the token it explains.
const ruleUses = (renderer.match(/var\(--chat-rule/g) ?? []).length;
ok('--chat-rule is USED exactly once in the renderer', ruleUses === 1, `${ruleUses} uses`);
ok('the table/card borders still use --chat-border', /borderTop: '1px solid var\(--chat-border\)'/.test(renderer)
  || /border: '1px solid var\(--chat-border\)'/.test(renderer));

// ── T5/T6 — MUST-FAIL pins ───────────────────────────────────────────────────
console.log('\n-- T5/T6: the values this check has to reject --');
const SHIPPED_WRONG = rootToken('border'); // #ddd5c5 — what --chat-border resolves to
ok('the shipped value is the one that was measured at 1.46:1',
  contrast(SHIPPED_WRONG, WHITE_BUBBLE) === 1.46, `${contrast(SHIPPED_WRONG, WHITE_BUBBLE)}:1`);
ok('MUST FAIL: the shipped value does not clear the floor on the white bubble',
  contrast(SHIPPED_WRONG, WHITE_BUBBLE) < FLOOR);
ok('MUST FAIL: nor on the page ground',
  contrast(SHIPPED_WRONG, PAGE_GROUND) < FLOOR, `${contrast(SHIPPED_WRONG, PAGE_GROUND)}:1`);

// The trap this file exists to avoid: a colour that clears WHITE and fails the warmer page
// ground. Checking one ground would report it green. #949494 is exactly that shape.
const ONE_GROUND_ONLY = '#949494';
ok('MUST FAIL: a value that clears the white bubble can still fail the page ground',
  contrast(ONE_GROUND_ONLY, WHITE_BUBBLE) >= FLOOR && contrast(ONE_GROUND_ONLY, PAGE_GROUND) < FLOOR,
  `bubble ${contrast(ONE_GROUND_ONLY, WHITE_BUBBLE)}:1, page ${contrast(ONE_GROUND_ONLY, PAGE_GROUND)}:1`);

// ── T7 — the dark surface is left alone, on purpose ──────────────────────────
console.log('\n-- T7: the LC/IB dark chat theme is deliberately not given a value --');
ok('app/globals.css declares --chat-border for the dark chat theme', /--chat-border:\s*#2a4a35/.test(globals));
ok('and does NOT declare --chat-rule, so it falls back and is unchanged',
  !/--chat-rule:/.test(globals));

console.log(`\n${failures === 0 ? 'ALL CHAT-RULE CONTRAST FIXTURES PASS' : `${failures} FIXTURE(S) FAILED`}\n`);
process.exitCode = failures === 0 ? 0 : 1;

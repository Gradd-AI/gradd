// lib/acca/prompt-cache.ts
// Shared prompt-caching helpers for every direct Anthropic API call site (tutor route,
// narrative grader, generator scripts, redteam judge). BILLING STRUCTURE ONLY — a
// cache_control breakpoint tells the API where to write/read a cache entry; it never
// changes what the model reads. Consecutive `text` content blocks are concatenated with
// no separator when the API builds the actual prompt, so splitting one string into
// [stable, rest] blocks is byte-identical to sending it as a single block — these helpers
// must never reorder or reword the content they are given, only mark where it splits.
//
// Minimum cacheable prefix length — CONFIRMED LIVE-FIRE 2026-07-23, not assumed: Sonnet 4.6 is
// 1024 tokens; Haiku 4.5 is 4096 tokens (double the old Haiku 3.5 floor of 2048 — a real
// knowledge-update trap, per AGENTS.md's "this is not the API you know" warning: training-data
// intuition about Haiku's cache floor is stale for this model generation). A breakpoint on a
// prefix under the model's minimum is NOT an error — the API silently skips creating a cache
// entry for it (empirically confirmed: no error, cache_creation_input_tokens/cache_read stay 0,
// input_tokens unaffected) — so it is always safe to add defensively even at a call site where
// the cacheable prefix sometimes runs under the floor for that call's model.
//
// ⚠️ IN THIS CODEBASE THE HAIKU LEGS ARE INERT ON EVERY PUBLISHED ITEM — MEASURED 2026-09-08,
// NOT PREDICTED. This header used to say they "will clear 4096 only for longer drills", which
// implied some do. None do:
//
//   drills   (154 published, tutor route): stable prefix 2,059–3,364 tokens →   0/154 ≥ 4096
//   cases    ( 38 published requirements): stable prefix 2,595–3,281 tokens →   0/ 38 ≥ 4096
//
// The largest stable prefix anywhere in the live corpus is 3,364 tokens — 732 short of the
// floor — because the prefix is a paper-scoped persona (~1,931 APM / ~2,202 AFM) plus a
// context/question block that is simply not big enough to close the gap. So `cacheBlock` /
// `cachePrefix` on a Haiku leg writes nothing and reads nothing today, on every published item.
//
// The ONE leg above a floor is `call2_diagnose`, the only Sonnet 4.6 leg (floor 1024):
//   drills 41/154 (APM 2/91, AFM 39/63, prefix 698–1,732) · cases 38/38 (prefix 1,034–1,859).
//
// ⚠️ THIS IS NOT AN ARGUMENT TO REMOVE THE MARKERS. They are correct, they cost nothing, and
// they start paying the moment a persona or a scenario grows past the floor — which is the
// "safe to add defensively" point above. It IS an argument against quoting this module as
// evidence that caching is doing something: on the Haiku legs, today, it is not.
//
// ⚠️ AND CACHING IS NOT A LATENCY FIX ON ANY OF THEM. Measured on the one leg that does cache
// (n=10 each arm, live, production prompt shape): cached median 2,786ms vs uncached 2,513ms,
// 10/10 cache hits, identical output length. The wait is output generation and TTFT; input
// processing was never the bottleneck. See docs/AFM_SURFACED.md, the 2026-09-08 caching item.

import type Anthropic from '@anthropic-ai/sdk';

type TextBlock = Anthropic.TextBlockParam;

const BREAKPOINT = { type: 'ephemeral' as const };

// Wrap a single stable string (a system prompt, or any content block with NO per-turn
// variable part) as one fully-cached block.
export function cacheBlock(text: string): TextBlock[] {
  return [{ type: 'text', text, cache_control: BREAKPOINT }];
}

// Split a built prompt into a cached STABLE prefix + an uncached remainder, without
// moving a byte. `full` must start with `stablePrefix` exactly — verified at runtime so a
// future edit that desyncs the two throws instead of silently caching the wrong split.
export function cachePrefix(stablePrefix: string, full: string): TextBlock[] {
  if (!full.startsWith(stablePrefix)) {
    throw new Error(
      'cachePrefix: stablePrefix is not a prefix of the built content — the cache split has ' +
      'desynced from the actual prompt (did the content-building order change?)',
    );
  }
  const rest = full.slice(stablePrefix.length);
  const blocks: TextBlock[] = [{ type: 'text', text: stablePrefix, cache_control: BREAKPOINT }];
  if (rest) blocks.push({ type: 'text', text: rest });
  return blocks;
}

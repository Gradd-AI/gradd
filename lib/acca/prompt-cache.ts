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
// the cacheable prefix sometimes runs under the floor for that call's model. In THIS codebase,
// most Haiku legs' stable prefix (a paper-scoped persona ~2000-2200 tokens + a per-drill
// context/question block) will clear 4096 only for longer drills — shorter ones get zero
// caching benefit until they grow, by construction, not a bug.

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

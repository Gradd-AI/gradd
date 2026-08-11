// lib/blog-subject.ts — THE BLOG'S SUBJECT AXIS, IN ONE PLACE.
//
// PURE. No fs, no next/headers, no next/navigation — callers hand in raw strings and get
// plain data back, so the whole rule is fixturable (`npm run test:blog-subject`) against the
// SAME input shape production builds (P-G6: `resolveSubject` takes Next's raw route param,
// `string | string[] | undefined`, not a pre-narrowed literal).
//
// ── THE DEFECTS THIS EXISTS TO CLOSE ────────────────────────────────────────────────────
// The blog was built when the ACCA product WAS APM and the site root WAS IB. Neither is true
// now, and four separate sites each encoded one of those assumptions independently:
//
//   1. `resolveSubject` knew 'apm' | 'ib' | null, and BOTH call sites collapsed that to a
//      BINARY (`subject === 'apm' ? 'apm' : 'ib'`). So `null` — the unfiltered archive, 9 of
//      whose 14 live posts are ACCA — rendered as IB: an "IB exam clarity" title and a logo
//      pointing at /ib. That archive is the CANONICAL url for every post and the only /blog
//      entry in the sitemap, so the page Google indexes for the blog's only organic channel
//      was misfiled by product.
//   2. The IB filter was `p.subject !== 'APM'` — negative space. An AFM post would have been
//      served in the IB view by construction.
//   3. The badge was `subject === 'APM' ? 'ACCA APM' : `IB ${subject}`` — an AFM post would
//      have rendered "IB AFM".
//   4. `BlogCTA`'s `isAPM = subject === 'APM'` sent everything else to Mia and
//      `/auth/signup/ib`. On an AFM post that is a cross-PRODUCT mis-send at the conversion
//      point — the reader is offered the wrong tutor, the wrong price and the wrong signup.
//
// Every one of those typechecks whether or not it is right, which is why the rule now lives
// in one module with one table behind it instead of four hand-built ternaries.
//
// ── SUBJECT IS NOT PAPER, AND THIS MODULE IS WHERE THEY MEET ────────────────────────────
// `AccaPaper` is APM | AFM. A blog SUBJECT spans two PRODUCTS — Econ and BM are IB and have
// no paper at all — so `?subject=` is not `?paper=` and the blog index must NEVER be passed
// through `paperHref`. But the blog's OUTBOUND links do become ACCA urls, and there the paper
// has to ride along. So this module owns exactly one crossing point: `accaPaperForSubject`,
// which is `strictPaper` and not `resolvePaper` on purpose — `strictPaper` REFUSES a non-ACCA
// subject (null) where `resolvePaper` would silently answer 'APM', which is the exact hazard
// its own header warns about. A null paper means "do not build an ACCA link at all".

import { DEFAULT_PAPER, strictPaper, type AccaPaper } from './acca/paper';
import { paperHref } from './acca/paper-url';

/** The `subject:` frontmatter value on every post in content/blog/. */
export const BLOG_SUBJECTS = ['Econ', 'BM', 'APM', 'AFM'] as const;
export type BlogSubject = (typeof BLOG_SUBJECTS)[number];

/**
 * The `?subject=` filter values, plus `null` for the unfiltered archive.
 *
 * 'acca' is a GROUP view spanning both papers — the ACCA pillar sells both, so its Blog link
 * needs a view that is ACCA-wide without claiming either paper. 'ib' is the same shape for
 * the other product, and stays the value the IB landing already links to.
 */
export type SubjectFilter = 'apm' | 'afm' | 'acca' | 'ib' | null;

export type BlogProduct = 'ACCA' | 'IB';

/**
 * THE ONE TABLE. Every product question about a subject resolves through here, and the
 * `Record` type makes it exhaustive: adding a member to `BlogSubject` fails to compile until
 * its product is stated. That is what stops the next subject from being classified by a
 * `!== 'APM'` somewhere.
 */
const SUBJECT_PRODUCT: Record<BlogSubject, BlogProduct> = {
  Econ: 'IB',
  BM: 'IB',
  APM: 'ACCA',
  AFM: 'ACCA',
};

export function productForSubject(subject: BlogSubject): BlogProduct {
  return SUBJECT_PRODUCT[subject];
}

/**
 * The ACCA paper a subject names, or null when the subject is not an ACCA paper.
 *
 * `strictPaper` does the work: it already refuses anything that is not a known paper, which
 * is precisely the answer wanted for Econ/BM. Callers MUST treat null as "not an ACCA
 * subject" and build no ACCA link — never as a paper.
 */
export function accaPaperForSubject(subject: BlogSubject): AccaPaper | null {
  return strictPaper(subject);
}

/**
 * Read Next's raw `searchParams.subject` into a filter.
 *
 * Takes `string | string[] | undefined` — the shape a page actually receives — because that
 * is where the last defect of this class lived: `paperFromRouteParam` exists in
 * `lib/acca/case-surface.ts` because `?paper=AFM&paper=AFM` arrives as an ARRAY and an
 * exact-match parser resolved it to the wrong thing. Same treatment here: take the first
 * value, trim it, and compare case-insensitively, so `?subject=APM` and a repeated param both
 * land where the reader plainly meant.
 *
 * Anything unrecognised → `null`, the neutral archive. That is the harmless catch-all: it
 * shows everything, and (unlike before) it no longer impersonates one of the products.
 */
export function resolveSubject(raw: string | string[] | undefined): SubjectFilter {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first !== 'string') return null;
  const v = first.trim().toLowerCase();
  if (v === 'apm' || v === 'afm' || v === 'acca' || v === 'ib') return v;
  return null;
}

/** The scoped view a post belongs to — the filter its own subject implies. */
export function filterForSubject(subject: BlogSubject): Exclude<SubjectFilter, null | 'acca'> {
  const paper = accaPaperForSubject(subject);
  if (paper === 'APM') return 'apm';
  if (paper === 'AFM') return 'afm';
  return 'ib';
}

/**
 * Does a post appear in a view? POSITIVE membership throughout — every arm asks what a
 * subject IS, never what it is not. The old ib arm (`!== 'APM'`) is the reason an AFM post
 * would have been filed under IB.
 */
export function subjectMatchesFilter(subject: BlogSubject, filter: SubjectFilter): boolean {
  if (filter === null) return true;
  if (filter === 'ib') return productForSubject(subject) === 'IB';
  if (filter === 'acca') return productForSubject(subject) === 'ACCA';
  return filterForSubject(subject) === filter;
}

/** The archive url for a view. `null` → the bare, unfiltered archive. */
export function archiveHref(filter: SubjectFilter): string {
  return filter === null ? '/blog' : `/blog?subject=${filter}`;
}

/** The badge on a post card and a post header. */
export function subjectBadge(subject: BlogSubject): string {
  const paper = accaPaperForSubject(subject);
  return paper ? `ACCA ${paper}` : `IB ${subject}`;
}

export interface BlogLink {
  label: string;
  href: string;
}

/**
 * Where an ACCA reader of a given paper starts. The paper rides INSIDE the encoded `next=`,
 * never as a second `?paper=` outside it — `lib/acca/paper-url.ts` names auth links as one of
 * the three categories that stay bare for exactly this reason, and `app/acca/cases/page.tsx`
 * already builds its redirect this way. Going through `paperHref` rather than concatenating
 * `?paper=${paper}` by hand is what keeps this from becoming a fourth private variant of the
 * rule: for APM it returns '/acca' byte-identical to the literal the pillar already uses.
 */
export function accaAuthHref(paper: AccaPaper): string {
  return `/acca/auth?next=${encodeURIComponent(paperHref('/acca', paper))}`;
}

/**
 * The header's identity for a view: where the logo goes, the scoped-archive chip beside it,
 * the CTA, and — on the neutral archive only — the two product doors.
 *
 * THE NEUTRAL ARCHIVE HAS NO CTA AND NO WORDMARK, DELIBERATELY. It spans both products, so
 * any single "Start free" button is a guess about a reader who has not declared, and guessing
 * at the conversion point is the defect this whole change exists to remove. It gets `doors`
 * instead: both scoped archives, offered evenly. Its logo goes to `/` — the site root — which
 * is a statement about the site's top, not a claim about the reader's product.
 */
export interface BlogIdentity {
  homeHref: string;
  wordmark: BlogLink | null;
  cta: BlogLink | null;
  doors: BlogLink[];
}

const IB_IDENTITY: BlogIdentity = {
  homeHref: '/ib',
  wordmark: null,
  cta: { label: 'Start free →', href: '/auth/signup/ib' },
  doors: [],
};

export function blogIdentity(filter: SubjectFilter): BlogIdentity {
  if (filter === null) {
    return {
      homeHref: '/',
      wordmark: null,
      cta: null,
      doors: [
        { label: 'ACCA', href: archiveHref('acca') },
        { label: 'IB', href: archiveHref('ib') },
      ],
    };
  }
  if (filter === 'ib') return IB_IDENTITY;

  // Every ACCA view points home at root, which IS the ACCA pillar (app/page.tsx, 2026-08-04).
  // The group view inherits the pillar's own paper default rather than inventing one: it sells
  // both papers and names neither, exactly as ACCA_AUTH_FREE does on the pillar itself.
  const paper: AccaPaper = filter === 'afm' ? 'AFM' : filter === 'apm' ? 'APM' : DEFAULT_PAPER;
  const label = filter === 'acca' ? 'ACCA' : `ACCA ${paper}`;
  return {
    homeHref: '/',
    wordmark: { label, href: archiveHref(filter) },
    cta: { label: 'Start free →', href: accaAuthHref(paper) },
    doors: [],
  };
}

/**
 * The end-of-post CTA. Keyed on the post's own SUBJECT (not a view), because a post has one
 * product and one paper and there is nothing to guess.
 */
export interface BlogCtaCopy {
  headline: string;
  sub: string;
  note: string;
  href: string;
  button: string;
}

export function ctaCopyFor(subject: BlogSubject): BlogCtaCopy {
  const paper = accaPaperForSubject(subject);
  if (paper) {
    return {
      headline: 'Ezra teaches this — and checks you’d score.',
      sub: 'Ezra spots where the marks slipped, coaches the fix, and marks you against the descriptors.',
      note: `Every ${paper} drill free. No card.`,
      href: accaAuthHref(paper),
      button: 'Try Ezra free →',
    };
  }
  return {
    headline: 'Stop practising the wrong answer.',
    sub: 'Mia spots the misconception, fixes the thinking, and makes you redraw it correctly.',
    note: 'Across the full IB Economics and Business Management curriculum. Free to start. No card needed.',
    href: '/auth/signup/ib',
    button: 'Try Mia free →',
  };
}

/**
 * Title + description per view.
 *
 * The APM and IB strings are BYTE-IDENTICAL to the ones these pages already serve — they are
 * indexed, and this change is about the neutral archive's identity, not about rewriting two
 * ranking pages. The neutral entry is the new one, and it is the point: `/blog` is the
 * canonical url for every post and 9 of its 14 live posts are ACCA, so a title reading "IB
 * exam clarity" misfiled the blog's only organic entry point by product.
 */
export interface ArchiveMeta {
  title: string;
  description: string;
}

const ARCHIVE_META: Record<Exclude<SubjectFilter, null> | 'neutral', ArchiveMeta> = {
  apm: {
    title: 'ACCA APM — exam technique, marking and the syllabus, explained',
    description:
      'How ACCA APM is marked, the professional-skills marks, describe vs apply, and the S26–J27 syllabus — exam technique explained for APM candidates.',
  },
  afm: {
    title: 'ACCA AFM — exam technique, marking and the syllabus, explained',
    description:
      'How ACCA AFM is marked, where the calculation marks stop and the judgement marks start, and what the examiner reports keep saying — exam technique explained for AFM candidates.',
  },
  acca: {
    title: 'ACCA APM & AFM — exam technique, marking and the syllabus, explained',
    description:
      'How ACCA Strategic Professional papers are marked, the professional-skills marks, describe vs apply, and what separates a calculation from a conclusion — exam technique for APM and AFM candidates.',
  },
  ib: {
    title: 'Gradd Blog — IB exam clarity',
    description: 'Common IB Economics and Business Management misconceptions, explained.',
  },
  neutral: {
    title: 'Gradd Blog — ACCA and IB exam technique, explained',
    description:
      'Exam technique for ACCA APM and AFM and for IB Economics and Business Management: how each exam is marked, where candidates lose the marks, and what to do differently.',
  },
};

export function archiveMetaFor(filter: SubjectFilter): ArchiveMeta {
  return ARCHIVE_META[filter ?? 'neutral'];
}

/** A post's content class. Drives archive grouping and the related-post preference. */
export type BlogIntent = 'failure' | 'technique' | 'syllabus' | 'exam-structure';

export interface IntentGroup {
  label: string;
  intents: BlogIntent[];
}

/**
 * Intent grouping applies to the ACCA views. The intents themselves are product-agnostic, but
 * IB has five posts across two subjects and reads better flat, and the neutral archive is
 * mixed by definition — grouping it would file an Econ post under "Failed APM?".
 *
 * The failure heading NAMES THE PAPER, which is why this is a function and not a constant:
 * "Failed APM?" over a list containing AFM posts is the same category of wrong answer as the
 * badge that would have read "IB AFM". The group view, spanning both papers, names neither.
 */
export function usesIntentGroups(filter: SubjectFilter): boolean {
  return filter === 'apm' || filter === 'afm' || filter === 'acca';
}

export function intentGroupsFor(filter: SubjectFilter): IntentGroup[] {
  if (!usesIntentGroups(filter) || filter === null || filter === 'ib') return [];
  const failed =
    filter === 'acca' ? 'Failed the exam?' : `Failed ${filter.toUpperCase()}?`;
  return [
    { label: failed, intents: ['failure'] },
    { label: 'Exam technique', intents: ['technique'] },
    { label: 'Syllabus & structure', intents: ['syllabus', 'exam-structure'] },
  ];
}

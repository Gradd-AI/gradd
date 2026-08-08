'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ACCA LANDING PAGE — the flagship marketing surface on gradd.ai. Renders the two SPOKES
// (/acca/apm, /acca/afm) and, since 2026-08-07, the PILLAR at root.
//
// ── THE PILLAR JOINED THIS COMPONENT (`feat/acca-pillar-config`) ─────────────
// Root used to be its own component on the generalised template's stylesheet, so the page a
// stranger ACTUALLY LANDS ON looked unlike the two it links to. It now renders here with
// `ACCA_PILLAR_LANDING`, which is why the section list below is nine kinds rather than six.
// The three new ones exist because the pillar's three unique blocks are real shapes —
// STAT_STRIP is a rule-to-rule strip, FEATURE_PANEL is a split with an artefact in it, and
// PAPER_CARDS carry a destination — and none of them is a points[] grid pretending.
//
// Each reuses an EXISTING treatment rather than inventing one: STAT_STRIP renders `.trust`,
// FEATURE_PANEL renders the `.one-sub` band and the `.d-grid` split SKILLS_PANEL uses, and
// PAPER_CARDS renders the `.os-card` shell. That is what makes the three pages read as one
// family; the new CSS below is only the shapes that genuinely did not exist.
//
// Free-tier + paid pricing, real CTAs into /acca, the proof row, professional-skills
// marking, FAQ + FAQPage JSON-LD. Exactly one <h1> (hero); every section is a labelled
// <section> with an <h2>. Design system: Fraunces/Geist/Geist Mono, oklch, scoped .acca-lp.
//
// ── CONFIG-DRIVEN, 2026-08-06 (`feat/afm-acca-landing-config`) ───────────────
// THIS COMPONENT OWNS STRUCTURE AND CSS. `acca-landing-config.ts` owns what the page SAYS,
// and nothing else. That split is deliberate and it is the opposite of the generalised
// template (`ProductLandingPage`) this page was once converted to and reverted from: that
// template let a config choose which section TYPES appeared, with no opinion about order,
// band rhythm or where an artefact went — so it could express every element of this page and
// compose none of them, and the result was rejected on sight (`app/acca/apm/page.tsx` carries
// the ruling in full).
//
// Here, `sections[]` is an ORDERED array of six known kinds, each with ONE renderer below.
// A config cannot reorder the page, cannot invent a section type, and cannot move the sage or
// forest band — the rhythm (cream hero → sage approach → cream loop → sage professional
// skills → cream what's-included/mock/compare → cream pricing → forest close) is in the
// renderers, not in the data.
//
// ONE section is optional: `resitBand`. Omitting it renders NOTHING — not an empty band, not
// a heading over blank space. APM sets it (a live free resit diagnostic); AFM omits it.
//
// APM's rendered body is BYTE-IDENTICAL across this extraction — proven with a SHA-256 over
// the built output before and after, not by reading. If you change a renderer below, re-prove
// it the same way.
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, useState, useEffect } from 'react';
import Link from 'next/link';
import AttributionCapture from '@/components/AttributionCapture';
import ScrollableHint from '@/components/landing/ScrollableHint';
import type {
  AccaLandingConfig,
  AccaSection,
  Cta,
  Eyebrow,
  Heading,
  PanelArtefact,
  RichText,
} from '@/components/landing/acca-landing-config';

// ── Shared bits ─────────────────────────────────────────────────────────────

/** Inline segments → text / <em> / <strong>. Strings in an array need no key. */
function rich(parts: RichText) {
  return parts.map((p, i) =>
    typeof p === 'string' ? p : 'em' in p ? <em key={i}>{p.em}</em> : <strong key={i}>{p.strong}</strong>,
  );
}

/** The page's one heading idiom: plain lead-in, then the rust italic tail.
 *
 *  The space between them is emitted INSIDE the first text node (`${text} `) rather than as
 *  its own child. Two adjacent text children would be separated by an HTML comment in the
 *  server render, which is a real difference in the output even though it looks like none. */
function heading(h: Heading) {
  if (!h.em) return h.text;
  return (
    <>
      {`${h.text} `}
      <em className="italic">{h.em}</em>
    </>
  );
}

/** A plain eyebrow, or two labels split by the rust dot. */
function eyebrow(e: Eyebrow) {
  if (typeof e === 'string') return e;
  return (
    <>
      {e.a}
      <span className="dot" />
      {e.b}
    </>
  );
}

/** Every button on the page is `label →`. The space belongs to the label's text node — see
 *  `heading` above for why it is not emitted as its own child. */
function btn(c: Cta, key?: string) {
  return (
    <Link key={key} href={c.href} className={`btn btn-${c.variant}`}>{`${c.label} `}<span className="arrow">→</span></Link>
  );
}

/** The eyebrow / heading / optional lead block every section opens with. */
function sectionHead(s: { eyebrow?: Eyebrow; heading: Heading; lead?: string }) {
  return (
    <div className="section-head">
      {s.eyebrow !== undefined && <span className="eyebrow">{eyebrow(s.eyebrow)}</span>}
      <h2 className="h-section">{heading(s.heading)}</h2>
      {s.lead !== undefined && <p className="lead">{s.lead}</p>}
    </div>
  );
}

/** ONE row of a marking panel, shared by SKILLS_PANEL and every PANEL artefact.
 *
 *  Shared deliberately rather than copied: the pillar's hero panel and the spokes' skills
 *  panel are meant to BE the same object, and two copies of this markup would let them drift
 *  apart one small edit at a time. `quoted` picks between the italic quotation treatment and
 *  the upright annotation one — see `PanelRow` for why that distinction is not decoration.
 *
 *  ⚠️ The output here is inside APM's SHA-256 pin. Anything added must be rendered only when a
 *  field is present, or the pin moves — which is the point of the pin. */
function markRow(r: { label: string; verdict: string; tone: 'strong' | 'mid' | 'flat'; body: string; quoted?: boolean }) {
  return (
    <div className="mark-row" key={r.label}>
      <div className="mark-row-hd"><span className="mark-skill">{r.label}</span><span className={`mark-band mark-band--${r.tone}`}>{r.verdict}</span></div>
      <p className={r.quoted ? 'mark-evidence' : 'mark-note'}>{r.body}</p>
    </div>
  );
}

/** A marking panel — the frame, its head, its rows and its optional foot. The italic
 *  `caption` is NOT rendered here: it sits OUTSIDE the frame, and only the hero has one. */
function panel(p: PanelArtefact) {
  return (
    <div className="mark-panel" role="img" aria-label={p.ariaLabel}>
      <div className="mark-panel-hd">
        <span className="mark-panel-title">{p.title}</span>
        <span className="mark-panel-sub">{p.sub}</span>
      </div>
      {p.rows.map(markRow)}
      {p.foot !== undefined && <p className="mark-panel-foot">{p.foot}</p>}
    </div>
  );
}

// ── Section renderers — one per kind, structure and classes owned here ───────

function renderSection(s: AccaSection, key: number) {
  switch (s.kind) {
    // ── PROOF_ROW ──
    // Three columns of PROSE, arrow-linked, reading left to right as ONE thing changing:
    // an answer, what is wrong with it, what it becomes. NOT a compare row — the middle
    // column diagnoses the first and the third is the payoff of the second, so the columns
    // are not interchangeable the way a comparison's are.
    case 'PROOF_ROW':
      return (
        <section key={key} className="section judgement" id={s.id} aria-label={s.ariaLabel}>
          <div className="wrap">
            {sectionHead(s)}
            {/* OPTIONAL big figures. Omitted, this renders nothing at all — not an empty
                row. They sit between the lead and the columns because they are the same
                finding stated as magnitudes, not a second claim. */}
            {s.numbers !== undefined && (
              <div className="ja-nums">
                {s.numbers.map((n) => (
                  <div className="ja-num" key={n.value}>
                    <span className="ja-num-value">{n.value}</span>
                    <p className="ja-num-body">{n.body}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="ja-card">
              <div className="ja-col ja-weak">
                <div className="ja-tag">{s.weak.label}</div>
                <p>{s.weak.body}</p>
              </div>
              <div className="ja-chip" aria-hidden="true">↓</div>
              <div className="ja-diag">
                <div className="ja-tag ja-tag-diag">{s.diagnosis.label}</div>
                <p>{s.diagnosis.body}</p>
              </div>
              <div className="ja-chip" aria-hidden="true">↓</div>
              <div className="ja-col ja-coached">
                <div className="ja-tag ja-tag-coached">{s.coached.label}</div>
                <p>{s.coached.body}</p>
              </div>
            </div>
            <p className="ja-caption">{s.caption}</p>
          </div>
        </section>
      );

    // ── CARD_TRIO ── sage band, three numbered cards.
    case 'CARD_TRIO':
      return (
        <section key={key} className="section one-sub" id={s.id} aria-label={s.ariaLabel}>
          <div className="wrap">
            {sectionHead(s)}
            <div className="one-sub-grid">
              {s.cards.map((c) => (
                <div className="os-card" key={c.num}>
                  <div className="num">{c.num}</div>
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    // ── STEPS ── an ordered list; the component numbers them, so a config never writes "1."
    case 'STEPS':
      return (
        <section key={key} className="section" id={s.id} aria-label={s.ariaLabel}>
          <div className="wrap">
            {sectionHead(s)}
            <ol className="tt-steps">
              {s.steps.map((t, i) => (
                <li className="tt-step" key={t}><span className="tt-n">{i + 1}</span><span className="tt-t">{t}</span></li>
              ))}
            </ol>
          </div>
        </section>
      );

    // ── SKILLS_PANEL ── sage band, four tiles beside a marking panel.
    case 'SKILLS_PANEL':
      return (
        <section key={key} className="section one-sub" id={s.id} aria-label={s.ariaLabel}>
          <div className="wrap">
            {sectionHead(s)}
            <div className="d-grid">
              <div className="skills-grid">
                {s.tiles.map((t) => (
                  <div className="skill-tile" key={t.title}>
                    <h3>{t.title}</h3>
                    <p>{t.body}</p>
                  </div>
                ))}
              </div>
              {/* The SCORE head, which only this section has — the pillar's panels carry a
                  subtitle instead. The ROWS below it are the shared `markRow`. */}
              <div className="mark-panel" role="img" aria-label={s.panel.ariaLabel}>
                <div className="mark-panel-hd">
                  <span className="mark-panel-title">{s.panel.title}</span>
                  <span className="mark-panel-score">{s.panel.score}<span className="mark-panel-of">{s.panel.of}</span></span>
                </div>
                {s.panel.rows.map((r) => markRow({ ...r, label: r.skill, body: r.evidence, quoted: true }))}
              </div>
            </div>
            <p className="ja-caption">{s.caption}</p>
          </div>
        </section>
      );

    // ── CARD_GRID ── the two-up tagged grid. `quote` is a verbatim line of the product's own
    // output, set apart from the prose around it; `limit` is the honest boundary on the claim
    // directly above it, deliberately NOT hidden in small print at the foot of the section.
    case 'CARD_GRID':
      return (
        <section key={key} className="section" id={s.id} aria-label={s.ariaLabel}>
          <div className="wrap">
            {sectionHead(s)}
            <div className="who-grid">
              {s.cards.map((c) => (
                <div className="who-card" key={c.tag}>
                  <span className="who-tag">{c.tag}</span>
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                  {c.quote !== undefined && <p className="mock-quote">{c.quote}</p>}
                  {c.limit !== undefined && <p className="mock-limit">{c.limit}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    // ── COMPARE_TABLE ── real shared rows, one column per option, Gradd's column in rust.
    case 'COMPARE_TABLE':
      return (
        <section key={key} className="section" id={s.id} aria-label={s.ariaLabel}>
          <div className="wrap">
            {sectionHead(s)}
            <div className="cmp-scroll">
              <table className="cmp-table">
                <thead>
                  <tr>
                    {/* Empty corner cell. `scope="col"` with no text is still the correct
                        header for the row-label column; a <td> here would break the grid. */}
                    <th scope="col" />
                    {s.columns.map((col) => (
                      <th key={col.label} scope="col" className={col.gradd ? 'is-gradd' : undefined}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.rowLabels.map((row, ri) => (
                    <tr key={row}>
                      <th scope="row">{row}</th>
                      {s.columns.map((col) => {
                        const v = col.values[ri];
                        return (
                          <td key={col.label} className={col.gradd ? 'is-gradd' : undefined}>
                            {/* role="img" is load-bearing, not decoration: aria-label is
                                ignored on a bare <span> (a generic element has no role that
                                supports naming), so a screen reader would announce a stray
                                "✓" or an em dash — or nothing. With the role it reads "Yes"
                                / "No", which is the only way this table is legible without
                                sight of the glyph. */}
                            {typeof v === 'boolean'
                              ? (v ? <span className="cmp-y" role="img" aria-label="Yes">✓</span>
                                   : <span className="cmp-n" role="img" aria-label="No">—</span>)
                              : v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Shown ONLY when the container actually overflows. It is the adjacent sibling
                of `.cmp-scroll` on purpose — the CSS rule is
                `[data-scrollable="true"] + .cmp-hint`, so the cue and the thing it describes
                cannot drift apart. NOT breakpoint-gated: see ScrollableHint.tsx for why a
                media query was wrong at both ends in production. */}
            <p className="cmp-hint">{s.scrollHint}</p>
            <ScrollableHint selector=".cmp-scroll" />
          </div>
        </section>
      );

    // ── STAT_STRIP ── the thin bordered counts band, rule to rule.
    //
    // It renders `.trust`, NOT `.section`, and that is load-bearing twice over. Visually it
    // is a strip between two sections rather than a section of its own, so it carries its own
    // top and bottom hairline and none of the section padding. Structurally, because it is
    // not `.section`, it BREAKS the cream-run adjacency chain — two cream sections either
    // side of it get no seam rule drawn across it, which is right: the strip's own borders
    // have already done that job, and a third line would be a triple.
    case 'STAT_STRIP':
      return (
        <section key={key} className="trust" aria-label={s.ariaLabel}>
          <div className="wrap trust-inner">
            <span className="trust-label">{s.label}</span>
            <div className="trust-stats">
              {s.stats.map((st) => (
                <div className="trust-stat" key={st.label}>
                  <span className="num">{st.value}</span>
                  <span className="lbl">{st.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    // ── FEATURE_PANEL ── sage band: bullets beside a marking panel.
    //
    // Reuses `.one-sub` (the band) and `.d-grid` (the two-column split) exactly as
    // SKILLS_PANEL does — same band, same proportions, same collapse point — so the pillar's
    // one sage feature and the spokes' sage feature are the same object at a glance.
    case 'FEATURE_PANEL':
      return (
        <section key={key} className="section one-sub" id={s.id} aria-label={s.ariaLabel}>
          <div className="wrap">
            {sectionHead(s)}
            <div className="d-grid">
              <ul className="feat-bullets">
                {s.bullets.map((b, i) => <li key={i}>{rich(b)}</li>)}
              </ul>
              {panel(s.panel)}
            </div>
          </div>
        </section>
      );

    // ── PAPER_CARDS ── one card per paper, each with a link into that paper's own page.
    //
    // The card SHELL is `.os-card`, the same one the sage band's numbered cards use; only the
    // contents differ, because a card on this band should not look like a new species. What
    // makes this a kind of its own rather than a CARD_GRID variant is the CTA: these cards are
    // destinations, and routing is the pillar's whole job.
    case 'PAPER_CARDS':
      return (
        <section key={key} className="section one-sub" id={s.id} aria-label={s.ariaLabel}>
          <div className="wrap">
            {sectionHead(s)}
            <div className="paper-grid">
              {s.cards.map((c) => (
                <article className="os-card paper-card" key={c.code}>
                  <div className="paper-hd">
                    <h3>{c.code}</h3>
                    <span className="paper-chip">{c.status}</span>
                  </div>
                  <p className="paper-name">{c.name}</p>
                  <p className="paper-blurb">{c.blurb}</p>
                  <p className="paper-live"><strong>What&rsquo;s live:</strong>{` ${c.live}`}</p>
                  {btn(c.cta)}
                </article>
              ))}
            </div>
          </div>
        </section>
      );
  }
}

// ── The page ────────────────────────────────────────────────────────────────

export default function ACCALandingPage({ config }: { config: AccaLandingConfig }) {
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      setShowTop(window.scrollY > 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 68, behavior: 'smooth' });
  };

  const { hero, resitBand, pricing, faq, finalCta, footer } = config;

  // Built from the SAME array the visible list renders, so the structured data mirrors the
  // on-page copy exactly and cannot drift from it. A page with no FAQ emits NO JSON-LD —
  // structured data asserting questions the page does not ask is worse than none.
  const faqJsonLd = faq === undefined ? null : {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <>
      {/* First-touch utm_* / fbclid → cookie → persisted to the profile at signup. */}
      <AttributionCapture />
      <style>{CSS}</style>

      <div className="acca-lp">
        <div className="bg-grain" aria-hidden="true" />

        {/* ── NAV ── */}
        <header className={`nav${scrolled ? ' nav--scrolled' : ''}`}>
          <div className="wrap nav-inner">
            <a href="#" className="nav-logo" aria-label="Gradd.ai home">
              <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{height:22,width:'auto',display:'block'}} />
            </a>
            <nav className="nav-links" aria-label="Primary">
              {config.nav.links.map((l) =>
                'href' in l
                  ? <Link key={l.label} href={l.href} className="nav-link-btn">{l.label}</Link>
                  : <button key={l.label} className="nav-link-btn" onClick={() => scrollTo(l.scrollTo)}>{l.label}</button>,
              )}
            </nav>
            <div className="nav-cta">
              {/* Quiet text links — the magic-link flow handles returning users and new
                  signups at the same destination, so Sign in shares the free CTA's href.
                  Lives in nav-cta (always visible) so it persists in the collapsed nav. */}
              {config.nav.quiet.map((q) => (
                <Link key={q.label} href={q.href} className="nav-signin">{q.label}</Link>
              ))}
              <Link href={config.nav.primary.href} className="btn btn-rust btn-sm">{`${config.nav.primary.label} `}<span className="arrow">→</span></Link>
            </div>
          </div>
        </header>

        {/* ── HERO ── */}
        <section className="hero" aria-label="Introduction">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <div className="hero-eyebrow eyebrow">
                <span>{hero.eyebrow.paper}</span><span className="dot" /><span>{hero.eyebrow.exam}</span>
              </div>
              <h1 className="hero-h1 h-display">
                {`${hero.h1.lead} `}<span className="em underline">{hero.h1.underline}</span>
              </h1>
              {/* One paragraph or several. A plain string renders the single <p> it always
                  did — the array form is what the pillar needs, because its hero states the
                  problem and the answer to it in that order and they are not one sentence. */}
              {(Array.isArray(hero.sub) ? hero.sub : [hero.sub]).map((p, i) => (
                <p className="hero-sub" key={i}>
                  {p}
                </p>
              ))}
              {hero.note !== undefined && <p className="hero-note">{hero.note}</p>}
              <div className="hero-cta">
                {hero.ctas.map((c) => btn(c, c.label))}
              </div>
              {hero.microcopy !== undefined && <p className="hero-microcopy">{hero.microcopy}</p>}
              {/* Dot-separated, so the separator belongs BETWEEN items, not to an item — a
                  Fragment carries the key without adding an element to the DOM. */}
              <div className="hero-meta">
                {hero.meta.map((m, i) => (
                  <Fragment key={m}>
                    {i > 0 && <span className="dot" />}
                    <span>{m}</span>
                  </Fragment>
                ))}
              </div>
            </div>

            {/* TWO ARTEFACT SHAPES, and the choice is the page's claim about itself: a SPOKE
                sells a tutor, so it shows a conversation; the PILLAR sells marking, so it
                shows a marked answer. Both sit in the same slot with the same caption
                treatment beneath. */}
            <div className="hero-visual">
              {hero.artefact.kind === 'CHAT' ? (
                <div className="chat" role="img" aria-label={hero.artefact.ariaLabel}>
                  <div className="chat-hd">
                    <div className="chat-logo">
                      <img src="/gradd-ai-logo.png" alt="" style={{height:16,width:'auto',display:'block'}} />
                    </div>
                    <div className="chat-name-pill"><span className="live" />{hero.artefact.name}</div>
                    <div className="chat-course">
                      <div className="em">{hero.artefact.courseTitle}</div>
                      <div>{hero.artefact.courseSub}</div>
                    </div>
                  </div>
                  <div className="chat-body">
                    {hero.artefact.turns.map((t, i) =>
                      t.role === 'student' ? (
                        <div className="chat-row from-user" key={i}>
                          <div className="user-bubble">{t.text}</div>
                          <div className="user-av">S</div>
                        </div>
                      ) : (
                        <div className="chat-row" key={i}>
                          <div className="ezra-av">E</div>
                          <div className="ezra-msg">
                            {t.badge !== undefined && <span className="hint-badge">{t.badge}</span>}
                            {t.paragraphs.map((p, pi) => <p key={pi}>{rich(p)}</p>)}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                  <div className="chat-input">
                    <div className="ph">{hero.artefact.inputPlaceholder}</div>
                    <div className="send">↵</div>
                  </div>
                  <div className="chat-foot">{hero.artefact.footer}</div>
                </div>
              ) : (
                panel(hero.artefact)
              )}
              {hero.artefact.caption !== undefined && <p className="visual-caption">{hero.artefact.caption}</p>}
            </div>
          </div>
        </section>

        {/* ── FREE RESIT DIAGNOSTIC (directly after hero) ──
            OPTIONAL. Omitted from the config, this renders nothing at all — no band, no
            heading, no empty container. AFM omits it: there is no AFM resit diagnostic to
            point at, and a real-looking band pointing at nothing is worse than no band. */}
        {resitBand !== undefined && (
          <section className="section resit-band" aria-label={resitBand.ariaLabel}>
            <div className="wrap">
              <div className="resit-band-inner">
                <span className="eyebrow">{resitBand.eyebrow}</span>
                <h2 className="h-section">{heading(resitBand.heading)}</h2>
                <p className="lead">
                  {resitBand.lead}
                </p>
                <div className="resit-band-cta">{btn(resitBand.cta)}</div>
              </div>
            </div>
          </section>
        )}

        {/* ── THE BODY ── ordered by the config; one renderer per kind, above. */}
        {config.sections.map((s, i) => renderSection(s, i))}

        {/* ── PRICING ── */}
        <section className="section pricing-band" id={pricing.id} aria-label={pricing.ariaLabel}>
          <div className="wrap">
            <div className="section-head" style={{marginLeft:'auto',marginRight:'auto',textAlign:'center'}}>
              <span className="eyebrow" style={{display:'inline-block',marginBottom:18}}>{pricing.eyebrow}</span>
              <h2 className="h-section" style={{marginLeft:'auto',marginRight:'auto'}}>{heading(pricing.heading)}</h2>
              <p className="lead" style={{margin:'22px auto 0'}}>{pricing.lead}</p>
            </div>
            <div className="price-grid">
              {pricing.tiers.map((t) => (
                <article className={`price-card${t.featured ? ' featured' : ''}`} key={t.name}>
                  {t.badge !== undefined && <span className={`price-badge${t.badgeMuted ? ' price-badge--muted' : ''}`}>{t.badge}</span>}
                  <span className="price-name">{t.name}</span>
                  <div className="price-amount"><span className="cur">{t.currency}</span>{t.amount}{t.per !== undefined && <span className="per">{t.per}</span>}</div>
                  <p className="price-tagline">{t.tagline}</p>
                  <ul className="price-features">
                    {t.features.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                  {btn(t.cta)}
                </article>
              ))}
            </div>
            <p className="price-note">{pricing.note}</p>
          </div>
        </section>

        {/* ── FAQ (+ FAQPage JSON-LD) ──
            OPTIONAL, on the same terms as the resit band: omitted, this renders nothing —
            no empty <dl>, no heading over blank space, and no JSON-LD. */}
        {faq !== undefined && (
        <section className="section" id={faq.id} aria-label={faq.ariaLabel}>
          <div className="wrap" style={{maxWidth:820}}>
            <div className="section-head">
              <span className="eyebrow">{faq.eyebrow}</span>
              <h2 className="h-section">{heading(faq.heading)}</h2>
            </div>
            <dl className="faq-list">
              {faq.items.map((f, i) => (
                <div className="faq-item" key={i}>
                  <dt className="faq-q">{f.q}</dt>
                  <dd className="faq-a">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
          />
        </section>
        )}

        {/* ── FINAL CTA ── */}
        <section className="final-cta" aria-label={finalCta.ariaLabel}>
          <div className="wrap final-cta-inner">
            <div className="tag-pill" style={{marginBottom:30,color:'color-mix(in oklab,var(--forest-ink) 80%,transparent)',borderColor:'color-mix(in oklab,var(--forest-ink) 30%,transparent)'}}>
              <span className="dot" />{` ${finalCta.pill}`}
            </div>
            <h2 className="h-display">{heading(finalCta.heading)}</h2>
            <p className="lead">{finalCta.lead}</p>
            {/* The optional SECOND button renders only when a config sets one, so a page with
                one CTA still emits exactly one child here. The pillar sets it because its
                close now offers BOTH free resit diagnostics — APM and AFM — and root is the
                one page that cannot assume which paper the visitor sat. Both carry the same
                variant on purpose: this renderer takes a button's weight from `variant`
                alone, so a rust-plus-ghost pair would quietly nominate a default paper. */}
            <div className="hero-cta" style={{justifyContent:'center',marginTop:36}}>
              {btn(finalCta.cta)}
              {finalCta.secondary !== undefined && btn(finalCta.secondary)}
            </div>
            <div className="small">{finalCta.small}</div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="footer">
          <div className="wrap footer-inner">
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{height:16,width:'auto',display:'block'}} />
              <span style={{fontSize:12,color:'var(--ink-3)',marginLeft:14}}>{footer.copyright}</span>
            </div>
            <div className="footer-links">
              {footer.links.map((l) =>
                l.href.startsWith('mailto:')
                  ? <a key={l.label} href={l.href}>{l.label}</a>
                  : <Link key={l.label} href={l.href}>{l.label}</Link>,
              )}
            </div>
          </div>
          <div className="wrap" style={{textAlign:'center',marginTop:20,paddingBottom:8}}>
            <p style={{fontFamily:'var(--sans)',fontSize:11,color:'var(--ink-3)',lineHeight:1.5}}>
              {footer.disclaimer}
            </p>
          </div>
        </footer>

        {/* Back to top */}
        <button
          className={`to-top${showTop ? ' visible' : ''}`}
          aria-label="Back to top"
          onClick={() => window.scrollTo({top:0,behavior:'smooth'})}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </>
  );
}

// ── Scoped CSS ─────────────────────────────────────────────────────────────────
// All selectors prefixed with .acca-lp — no collision with .ib-lp or LC landing.
// Design system ported from IBLandingPage.tsx (oklch palette, Fraunces/Geist/Geist Mono).

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap');

.acca-lp {
  --paper:    oklch(96.2% 0.012 78);
  --paper-2:  oklch(93.5% 0.015 78);
  --paper-3:  oklch(89% 0.018 78);
  --ink:      oklch(18% 0.012 60);
  --ink-2:    oklch(34% 0.012 60);
  --ink-3:    oklch(54% 0.012 60);
  --rule:     oklch(86% 0.014 78);
  --rule-strong: oklch(74% 0.018 78);
  --forest:   oklch(22% 0.035 168);
  --forest-2: oklch(28% 0.04 168);
  --forest-ink: oklch(94% 0.025 80);
  --sage:     oklch(91% 0.018 140);
  --sage-2:   oklch(86% 0.025 140);
  --rust:     oklch(64% 0.17 47);
  --rust-2:   oklch(58% 0.17 47);
  --rust-ink: oklch(98% 0.01 70);
  --gold:     oklch(70% 0.14 75);
  --serif:    "Fraunces", "Times New Roman", Georgia, serif;
  --sans:     "Geist", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --mono:     "Geist Mono", ui-monospace, "JetBrains Mono", Menlo, monospace;
  --max:      1240px;
  --gut:      clamp(20px, 4vw, 56px);
  --section:  clamp(72px, 9vw, 128px);
  --radius:   14px;
  --radius-sm:10px;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 16px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  overflow-x: clip;
}

/* ── Base ── */
.acca-lp *, .acca-lp *::before, .acca-lp *::after { box-sizing: border-box; margin: 0; padding: 0; }
.acca-lp *::selection { background: var(--rust); color: var(--rust-ink); }
.acca-lp img, .acca-lp svg { display: block; max-width: 100%; }
.acca-lp a { color: inherit; text-decoration: none; }
.acca-lp button { font: inherit; cursor: pointer; border: none; background: none; }
.acca-lp h1, .acca-lp h2, .acca-lp h3, .acca-lp h4 { font-weight: 400; }

/* ── Noise grain ── */
.acca-lp .bg-grain {
  position: fixed; inset: 0; z-index: 0;
  background-image: radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0);
  background-size: 22px 22px;
  pointer-events: none; opacity: 0.3;
}

/* ── Type ── */
.acca-lp .eyebrow {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--ink-3); font-weight: 500;
}
.acca-lp .eyebrow .dot {
  display: inline-block; width: 5px; height: 5px; background: var(--rust);
  border-radius: 50%; vertical-align: middle; margin: 0 8px 2px;
}
.acca-lp .italic { font-style: italic; }
.acca-lp .h-section .italic,
.acca-lp .h-display .italic { color: var(--rust); }
.acca-lp .h-display {
  font-family: var(--serif); font-size: clamp(48px, 7.4vw, 104px);
  line-height: 0.96; letter-spacing: -0.025em; text-wrap: balance;
}
.acca-lp .h-section {
  font-family: var(--serif); font-size: clamp(34px, 4.6vw, 60px);
  line-height: 1.02; letter-spacing: -0.02em; text-wrap: balance;
}
.acca-lp .lead {
  font-size: clamp(17px, 1.45vw, 20px); line-height: 1.5;
  color: var(--ink-2); max-width: 56ch; text-wrap: pretty;
}

/* ── Layout ── */
.acca-lp .wrap { max-width: var(--max); margin: 0 auto; padding: 0 var(--gut); }
.acca-lp .section { padding: var(--section) 0; }

/* ── SEAM RULES INSIDE THE CREAM RUN ─────────────────────────────────────────
   The body closes with THREE consecutive cream sections — what's included → the
   timed mock → how it compares — 2,656px of unbroken cream at 1440 with no band
   change anywhere in it, so they read as one long block (Grant, 2026-08-06; the
   one thing flagged on an otherwise approved page).

   The treatment REUSES the page's existing section-opening device — a 1px --rule
   hairline — rather than inventing a tone or changing what a card means. No new
   band: the approved rhythm (cream hero → sage → cream → sage → cream → forest)
   is untouched.

   ── THE :not() CHAIN IS THE SCOPING, and it is the whole rule. A hairline is drawn
   only where a cream section FOLLOWS a cream section, which is true at exactly two
   places on each page. It is deliberately NOT drawn:
     · before STEPS or the first CARD_GRID — each follows a sage .one-sub band, whose
       own border-bottom already separates it; a second line would double it
     · before .pricing-band — it brings its own background and its own two borders
     · before the FAQ — it follows .pricing-band, so the band edge has just fired
     · before .judgement — on APM it follows the sage .resit-band, on AFM the hero
   .judgement is NOT in the chain, and that is deliberate: it renders CREAM, not a
   band. Listing it would assert otherwise and would suppress a CORRECT hairline if
   the section order ever changed. Verified in-browser on both pages: exactly the two
   seams match, with and without it.

   THE PILLAR'S STAT_STRIP IS OUTSIDE THIS RULE BY CONSTRUCTION, not by exclusion: it renders
   .trust, which is not .section, so it is not an adjacent sibling either half can match.
   That is the correct answer — it carries its own top and bottom hairline, and a seam rule
   drawn across it would be a third line. A future strip-shaped kind must do the same, or be
   listed here.

   Every genuine BAND class must appear in BOTH halves. A new one added later and not
   listed here would paint a hairline directly onto that band's own border.
   test-acca-landing-config.ts guards the PRECONDITION for that, and the limit of what
   it can see is worth stating: its bodyOf() strips <style>, so it cannot assert a
   painted border and does not claim to. It re-derives this selector's MATCH SET from
   the rendered class sequence and pins it at exactly two named seams per page, which
   is what catches a reordered body or a newly-banded section. That the matched seam
   is then actually drawn is a CSS fact, verified by screenshot.

   CSS-ONLY BY DESIGN: an <hr>, or a new class on the section, would change the
   rendered body and break the APM SHA-256 pin. The pin's bodyOf() strips <style>, so
   a rule expressed here passes through it untouched — pin still green after this. */
.acca-lp .section:not(.one-sub):not(.pricing-band):not(.resit-band)
       + .section:not(.one-sub):not(.pricing-band):not(.resit-band) {
  border-top: 1px solid var(--rule);
}

.acca-lp .section-head { max-width: 780px; margin-bottom: 56px; }
.acca-lp .section-head .eyebrow { display: block; margin-bottom: 18px; }
.acca-lp .section-head .lead { margin-top: 22px; }
.acca-lp .rule { border: 0; border-top: 1px solid var(--rule); margin: 0; }

/* ── Buttons ── */
.acca-lp .btn {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 14px 22px; border-radius: 999px; font-weight: 500;
  font-size: 15px; letter-spacing: -0.005em; border: 1px solid transparent;
  transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease;
  white-space: nowrap; cursor: pointer; text-decoration: none;
}
.acca-lp .btn:hover { transform: translateY(-1px); }
.acca-lp .btn .arrow { transition: transform 0.18s ease; }
.acca-lp .btn:hover .arrow { transform: translateX(3px); }
.acca-lp .btn-sm { padding: 9px 14px; font-size: 13px; min-height: 44px; }
.acca-lp .btn-primary { background: var(--ink); color: var(--paper); }
.acca-lp .btn-primary:hover { background: var(--rust); color: var(--rust-ink); border-color: var(--rust); }
.acca-lp .btn-rust { background: var(--rust); color: var(--rust-ink); }
.acca-lp .btn-rust:hover { background: var(--rust-2); }
.acca-lp .btn-ghost { background: transparent; color: var(--ink); border-color: var(--rule-strong); }
.acca-lp .btn-ghost:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.acca-lp .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

/* ── Nav ── */
.acca-lp .nav {
  position: sticky; top: 0; z-index: 100;
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  background: var(--paper);
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}
.acca-lp .nav--scrolled { border-bottom-color: color-mix(in oklab, var(--rule) 60%, transparent); }
.acca-lp .nav-inner {
  display: flex; align-items: center; justify-content: space-between; height: 68px;
}
.acca-lp .nav-links { display: flex; align-items: center; gap: 28px; }
.acca-lp .nav-link-btn {
  font-size: 14px; color: var(--ink-2); background: none; border: none;
  cursor: pointer; font-family: var(--sans); padding: 0;
  transition: color 0.15s;
}
.acca-lp .nav-link-btn:hover { color: var(--ink); }
.acca-lp .nav-cta { display: flex; align-items: center; gap: 14px; }
.acca-lp .nav-signin {
  font-size: 14px; color: var(--ink-2); text-decoration: none;
  white-space: nowrap; transition: color 0.15s;
}
.acca-lp .nav-signin:hover { color: var(--ink); }
@media (max-width: 480px) { .acca-lp .nav-signin { font-size: 13px; } }
@media (max-width: 860px) { .acca-lp .nav-links { display: none; } }
@media (max-width: 480px) {
  .acca-lp .nav-inner { height: 56px; }
  .acca-lp .nav-cta { gap: 10px; }
}

/* ── Hero ── */
.acca-lp .hero {
  position: relative; z-index: 1;
  padding: clamp(64px, 9vw, 112px) 0 clamp(48px, 7vw, 88px);
}
.acca-lp .hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(0, 1fr);
  gap: clamp(40px, 5vw, 80px); align-items: center;
}
@media (max-width: 940px) { .acca-lp .hero-grid { grid-template-columns: 1fr; } }
.acca-lp .hero-eyebrow { margin-bottom: 24px; }
.acca-lp .hero-h1 .em { font-style: italic; color: var(--forest); }
.acca-lp .hero-h1 .underline {
  position: relative; display: inline-block; font-style: italic; margin-right: 0.08em;
}
.acca-lp .hero-h1 .underline::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: 0.06em;
  height: 0.22em; background: var(--rust); opacity: 0.85; z-index: -1; border-radius: 2px;
}
.acca-lp .hero-sub {
  margin-top: 28px; font-size: clamp(17px, 1.4vw, 19px);
  line-height: 1.55; color: var(--ink-2); max-width: 52ch;
}
/* A SECOND hero paragraph is a paragraph, not a second block: 28px is the gap between the
   h1 and the copy, and repeating it between two sentences of one argument breaks them apart.
   Only ever matches when a config supplies an array. */
.acca-lp .hero-sub + .hero-sub { margin-top: 14px; }
.acca-lp .hero-thesis {
  font-family: var(--serif);
  font-style: italic;
  font-size: clamp(18px, 1.6vw, 22px);
  color: var(--forest);
  letter-spacing: -0.01em;
  line-height: 1.4;
  margin-top: 24px;
  max-width: 42ch;
}
.acca-lp .hero-cta { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 36px; }
.acca-lp .hero-meta {
  display: flex; gap: 22px; align-items: center; flex-wrap: wrap;
  margin-top: 22px; font-size: 13px; color: var(--ink-3);
}
.acca-lp .hero-meta .dot {
  width: 4px; height: 4px; background: var(--ink-3);
  border-radius: 50%; display: inline-block; vertical-align: middle;
}
@media (max-width: 480px) {
  .acca-lp .hero-cta { flex-direction: column; align-items: stretch; gap: 10px; }
  .acca-lp .hero-cta .btn { width: 100%; justify-content: center; }
  .acca-lp .hero-meta { gap: 12px; font-size: 12px; }
}

/* ── Chat preview ── */
.acca-lp .chat {
  background: var(--paper); border: 1px solid var(--rule-strong);
  border-radius: 22px; padding: 22px 24px;
  box-shadow: 0 30px 60px -30px rgba(20,24,22,0.2), 0 2px 6px rgba(20,24,22,0.08);
  display: flex; flex-direction: column; gap: 16px; min-height: 480px; overflow: hidden;
  position: relative;
}
.acca-lp .chat::before {
  content: ""; position: absolute; inset: -16px;
  border: 1px dashed var(--rule); border-radius: 30px; z-index: -1; opacity: 0.5;
}
.acca-lp .chat-hd {
  display: flex; align-items: center; gap: 10px;
  padding-bottom: 14px; border-bottom: 1px solid var(--rule);
}
.acca-lp .chat-logo {
  font-family: var(--serif); font-size: 17px; letter-spacing: -0.02em; color: var(--ink);
  display: flex; align-items: baseline;
}
.acca-lp .chat-name-pill {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 5px 12px; border: 1px solid var(--rule-strong); border-radius: 999px;
  font-size: 12px; color: var(--ink);
}
.acca-lp .chat-name-pill .live {
  width: 6px; height: 6px; border-radius: 50%; background: var(--rust);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--rust) 25%, transparent);
}
.acca-lp .chat-course {
  margin-left: auto; font-family: var(--mono); font-size: 10.5px;
  letter-spacing: 0.04em; color: var(--ink-3); text-align: right;
}
.acca-lp .chat-course .em { color: var(--ink); }
.acca-lp .chat-body {
  display: flex; flex-direction: column; gap: 14px;
  font-family: var(--sans); font-size: 13.5px; line-height: 1.65; color: var(--ink);
}
.acca-lp .chat-row { display: flex; align-items: flex-start; gap: 12px; }
.acca-lp .chat-row.from-user { justify-content: flex-end; }
.acca-lp .ezra-av {
  width: 26px; height: 26px; flex: 0 0 26px; border-radius: 50%;
  background: var(--forest); color: var(--gold);
  display: grid; place-items: center; font-family: var(--mono);
  font-size: 11px; font-weight: 500;
}
.acca-lp .ezra-msg { display: flex; flex-direction: column; gap: 10px; max-width: 90%; }
.acca-lp .ezra-msg p { margin: 0; }
.acca-lp .ezra-msg strong { color: var(--forest); font-weight: 600; }
.acca-lp .ezra-msg em { font-style: italic; font-family: var(--serif); font-size: 1.12em; color: var(--rust); }
.acca-lp .ezra-msg .key { color: var(--forest); font-style: italic; font-family: var(--serif); font-size: 1.12em; }
.acca-lp .ezra-msg h4 {
  font-family: var(--serif); font-style: italic; font-size: 19px;
  font-weight: 400; color: var(--forest); letter-spacing: -0.012em; line-height: 1.2;
}
.acca-lp .user-bubble {
  background: var(--forest); color: var(--forest-ink); padding: 10px 16px;
  border-radius: 18px; font-size: 13.5px; line-height: 1.45; max-width: 80%;
}
.acca-lp .user-av {
  width: 26px; height: 26px; flex: 0 0 26px; border-radius: 50%;
  background: var(--rust); color: var(--rust-ink);
  display: grid; place-items: center; font-family: var(--mono); font-size: 11px;
}
.acca-lp .chat-input {
  margin-top: auto; display: flex; align-items: center; gap: 8px;
  padding: 8px 8px 8px 10px; border: 1px solid var(--rule-strong);
  border-radius: 14px; background: var(--paper-2);
}
.acca-lp .chat-input .ph { flex: 1; min-width: 0; font-size: 13px; color: var(--ink-3); }
.acca-lp .chat-input .send {
  width: 30px; height: 30px; border-radius: 8px; background: var(--rust);
  color: var(--rust-ink); display: grid; place-items: center; font-size: 13px;
}
.acca-lp .chat-foot {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.04em;
  color: var(--ink-3); text-align: center;
}

/* ── Trust bar ── */
.acca-lp .trust {
  border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
  padding: 22px 0; background: color-mix(in oklab, var(--paper) 90%, var(--paper-2));
  position: relative; z-index: 1;
}
.acca-lp .trust-inner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 32px; flex-wrap: wrap;
}
.acca-lp .trust-label {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--ink-3);
}
/* GRID, NOT flex-wrap. Four stats of unequal width in a wrapping flex row wrap by whatever
   happens to fit, which produced a staggered 1 / 2 / 1 at mid widths — the figures landing at
   three different vertical positions, reading as a layout error rather than a strip. An
   explicit column count can only ever produce a FULL row or the stack: 4-up, then an even
   2×2, then one per line. Never 3, never an orphan.
   auto-fit / auto-fill is the wrong tool here for the same reason flex-wrap was — both pick
   the count from available width, and both can land on 3. The count is a design decision, so
   it is stated. (No backticks in this block: it is a JS template literal, and one terminates
   the CSS mid-rule.)
   align-items:baseline aligns the first baseline of each cell, so within any row the italic
   serif figures sit on one line however many lines a label wraps to. */
.acca-lp .trust-stats {
  display: grid; grid-template-columns: repeat(4, auto);
  align-items: baseline; justify-content: center;
  gap: 16px clamp(20px,4vw,56px);
}
@media (max-width: 900px) {
  /* THE LABEL GOES ABOVE, not beside. .trust-inner is a space-between flex row, and once the
     stats narrow to one or two columns the row still fits both children — so "LIVE TODAY"
     ended up vertically centred against a four-row stack, reading as a stray word rather than
     the strip's label. Stacking the row is what makes the 2×2 sit square under it. */
  .acca-lp .trust-inner { flex-direction: column; align-items: flex-start; gap: 18px; }
  /* 1fr, not auto: an even 2×2 is the requirement, and auto columns size to their own content,
     so the long first label made column 1 twice column 2. */
  .acca-lp .trust-stats { grid-template-columns: repeat(2, 1fr); width: 100%; }
}
@media (max-width: 400px) { .acca-lp .trust-stats { grid-template-columns: 1fr; } }
.acca-lp .trust-stat { display: flex; align-items: baseline; gap: 8px; }
/* white-space:nowrap because the FIGURE IS AN ATOM. "~1 min" is the one stat whose value
   contains a space, and in a narrow column it broke after "~1", dropping "min" onto its own
   line underneath — so the unit read as belonging to the label rather than the number. */
.acca-lp .trust-stat .num {
  font-family: var(--serif); font-size: 28px; letter-spacing: -0.02em;
  font-style: italic; color: var(--ink); white-space: nowrap;
}
.acca-lp .trust-stat .lbl { font-size: 12px; color: var(--ink-3); }
.acca-lp .trust-footnote {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.05em;
  color: var(--ink-3); margin-top: 8px; text-align: center;
}

/* ── Pain section ── */
.acca-lp .pain { background: var(--paper); }
.acca-lp .pain-grid {
  display: grid; grid-template-columns: minmax(0,1.05fr) minmax(0,1fr);
  gap: clamp(40px,6vw,80px); align-items: start;
}
@media (max-width: 940px) { .acca-lp .pain-grid { grid-template-columns: 1fr; } }
.acca-lp .pain-cards { display: grid; grid-template-columns: 1fr; gap: 14px; }
.acca-lp .pain-card {
  border: 1px solid var(--rule); border-radius: var(--radius); padding: 22px 24px;
  background: var(--paper); display: grid; grid-template-columns: auto 1fr;
  gap: 18px; align-items: start;
}
.acca-lp .pain-card .stat {
  font-family: var(--serif); font-size: clamp(22px, 3.5vw, 30px); line-height: 1.1;
  color: var(--rust); letter-spacing: -0.02em;
  overflow-wrap: break-word; word-break: break-word;
}
.acca-lp .pain-card .stat .unit {
  font-size: 11px; font-family: var(--mono); color: var(--ink-3);
  display: block; margin-top: 4px; letter-spacing: 0.04em;
}
.acca-lp .pain-card .label { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
.acca-lp .pain-card .desc { font-size: 14px; color: var(--ink-2); line-height: 1.5; }

/* ── One subscription / Features ── */
.acca-lp .one-sub {
  background: var(--sage); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
}
.acca-lp .one-sub .h-section em { font-style: italic; color: var(--rust); }
.acca-lp .one-sub-grid {
  display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-top: 40px;
}
@media (max-width: 860px) { .acca-lp .one-sub-grid { grid-template-columns: 1fr; } }
.acca-lp .os-card {
  background: var(--paper); border: 1px solid var(--rule);
  border-radius: var(--radius); padding: 26px;
}
.acca-lp .os-card .num {
  font-family: var(--mono); font-size: 11px; color: var(--ink-3);
  letter-spacing: 0.1em; margin-bottom: 14px;
}
.acca-lp .os-card h3 {
  font-family: var(--serif); font-size: 24px; line-height: 1.15;
  letter-spacing: -0.015em; margin-bottom: 10px;
}
.acca-lp .os-card p { font-size: 14px; color: var(--ink-2); line-height: 1.55; }

/* ── Paper cards — the pillar's routing pair, on the same sage band and in the same .os-card
   shell as the numbered cards above. Only the contents differ: a card on this band should
   not look like a new species because it happens to carry a link. ── */
.acca-lp .paper-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 40px; }
@media (max-width: 760px) { .acca-lp .paper-grid { grid-template-columns: 1fr; } }
.acca-lp .paper-card { display: flex; flex-direction: column; gap: 10px; }
.acca-lp .paper-hd { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
/* margin-bottom is zeroed because .os-card h3 carries 10px for a non-flex card, and here it
   would compound with the column gap into an uneven 20px under the code alone. */
.acca-lp .paper-card h3 { font-size: 30px; margin-bottom: 0; }
.acca-lp .paper-chip {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--rust); border: 1px solid color-mix(in oklab, var(--rust) 35%, transparent);
  border-radius: 999px; padding: 3px 10px; white-space: nowrap;
}
.acca-lp .paper-card .paper-name { font-size: 13px; font-weight: 500; color: var(--ink-3); }
.acca-lp .paper-card .paper-blurb { font-size: 14px; line-height: 1.55; }
.acca-lp .paper-card .paper-live { font-size: 13px; line-height: 1.5; margin-bottom: 6px; }
.acca-lp .paper-card .paper-live strong { color: var(--rust); font-weight: 600; }
/* margin-top:auto so both buttons sit on one line however unevenly the blurbs wrap. */
.acca-lp .paper-card .btn { align-self: flex-start; margin-top: auto; }

/* ── Feature bullets — the copy half of FEATURE_PANEL.
   PADDING-LEFT + ::before, NOT a two-column grid on the <li>. A grid makes every ELEMENT
   child of the bullet a grid ITEM of its own, so an <em> inside a sentence is torn out onto
   its own line — caught on the "reported as <em>not reached</em>" bullet, which is exactly
   the bullet that needs the emphasis. This keeps the <li> in normal inline flow. ── */
.acca-lp .feat-bullets { list-style: none; display: flex; flex-direction: column; gap: 14px; }
.acca-lp .feat-bullets li {
  position: relative; padding-left: 26px;
  font-size: 14.5px; line-height: 1.5; color: var(--ink-2);
}
/* RUST, not --forest. The marker was already a drawn ::before rather than a browser default,
   but --forest is oklch(22% 0.035 168) — 22% lightness at 0.035 chroma reads as black at this
   size, so the one piece of decoration on this band looked like the one piece nobody had
   designed. Rust is the page's marker colour everywhere else it appears: .price-features
   ::before, .paper-chip, .paper-live strong.
   Geometry and colour only — still padding-left + absolute ::before, still NOT a grid on the
   <li>, for the reason stated above. */
.acca-lp .feat-bullets li::before {
  content: ""; position: absolute; left: 4px; top: 7px;
  width: 8px; height: 8px; border-radius: 50%; background: var(--rust);
}
.acca-lp .feat-bullets li em { font-style: italic; color: var(--forest); font-weight: 500; }

/* ── Exam-ready / How it marks band ── */
.acca-lp .band-dark { background: var(--forest); color: var(--forest-ink); }
.acca-lp .band-dark .h-section { color: var(--forest-ink); }
.acca-lp .band-dark .lead { color: color-mix(in oklab,var(--forest-ink) 78%,transparent); }
.acca-lp .band-dark .h-section em { font-style: italic; color: var(--rust); }
.acca-lp .pillars {
  display: grid; grid-template-columns: repeat(3,1fr);
  gap: 1px; background: color-mix(in oklab,var(--forest-ink) 18%,transparent);
  border: 1px solid color-mix(in oklab,var(--forest-ink) 18%,transparent);
  border-radius: var(--radius); overflow: hidden; margin-top: 48px;
}
@media (max-width: 860px) { .acca-lp .pillars { grid-template-columns: 1fr; } }
.acca-lp .pillar { background: var(--forest); padding: 32px 28px; }
.acca-lp .pillar .num {
  font-family: var(--serif); font-size: 48px; font-style: italic;
  letter-spacing: -0.02em; line-height: 1; color: var(--rust); margin-bottom: 16px;
}
.acca-lp .pillar h3 { font-family: var(--serif); font-size: 24px; letter-spacing: -0.015em; margin-bottom: 8px; color: var(--forest-ink); }
.acca-lp .pillar p { font-size: 14px; line-height: 1.55; color: color-mix(in oklab,var(--forest-ink) 72%,transparent); }

/* ── Who it's for ── */
.acca-lp .who-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 14px; }
@media (max-width: 760px) { .acca-lp .who-grid { grid-template-columns: 1fr; } }
.acca-lp .who-card {
  background: var(--paper); border: 1px solid var(--rule);
  border-radius: var(--radius); padding: 26px 28px;
  display: flex; flex-direction: column; gap: 10px;
}
.acca-lp .who-card .who-tag {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--rust);
}
.acca-lp .who-card h3 { font-family: var(--serif); font-size: 24px; letter-spacing: -0.015em; line-height: 1.15; }
.acca-lp .who-card p { font-size: 14px; color: var(--ink-2); line-height: 1.5; }

/* ── The timed mock ──
   No new card shell: the section reuses .who-grid / .who-card exactly. These two rules are
   the whole addition.

   .mock-quote is a VERBATIM line of the product's own output, so it is set apart from the
   prose around it rather than blended into it — the rust rule is the same featured accent
   the Gradd column and .price-card.featured use, and the italic matches .mark-evidence,
   which is the page's existing treatment for a quoted line the product produced.
   text-wrap: pretty matters here specifically: both quotes are dense with figures, and at
   390px a greedy break leaves "4.80%." alone on the last line.

   .mock-limit is the honest boundary on the pacing claim and it is deliberately NOT hidden
   in small print — 12px, but full --ink-2 contrast, sitting directly under the claim it
   qualifies rather than at the foot of the section where it would read as a disclaimer. */
.acca-lp .mock-quote {
  font-size: 13px; font-style: italic; line-height: 1.55;
  color: var(--ink-2); text-wrap: pretty;
  border-left: 2px solid var(--rust); padding-left: 14px;
  margin-top: 2px;
}
.acca-lp .mock-limit { font-size: 12px; color: var(--ink-2); line-height: 1.45; }

/* ── Pricing band (reused for waitlist) ── */
.acca-lp .pricing-band {
  background: var(--paper-2); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
}

/* ── Waitlist block ── */
.acca-lp .waitlist-block {
  display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr);
  gap: clamp(40px,6vw,80px); align-items: center;
}
@media (max-width: 860px) { .acca-lp .waitlist-block { grid-template-columns: 1fr; } }

.acca-lp .waitlist-form-wrap {
  background: var(--paper); border: 1px solid var(--rule-strong);
  border-radius: var(--radius); padding: 36px;
  box-shadow: 0 20px 40px -25px rgba(20,24,22,0.12);
}

.acca-lp .waitlist-form { display: flex; flex-direction: column; gap: 14px; }

.acca-lp .waitlist-input-row {
  display: flex; gap: 10px; align-items: stretch; flex-wrap: wrap;
}

.acca-lp .waitlist-input {
  flex: 1; min-width: 0; padding: 14px 18px;
  border: 1px solid var(--rule-strong); border-radius: 999px;
  font-family: var(--sans); font-size: 15px; color: var(--ink);
  background: var(--paper); outline: none;
  transition: border-color 0.18s;
}
.acca-lp .waitlist-input:focus { border-color: var(--forest); }
.acca-lp .waitlist-input::placeholder { color: var(--ink-3); }
.acca-lp .waitlist-input:disabled { opacity: 0.6; }

.acca-lp .waitlist-btn { flex-shrink: 0; white-space: nowrap; }

.acca-lp .waitlist-error {
  font-size: 13px; color: var(--rust); font-family: var(--mono); letter-spacing: 0.02em;
}

.acca-lp .waitlist-small {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--ink-3); line-height: 1.5;
}

.acca-lp .waitlist-success {
  display: flex; flex-direction: column; align-items: center;
  gap: 16px; text-align: center; padding: 8px 0;
}
.acca-lp .success-icon {
  width: 52px; height: 52px; border-radius: 50%;
  background: oklch(58% 0.15 145); color: white;
  display: grid; place-items: center; font-size: 22px;
}
.acca-lp .waitlist-success h3 {
  font-family: var(--serif); font-size: 28px; letter-spacing: -0.015em; color: var(--forest);
}
.acca-lp .waitlist-success p { font-size: 15px; color: var(--ink-2); max-width: 34ch; }

@media (max-width: 480px) {
  .acca-lp .waitlist-input-row { flex-direction: column; }
  .acca-lp .waitlist-input { border-radius: var(--radius); }
  .acca-lp .waitlist-btn { width: 100%; justify-content: center; border-radius: var(--radius); }
  .acca-lp .waitlist-form-wrap { padding: 24px 20px; }
}

/* ── Final CTA ── */
.acca-lp .final-cta { background: var(--forest); color: var(--forest-ink); position: relative; overflow: hidden; }
.acca-lp .final-cta::before {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(circle at 80% 20%,color-mix(in oklab,var(--rust) 30%,transparent),transparent 50%),
              radial-gradient(circle at 10% 90%,color-mix(in oklab,var(--forest-2) 80%,transparent),transparent 60%);
  pointer-events: none;
}
/* THE HORIZONTAL VALUE IS var(--gut), NOT 0 (fixed 2026-08-06).
   This element is class="wrap final-cta-inner", and .wrap's whole job is padding: 0 var(--gut).
   A padding SHORTHAND here overrides both axes, so the 0 silently cancelled the page gutter for
   the entire closing band — measured pre-fix at 390px and 412px, the heading, the lead AND the
   small print all sat at exactly L0 R0, flush to the viewport on both sides. The full-bleed CTA
   pill was the visible symptom because it is the only one of them with a background; the centred
   text was touching the edges just as hard and simply looked less obviously wrong.
   Restating the gutter is the fix. Anything that sets padding here must set BOTH axes. */
.acca-lp .final-cta-inner {
  position: relative; text-align: center;
  padding: clamp(80px,11vw,140px) var(--gut);
}
/* LINE-HEIGHT IS OVERRIDDEN HERE, AND ONLY HERE. The shared .h-display sets 0.96 — a line
   box SMALLER than the font size, which is right for the hero, where the display type is the
   first thing on a light page and the tightness reads as deliberate. It is wrong for this
   heading, which is the one place a cream line sits directly above a RUST ITALIC line: the
   descenders of line 1 (the "g" of "Preparing") land in the cap-height of line 2 ("APM"),
   and the italic "?" rises into the line above. 1.06 is the smallest ratio that clears both
   collisions while keeping the two lines reading as ONE phrase — 1.12 was measured too and
   opens a gap that breaks the phrase in half. Unitless, so it holds at every width: the
   mobile block below changes font-size only, and the crowding is worst there because the
   heading wraps. The hero's 0.96 is untouched, and is approved as it stands. */
.acca-lp .final-cta .h-display { color: var(--forest-ink); max-width: 18ch; margin: 0 auto; line-height: 1.06; }
.acca-lp .final-cta .h-display em { color: var(--rust); }
.acca-lp .final-cta .lead { color: color-mix(in oklab,var(--forest-ink) 80%,transparent); margin: 24px auto 0; }
.acca-lp .final-cta .btn-ghost {
  border-color: color-mix(in oklab,var(--forest-ink) 40%,transparent); color: var(--forest-ink);
}
.acca-lp .final-cta .btn-ghost:hover { background: var(--forest-ink); color: var(--forest); border-color: var(--forest-ink); }
.acca-lp .small {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em;
  text-transform: uppercase; color: color-mix(in oklab,var(--forest-ink) 55%,transparent); margin-top: 28px;
}
@media (max-width: 480px) {
  /* BOTH AXES — see the base rule above for why a bare 0 here is a bug, not a shorthand. */
  .acca-lp .final-cta-inner { padding: clamp(56px,12vw,96px) var(--gut); }
  .acca-lp .final-cta .h-display { padding: 0 4px; font-size: clamp(40px,11vw,56px); }
  /* THE CLOSING BUTTON IS NO LONGER FULL-BLEED (same S23 report).
     Restoring the gutter above already pulls it off the edges; this is the second half of the
     ask — "a little narrower, not full-bleed". This block reuses .hero-cta, and the hero's own
     mobile rule stretches every .btn inside it to width:100%. In the HERO that is right: two
     stacked buttons that must read as one block of equal weight. Here there is ONE button, and
     a lone pill the full width of the band reads as a bar rather than a call to action.
     An inset, NOT width:auto: shrunk to its own text ("Start free →") the pill is ~140px and
     looks incidental against a display-scale heading. This adds to --gut rather than replacing
     it, so the button sits inset FURTHER than the text it closes (measured L36 at 390px,
     L37 at 412px, against L20 for the lead). */
  .acca-lp .final-cta .hero-cta { padding: 0 clamp(8px,4vw,28px); }
}

/* ── Footer ── */
.acca-lp .footer { padding: 56px 0 40px; border-top: 1px solid var(--rule); font-size: 13px; color: var(--ink-3); }
.acca-lp .footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
/* FLEX-ROW EXACT-FIT DEFECT (fixed 2026-08-06, reported on a Samsung S23 at ~412px).
   This row was display:flex with a 24px gap and NO flex-wrap. Six links plus five 24px gaps
   do not fit a 412px viewport's 372px content box, and because a flex item may shrink below
   its content width, the row did not overflow — the ITEMS shrank and every label broke
   mid-word instead. Measured pre-fix at both 390px and 412px: all six anchors 40px tall,
   i.e. two lines each. The parent .footer-inner already wraps, which is why the links land on
   their own line; the links row itself never did.

   THE FIX IS TWO RULES, AND BOTH ARE LOAD-BEARING. flex-wrap alone would still let a single
   label break mid-word, so white-space:nowrap on the anchors is what makes a link the atomic
   unit — the row can then only fail by getting TALLER, never by breaking text. The row gap
   exists because wrapping without one puts two lines of links flush against each other. */
.acca-lp .footer-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px 24px; }
.acca-lp .footer-links a { white-space: nowrap; }
.acca-lp .footer-links a:hover { color: var(--ink); }
/* Once the row has wrapped it is the full width of the footer, so the logo line above it is
   centred too — a left-aligned line over a centred one reads as a mistake, not a layout. */
@media (max-width: 640px) {
  .acca-lp .footer-inner { justify-content: center; text-align: center; }
}

/* ── Tag pill ── */
.acca-lp .tag-pill {
  display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px;
  border: 1px solid var(--rule-strong); border-radius: 999px; font-size: 12px;
  font-family: var(--mono); letter-spacing: 0.04em; color: var(--ink-2);
}
.acca-lp .tag-pill .dot { width: 5px; height: 5px; border-radius: 50%; background: var(--rust); }

/* ── Hero note + trust strip + visual caption + hint badge ── */
.acca-lp .hero-note { margin-top: 16px; font-size: 13.5px; color: var(--ink-2); line-height: 1.5; font-weight: 500; }
.acca-lp .hero-microcopy { margin-top: 12px; font-size: 13px; color: var(--ink-3); font-family: var(--sans); letter-spacing: -0.005em; }
.acca-lp .visual-caption {
  margin-top: 16px; text-align: center; font-family: var(--serif); font-style: italic;
  font-size: 15px; color: var(--forest); line-height: 1.4;
}
.acca-lp .hint-badge {
  display: inline-block; align-self: flex-start; font-family: var(--mono);
  font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--rust);
  background: color-mix(in oklab, var(--rust) 14%, transparent);
  border: 1px solid color-mix(in oklab, var(--rust) 30%, transparent);
  padding: 2px 8px; border-radius: 999px; margin-bottom: 4px;
}

/* ── Free resit diagnostic band (after hero) ── */
.acca-lp .resit-band {
  background: var(--sage);
  border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
  padding: clamp(48px, 6vw, 80px) 0;
}
.acca-lp .resit-band-inner { max-width: 760px; }
.acca-lp .resit-band-inner .eyebrow { display: block; margin-bottom: 16px; }
.acca-lp .resit-band .h-section em { font-style: italic; color: var(--rust); }
.acca-lp .resit-band-inner .lead { margin-top: 20px; }
.acca-lp .resit-band-cta { margin-top: 30px; }
@media (max-width: 480px) {
  .acca-lp .resit-band-cta .btn { width: 100%; justify-content: center; }
}

/* ── A. Judgement (before / diagnosis / after) ── */
.acca-lp .ja-card {
  display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; align-items: stretch; gap: 14px; margin-top: 8px;
}
@media (max-width: 860px) { .acca-lp .ja-card { grid-template-columns: 1fr; } }
.acca-lp .ja-col, .acca-lp .ja-diag {
  background: var(--paper); border: 1px solid var(--rule); border-radius: var(--radius);
  padding: 22px; display: flex; flex-direction: column; gap: 10px;
}
.acca-lp .ja-diag { background: color-mix(in oklab, var(--paper) 84%, var(--sage)); }
.acca-lp .ja-coached { border-color: var(--rust); }
.acca-lp .ja-tag { font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); }
.acca-lp .ja-tag-diag { color: var(--forest); }
.acca-lp .ja-tag-coached { color: var(--rust); }
.acca-lp .ja-col p, .acca-lp .ja-diag p { font-size: 14px; line-height: 1.55; color: var(--ink); }
.acca-lp .ja-weak p { color: var(--ink-2); }
.acca-lp .ja-chip { align-self: center; justify-self: center; color: var(--rust); font-size: 18px; }
.acca-lp .ja-caption {
  margin-top: 22px; text-align: center; font-family: var(--serif); font-style: italic; font-size: 16px; color: var(--forest);
}

/* ── A2. The proof's optional big figures ──
   The page's ONE weight-variety device, and it is deliberately borderless-on-cream rather
   than a fourth kind of card: three cards above three cards would read as six of a thing.
   Rust italic serif is the same numeral treatment .tt-n and .pillar .num already use.

   ⚠️ "flex: 0 0 auto" in the stacked block is LOAD-BEARING, not tidying — this is the exact
   defect measured on the page this replaced, at 390px. The row rule is "flex: 1 1 200px",
   and flex-BASIS resolves against the MAIN axis, which becomes the block axis the moment the
   container turns column. Each figure then claims a 200px minimum HEIGHT and the section
   renders with ~100px of dead space under every body paragraph.
   (NB: no backticks anywhere in this string — it is a template literal, and one here ends it
   early. This exact comment cost a build once; the double quotes above are why.) */
.acca-lp .ja-nums { display: flex; flex-wrap: wrap; margin: 0 0 34px; }
.acca-lp .ja-num {
  flex: 1 1 200px; padding: 0 clamp(14px, 2.6vw, 30px);
  border-left: 1px solid var(--rule); text-align: center;
}
.acca-lp .ja-num:first-child { border-left: 0; }
.acca-lp .ja-num-value {
  display: block; font-family: var(--serif); font-style: italic;
  font-size: clamp(44px, 6vw, 76px); line-height: 1; letter-spacing: -0.02em; color: var(--rust);
}
.acca-lp .ja-num-body { margin-top: 12px; font-size: 14px; line-height: 1.5; color: var(--ink-2); }
@media (max-width: 760px) {
  .acca-lp .ja-nums { flex-direction: column; gap: 22px; }
  .acca-lp .ja-num { flex: 0 0 auto; border-left: 0; border-top: 1px solid var(--rule); padding: 20px 0 0; }
  .acca-lp .ja-num:first-child { border-top: 0; padding-top: 0; }
}

/* ── C. Teach-through steps ── */
.acca-lp .tt-steps { list-style: none; display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-top: 8px; }
@media (max-width: 860px) { .acca-lp .tt-steps { grid-template-columns: 1fr; } }
.acca-lp .tt-step {
  background: var(--paper); border: 1px solid var(--rule); border-radius: var(--radius);
  padding: 22px 18px; display: flex; flex-direction: column; gap: 12px; align-items: flex-start;
}
.acca-lp .tt-n { font-family: var(--serif); font-style: italic; font-size: 30px; line-height: 1; color: var(--rust); }
.acca-lp .tt-t { font-size: 14px; line-height: 1.45; color: var(--ink); }

/* ── D. Skills grid + marking panel ── */
.acca-lp .d-grid {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(24px, 4vw, 48px); align-items: start; margin-top: 8px;
}
@media (max-width: 940px) { .acca-lp .d-grid { grid-template-columns: 1fr; } }
.acca-lp .skills-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 480px) { .acca-lp .skills-grid { grid-template-columns: 1fr; } }
.acca-lp .skill-tile { background: var(--paper); border: 1px solid var(--rule); border-radius: var(--radius); padding: 20px; }
.acca-lp .skill-tile h3 { font-family: var(--serif); font-size: 19px; letter-spacing: -0.01em; margin-bottom: 6px; }
.acca-lp .skill-tile p { font-size: 13px; color: var(--ink-2); line-height: 1.45; }
.acca-lp .mark-panel {
  background: var(--paper); border: 1px solid var(--rule-strong); border-radius: var(--radius);
  padding: 22px 24px; box-shadow: 0 20px 40px -28px rgba(20,24,22,0.18);
  display: flex; flex-direction: column; gap: 14px;
}
/* GAP + WRAP ARE NOT TIDYING. This row is space-between with two children, and the pillar's
   panels put a long subtitle ("ACCA AFM · Mock Paper 1 · Q3 (i)") in the right-hand slot
   rather than the spokes' two-character score. Without a gap the two run together at the
   collapse point; without wrap the subtitle breaks mid-word instead of taking its own line. */
.acca-lp .mark-panel-hd { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding-bottom: 12px; border-bottom: 1px solid var(--rule); }
.acca-lp .mark-panel-title { font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); }
.acca-lp .mark-panel-score { font-family: var(--serif); font-size: 30px; color: var(--forest); line-height: 1; }
.acca-lp .mark-panel-of { font-size: 16px; color: var(--ink-3); }
/* The pillar's panels caption their head rather than scoring it — an illustration of marking
   should not put an invented number on itself. Same slot, same baseline, quieter voice. */
.acca-lp .mark-panel-sub { font-size: 12px; color: var(--ink-3); text-align: right; }
.acca-lp .mark-panel-foot {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.04em; color: var(--ink-3);
  padding-top: 12px; border-top: 1px solid var(--rule);
}
.acca-lp .mark-row { display: flex; flex-direction: column; gap: 6px; }
.acca-lp .mark-row-hd { display: flex; align-items: center; gap: 10px; }
.acca-lp .mark-skill { font-size: 13.5px; font-weight: 600; color: var(--ink); }
.acca-lp .mark-band { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; }
.acca-lp .mark-band--strong { color: oklch(45% 0.12 145); background: oklch(90% 0.06 145); }
.acca-lp .mark-band--mid { color: oklch(48% 0.11 75); background: color-mix(in oklab, var(--gold) 20%, transparent); }
/* NOT A BAND. Green says "did well" and gold says "middling"; a row reporting that no budget
   could be computed is neither, and painting it green claimed a result that was never
   measured. This is the page's neutral label treatment, borrowed from .price-name. */
.acca-lp .mark-band--flat { color: var(--ink-3); background: var(--paper-2); border: 1px solid var(--rule); }
/* TWO TREATMENTS, ONE SIZE, AND THE DIFFERENCE IS PROVENANCE. .mark-evidence is a line the
   product WROTE, so it is italic — the page's quotation voice, shared with .ja-caption and
   .visual-caption. .mark-note is a line WE wrote about the product, and setting it in the
   same italic would claim the marker said it. Everything else about them matches, because
   the distinction is authorship and not importance. */
.acca-lp .mark-evidence { font-size: 13px; color: var(--ink-2); line-height: 1.5; font-style: italic; }
.acca-lp .mark-note { font-size: 13px; color: var(--ink-2); line-height: 1.5; }

/* ── E. Comparison table ──
   REPLACES the retired three-card .compare-strip (.compare-col, .compare-col--gradd and
   .compare-name are all deleted with it; nothing else on the page used them).
   The card shell is this page's standard one, unchanged: paper fill, --rule border,
   --radius corners — the same shell as .price-card, .skill-tile, .tt-step. Only the
   INSIDE is a table. The Gradd column is RUST, which is this page's featured accent
   (.price-card.featured, .price-badge, and the old .compare-col--gradd all use it); the
   template's version of this table highlights in forest, and forest on this page is
   reserved for the final CTA.
   NOTE FOR FUTURE EDITS: this whole stylesheet is one JS template literal — no backticks
   and no dollar-brace in here, or the literal ends early and the build fails to parse. */
.acca-lp .cmp-scroll {
  overflow-x: auto; margin-top: 8px;
  background: var(--paper); border: 1px solid var(--rule); border-radius: var(--radius);
}
.acca-lp .cmp-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.acca-lp .cmp-table th, .acca-lp .cmp-table td {
  padding: 16px 20px; text-align: left; vertical-align: top;
  border-bottom: 1px solid var(--rule); white-space: nowrap;
}
.acca-lp .cmp-table tbody tr:last-child th, .acca-lp .cmp-table tbody tr:last-child td { border-bottom: 0; }
/* Column heads carry the NAME, so they keep the serif voice the old .compare-name had —
   one size down, because four of them share a row here rather than three cards. */
.acca-lp .cmp-table thead th {
  font-family: var(--serif); font-size: 17px; letter-spacing: -0.01em; font-weight: 400;
  color: var(--ink); background: var(--paper-2); border-bottom: 1px solid var(--rule-strong);
}
.acca-lp .cmp-table thead th.is-gradd { background: var(--rust); color: var(--rust-ink); }
/* Row labels are LABELS, so they take the page's small-label idiom (mono, uppercase) —
   the same treatment as .price-name and .mark-panel-title. They wrap; the data cells do not. */
.acca-lp .cmp-table tbody th {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--ink-3); font-weight: 500; white-space: normal; min-width: 190px;
}
.acca-lp .cmp-table td { color: var(--ink-2); line-height: 1.45; }
.acca-lp .cmp-table td.is-gradd {
  color: var(--ink); font-weight: 600;
  background: color-mix(in oklab, var(--paper) 88%, var(--rust));
  border-left: 1px solid var(--rust); border-right: 1px solid var(--rust);
}
.acca-lp .cmp-table tbody tr:last-child td.is-gradd { border-bottom: 1px solid var(--rust); }
/* ✓ in rust, matching .price-features li::before — the page already means "included" in rust. */
.acca-lp .cmp-y { color: var(--rust); font-weight: 600; font-size: 16px; }
.acca-lp .cmp-n { color: var(--ink-3); }
/* DRIVEN BY ACTUAL OVERFLOW, NOT BY A BREAKPOINT. ScrollableHint measures scrollWidth vs
   clientWidth and sets data-scrollable on .cmp-scroll; this rule keys off that attribute, so
   the cue appears whenever the table really scrolls and at no other time. A media query here
   would be a guess about the longest string in COMPARE_COLS — and that guess was wrong at
   BOTH ends in production on the template's copy of this table. */
.acca-lp .cmp-hint { display: none; margin: 10px 0 0; font-size: 12px; color: var(--ink-3); text-align: center; }
.acca-lp .cmp-scroll[data-scrollable="true"] + .cmp-hint { display: block; }
@media (max-width: 640px) {
  .acca-lp .cmp-table th, .acca-lp .cmp-table td { padding: 13px 15px; }
  .acca-lp .cmp-table tbody th { min-width: 160px; }
}

/* ── F. FAQ ── */
.acca-lp .faq-list { margin-top: 8px; }
.acca-lp .faq-item { padding: 22px 0; border-top: 1px solid var(--rule); }
.acca-lp .faq-item:last-child { border-bottom: 1px solid var(--rule); }
.acca-lp .faq-q { font-family: var(--serif); font-size: 20px; letter-spacing: -0.01em; color: var(--ink); margin-bottom: 8px; }
.acca-lp .faq-a { font-size: 15px; line-height: 1.6; color: var(--ink-2); margin: 0; }

/* ── Muted price badge (Monthly) ── */
.acca-lp .price-badge--muted { background: var(--paper-2); color: var(--ink-3); border: 1px solid var(--rule-strong); }

/* ── Pricing cards ── */
.acca-lp .price-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 44px; align-items: stretch;
}
@media (max-width: 860px) { .acca-lp .price-grid { grid-template-columns: 1fr; max-width: 460px; margin-left: auto; margin-right: auto; } }
.acca-lp .price-card {
  background: var(--paper); border: 1px solid var(--rule); border-radius: var(--radius);
  padding: 30px 28px; display: flex; flex-direction: column; gap: 14px; position: relative;
}
.acca-lp .price-card.featured {
  border-color: var(--rust); box-shadow: 0 24px 50px -30px rgba(20,24,22,0.28);
}
.acca-lp .price-badge {
  position: absolute; top: -11px; left: 24px; background: var(--rust); color: var(--rust-ink);
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 999px;
}
.acca-lp .price-name {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-3);
}
.acca-lp .price-amount {
  font-family: var(--serif); font-size: 46px; letter-spacing: -0.02em; line-height: 1; color: var(--ink);
}
.acca-lp .price-amount .cur { font-size: 0.5em; vertical-align: super; margin-right: 2px; }
.acca-lp .price-amount .per {
  font-family: var(--sans); font-size: 14px; color: var(--ink-3); margin-left: 8px; letter-spacing: 0;
}
.acca-lp .price-tagline { font-size: 14px; color: var(--ink-2); line-height: 1.5; }
.acca-lp .price-features { list-style: none; display: flex; flex-direction: column; gap: 8px; margin: 4px 0; }
.acca-lp .price-features li {
  font-size: 13.5px; color: var(--ink-2); padding-left: 22px; position: relative; line-height: 1.45;
}
.acca-lp .price-features li::before { content: "✓"; position: absolute; left: 0; color: var(--rust); font-weight: 600; }
.acca-lp .price-card .btn { margin-top: auto; justify-content: center; width: 100%; }
.acca-lp .price-note {
  text-align: center; font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--ink-3); margin-top: 26px;
}

/* ── Back to top ── */
.acca-lp .to-top {
  position: fixed; right: 24px; bottom: 24px; z-index: 90;
  width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--rule-strong);
  background: var(--ink); color: var(--paper); display: grid; place-items: center;
  cursor: pointer; opacity: 0; transform: translateY(8px); pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease, background 0.18s ease;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}
.acca-lp .to-top.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
.acca-lp .to-top:hover { background: var(--rust); border-color: var(--rust); color: var(--rust-ink); }
.acca-lp .to-top svg { width: 16px; height: 16px; }
@media (max-width: 640px) { .acca-lp .to-top { right: 16px; bottom: 16px; } }
@media (max-width: 480px) {
  .acca-lp .hero-meta .dot { display: none; }
  .acca-lp .chat { max-height: 360px; overflow: hidden; position: relative; }
  .acca-lp .chat::after {
    content: ""; position: absolute; bottom: 0; left: 0; right: 0; height: 72px;
    background: linear-gradient(to bottom, transparent, var(--paper));
    border-radius: 0 0 22px 22px; pointer-events: none; z-index: 1;
  }
}
`;

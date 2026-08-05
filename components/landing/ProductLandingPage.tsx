// components/landing/ProductLandingPage.tsx
// THE PARAMETERISED PRODUCT LANDING — a paper is a config file, not a page.
//
// ── SERVER COMPONENT, AND THAT IS LOAD-BEARING ──────────────────────────────
// Everything here is server-rendered: the copy, the FAQ list, and critically the FAQPage
// JSON-LD. The only client code is `ProductLandingChrome` (scroll shadow + back-to-top) and
// `AttributionCapture`, both furniture that touches no config content.
//
// The alternative — porting ACCALandingPage's page-wide `'use client'` — would have put the
// structured data behind hydration. That schema is worth a rich result, so the chrome is
// the island and the page is not. See ProductLandingChrome for the full reasoning.
//
// ── EVERY OPTIONAL SECTION IS DECIDED BY product-landing-sections.ts ────────
// This component never asks `c.faqs && c.faqs.length` inline. It asks `hasSection(c, ...)`,
// which the fixtures ask too — so "an omitted section renders nothing" is asserted against
// the same predicate the page uses, not a second copy of the condition.
//
// AFM RENDERS BYTE-IDENTICALLY after this change: it sets none of the optional fields, so
// every new branch is false, and the one CSS rule that changed (the points grid) computes
// to the same three columns it always did.
import Link from 'next/link';
import AttributionCapture from '@/components/AttributionCapture';
import ProductLandingChrome from './ProductLandingChrome';
import ScrollableHint from './ScrollableHint';
import type { ProductLandingConfig, LandingMockup, LandingBand } from './product-landing-config';
import {
  hasSection, pricingModel, buildFaqJsonLd, POINTS_GRID_TEMPLATE, DEFAULT_FOOTER_LINKS,
} from './product-landing-sections';

/** The class modifier for a full-width coloured band. `band` is undefined on every section
 *  shape unless a config sets one, so this returns '' (no class change) for every existing
 *  page — see `LandingBand`. */
function bandClass(band: LandingBand | undefined): string {
  if (band === 'dark') return ' plp-band-dark';
  if (band === 'sage') return ' plp-band-sage';
  return '';
}

/** One rendered mock-up (chat transcript or marking panel). Shared by `mockups[]`,
 *  `heroArtefact` and `featureArtefacts[]` so the chat/panel renderer has exactly one
 *  implementation regardless of which section is carrying the mock-up. */
function renderMockup(m: LandingMockup, key: string | number) {
  return (
    <figure key={key} className="plp-mockup" role="img" aria-label={m.ariaLabel}>
      {(m.title || m.subtitle) && (
        <div className="plp-mockup-head">
          {m.title && <span className="plp-mockup-title">{m.title}</span>}
          {m.subtitle && <span className="plp-mockup-sub">{m.subtitle}</span>}
        </div>
      )}
      {m.kind === 'chat' && (m.turns ?? []).map((t, ti) => (
        <div key={ti} className={`plp-turn plp-turn--${t.role}`}>
          {t.badge && <span className="plp-turn-badge">{t.badge}</span>}
          {t.lines.map((line, li) => <p key={li}>{line}</p>)}
        </div>
      ))}
      {m.kind === 'panel' && (m.rows ?? []).map((r, ri) => (
        <div key={ri} className="plp-panel-row">
          <div className="plp-panel-rowhead">
            <span className="plp-panel-label">{r.label}</span>
            {r.verdict && <span className="plp-panel-verdict">{r.verdict}</span>}
          </div>
          <p className="plp-panel-body">{r.body}</p>
        </div>
      ))}
      {m.kind === 'chat' && m.inputPlaceholder && (
        <div className="plp-chat-input">
          <span className="plp-chat-input-ph">{m.inputPlaceholder}</span>
          <span className="plp-chat-input-send" aria-hidden="true">↵</span>
        </div>
      )}
      {m.footer && <figcaption className="plp-mockup-foot">{m.footer}</figcaption>}
      {m.caption && <p className="plp-mockup-caption">{m.caption}</p>}
    </figure>
  );
}

export default function ProductLandingPage({ config: c }: { config: ProductLandingConfig }) {
  const pricing = pricingModel(c);
  const faqJsonLd = buildFaqJsonLd(c);

  // Split out so the hero can render it either inline (no heroArtefact — unchanged markup,
  // byte-identical for every page that doesn't set one) or inside a two-column grid cell
  // alongside a mock-up. A Fragment emits no markup of its own.
  const heroCopy = (
    <>
      <p className="plp-eyebrow">{c.eyebrow}</p>
      <h1 className="plp-h1">{c.headline}</h1>
      <p className="plp-sub">{c.subhead}</p>
      <p className="plp-coverage"><strong>What’s live:</strong> {c.coverage}</p>
      <div className="plp-cta-row">
        <Link href={c.freeCta.href} className="btn btn-rust btn-lg">{c.freeCta.label} <span className="arrow">→</span></Link>
      </div>
      <p className="plp-microcopy">Free to start · no card · {c.examName} ({c.paper})</p>
      {c.proof && (
        <p className="plp-microcopy">
          <Link href={c.proof.href} className="plp-prooflink">{c.proof.label} — a real, unedited transcript →</Link>
        </p>
      )}
      {c.heroMicrocopy && <p className="plp-hero-microcopy">{c.heroMicrocopy}</p>}
      {hasSection(c, 'heroMeta') && (
        <div className="plp-hero-meta">
          {c.heroMeta!.flatMap((m, i) => i === 0
            ? [<span key={`m${i}`}>{m}</span>]
            : [
                <span key={`d${i}`} className="plp-hero-meta-dot" aria-hidden="true" />,
                <span key={`m${i}`}>{m}</span>,
              ])}
        </div>
      )}
    </>
  );

  return (
    <>
      {/* First-touch utm_* / fbclid → cookie → persisted to the profile at signup. */}
      <AttributionCapture />
      <style>{CSS}</style>
      <div className="plp">
        <div className="bg-grain" aria-hidden="true" />
        <header className="plp-header">
          <div className="plp-wrap plp-header-inner">
            <Link href="/" className="plp-logo" aria-label="Gradd.ai home">
              <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{ height: 22, width: 'auto', display: 'block' }} />
            </Link>
            <nav className="plp-nav">
              {/* THE PROOF LINK IS NOT IN THE NAV — removed 2026-08-05, and it is a fix, not a
                  trim. Measured on /acca/afm at desktop: the nav's items summed to 759px
                  against 759px of available track — it FIT, with zero slack, so flexbox shrank
                  every link to its min-content width and each label broke mid-phrase ("See a
                  real / walkthrough", "What's / included"). No overflow, no clipping, nothing
                  a scrollWidth check would catch; it just looked broken. APM renders the same
                  nav minus this one link and has ~146px of slack, which is the whole reason
                  APM looked right and AFM did not — so removing it makes AFM's header exactly
                  APM's. Nothing is lost: `c.proof` still renders in the HERO one line below,
                  with a longer and better label ("… — a real, unedited transcript"). */}
              <Link href="/acca/apm" className="plp-navlink">ACCA APM</Link>
              {/* Points at root, not /acca — root IS the ACCA pillar now, and /acca itself
                  only redirects an anonymous visitor straight back here. Linking /acca
                  directly would just add a redirect hop for every reader who clicks this. */}
              <Link href="/" className="plp-navlink">All ACCA</Link>
              {/* SAME-PAGE ANCHOR links are tagged so they can drop out on a narrow viewport
                  — see the media query. Measured at 390px: with all of them present the nav
                  wrapped to THREE rows and the STICKY header stood 102px tall, eating a
                  quarter of the screen on every scroll. They are the right ones to lose: a
                  "#pricing" jump is redundant on a phone already scrolling, while the
                  cross-page links (the other paper, All ACCA, Blog, Sign in) are the only way
                  out of this page. */}
              {(c.nav ?? []).map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`plp-navlink${n.href.startsWith('#') ? ' plp-navlink--anchor' : ''}`}
                >{n.label}</Link>
              ))}
              <Link href={c.freeCta.href} className="btn btn-rust btn-sm">{c.freeCta.label} <span className="arrow">→</span></Link>
            </nav>
          </div>
        </header>

        <main>
          <section className="plp-hero">
            {hasSection(c, 'heroArtefact') ? (
              <div className="plp-wrap plp-hero-inner plp-hero-inner--split">
                <div className="plp-hero-copy">{heroCopy}</div>
                <div className="plp-hero-visual">{renderMockup(c.heroArtefact!, 'hero-artefact')}</div>
              </div>
            ) : (
              <div className="plp-wrap plp-hero-inner">{heroCopy}</div>
            )}
          </section>

          {/* ── STAT BAR — a thin bordered strip of 3-5 stats under the hero, not a card. ── */}
          {hasSection(c, 'statBar') && (
            <section className={`plp-statbar${bandClass(c.statBar!.band)}`} aria-label={c.statBar!.label ?? 'By the numbers'}>
              <div className="plp-wrap plp-statbar-inner">
                {c.statBar!.label && <span className="plp-statbar-label">{c.statBar!.label}</span>}
                <div className="plp-statbar-stats">
                  {c.statBar!.stats.map((s, i) => (
                    <div key={i} className="plp-statbar-stat">
                      <span className="plp-statbar-num">{s.value}</span>
                      <span className="plp-statbar-lbl">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── SECTION GROUPS. `sections[]` REPLACES the flat points grid when present —
              points[] renders EXACTLY as before when it is not, so AFM is unaffected. ── */}
          {hasSection(c, 'sections') ? (
            c.sections!.map((g) => (
              <section key={g.heading} className={`plp-section-group${bandClass(g.band)}`} aria-label={g.heading}>
                <div className="plp-wrap">
                  {g.eyebrow && <p className="plp-eyebrow">{g.eyebrow}</p>}
                  <h2 className="plp-h2">{g.heading}</h2>
                  {g.lead && <p className="plp-sub">{g.lead}</p>}
                  <div className="plp-points-grid plp-section-group-grid">
                    {g.cards.map((card) => (
                      <div key={card.title} className="plp-point">
                        <h3 className="plp-point-title">{card.title}</h3>
                        <p className="plp-point-body">{card.body}</p>
                      </div>
                    ))}
                  </div>
                  {g.caption && <p className="plp-caption">{g.caption}</p>}
                </div>
              </section>
            ))
          ) : (
            <section className="plp-points">
              <div className="plp-wrap plp-points-grid">
                {c.points.map((p) => (
                  <div key={p.title} className="plp-point">
                    <h2 className="plp-point-title">{p.title}</h2>
                    <p className="plp-point-body">{p.body}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── FEATURE ARTEFACTS — full-width split copy/mock-up sections, each with its
              own eyebrow/heading/lead. The framing a mockups[] entry never gets on its own. ── */}
          {hasSection(c, 'featureArtefacts') && c.featureArtefacts!.map((fa, i) => (
            <section
              key={fa.heading}
              className={`plp-feature-artefact${bandClass(fa.band)}`}
              aria-label={fa.heading}
            >
              <div className="plp-wrap plp-feature-artefact-grid">
                {fa.reverse && renderMockup(fa.mockup, `fa-${i}`)}
                <div className="plp-feature-artefact-copy">
                  {fa.eyebrow && <p className="plp-eyebrow">{fa.eyebrow}</p>}
                  <h2 className="plp-h2">{fa.heading}</h2>
                  {fa.lead && <p className="plp-sub">{fa.lead}</p>}
                  {fa.bullets && fa.bullets.length > 0 && (
                    <ul className="plp-feature-artefact-bullets">
                      {fa.bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                    </ul>
                  )}
                </div>
                {!fa.reverse && renderMockup(fa.mockup, `fa-${i}`)}
              </div>
            </section>
          ))}

          {/* ── BIG NUMBERS — enormous italic-serif figures separated by rules, no cards. ── */}
          {hasSection(c, 'bigNumbers') && (
            <section className={`plp-bignums${bandClass(c.bigNumbers!.band)}`} aria-label={c.bigNumbers!.heading ?? 'By the numbers'}>
              <div className="plp-wrap">
                {c.bigNumbers!.eyebrow && <p className="plp-eyebrow">{c.bigNumbers!.eyebrow}</p>}
                {c.bigNumbers!.heading && <h2 className="plp-h2">{c.bigNumbers!.heading}</h2>}
                <div className="plp-bignums-grid">
                  {c.bigNumbers!.items.map((it, i) => (
                    <div key={i} className="plp-bignum">
                      <span className="plp-bignum-value">{it.value}</span>
                      <p className="plp-bignum-body">{it.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── MOCK-UPS (chat transcript / marking panel) ── */}
          {hasSection(c, 'mockups') && (
            <section className="plp-mockups" aria-label="What it looks like">
              <div className="plp-wrap plp-mockup-stack">
                {c.mockups!.map((m, i) => renderMockup(m, i))}
              </div>
            </section>
          )}

          {/* ── ORDERED STEPS. The template numbers them, so a config never hardcodes "1." ── */}
          {hasSection(c, 'steps') && (
            <section className="plp-steps" aria-label={c.stepsHeading ?? 'How it works'}>
              <div className="plp-wrap">
                {c.stepsHeading && <h2 className="plp-h2">{c.stepsHeading}</h2>}
                <ol className="plp-step-list">
                  {c.steps!.map((s, i) => (
                    <li key={s.title} className="plp-step">
                      <span className="plp-step-n" aria-hidden="true">{i + 1}</span>
                      <h3 className="plp-step-title">{s.title}</h3>
                      {s.body && <p className="plp-step-body">{s.body}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}

          {/* ── JUDGEMENT (weak / diagnosis / coached before-after card) ──
              Split out of the old single comparison{} slot — see LandingJudgement. ── */}
          {hasSection(c, 'judgement') && (
            <section className={`plp-judgement${bandClass(c.judgement!.band)}`} aria-label={c.judgement!.heading}>
              <div className="plp-wrap">
                {c.judgement!.eyebrow && <p className="plp-eyebrow">{c.judgement!.eyebrow}</p>}
                <h2 className="plp-h2">{c.judgement!.heading}</h2>
                {c.judgement!.lead && <p className="plp-sub">{c.judgement!.lead}</p>}
                <div className="plp-judgement-grid">
                  <div className="plp-judgement-col plp-judgement-col--weak">
                    <span className="plp-judgement-tag">{c.judgement!.weak.label}</span>
                    <p>{c.judgement!.weak.body}</p>
                  </div>
                  <div className="plp-judgement-arrow" aria-hidden="true">↓</div>
                  <div className="plp-judgement-col plp-judgement-col--diag">
                    <span className="plp-judgement-tag">{c.judgement!.diagnosis.label}</span>
                    <p>{c.judgement!.diagnosis.body}</p>
                  </div>
                  <div className="plp-judgement-arrow" aria-hidden="true">↓</div>
                  <div className="plp-judgement-col plp-judgement-col--coached">
                    <span className="plp-judgement-tag">{c.judgement!.coached.label}</span>
                    <p>{c.judgement!.coached.body}</p>
                  </div>
                </div>
                {c.judgement!.caption && <p className="plp-caption">{c.judgement!.caption}</p>}
              </div>
            </section>
          )}

          {/* ── COMPARE STRIP (the competitor columns) ──
              The other half of the old comparison{} split — see LandingCompareStrip. ── */}
          {hasSection(c, 'compareStrip') && (
            <section className="plp-compare-strip" aria-label={c.compareStrip!.heading}>
              <div className="plp-wrap">
                {c.compareStrip!.eyebrow && <p className="plp-eyebrow">{c.compareStrip!.eyebrow}</p>}
                <h2 className="plp-h2">{c.compareStrip!.heading}</h2>
                <div className="plp-compare-strip-grid">
                  {c.compareStrip!.columns.map((col) => (
                    <div key={col.label} className={`plp-compare-strip-col${col.featured ? ' is-featured' : ''}`}>
                      <span className="plp-compare-strip-name">{col.label}</span>
                      <p>{col.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── COMPARE TABLE — a real table with a highlighted Gradd column, distinct from
              the flat compareStrip above (one paragraph per column, no shared rows). ── */}
          {hasSection(c, 'cmpTable') && (
            <section className={`plp-cmptable${bandClass(c.cmpTable!.band)}`} aria-label={c.cmpTable!.heading ?? 'Comparison'}>
              <div className="plp-wrap">
                {c.cmpTable!.eyebrow && <p className="plp-eyebrow">{c.cmpTable!.eyebrow}</p>}
                {c.cmpTable!.heading && <h2 className="plp-h2">{c.cmpTable!.heading}</h2>}
                <div className="plp-cmptable-scroll">
                  <table className="plp-cmptable-table">
                    <thead>
                      <tr>
                        <th scope="col" />
                        {c.cmpTable!.columns.map((col) => (
                          <th key={col.label} scope="col" className={col.featured ? 'is-gradd' : undefined}>{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {c.cmpTable!.rowLabels.map((row, ri) => (
                        <tr key={row}>
                          <th scope="row">{row}</th>
                          {c.cmpTable!.columns.map((col) => {
                            const v = col.values[ri];
                            return (
                              <td key={col.label} className={col.featured ? 'is-gradd' : undefined}>
                                {typeof v === 'boolean'
                                  ? (v ? <span className="plp-cmptable-y">✓</span> : <span className="plp-cmptable-n">—</span>)
                                  : v}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Shown only when the container ACTUALLY overflows — see ScrollableHint.
                    It is the adjacent sibling of .plp-cmptable-scroll on purpose: the CSS
                    rule is `[data-scrollable="true"] + .plp-cmptable-hint`, so the cue and
                    the thing it describes cannot drift apart. */}
                <p className="plp-cmptable-hint">Scroll to see more →</p>
                <ScrollableHint selector=".plp-cmptable-scroll" />
              </div>
            </section>
          )}

          {/* ── SECONDARY CTA BAND (the resit-funnel entry on APM) ── */}
          {hasSection(c, 'secondaryCta') && (
            <section className="plp-band" aria-label={c.secondaryCta!.heading}>
              <div className="plp-wrap">
                {c.secondaryCta!.eyebrow && <p className="plp-eyebrow">{c.secondaryCta!.eyebrow}</p>}
                <h2 className="plp-h2">{c.secondaryCta!.heading}</h2>
                {c.secondaryCta!.body && <p className="plp-sub">{c.secondaryCta!.body}</p>}
                <Link href={c.secondaryCta!.cta.href} className="btn btn-rust btn-lg">
                  {c.secondaryCta!.cta.label} <span className="arrow">→</span>
                </Link>
              </div>
            </section>
          )}

          {/* ── PRICING. Tiers when configured, otherwise the original simple card. ── */}
          <section className="plp-pricing" id="pricing">
            <div className="plp-wrap">
              {pricing.mode === 'simple' ? (
                <div className="plp-price-card">
                  <h2 className="plp-price-h">{pricing.heading}</h2>
                  <p className="plp-price-line">{pricing.free}</p>
                  <p className="plp-price-line">{pricing.paid}</p>
                  <div className="plp-cta-row" style={{ marginTop: 20 }}>
                    <Link href={c.freeCta.href} className="btn btn-rust btn-lg">{c.freeCta.label} <span className="arrow">→</span></Link>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="plp-h2 plp-tier-h">{pricing.heading}</h2>
                  <div className="plp-tier-grid">
                    {pricing.tiers.map((t) => (
                      <article key={t.name} className={`plp-tier${t.featured ? ' is-featured' : ''}`}>
                        {t.badge && <span className="plp-tier-badge">{t.badge}</span>}
                        <span className="plp-tier-name">{t.name}</span>
                        <div className="plp-tier-amount">
                          {t.amount}
                          {t.period && <span className="plp-tier-period">{t.period}</span>}
                        </div>
                        <p className="plp-tier-tagline">{t.tagline}</p>
                        <ul className="plp-tier-features">
                          {t.features.map((f, fi) => <li key={fi}>{f}</li>)}
                        </ul>
                        <Link href={t.cta.href} className="btn btn-rust">
                          {t.cta.label} <span className="arrow">→</span>
                        </Link>
                      </article>
                    ))}
                  </div>
                </>
              )}
              {c.pricingNote && <p className="plp-price-note">{c.pricingNote}</p>}
            </div>
          </section>

          {/* ── FAQ + FAQPage JSON-LD, from ONE array so they cannot drift. ── */}
          {hasSection(c, 'faqs') && (
            <section className="plp-faq" id="faq" aria-label="Frequently asked questions">
              <div className="plp-wrap">
                <h2 className="plp-h2">Questions, answered.</h2>
                <dl className="plp-faq-list">
                  {c.faqs!.map((f, i) => (
                    <div key={i} className="plp-faq-item">
                      <dt className="plp-faq-q">{f.q}</dt>
                      <dd className="plp-faq-a">{f.a}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              {/* Server-rendered — the whole reason this component is not 'use client'. */}
              {faqJsonLd && (
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
                />
              )}
            </section>
          )}

          {/* ── FINAL CTA ── */}
          {hasSection(c, 'finalCta') && (
            <section className="plp-final" aria-label="Get started">
              <div className="plp-wrap">
                {c.finalCta!.pill && <span className="plp-pill">{c.finalCta!.pill}</span>}
                <h2 className="plp-h2">{c.finalCta!.heading}</h2>
                {c.finalCta!.body && <p className="plp-sub">{c.finalCta!.body}</p>}
                <div className="plp-cta-row">
                  {c.finalCta!.ctas.map((cta) => (
                    <Link
                      key={cta.href + cta.label}
                      href={cta.href}
                      className={`btn btn-lg ${cta.variant === 'ghost' ? 'btn-ghost' : 'btn-rust'}`}
                    >
                      {cta.label} <span className="arrow">→</span>
                    </Link>
                  ))}
                </div>
                {c.finalCta!.fineprint && <p className="plp-final-fineprint">{c.finalCta!.fineprint}</p>}
              </div>
            </section>
          )}
        </main>

        <footer className="plp-footer">
          <div className="plp-wrap plp-footer-inner">
            <span>© 2026 Gradd.ai · {c.footnote}</span>
            <div className="plp-footer-links">
              {(c.footerLinks ?? DEFAULT_FOOTER_LINKS).map((l) => (
                l.href.startsWith('mailto:')
                  ? <a key={l.href} href={l.href}>{l.label}</a>
                  : <Link key={l.href} href={l.href}>{l.label}</Link>
              ))}
            </div>

          </div>
        </footer>

        {/* The ONLY client island. Renders null when both chrome flags are off, so a config
            that does not ask for chrome ships no scroll listener and no extra markup. */}
        <ProductLandingChrome
          headerShadow={hasSection(c, 'stickyHeaderShadow')}
          backToTop={hasSection(c, 'backToTop')}
        />
      </div>
    </>
  );
}

const CSS = `
.plp-wrap { max-width: 920px; margin: 0 auto; padding: 0 clamp(16px, 4vw, 32px); width: 100%; }
/* MIN-height + nowrap links + a wrapping nav — the robustness net behind the proof-link
   removal above. Fixed height plus a non-wrapping nav of shrinkable links is the combination
   that produced the AFM header defect: the links absorb the pressure by breaking their own
   text mid-phrase, so the header never overflows and never reports a problem. With
   white-space nowrap a label can no longer break, so pressure moves to the NAV, which now
   wraps to a second row, and min-height lets the header grow to hold it. A future config with
   one nav link too many gets a visibly taller header instead of silent damage. */
.plp-header-inner { min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.plp-logo { display: flex; align-items: center; text-decoration: none; }
.plp-nav { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; column-gap: 16px; row-gap: 8px; }
.plp-navlink { white-space: nowrap; }
@media (max-width: 560px) { .plp-navlink--anchor { display: none; } }
.plp-hero { padding: clamp(44px, 8vw, 88px) 0 clamp(28px, 5vw, 52px); }
.plp-hero-inner { max-width: 720px; }
.plp-eyebrow { margin: 0 0 14px; }
.plp-sub { margin: 0 0 20px; max-width: 620px; }
.plp-coverage { font-size: 14.5px; line-height: 1.55; color: var(--text); background: color-mix(in oklab, var(--rust) 8%, transparent); border: 1px solid color-mix(in oklab, var(--rust) 28%, transparent); border-radius: 12px; padding: 12px 16px; margin: 0 0 26px; max-width: 620px; }
.plp-coverage strong { color: var(--rust); }
.plp-cta-row { display: flex; flex-wrap: wrap; gap: 12px; }
.plp-microcopy { font-size: 12.5px; color: var(--text-muted); margin: 14px 0 0; }
.plp-prooflink { color: var(--rust); font-weight: 600; text-decoration: none; }
.plp-prooflink:hover { text-decoration: underline; }
.plp-hero-microcopy { font-size: 13px; color: var(--text-muted); margin: 12px 0 0; line-height: 1.5; }
.plp-hero-meta { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; margin: 18px 0 0;
  font-size: 13px; color: var(--text-muted); }
.plp-hero-meta-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--text-muted); display: inline-block; }
.plp-points { padding: clamp(24px, 4vw, 40px) 0; }
/* FIXED: was \`repeat(3, 1fr)\`, which silently constrained \`points[]\` to exactly three —
   four produced a broken row of one, two produced stretched cards, and nothing in the type
   said so. auto-fit sizes to whatever it is given; at the 920px wrap width THREE points
   still compute to three equal columns, which is what keeps AFM byte-identical. */
.plp-points-grid { display: grid; grid-template-columns: ${POINTS_GRID_TEMPLATE}; gap: 18px; }
@media (max-width: 720px) { .plp-points-grid { grid-template-columns: 1fr; } }
.plp-point { border: 1px solid var(--border); border-radius: 14px; padding: 22px; }
.plp-point-title { font-size: 18px; letter-spacing: -0.2px; margin: 0 0 8px; color: var(--text); }
.plp-point-body { font-size: 14px; line-height: 1.55; color: var(--text-muted); margin: 0; }
.plp-pricing { padding: clamp(24px, 4vw, 48px) 0; }
.plp-price-card { border: 1px solid var(--border); border-radius: 16px; padding: clamp(24px, 4vw, 36px); box-shadow: var(--shadow-lg); max-width: 620px; margin: 0 auto; text-align: center; }
.plp-price-h { font-size: clamp(20px, 3vw, 26px); letter-spacing: -0.3px; margin: 0 0 14px; color: var(--text); }
.plp-price-line { font-size: 15px; line-height: 1.6; color: var(--text-muted); margin: 0 0 8px; }
.plp-price-note { text-align: center; font-size: 11.5px; font-weight: 700; letter-spacing: .05em;
  text-transform: uppercase; color: var(--text-muted); margin-top: 22px; }
.plp-footer { margin-top: auto; border-top: 1px solid var(--border-light, var(--border)); padding: 18px 0; }
.plp-footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 11.5px; color: var(--text-muted); }
.plp-footer-links { display: flex; gap: 16px; }
.plp-footer-links a { font-size: 11.5px; color: var(--text-muted); text-decoration: none; }
.plp-footer-links a:hover { color: var(--text); }

/* ── Sections added with the generalisation (2026-08-03) ──────────────────────
   Every selector below belongs to an OPTIONAL section. A config that omits the field
   renders none of this markup, so these rules cost an existing page nothing. */

/* Header shadow — driven by data-scrolled, which ProductLandingChrome sets on .plp so the
   header itself stays server-rendered markup. */
.plp[data-scrolled="true"] .plp-header { box-shadow: 0 1px 12px rgba(0,0,0,.07); }

/* Mock-ups */
.plp-mockups { padding: clamp(20px, 4vw, 40px) 0; }
.plp-mockup-stack { display: flex; flex-direction: column; gap: 18px; }
.plp-mockup { margin: 0; border: 1px solid var(--border);
  border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.plp-mockup-head { display: flex; flex-direction: column; gap: 2px; padding-bottom: 10px;
  border-bottom: 1px solid var(--border); }
.plp-mockup-title { font-size: 13.5px; font-weight: 700; color: var(--text); }
.plp-mockup-sub { font-size: 12px; color: var(--text-muted); }
.plp-turn { border-radius: 10px; padding: 11px 14px; font-size: 14px; line-height: 1.55; }
.plp-turn p { margin: 0 0 8px; }
.plp-turn p:last-child { margin-bottom: 0; }
.plp-turn--student { background: color-mix(in oklab, var(--text) 5%, transparent); color: var(--text-muted); }
.plp-turn--tutor { background: color-mix(in oklab, var(--rust) 8%, transparent);
  border: 1px solid color-mix(in oklab, var(--rust) 22%, transparent); color: var(--text); }
.plp-panel-row { border-top: 1px solid var(--border); padding-top: 10px; }
.plp-panel-row:first-of-type { border-top: 0; padding-top: 0; }
.plp-panel-rowhead { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
.plp-panel-label { font-size: 13px; font-weight: 700; color: var(--text); }
.plp-panel-verdict { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
  color: var(--rust); border: 1px solid color-mix(in oklab, var(--rust) 35%, transparent);
  border-radius: 999px; padding: 2px 9px; }
.plp-panel-body { font-size: 13.5px; line-height: 1.55; color: var(--text-muted); margin: 0; }
.plp-mockup-foot { font-size: 11.5px; color: var(--text-muted); padding-top: 8px; border-top: 1px solid var(--border); }
.plp-mockup-caption { margin-top: 4px; text-align: center; font-size: 14px; line-height: 1.4; }
.plp-turn-badge { display: inline-block; align-self: flex-start; font-size: 10px; font-weight: 700;
  letter-spacing: .06em; text-transform: uppercase; color: var(--rust);
  background: color-mix(in oklab, var(--rust) 14%, transparent);
  border: 1px solid color-mix(in oklab, var(--rust) 30%, transparent);
  padding: 2px 8px; border-radius: 999px; margin-bottom: 4px; }
.plp-chat-input { margin-top: 10px; display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 10px;
  border: 1px solid var(--border); border-radius: 12px; background: color-mix(in oklab, var(--surface) 92%, transparent); }
.plp-chat-input-ph { flex: 1; min-width: 0; font-size: 13px; color: var(--text-muted); }
.plp-chat-input-send { width: 26px; height: 26px; border-radius: 7px; background: var(--rust); color: var(--rust-ink);
  display: grid; place-items: center; font-size: 12px; flex: 0 0 auto; }

/* Steps */
.plp-steps { padding: clamp(20px, 4vw, 40px) 0; }
.plp-step-list { list-style: none; margin: 0; padding: 0; display: grid;
  grid-template-columns: ${POINTS_GRID_TEMPLATE}; gap: 18px; }
@media (max-width: 720px) { .plp-step-list { grid-template-columns: 1fr; } }
.plp-step { border-top: 2px solid color-mix(in oklab, var(--rust) 40%, transparent); padding-top: 14px; }
.plp-step-n { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px;
  border-radius: 999px; background: var(--rust); color: var(--rust-ink); font-size: 12.5px;
  font-weight: 700; margin-bottom: 8px; }
.plp-step-title { font-size: 16.5px; margin: 0 0 6px; }
.plp-step-body { font-size: 14px; line-height: 1.55; color: var(--text-muted); margin: 0; }

/* Section groups — headed clusters of cards, replacing the flat points grid when
   sections[] is set. Reuses .plp-points-grid / .plp-point for the card shape. */
.plp-section-group { padding: clamp(24px, 4vw, 40px) 0; }
.plp-section-group-grid { margin-top: 24px; }
.plp-caption { margin-top: 20px; text-align: center; font-size: 15px; line-height: 1.4; }

/* Judgement (weak / diagnosis / coached before-after card). Grid mechanism (flex-wrap,
   not a fixed-count template) lives in globals.css — see the comment there. */
.plp-judgement { padding: clamp(20px, 4vw, 40px) 0; }
.plp-judgement-col { border: 1px solid var(--border); border-radius: 12px;
  padding: 18px; display: flex; flex-direction: column; gap: 8px; }
.plp-judgement-col--coached { border-color: var(--rust); }
.plp-judgement-tag { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
  color: var(--text-muted); }
.plp-judgement-col--coached .plp-judgement-tag { color: var(--rust); }
.plp-judgement-col p { font-size: 14px; line-height: 1.55; color: var(--text-muted); margin: 0; }
.plp-judgement-arrow { align-self: center; justify-self: center; color: var(--rust); font-size: 16px; }

/* Compare strip (competitor columns) */
.plp-compare-strip { padding: clamp(20px, 4vw, 40px) 0; }
.plp-compare-strip-grid { display: grid; grid-template-columns: ${POINTS_GRID_TEMPLATE}; gap: 16px; margin-top: 14px; }
@media (max-width: 720px) { .plp-compare-strip-grid { grid-template-columns: 1fr; } }
.plp-compare-strip-col { border: 1px solid var(--border); border-radius: 12px; padding: 18px; }
.plp-compare-strip-col.is-featured { border-color: var(--rust); background: color-mix(in oklab, var(--paper) 88%, var(--rust)); }
.plp-compare-strip-name { font-size: 15px; font-weight: 700; color: var(--text); }
.plp-compare-strip-col.is-featured .plp-compare-strip-name { color: var(--rust); }
.plp-compare-strip-col p { font-size: 14px; color: var(--text-muted); line-height: 1.5; margin: 4px 0 0; }

/* Secondary CTA band */
.plp-band { padding: clamp(24px, 4vw, 44px) 0; background: color-mix(in oklab, var(--rust) 6%, transparent);
  border-top: 1px solid color-mix(in oklab, var(--rust) 18%, transparent);
  border-bottom: 1px solid color-mix(in oklab, var(--rust) 18%, transparent); }

/* Pricing tiers */
.plp-tier-h { text-align: center; }
.plp-tier-grid { display: grid; grid-template-columns: ${POINTS_GRID_TEMPLATE}; gap: 18px; align-items: stretch; }
@media (max-width: 720px) { .plp-tier-grid { grid-template-columns: 1fr; } }
.plp-tier { position: relative; border: 1px solid var(--border);
  border-radius: 14px; padding: 24px; display: flex; flex-direction: column; gap: 8px; }
.plp-tier.is-featured { border-color: var(--rust); box-shadow: var(--shadow-lg); }
.plp-tier-badge { position: absolute; top: -11px; left: 50%; transform: translateX(-50%);
  background: var(--rust); color: var(--rust-ink); font-size: 11px; font-weight: 700;
  letter-spacing: .03em; padding: 3px 11px; border-radius: 999px; white-space: nowrap; }
.plp-tier-name { font-size: 12.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.plp-tier-amount { font-size: 34px; letter-spacing: -.8px; color: var(--text); }
.plp-tier-period { display: block; font-family: var(--font-body); font-size: 12.5px; font-weight: 500;
  letter-spacing: 0; color: var(--text-muted); margin-top: 2px; }
.plp-tier-tagline { font-size: 13.5px; line-height: 1.5; color: var(--text-muted); margin: 0; }
.plp-tier-features { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.plp-tier-features li { font-size: 13.5px; line-height: 1.5; color: var(--text-muted); padding-left: 18px; position: relative; }
.plp-tier-features li::before { content: '✓'; position: absolute; left: 0; color: var(--rust); font-weight: 700; }
.plp-tier .btn { align-self: stretch; justify-content: center; margin-top: auto; }

/* FAQ */
.plp-faq { padding: clamp(20px, 4vw, 44px) 0; }
.plp-faq-list { margin: 0; }
.plp-faq-item { border-top: 1px solid var(--border); padding: 16px 0; }
.plp-faq-item:first-child { border-top: 0; }
.plp-faq-q { margin: 0 0 6px; }
.plp-faq-a { font-size: 14.5px; line-height: 1.6; color: var(--text-muted); margin: 0; }

/* Final CTA — the dark band background/text-color/padding live in globals.css. */
.plp-final .plp-cta-row { justify-content: center; }
.plp-pill { display: inline-block; font-size: 12px; font-weight: 700;
  border: 1px solid color-mix(in oklab, var(--rust) 30%, transparent); border-radius: 999px;
  padding: 4px 13px; margin-bottom: 14px; }
.plp-final-fineprint { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  margin-top: 22px; }

/* Back to top */
.plp-totop { position: fixed; right: 18px; bottom: 18px; z-index: 50; width: 38px; height: 38px;
  border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--text);
  display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
  opacity: 0; pointer-events: none; transform: translateY(6px);
  transition: opacity .18s ease, transform .18s ease; box-shadow: var(--shadow-sm); }
.plp-totop.is-visible { opacity: 1; pointer-events: auto; transform: translateY(0); }
@media (prefers-reduced-motion: reduce) { .plp-totop { transition: none; } }
`;

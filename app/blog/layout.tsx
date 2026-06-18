export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .blog-shell {
          min-height: 100vh;
          background: var(--bg, #f7f3ec);
          color: var(--text, #1a1208);
          font-family: var(--font-body, 'Plus Jakarta Sans', system-ui, sans-serif);
        }
        .blog-header {
          background: var(--brand, #0e2b1e);
          padding: 40px 24px 36px;
          text-align: center;
        }
        .blog-header-wordmark {
          font-family: var(--font-display, 'Playfair Display', Georgia, serif);
          font-style: italic;
          font-weight: 400;
          font-size: 28px;
          color: #f7f3ec;
          letter-spacing: -0.03em;
          text-decoration: none;
          display: inline-block;
          margin-bottom: 6px;
        }
        .blog-header-tagline {
          font-size: 14px;
          color: oklch(72% 0.02 80);
          margin: 0;
        }
        .blog-prose {
          max-width: 680px;
          margin: 0 auto;
          padding: 40px 24px 80px;
        }
        .blog-prose h2 {
          font-family: var(--font-display, 'Playfair Display', Georgia, serif);
          font-style: italic;
          font-weight: 400;
          font-size: 26px;
          color: var(--brand, #0e2b1e);
          letter-spacing: -0.025em;
          margin: 2.2em 0 0.6em;
        }
        .blog-prose h2:first-child {
          margin-top: 0;
        }
        .blog-prose p {
          font-size: 17px;
          line-height: 1.72;
          margin: 0 0 1.1em;
          color: var(--text, #1a1208);
        }
        .blog-prose blockquote {
          border-left: 3px solid var(--accent, #c8972e);
          margin: 1.6em 0;
          padding: 14px 20px;
          background: rgba(200,151,46,0.07);
          border-radius: 0 8px 8px 0;
        }
        .blog-prose blockquote p {
          margin: 0;
          font-style: italic;
          font-size: 16px;
          line-height: 1.65;
        }
        .blog-prose strong {
          font-weight: 600;
        }
        .blog-prose em {
          font-style: italic;
        }
        .blog-prose ul, .blog-prose ol {
          padding-left: 1.4em;
          margin: 0 0 1.1em;
        }
        .blog-prose li {
          font-size: 17px;
          line-height: 1.65;
          margin-bottom: 0.4em;
        }
        .blog-prose hr {
          border: none;
          border-top: 1px solid var(--border, #ddd5c5);
          margin: 2em 0;
        }
      `}</style>
      {children}
    </>
  );
}

// app/cookies/page.tsx
// Gradd — Cookie Policy
// Deploy to: /cookies

import React from "react";

export const metadata = {
  title: "Cookie Policy | Gradd",
  description:
    "Gradd uses only essential cookies required for login. No advertising or tracking cookies.",
};

export default function CookiesPage() {
  const styles: Record<string, React.CSSProperties> = {
    page: {
      background: "#FAFAF7",
      minHeight: "100vh",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: "#1A1A18",
    },
    header: {
      background: "#1B3D2F",
      padding: "32px 24px 28px",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      gap: "12px",
    },
    logoText: {
      fontFamily: "'Georgia', serif",
      fontSize: "28px",
      fontWeight: "700",
      color: "#FFFFFF",
      letterSpacing: "-0.5px",
      margin: 0,
    },
    logoAccent: {
      color: "#7EC8A4",
    },
    headerTitle: {
      fontSize: "15px",
      fontWeight: "400",
      color: "rgba(255,255,255,0.75)",
      margin: 0,
      letterSpacing: "0.08em",
      textTransform: "uppercase" as const,
    },
    divider: {
      width: "40px",
      height: "1px",
      background: "rgba(255,255,255,0.25)",
      margin: "4px 0",
    },
    lastUpdated: {
      fontSize: "13px",
      color: "rgba(255,255,255,0.5)",
      margin: 0,
    },
    main: {
      maxWidth: "760px",
      margin: "0 auto",
      padding: "56px 32px 80px",
    },
    h1: {
      fontFamily: "'Georgia', serif",
      fontSize: "32px",
      fontWeight: "700",
      color: "#1B3D2F",
      marginBottom: "8px",
      marginTop: 0,
      lineHeight: "1.2",
    },
    intro: {
      fontSize: "16px",
      lineHeight: "1.75",
      color: "#4A4A42",
      marginBottom: "48px",
      borderLeft: "3px solid #7EC8A4",
      paddingLeft: "20px",
    },
    h2: {
      fontFamily: "'Georgia', serif",
      fontSize: "19px",
      fontWeight: "700",
      color: "#1B3D2F",
      marginTop: "44px",
      marginBottom: "12px",
    },
    p: {
      fontSize: "15px",
      lineHeight: "1.8",
      color: "#3A3A32",
      marginBottom: "16px",
    },
    ul: {
      paddingLeft: "20px",
      marginBottom: "16px",
    },
    li: {
      fontSize: "15px",
      lineHeight: "1.8",
      color: "#3A3A32",
      marginBottom: "6px",
    },
    cookieCard: {
      background: "#FFFFFF",
      border: "1px solid #D8D8D0",
      borderRadius: "10px",
      padding: "24px",
      marginBottom: "16px",
    },
    cookieName: {
      fontFamily: "'Georgia', serif",
      fontSize: "15px",
      fontWeight: "700",
      color: "#1B3D2F",
      margin: "0 0 4px 0",
    },
    cookieMeta: {
      fontSize: "13px",
      color: "#888880",
      margin: "0 0 10px 0",
      fontStyle: "italic",
    },
    cookieDesc: {
      fontSize: "14px",
      lineHeight: "1.7",
      color: "#3A3A32",
      margin: 0,
    },
    badge: {
      display: "inline-block",
      background: "#EDF6F1",
      color: "#1B3D2F",
      border: "1px solid #B8DEC9",
      borderRadius: "20px",
      padding: "2px 10px",
      fontSize: "12px",
      fontWeight: "700",
      letterSpacing: "0.04em",
      marginLeft: "8px",
      verticalAlign: "middle" as const,
    },
    notice: {
      background: "#EDF6F1",
      border: "1px solid #B8DEC9",
      borderRadius: "8px",
      padding: "20px 24px",
      marginBottom: "24px",
    },
    noticeText: {
      fontSize: "15px",
      lineHeight: "1.75",
      color: "#1B3D2F",
      margin: 0,
      fontWeight: "500",
    },
    footer: {
      borderTop: "1px solid #E0E0D8",
      paddingTop: "32px",
      marginTop: "56px",
    },
    footerText: {
      fontSize: "13px",
      color: "#888880",
      lineHeight: "1.7",
    },
    link: {
      color: "#1B3D2F",
      textDecoration: "underline",
    },
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <p style={styles.logoText}>
          Gr<span style={styles.logoAccent}>add</span>
        </p>
        <div style={styles.divider} />
        <p style={styles.headerTitle}>Cookie Policy</p>
        <p style={styles.lastUpdated}>Last updated: 01 May 2026</p>
      </header>

      <main style={styles.main}>
        <h1 style={styles.h1}>Cookie Policy</h1>

        <p style={styles.intro}>
          Gradd uses only the cookies that are strictly necessary to keep you
          logged in. We have no advertising network, no analytics tracking, and
          no third-party cookies from social media or ad platforms. This is a
          short policy because there is very little to tell.
        </p>

        {/* What is a cookie */}
        <h2 style={styles.h2}>What Is a Cookie?</h2>
        <p style={styles.p}>
          A cookie is a small text file stored on your device by your browser
          when you visit a website. Cookies can serve different purposes: some
          are essential to make a site function, others track your behaviour
          across the web for advertising purposes.
        </p>

        {/* What we use */}
        <h2 style={styles.h2}>Cookies Gradd Uses</h2>

        <div style={styles.notice}>
          <p style={styles.noticeText}>
            Gradd uses one category of cookie only: strictly necessary
            functional cookies. These cannot be switched off without breaking
            your ability to log in.
          </p>
        </div>

        {/* Cookie detail cards */}
        <div style={styles.cookieCard}>
          <p style={styles.cookieName}>
            sb-[project-ref]-auth-token
            <span style={styles.badge}>Strictly Necessary</span>
          </p>
          <p style={styles.cookieMeta}>
            Provider: Supabase · Type: HTTP-only, Secure · Duration: Session /
            up to 7 days (sliding refresh)
          </p>
          <p style={styles.cookieDesc}>
            This cookie stores your encrypted authentication session token. It
            is set by Supabase SSR when you log in and allows Gradd&apos;s
            server to verify your identity on each page request. Without it you
            cannot remain logged in. The cookie is HTTP-only (not accessible to
            JavaScript) and transmitted over HTTPS only, providing strong
            protection against session hijacking.
          </p>
        </div>

        <div style={styles.cookieCard}>
          <p style={styles.cookieName}>
            sb-[project-ref]-auth-token-code-verifier
            <span style={styles.badge}>Strictly Necessary</span>
          </p>
          <p style={styles.cookieMeta}>
            Provider: Supabase · Type: HTTP-only, Secure · Duration: Short-lived
            (OAuth flow only)
          </p>
          <p style={styles.cookieDesc}>
            A short-lived cookie used during the PKCE (Proof Key for Code
            Exchange) OAuth flow to prevent authorisation code interception
            attacks. It is deleted immediately after login completes.
          </p>
        </div>

        {/* What we don't use */}
        <h2 style={styles.h2}>What We Do Not Use</h2>
        <ul style={styles.ul}>
          <li style={styles.li}>
            <strong>Analytics cookies</strong> — we do not use Google Analytics,
            Mixpanel, or any equivalent tracking service.
          </li>
          <li style={styles.li}>
            <strong>Advertising cookies</strong> — we do not run retargeting
            campaigns or serve behavioural ads.
          </li>
          <li style={styles.li}>
            <strong>Social media cookies</strong> — we have no embedded social
            widgets that set third-party cookies.
          </li>
          <li style={styles.li}>
            <strong>Performance or preference cookies</strong> — beyond your
            auth session, we do not store any personalisation data in cookies.
          </li>
        </ul>

        {/* No banner required */}
        <h2 style={styles.h2}>Why There Is No Cookie Consent Banner</h2>
        <p style={styles.p}>
          Under the ePrivacy Regulations (SI 336/2011, implementing the EU
          Cookie Directive) and associated guidance from the Data Protection
          Commission, cookies that are strictly necessary for a service
          explicitly requested by the user are exempt from the consent
          requirement. Because Gradd uses only such cookies, no opt-in banner is
          legally required.
        </p>
        <p style={styles.p}>
          We still publish this policy so that you know exactly what is set and
          why.
        </p>

        {/* Managing cookies */}
        <h2 style={styles.h2}>Managing or Deleting Cookies</h2>
        <p style={styles.p}>
          You can delete cookies at any time through your browser settings.
          Deleting the Gradd session cookie will log you out. You can also log
          out via the Gradd interface, which clears the session cookie
          immediately.
        </p>
        <p style={styles.p}>
          Browser guides for managing cookies:
        </p>
        <ul style={styles.ul}>
          <li style={styles.li}>
            <a
              href="https://support.google.com/chrome/answer/95647"
              style={styles.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Chrome
            </a>
          </li>
          <li style={styles.li}>
            <a
              href="https://support.mozilla.org/en-US/kb/delete-cookies-remove-info-websites-stored"
              style={styles.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              Mozilla Firefox
            </a>
          </li>
          <li style={styles.li}>
            <a
              href="https://support.apple.com/en-ie/guide/safari/sfri11471/mac"
              style={styles.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              Apple Safari
            </a>
          </li>
          <li style={styles.li}>
            <a
              href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
              style={styles.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              Microsoft Edge
            </a>
          </li>
        </ul>

        {/* Contact */}
        <h2 style={styles.h2}>Questions</h2>
        <p style={styles.p}>
          If you have any questions about our use of cookies, contact us at{" "}
          <a href="mailto:hello@gradd.ie" style={styles.link}>
            hello@gradd.ie
          </a>
          .
        </p>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Gradd · gradd.ie ·{" "}
            <a href="/terms" style={styles.link}>
              Terms of Service
            </a>{" "}
            ·{" "}
            <a href="/privacy" style={styles.link}>
              Privacy Policy
            </a>
          </p>
          <p style={styles.footerText}>
            © {new Date().getFullYear()} Gradd. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}

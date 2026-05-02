// app/privacy/page.tsx
// Gradd — Privacy Policy (GDPR-compliant)
// Deploy to: /privacy

import React from "react";

export const metadata = {
  title: "Privacy Policy | Gradd",
  description:
    "How Gradd collects, uses, and protects your personal data. GDPR-compliant.",
};

export default function PrivacyPage() {
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
    h3: {
      fontFamily: "'Georgia', serif",
      fontSize: "16px",
      fontWeight: "700",
      color: "#2C5440",
      marginTop: "24px",
      marginBottom: "8px",
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
    notice: {
      background: "#EDF6F1",
      border: "1px solid #B8DEC9",
      borderRadius: "8px",
      padding: "20px 24px",
      marginBottom: "16px",
    },
    noticeText: {
      fontSize: "15px",
      lineHeight: "1.75",
      color: "#1B3D2F",
      margin: 0,
      fontWeight: "500",
    },
    processorTable: {
      width: "100%",
      borderCollapse: "collapse" as const,
      marginBottom: "24px",
      fontSize: "14px",
    },
    th: {
      background: "#1B3D2F",
      color: "#FFFFFF",
      padding: "10px 14px",
      textAlign: "left" as const,
      fontFamily: "'Georgia', serif",
      fontWeight: "700",
      fontSize: "13px",
    },
    td: {
      padding: "10px 14px",
      borderBottom: "1px solid #E0E0D8",
      color: "#3A3A32",
      verticalAlign: "top" as const,
      lineHeight: "1.6",
    },
    trEven: {
      background: "#F4F4F0",
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

  const processors = [
    {
      name: "Anthropic (Claude API)",
      purpose: "AI tutor response generation",
      location: "USA",
      basis: "Standard Contractual Clauses (SCCs)",
      privacy: "https://www.anthropic.com/privacy",
    },
    {
      name: "Supabase",
      purpose: "Database, authentication, and user account management",
      location: "EU (AWS eu-west-1)",
      basis: "Adequacy / SCCs",
      privacy: "https://supabase.com/privacy",
    },
    {
      name: "Stripe",
      purpose: "Payment processing and subscription billing",
      location: "USA / EU",
      basis: "SCCs",
      privacy: "https://stripe.com/ie/privacy",
    },
    {
      name: "Resend",
      purpose: "Transactional email (account confirmation, receipts)",
      location: "USA",
      basis: "SCCs",
      privacy: "https://resend.com/legal/privacy-policy",
    },
    {
      name: "Vercel",
      purpose: "Application hosting and delivery",
      location: "USA / global edge",
      basis: "SCCs",
      privacy: "https://vercel.com/legal/privacy-policy",
    },
  ];

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <p style={styles.logoText}>
          Gr<span style={styles.logoAccent}>add</span>
        </p>
        <div style={styles.divider} />
        <p style={styles.headerTitle}>Privacy Policy</p>
        <p style={styles.lastUpdated}>Last updated: 01 May 2026</p>
      </header>

      <main style={styles.main}>
        <h1 style={styles.h1}>Privacy Policy</h1>

        <p style={styles.intro}>
          Gradd takes your privacy seriously — especially because many of our
          users are students, some of whom may be minors. This policy explains
          what personal data we collect, why we collect it, who we share it
          with, and your rights under the General Data Protection Regulation
          (GDPR) and Irish data protection law.
        </p>

        {/* 1 */}
        <h2 style={styles.h2}>1. Data Controller</h2>
        <p style={styles.p}>
          The data controller for personal data processed through Gradd is
          Gradd, a sole trader operating in Ireland.
        </p>
        <p style={styles.p}>
          Contact:{" "}
          <a href="mailto:hello@gradd.ie" style={styles.link}>
            hello@gradd.ie
          </a>
        </p>

        {/* 2 */}
        <h2 style={styles.h2}>2. Data We Collect</h2>

        <h3 style={styles.h3}>Account and Registration Data</h3>
        <ul style={styles.ul}>
          <li style={styles.li}>Email address</li>
          <li style={styles.li}>
            Password (stored as a salted hash — we never see your plain-text
            password)
          </li>
          <li style={styles.li}>
            Account creation date and last login timestamp
          </li>
        </ul>

        <h3 style={styles.h3}>Subscription and Billing Data</h3>
        <ul style={styles.ul}>
          <li style={styles.li}>
            Stripe customer ID and subscription status
          </li>
          <li style={styles.li}>
            Payment method type and last four digits (held by Stripe — we do not
            store full card details)
          </li>
          <li style={styles.li}>Billing history and invoice records</li>
        </ul>

        <h3 style={styles.h3}>Platform Usage Data</h3>
        <ul style={styles.ul}>
          <li style={styles.li}>
            Chat session content — the questions you ask Aoife (Gradd&apos;s AI
            tutor) and the responses generated
          </li>
          <li style={styles.li}>
            Session timestamps and approximate usage frequency
          </li>
        </ul>

        <h3 style={styles.h3}>Technical Data</h3>
        <ul style={styles.ul}>
          <li style={styles.li}>
            Authentication session tokens (stored in a secure HTTP-only cookie
            via Supabase SSR)
          </li>
          <li style={styles.li}>
            Server-side request logs (IP address, browser type) — retained for
            up to 30 days for security purposes
          </li>
        </ul>

        <div style={styles.notice}>
          <p style={styles.noticeText}>
            Note for parents: if your child uses Gradd, the data collected is
            limited to the above. We do not collect information about school
            attendance, real grades, or sensitive personal data as defined under
            GDPR Article 9.
          </p>
        </div>

        {/* 3 */}
        <h2 style={styles.h2}>3. Why We Collect It — Legal Bases</h2>
        <ul style={styles.ul}>
          <li style={styles.li}>
            <strong>Contract performance (Art. 6(1)(b)):</strong> Account
            registration, subscription management, and delivering the platform
            service.
          </li>
          <li style={styles.li}>
            <strong>Legal obligation (Art. 6(1)(c)):</strong> Retaining billing
            records for VAT and tax compliance purposes (Irish Revenue
            requirements — 6 years).
          </li>
          <li style={styles.li}>
            <strong>Legitimate interests (Art. 6(1)(f)):</strong> Security
            logging, fraud prevention, and improving AI tutor response quality.
          </li>
        </ul>

        {/* 4 */}
        <h2 style={styles.h2}>4. Data Retention</h2>
        <ul style={styles.ul}>
          <li style={styles.li}>
            <strong>Account data:</strong> Retained for as long as your account
            is active. Deleted within 30 days of account deletion request.
          </li>
          <li style={styles.li}>
            <strong>Chat sessions:</strong> Retained for 12 months to support
            session continuity and product improvement. You may request earlier
            deletion.
          </li>
          <li style={styles.li}>
            <strong>Billing records:</strong> Retained for 6 years as required
            by Irish Revenue and VAT legislation.
          </li>
          <li style={styles.li}>
            <strong>Server logs:</strong> Retained for up to 30 days, then
            deleted automatically.
          </li>
        </ul>

        {/* 5 */}
        <h2 style={styles.h2}>5. Data Processors (Third-Party Services)</h2>
        <p style={styles.p}>
          We share your data only with the processors listed below, all of whom
          are bound by GDPR-compliant data processing agreements. We do not sell
          your data to any third party.
        </p>

        <div style={{ overflowX: "auto" as const, marginBottom: "24px" }}>
          <table style={styles.processorTable}>
            <thead>
              <tr>
                <th style={styles.th}>Processor</th>
                <th style={styles.th}>Purpose</th>
                <th style={styles.th}>Location</th>
                <th style={styles.th}>Transfer Basis</th>
              </tr>
            </thead>
            <tbody>
              {processors.map((p, i) => (
                <tr key={p.name} style={i % 2 === 1 ? styles.trEven : {}}>
                  <td style={styles.td}>
                    <a href={p.privacy} style={styles.link} target="_blank" rel="noopener noreferrer">
                      {p.name}
                    </a>
                  </td>
                  <td style={styles.td}>{p.purpose}</td>
                  <td style={styles.td}>{p.location}</td>
                  <td style={styles.td}>{p.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={styles.p}>
          Where processors are located outside the European Economic Area (EEA),
          transfers are protected by Standard Contractual Clauses approved by the
          European Commission.
        </p>

        {/* 6 */}
        <h2 style={styles.h2}>6. Cookies</h2>
        <p style={styles.p}>
          Gradd uses only essential functional cookies required to keep you
          logged in (Supabase authentication session). We do not use advertising
          cookies, tracking cookies, or analytics cookies. See our{" "}
          <a href="/cookies" style={styles.link}>
            Cookie Policy
          </a>{" "}
          for full details.
        </p>

        {/* 7 */}
        <h2 style={styles.h2}>7. Your Rights Under GDPR</h2>
        <p style={styles.p}>
          As a data subject under GDPR, you have the following rights:
        </p>
        <ul style={styles.ul}>
          <li style={styles.li}>
            <strong>Right of access:</strong> Request a copy of the personal
            data we hold about you.
          </li>
          <li style={styles.li}>
            <strong>Right to rectification:</strong> Ask us to correct
            inaccurate data.
          </li>
          <li style={styles.li}>
            <strong>Right to erasure (&quot;right to be forgotten&quot;):</strong>{" "}
            Request deletion of your personal data, subject to our legal
            retention obligations.
          </li>
          <li style={styles.li}>
            <strong>Right to restriction:</strong> Ask us to limit how we
            process your data in certain circumstances.
          </li>
          <li style={styles.li}>
            <strong>Right to data portability:</strong> Receive your data in a
            structured, machine-readable format.
          </li>
          <li style={styles.li}>
            <strong>Right to object:</strong> Object to processing based on
            legitimate interests.
          </li>
          <li style={styles.li}>
            <strong>Right to withdraw consent:</strong> Where processing is
            based on consent, withdraw it at any time without affecting the
            lawfulness of prior processing.
          </li>
        </ul>

        {/* 8 */}
        <h2 style={styles.h2}>8. How to Request Data Deletion</h2>
        <p style={styles.p}>
          To request deletion of your account and associated personal data,
          email us at{" "}
          <a href="mailto:hello@gradd.ie" style={styles.link}>
            hello@gradd.ie
          </a>{" "}
          with the subject line <strong>&quot;Data Deletion Request&quot;</strong>{" "}
          and the email address associated with your account. We will process
          your request within 30 days and confirm by email when complete.
        </p>
        <p style={styles.p}>
          Note: billing records required for tax compliance (6 years) will be
          retained but fully anonymised where technically possible.
        </p>

        {/* 9 */}
        <h2 style={styles.h2}>9. Supervisory Authority — Data Protection Commission</h2>
        <p style={styles.p}>
          If you believe we have not handled your personal data in accordance
          with GDPR, you have the right to lodge a complaint with Ireland&apos;s
          supervisory authority:
        </p>
        <div style={styles.notice}>
          <p style={styles.noticeText}>
            Data Protection Commission (DPC)<br />
            21 Fitzwilliam Square South, Dublin 2, D02 RD28<br />
            Web:{" "}
            <a href="https://www.dataprotection.ie" style={styles.link} target="_blank" rel="noopener noreferrer">
              www.dataprotection.ie
            </a>
            <br />
            Phone: +353 (0)76 110 4800
          </p>
        </div>

        {/* 10 */}
        <h2 style={styles.h2}>10. Security</h2>
        <p style={styles.p}>
          We implement appropriate technical and organisational measures to
          protect your personal data, including:
        </p>
        <ul style={styles.ul}>
          <li style={styles.li}>
            TLS encryption for all data in transit (HTTPS enforced)
          </li>
          <li style={styles.li}>
            Passwords stored as bcrypt hashes — never in plaintext
          </li>
          <li style={styles.li}>
            Row-Level Security (RLS) policies on our Supabase database ensuring
            users can only access their own data
          </li>
          <li style={styles.li}>
            HTTP-only, secure session cookies to mitigate XSS risk
          </li>
        </ul>

        {/* 11 */}
        <h2 style={styles.h2}>11. Changes to This Policy</h2>
        <p style={styles.p}>
          We may update this Privacy Policy from time to time. Material changes
          will be communicated by email at least 14 days before they take
          effect. The &quot;last updated&quot; date at the top of this page
          reflects the most recent revision.
        </p>

        {/* 12 */}
        <h2 style={styles.h2}>12. Contact</h2>
        <p style={styles.p}>
          For any privacy-related enquiries or to exercise your rights, contact
          us at:{" "}
          <a href="mailto:hello@gradd.ie" style={styles.link}>
            hello@gradd.ie
          </a>
        </p>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Gradd · gradd.ie ·{" "}
            <a href="/terms" style={styles.link}>
              Terms of Service
            </a>{" "}
            ·{" "}
            <a href="/cookies" style={styles.link}>
              Cookie Policy
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

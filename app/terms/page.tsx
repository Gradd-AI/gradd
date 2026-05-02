// app/terms/page.tsx
// Gradd — Terms of Service
// Deploy to: /terms

import React from "react";

export const metadata = {
  title: "Terms of Service | Gradd",
  description: "Gradd Terms of Service — Irish law governs.",
};

export default function TermsPage() {
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
        <p style={styles.headerTitle}>Terms of Service</p>
        <p style={styles.lastUpdated}>Last updated: 01 May 2026</p>
      </header>

      {/* Body */}
      <main style={styles.main}>
        <h1 style={styles.h1}>Terms of Service</h1>

        <p style={styles.intro}>
          Please read these terms carefully before using Gradd. By creating an
          account or subscribing, you agree to be bound by these terms. If you
          are under 18, a parent or guardian must also agree on your behalf.
        </p>

        {/* 1 */}
        <h2 style={styles.h2}>1. Who We Are</h2>
        <p style={styles.p}>
          Gradd is an AI-powered study platform designed to help students
          prepare for the Irish Leaving Certificate examinations. Gradd is
          operated as a sole trader business registered in Ireland
          (&quot;Gradd&quot;, &quot;we&quot;, &quot;us&quot;, or
          &quot;our&quot;).
        </p>
        <p style={styles.p}>
          Enquiries may be directed to:{" "}
          <a href="mailto:hello@gradd.ie" style={styles.link}>
            hello@gradd.ie
          </a>
        </p>

        {/* 2 */}
        <h2 style={styles.h2}>2. Nature of the Service — Study Aid, Not a School</h2>
        <div style={styles.notice}>
          <p style={styles.noticeText}>
            Gradd is a study aid. We are not a school, a registered educational
            institution, or a grinds service. We do not provide accredited
            tuition, and our platform does not replace your school, teacher, or
            official State Examinations Commission guidance.
          </p>
        </div>
        <p style={styles.p}>
          The Gradd platform provides AI-generated responses to Leaving
          Certificate study questions. These responses are intended to
          supplement your studies, not to replace qualified teacher instruction.
          You should verify important information with your school or official
          SEC resources.
        </p>

        {/* 3 */}
        <h2 style={styles.h2}>3. No Guarantee of Exam Results</h2>
        <p style={styles.p}>
          We do not guarantee any particular exam outcome, grade, points score,
          or academic result from using Gradd. Study outcomes depend on many
          factors outside our control, including individual effort, aptitude,
          and exam conditions set by the State Examinations Commission.
        </p>
        <p style={styles.p}>
          Any testimonials or examples of student progress shared by Gradd are
          illustrative and not a representation of typical or guaranteed results.
        </p>

        {/* 4 */}
        <h2 style={styles.h2}>4. AI Accuracy Disclaimer</h2>
        <div style={styles.notice}>
          <p style={styles.noticeText}>
            Gradd uses artificial intelligence (powered by Anthropic's Claude
            API) to generate responses. AI can make mistakes. Content generated
            by Gradd's tutor may occasionally be incomplete, outdated, or
            inaccurate. Always cross-reference AI responses with your textbook,
            your teacher, and official SEC marking schemes.
          </p>
        </div>
        <p style={styles.p}>
          We are not liable for any loss, academic or otherwise, arising from
          reliance on AI-generated content provided through Gradd.
        </p>

        {/* 5 */}
        <h2 style={styles.h2}>5. Eligibility and Age Requirements</h2>
        <p style={styles.p}>
          To use Gradd, you must be:
        </p>
        <ul style={styles.ul}>
          <li style={styles.li}>
            Aged 16 or over; or
          </li>
          <li style={styles.li}>
            Under 16, with a parent or legal guardian who has reviewed and
            agreed to these Terms on your behalf and who has set up and manages
            the account.
          </li>
        </ul>
        <p style={styles.p}>
          By creating an account, you confirm that you meet the above eligibility
          criteria. If we become aware that a user under 16 has created an
          account without parental consent, we will suspend that account and
          delete associated personal data.
        </p>

        {/* 6 */}
        <h2 style={styles.h2}>6. Account Registration</h2>
        <p style={styles.p}>
          You must provide accurate and complete information when registering.
          You are responsible for maintaining the confidentiality of your login
          credentials and for all activity that occurs under your account. Notify
          us immediately at{" "}
          <a href="mailto:hello@gradd.ie" style={styles.link}>
            hello@gradd.ie
          </a>{" "}
          if you suspect unauthorised access to your account.
        </p>

        {/* 7 */}
        <h2 style={styles.h2}>7. Subscriptions and Payment</h2>
        <p style={styles.p}>
          Access to Gradd's full feature set requires a paid subscription.
          Subscriptions are billed on a recurring basis (monthly or annually, as
          selected at checkout) through Stripe. By subscribing, you authorise us
          to charge your payment method on a recurring basis until you cancel.
        </p>
        <p style={styles.p}>
          All prices are displayed in Euro (€) and are inclusive of VAT where
          applicable under Irish law. Gradd reserves the right to change
          subscription pricing. We will give you at least 30 days&apos; notice
          of any price increase before it applies to your subscription.
        </p>

        {/* 8 */}
        <h2 style={styles.h2}>8. Cancellation and Refunds</h2>
        <p style={styles.p}>
          You may cancel your subscription at any time through your account
          settings (Manage Subscription). Cancellation takes effect at the end
          of your current billing period. You will retain access to Gradd until
          that date.
        </p>
        <p style={styles.p}>
          Under the European Union (Consumer Information, Cancellation and Other
          Rights) Regulations 2013, you have the right to cancel a digital
          services contract within 14 days of purchase without giving a reason
          (&quot;cooling-off period&quot;). If you begin using the service during
          this period, you acknowledge that you are waiving your right to a full
          refund for the portion of the service already used. To exercise your
          right of withdrawal, contact us at{" "}
          <a href="mailto:hello@gradd.ie" style={styles.link}>
            hello@gradd.ie
          </a>
          .
        </p>
        <p style={styles.p}>
          Outside the 14-day cooling-off period, subscription fees are
          non-refundable except where required by Irish consumer law.
        </p>

        {/* 9 */}
        <h2 style={styles.h2}>9. Acceptable Use</h2>
        <p style={styles.p}>
          You agree not to:
        </p>
        <ul style={styles.ul}>
          <li style={styles.li}>
            Share your account credentials with others or allow others to use
            your account;
          </li>
          <li style={styles.li}>
            Attempt to extract, scrape, or reproduce Gradd&apos;s content,
            system prompts, or curriculum materials at scale;
          </li>
          <li style={styles.li}>
            Use the platform to submit or generate plagiarised work for academic
            submission — doing so may breach your school&apos;s academic
            integrity policy;
          </li>
          <li style={styles.li}>
            Use the platform in any unlawful way, or in a way that harms or
            could harm Gradd or other users.
          </li>
        </ul>

        {/* 10 */}
        <h2 style={styles.h2}>10. Intellectual Property</h2>
        <p style={styles.p}>
          All content on the Gradd platform — including curriculum materials,
          system prompts, branding, and software — is owned by or licensed to
          Gradd. You may use the platform for personal, non-commercial study
          purposes only. You may not reproduce, distribute, or commercialise any
          part of the platform without our written permission.
        </p>

        {/* 11 */}
        <h2 style={styles.h2}>11. Availability and Changes</h2>
        <p style={styles.p}>
          We aim to keep Gradd available at all times but cannot guarantee
          uninterrupted access. We may carry out maintenance, updates, or
          changes to the platform with or without notice. We reserve the right
          to modify or discontinue any feature of the platform at any time.
        </p>

        {/* 12 */}
        <h2 style={styles.h2}>12. Limitation of Liability</h2>
        <p style={styles.p}>
          To the fullest extent permitted by Irish law, Gradd&apos;s total
          liability to you for any claim arising from your use of the platform
          shall not exceed the total subscription fees you have paid to us in the
          12 months preceding the claim.
        </p>
        <p style={styles.p}>
          We are not liable for any indirect, consequential, or special loss,
          including but not limited to loss of academic opportunity, loss of
          income, or reputational harm.
        </p>
        <p style={styles.p}>
          Nothing in these Terms limits or excludes our liability for death or
          personal injury caused by our negligence, fraud, or any other liability
          that cannot be excluded under Irish law.
        </p>

        {/* 13 */}
        <h2 style={styles.h2}>13. Changes to These Terms</h2>
        <p style={styles.p}>
          We may update these Terms from time to time. If we make material
          changes, we will notify you by email at least 14 days before the
          changes take effect. Continued use of Gradd after that date constitutes
          acceptance of the updated Terms.
        </p>

        {/* 14 */}
        <h2 style={styles.h2}>14. Governing Law and Jurisdiction</h2>
        <p style={styles.p}>
          These Terms are governed by the laws of Ireland. Any disputes arising
          under or in connection with these Terms shall be subject to the
          exclusive jurisdiction of the courts of Ireland.
        </p>
        <p style={styles.p}>
          If you are a consumer based in another EU member state, you may also
          have rights under the law of your country of residence that cannot be
          waived by agreement.
        </p>

        {/* 15 */}
        <h2 style={styles.h2}>15. Contact</h2>
        <p style={styles.p}>
          For any questions about these Terms, contact us at:{" "}
          <a href="mailto:hello@gradd.ie" style={styles.link}>
            hello@gradd.ie
          </a>
        </p>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Gradd · gradd.ie ·{" "}
            <a href="/privacy" style={styles.link}>
              Privacy Policy
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

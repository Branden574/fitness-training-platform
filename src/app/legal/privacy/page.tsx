import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy · Martinez/Fitness',
  description:
    'How Martinez/Fitness collects, uses, and protects personal information, including California (CCPA/CPRA) rights.',
};

const EFFECTIVE_DATE = 'April 21, 2026';
const CONTACT_EMAIL = 'martinezfitness559@gmail.com';

export default function PrivacyPolicyPage() {
  return (
    <main
      data-mf
      className="mf-bg mf-fg"
      style={{ minHeight: '100vh', padding: '48px 20px 80px' }}
    >
      <article
        style={{
          maxWidth: 760,
          margin: '0 auto',
          fontSize: 14,
          lineHeight: 1.65,
        }}
      >
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
          LEGAL · PRIVACY POLICY
        </div>
        <h1
          className="mf-font-display"
          style={{
            fontSize: 40,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          Privacy Policy
        </h1>
        <p className="mf-fg-dim" style={{ marginTop: 12, fontSize: 13 }}>
          Effective {EFFECTIVE_DATE}. This policy explains what personal
          information Martinez/Fitness collects, how we use it, who we share it
          with, and the rights you have over it — with specific disclosures for
          California residents.
        </p>

        <Section title="1. Who we are">
          <p>
            Martinez/Fitness (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;)
            operates an online platform that connects independent fitness
            trainers with clients. We run the platform at{' '}
            <span className="mf-font-mono">martinezfitness559.com</span>. The
            platform is based in California.
          </p>
          <p>
            For privacy questions or to exercise your rights under this policy,
            contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="mf-link">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="2. Information we collect">
          <p>
            We collect only what the platform needs to operate. Categories below
            track the definitions used by the California Consumer Privacy Act
            (CCPA), as amended by the California Privacy Rights Act (CPRA).
          </p>
          <ul>
            <li>
              <strong>Identifiers.</strong> Name, email address, and a hashed
              password for your account. Trainers additionally provide a public
              display name and profile slug.
            </li>
            <li>
              <strong>Commercial information.</strong> Records of transactions
              processed through the platform (subscription status, application
              submissions). Payment card numbers are handled directly by Stripe
              and are never stored on our servers.
            </li>
            <li>
              <strong>Internet / electronic activity.</strong> Minimal server
              logs: IP address, user-agent, and timestamps of requests to our
              API. Used for security, abuse prevention, and debugging. No
              third-party advertising trackers are embedded on the platform.
            </li>
            <li>
              <strong>Professional information (trainers only).</strong>{' '}
              Certifications, years of experience, rates, specialties, bio,
              location (city), profile photos, and testimonials you choose to
              publish.
            </li>
            <li>
              <strong>Sensitive personal information.</strong> Health- and
              fitness-related information you voluntarily log, including body
              weight, body-fat percentage, sleep, mood, energy, progress notes,
              and any progress photos you upload. Under CPRA this is a
              &quot;sensitive&quot; category; we use it only to provide the
              platform&apos;s tracking and coaching features to you and your
              chosen trainer. We do not use it to infer characteristics about
              you, do not sell it, and do not share it outside the limited
              service-provider relationships listed in Section 4.
            </li>
            <li>
              <strong>Communications.</strong> Messages you send to your
              trainer or to us, and application-form responses.
            </li>
          </ul>
          <p>
            We do not knowingly collect precise geolocation, biometric
            identifiers, government-issued ID numbers, financial-account
            numbers, or content from a consumer&apos;s mail/email/text messages
            where we are not the intended recipient.
          </p>
        </Section>

        <Section title="3. How we use it">
          <ul>
            <li>Create and maintain your account and authenticate you.</li>
            <li>
              Connect trainers and clients, process applications, deliver
              programs, and enable messaging between them.
            </li>
            <li>
              Process payments through Stripe and Stripe Connect (trainer
              payouts).
            </li>
            <li>Send transactional email (account, billing, safety).</li>
            <li>
              Detect, investigate, and prevent fraud, abuse, or violations of
              our Terms.
            </li>
            <li>Comply with legal obligations and enforce our agreements.</li>
          </ul>
          <p>
            We do not use your personal information for cross-context behavioral
            advertising, and we do not sell personal information.
          </p>
        </Section>

        <Section title="4. Service providers we share with">
          <p>
            We use the following third-party service providers (subprocessors)
            to operate the platform. Each is bound by contract to use personal
            information only to perform services for us.
          </p>
          <ul>
            <li>
              <strong>Stripe, Inc.</strong> — payment processing, Stripe
              Connect for trainer payouts. Stripe is the controller of card
              data.
            </li>
            <li>
              <strong>Railway</strong> — application hosting and managed
              PostgreSQL database in U.S. regions.
            </li>
            <li>
              <strong>Resend</strong> — transactional email delivery.
            </li>
          </ul>
          <p>
            We also disclose information when required by law, legal process, or
            to protect the rights, property, or safety of our users or the
            public.
          </p>
        </Section>

        <Section title="5. Retention">
          <p>
            We keep personal information for as long as your account is active
            or as needed to provide the service. If you close your account, we
            delete or de-identify the personal information associated with it
            within 30 days, except records we must keep for tax, accounting,
            legal, or fraud-prevention purposes (typically up to 7 years for
            financial records).
          </p>
        </Section>

        <Section title="6. Security">
          <p>
            We store passwords as bcrypt hashes, transmit data over TLS, and
            keep production database access restricted to the platform itself
            and a small number of administrators. No system is perfectly secure;
            you are responsible for keeping your account password confidential.
          </p>
        </Section>

        <Section title="7. Your California privacy rights">
          <p>
            If you are a California resident, under the CCPA/CPRA you have the
            right to:
          </p>
          <ul>
            <li>
              <strong>Know</strong> what personal information we have collected
              about you, the sources, the purposes, and the categories of
              recipients.
            </li>
            <li>
              <strong>Delete</strong> personal information we have collected
              from you, subject to statutory exceptions.
            </li>
            <li>
              <strong>Correct</strong> inaccurate personal information we
              maintain about you.
            </li>
            <li>
              <strong>Limit the use of sensitive personal information</strong>{' '}
              to the purposes reasonably necessary to provide the service. We
              already limit use of sensitive PI to those purposes; you do not
              need to exercise this right for us to comply.
            </li>
            <li>
              <strong>Opt out of the sale or sharing</strong> of personal
              information. We do not sell personal information, and we do not
              share it for cross-context behavioral advertising, so this right
              is preserved by default.
            </li>
            <li>
              <strong>Non-discrimination</strong> — we will not deny service or
              charge different prices because you exercise a privacy right.
            </li>
          </ul>
          <p>
            <strong>How to exercise these rights.</strong> Email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="mf-link">
              {CONTACT_EMAIL}
            </a>{' '}
            from the email address on your account, or — if signed in — use the
            deletion tools in your account settings. We will verify your
            identity before responding. You may also designate an authorized
            agent in writing. We will respond within 45 days; extensions up to
            another 45 days are allowed under CCPA when reasonably necessary,
            and we will notify you.
          </p>
          <p>
            <strong>Shine the Light (Cal. Civ. Code § 1798.83).</strong> We do
            not disclose personal information to third parties for their own
            direct-marketing purposes.
          </p>
        </Section>

        <Section title="8. Minors">
          <p>
            The platform is intended for users 18 and older. We do not knowingly
            collect personal information from anyone under 13. If we learn that
            we have collected personal information from a minor under 16 without
            the consent required by CCPA, we will delete it.
          </p>
        </Section>

        <Section title="9. Cookies and tracking">
          <p>
            We use strictly necessary cookies to keep you signed in (NextAuth
            session cookies) and a small number of first-party cookies used by
            our hosting provider for routing and security. We do not load
            third-party analytics, advertising, or social-media tracking
            scripts. Because we do not sell or share personal information, we
            treat Global Privacy Control (GPC) signals as an opt-out preference
            that is already satisfied by default.
          </p>
        </Section>

        <Section title="10. Changes to this policy">
          <p>
            We may update this policy to reflect changes in the service or the
            law. The effective date at the top will show when it was last
            updated; material changes will also be announced through the
            platform or by email.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            Privacy requests, complaints, or questions:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="mf-link">
              {CONTACT_EMAIL}
            </a>
            . For content takedown requests, see{' '}
            <Link href="/legal/takedown" className="mf-link">
              /legal/takedown
            </Link>
            . The Terms of Service are at{' '}
            <Link href="/legal/terms" className="mf-link">
              /legal/terms
            </Link>
            .
          </p>
        </Section>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 32 }}>
      <h2
        className="mf-font-display"
        style={{
          fontSize: 20,
          letterSpacing: '-0.01em',
          margin: '0 0 8px 0',
          lineHeight: 1.2,
        }}
      >
        {title}
      </h2>
      <div className="mf-fg-dim">{children}</div>
    </section>
  );
}

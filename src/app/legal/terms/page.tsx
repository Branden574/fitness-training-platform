import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service · Martinez/Fitness',
  description:
    'Terms governing use of the Martinez/Fitness platform, including trainer and client responsibilities, payments, and California governing law.',
};

const EFFECTIVE_DATE = 'April 21, 2026';
const CONTACT_EMAIL = 'martinezfitness559@gmail.com';

export default function TermsOfServicePage() {
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
          LEGAL · TERMS OF SERVICE
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
          Terms of Service
        </h1>
        <p className="mf-fg-dim" style={{ marginTop: 12, fontSize: 13 }}>
          Effective {EFFECTIVE_DATE}. By creating an account or using the
          platform, you agree to these Terms. If you don&apos;t agree, don&apos;t
          use the service.
        </p>

        <Section title="1. The service">
          <p>
            Martinez/Fitness is an online platform that connects independent
            fitness trainers (&quot;Trainers&quot;) with prospective and current
            clients (&quot;Clients&quot;). We provide software, hosting,
            messaging, a program builder, progress tracking, and payment
            infrastructure. We are not a fitness trainer, medical provider, or
            employer of any Trainer on the platform. All coaching, programs,
            and nutrition guidance come from the Trainer, not from us.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>
            You must be at least 18 years old to create an account. You must
            provide accurate, current, complete information and keep it
            updated. You are responsible for activity under your account and
            for keeping your password confidential.
          </p>
        </Section>

        <Section title="3. Trainer obligations">
          <ul>
            <li>
              You are an independent contractor — not our employee, partner, or
              agent. You control how you coach your clients and are solely
              responsible for your services.
            </li>
            <li>
              You are responsible for holding any licenses, certifications, or
              insurance your jurisdiction requires.
            </li>
            <li>
              All claims on your profile — including credentials, experience,
              testimonials, and transformation photos — must be accurate, your
              own to post, and truthful. You represent that you have the rights
              and consents to post any third-party content (e.g., client
              photos).
            </li>
            <li>
              You are responsible for your own tax reporting and compliance on
              income earned through the platform.
            </li>
            <li>
              You will comply with the separate Trainer Agreement presented in
              your account, which governs payout terms and listing conduct.
            </li>
          </ul>
        </Section>

        <Section title="4. Client obligations">
          <ul>
            <li>
              Provide honest information in applications and intake forms so
              your Trainer can work safely with you.
            </li>
            <li>
              Consult a physician before starting any new exercise or nutrition
              program, particularly if you have a medical condition, injury, or
              are pregnant.
            </li>
            <li>
              Pay agreed fees when due. If you dispute a charge, contact your
              Trainer first and us second.
            </li>
          </ul>
        </Section>

        <Section title="5. Payments">
          <p>
            Payments are processed by Stripe and, where applicable, paid out to
            Trainers through Stripe Connect. By using the platform you also
            agree to the{' '}
            <a
              href="https://stripe.com/legal/connect-account"
              target="_blank"
              rel="noopener noreferrer"
              className="mf-link"
            >
              Stripe Connected Account Agreement
            </a>
            .
          </p>
          <p>
            Trainers set their own prices. A platform fee may be deducted from
            each transaction; the current rate is disclosed in the Trainer
            Agreement. Taxes are the responsibility of the Trainer and/or
            Client, as applicable.
          </p>
          <p>
            <strong>Refunds.</strong> Refund eligibility is set between Trainer
            and Client as part of their engagement. We will reverse a payment
            in cases of proven fraud, chargeback decisions, or where required
            by law.
          </p>
        </Section>

        <Section title="6. Your content and license to us">
          <p>
            You keep ownership of the content you upload (photos, text,
            testimonials, messages, progress entries). You grant us a worldwide,
            non-exclusive, royalty-free license to host, store, transmit, and
            display that content solely for the purpose of operating the
            platform for you and your connected counterparty (Trainer or
            Client). We do not use your content for advertising and do not
            license it to third parties.
          </p>
          <p>
            If you remove content or delete your account, the license ends for
            future uses, subject to reasonable operational windows (backup
            cycles and legal-hold obligations described in the Privacy Policy).
          </p>
        </Section>

        <Section title="7. Prohibited conduct">
          <ul>
            <li>No illegal, fraudulent, or deceptive activity.</li>
            <li>
              No false medical, therapeutic, or diagnostic claims; no claims
              that exercise or nutrition programs treat or cure disease.
            </li>
            <li>
              No content that harasses, threatens, sexualizes minors, or depicts
              another person without their consent.
            </li>
            <li>
              No scraping, reverse engineering, or circumventing platform
              security.
            </li>
            <li>
              No uploading malware, sending spam, or attempting to compromise
              other accounts.
            </li>
          </ul>
          <p>
            We may remove content and suspend or terminate accounts that
            violate these rules. Report issues to{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="mf-link">
              {CONTACT_EMAIL}
            </a>{' '}
            or via{' '}
            <Link href="/legal/takedown" className="mf-link">
              /legal/takedown
            </Link>
            .
          </p>
        </Section>

        <Section title="8. Health and medical disclaimer">
          <p>
            The platform is not a substitute for professional medical advice,
            diagnosis, or treatment. Always seek the advice of your physician
            or other qualified health provider with any questions you may have
            regarding a medical condition. Never disregard professional medical
            advice or delay seeking it because of something you read or received
            on the platform.
          </p>
        </Section>

        <Section title="9. Our intellectual property">
          <p>
            The platform software, design, branding, and trademarks belong to
            Martinez/Fitness. Except for the content you upload, nothing in
            these Terms transfers any of our intellectual property to you.
          </p>
        </Section>

        <Section title="10. Termination">
          <p>
            You can close your account any time from account settings. We can
            suspend or terminate your account if you materially breach these
            Terms, if your activity creates risk to us or other users, or as
            required by law. On termination, Sections 6, 9, 11, 12, 13, 14, and
            15 survive.
          </p>
        </Section>

        <Section title="11. Disclaimers">
          <p>
            The platform is provided &quot;as is&quot; and &quot;as
            available.&quot; To the maximum extent permitted by law, we
            disclaim all warranties, express or implied, including
            merchantability, fitness for a particular purpose, and
            non-infringement. We do not warrant that the service will be
            uninterrupted, error-free, or will achieve any particular fitness
            outcome.
          </p>
        </Section>

        <Section title="12. Limitation of liability">
          <p>
            To the maximum extent permitted by law, Martinez/Fitness and its
            officers, employees, and contractors will not be liable for any
            indirect, incidental, consequential, special, exemplary, or
            punitive damages, or for lost profits, revenue, goodwill, or data,
            arising out of or related to your use of the platform.
          </p>
          <p>
            Our aggregate liability to you for all claims relating to the
            platform is limited to the greater of (a) the amount you paid us in
            the 12 months before the event giving rise to the claim, or (b)
            USD $100.
          </p>
          <p>
            Nothing in these Terms limits liability that cannot be limited
            under applicable law, including liability for gross negligence,
            fraud, or willful misconduct.
          </p>
        </Section>

        <Section title="13. Indemnification">
          <p>
            You agree to defend, indemnify, and hold us harmless from claims
            and expenses (including reasonable attorneys&apos; fees) arising
            out of your content, your breach of these Terms, your violation of
            law, or your acts as a Trainer or Client on the platform.
          </p>
        </Section>

        <Section title="14. Governing law and venue">
          <p>
            These Terms are governed by the laws of the State of California,
            without regard to its conflict-of-laws rules. Any claim not subject
            to dispute resolution under Section 15 must be brought in the state
            or federal courts located in Fresno County, California, and you and
            we consent to personal jurisdiction there.
          </p>
        </Section>

        <Section title="15. Dispute resolution">
          <p>
            <strong>Informal resolution first.</strong> Before filing any
            formal proceeding, you agree to contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="mf-link">
              {CONTACT_EMAIL}
            </a>{' '}
            and try to resolve the dispute informally for at least 30 days.
          </p>
          <p>
            <strong>Small claims.</strong> Either party may bring an individual
            action in small-claims court for disputes within that court&apos;s
            jurisdiction.
          </p>
          <p>
            <strong>No class actions.</strong> To the extent permitted by law,
            you and we agree that any dispute will be resolved only on an
            individual basis, not as a class, collective, or representative
            action.
          </p>
          <p>
            Nothing in this section prevents you from exercising any
            non-waivable right under California or federal law.
          </p>
        </Section>

        <Section title="16. Changes to these Terms">
          <p>
            We may update these Terms. If we make material changes, we will
            notify you through the platform or by email before they take
            effect. Continued use after the effective date of an update means
            you accept the updated Terms.
          </p>
        </Section>

        <Section title="17. Contact">
          <p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="mf-link">
              {CONTACT_EMAIL}
            </a>{' '}
            · Privacy:{' '}
            <Link href="/legal/privacy" className="mf-link">
              /legal/privacy
            </Link>{' '}
            · Takedowns:{' '}
            <Link href="/legal/takedown" className="mf-link">
              /legal/takedown
            </Link>
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

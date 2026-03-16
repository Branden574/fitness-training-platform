import { Phone, Mail, MapPin, Clock, Instagram, MessageCircle } from 'lucide-react';
import ContactForm from '@/components/ContactForm';
import Link from 'next/link';

const faqs = [
  {
    q: "Do I need experience to start training?",
    a: "Not at all. I work with clients of all fitness levels, from complete beginners to advanced athletes. Every program is customized to your current abilities and goals."
  },
  {
    q: "What should I bring to my first session?",
    a: "Comfortable workout clothes, athletic shoes, a water bottle, and a positive attitude. All equipment is provided at the studio."
  },
  {
    q: "How quickly will I see results?",
    a: "Most clients start feeling stronger and more energetic within 2-3 weeks. Visible changes typically appear around 4-6 weeks with consistent training and nutrition."
  },
  {
    q: "Do you offer nutrition guidance?",
    a: "Yes. Nutrition is a crucial part of achieving your goals. I provide meal planning, macro guidance, and ongoing nutrition support with all programs."
  },
  {
    q: "Can I train if I have injuries?",
    a: "I'm certified in corrective exercise and can work around most injuries. We'll assess your limitations and create a safe, effective program that supports your recovery."
  },
  {
    q: "What makes your approach different?",
    a: "I focus on sustainable, science-based methods tailored to your lifestyle. It's not about quick fixes — it's about creating lasting habits and genuine transformation."
  },
];

export default function ContactPage() {
  return (
    <main>
      {/* Hero */}
      <section className="pt-28 pb-16 bg-surface-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-brand-600 font-semibold text-sm tracking-wide uppercase mb-3">Contact</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-surface-900 leading-tight mb-6">
              Let&apos;s get started.
            </h1>
            <p className="text-lg text-surface-500 leading-relaxed">
              Ready to start training? Have questions? Fill out the form below or reach out directly.
              I&apos;ll get back to you within 24 hours.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info + Form */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left: Contact info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-surface-900 mb-2">Reach out directly</h2>
                <p className="text-surface-500">
                  Whether you&apos;re ready to start or just have questions, I&apos;m here to help.
                </p>
              </div>

              <div className="space-y-5">
                <ContactItem
                  icon={<Phone className="w-5 h-5" />}
                  label="Phone"
                  value="(559) 365-2946"
                  detail="Best for urgent questions or scheduling"
                />
                <ContactItem
                  icon={<Mail className="w-5 h-5" />}
                  label="Email"
                  value="martinezfitness559@gmail.com"
                  detail="Program inquiries or general information"
                />
                <ContactItem
                  icon={<MapPin className="w-5 h-5" />}
                  label="Studio"
                  value="Synergy Personal Training"
                  detail="4774 N Blackstone Ave, Fresno, CA 93726"
                />
                <ContactItem
                  icon={<Clock className="w-5 h-5" />}
                  label="Hours"
                  value="Monday - Friday: 5:00 AM - 8:00 PM"
                  detail="Saturday & Sunday: Closed"
                />
              </div>

              {/* Social */}
              <div>
                <p className="text-sm font-medium text-surface-700 mb-3">Follow along</p>
                <div className="flex gap-3">
                  <a
                    href="https://www.instagram.com/brentjmartinez/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-surface-600 bg-surface-100 px-4 py-2 rounded-full hover:bg-surface-200 transition-colors"
                  >
                    <Instagram className="w-4 h-4" /> Instagram
                  </a>
                  <a
                    href="https://wa.me/15593652946"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-surface-600 bg-surface-100 px-4 py-2 rounded-full hover:bg-surface-200 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* Right: Form */}
            <ContactForm />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-surface-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-surface-900 mb-2">Frequently Asked Questions</h2>
            <p className="text-surface-500">Quick answers to common questions</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white border border-surface-200 rounded-card p-5">
                <h3 className="font-semibold text-surface-900 mb-2">{faq.q}</h3>
                <p className="text-sm text-surface-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-surface-900">
        <div className="max-w-3xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white mb-4">Your fitness journey starts here.</h2>
          <p className="text-surface-400 mb-6">Take the first step — schedule your free consultation today.</p>
          <a
            href="#top"
            className="inline-flex items-center justify-center bg-brand-600 text-white font-semibold px-6 py-3 rounded-btn hover:bg-brand-700 transition-colors"
          >
            Fill Out the Form Above
          </a>
        </div>
      </section>
    </main>
  );
}

function ContactItem({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm text-surface-500">{label}</p>
        <p className="font-medium text-surface-900">{value}</p>
        <p className="text-sm text-surface-500">{detail}</p>
      </div>
    </div>
  );
}

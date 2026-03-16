import Link from "next/link";
import Image from "next/image";
import ContactForm from "@/components/ContactForm";
import { Phone, Mail, MapPin, ArrowRight, CheckCircle2, Star, Users, Award, ChevronRight } from "lucide-react";

const stats = [
  { value: "150+", label: "Clients Trained" },
  { value: "10+", label: "Years Experience" },
  { value: "NASM", label: "Certified Trainer" },
  { value: "4.9", label: "Client Rating" },
];

const services = [
  {
    title: "1-on-1 Personal Training",
    description: "In-person sessions with hands-on coaching, form correction, and personalized programming at our Fresno studio.",
    price: "From $75/session",
  },
  {
    title: "Semi-Private Training",
    description: "Train with 2-4 people in a small group environment. All the benefits of personal training at a reduced cost.",
    price: "From $45/session",
  },
  {
    title: "Online Coaching",
    description: "Custom workout plans, nutrition guidance, weekly check-ins, and full app access from anywhere.",
    price: "From $150/month",
  },
];

const results = [
  { name: "Real client transformation", image: "/images/client-1.jpg" },
  { name: "Client progress", image: "/images/client-2.jpg" },
  { name: "Training results", image: "/images/client-3.jpg" },
  { name: "Client success", image: "/images/client-5.jpg" },
];

const testimonials = [
  {
    quote: "Brent helped me lose 35 pounds in 5 months. His approach is no-nonsense but incredibly supportive. Best investment I've made in myself.",
    name: "Marcus R.",
    detail: "Lost 35 lbs in 5 months",
  },
  {
    quote: "After years of inconsistent training, Brent gave me the structure and accountability I needed. I'm stronger at 45 than I was at 25.",
    name: "David K.",
    detail: "Training for 2+ years",
  },
  {
    quote: "The nutrition coaching alone was worth it. Brent doesn't do cookie-cutter plans — everything is built around your life and your goals.",
    name: "Sarah M.",
    detail: "Online coaching client",
  },
];

export default function Home() {
  return (
    <main>
      {/* ── HERO ── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-surface-950">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/images/hero-slide-1.jpg"
            alt="Brent Martinez Fitness Training"
            fill
            className="object-cover opacity-40"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface-950/90 via-surface-950/70 to-surface-950/40" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 w-full">
          <div className="max-w-2xl">
            <p className="text-brand-400 font-semibold text-sm tracking-wide uppercase mb-4">
              Certified Personal Trainer &bull; Fresno, CA
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-6">
              Build the body<br />
              <span className="text-brand-400">you&apos;ve been working toward.</span>
            </h1>
            <p className="text-lg text-surface-300 leading-relaxed mb-8 max-w-lg">
              Personalized training programs, expert nutrition coaching, and real accountability
              with certified trainer Brent Martinez. In-person in Fresno or online anywhere.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white font-semibold px-6 py-3.5 rounded-btn hover:bg-brand-700 transition-colors"
              >
                Start Free Consultation
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/programs"
                className="inline-flex items-center justify-center gap-2 border border-white/20 text-white font-medium px-6 py-3.5 rounded-btn hover:bg-white/10 transition-colors"
              >
                View Programs
              </Link>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-surface-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES OVERVIEW ── */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <p className="text-brand-600 font-semibold text-sm tracking-wide uppercase mb-2">What I Offer</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 mb-4">
              Training that fits your life.
            </h2>
            <p className="text-lg text-surface-500">
              Whether you train in-person at our Fresno studio or remotely, every program is
              built around your goals, your schedule, and your body.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {services.map((svc) => (
              <div
                key={svc.title}
                className="group border border-surface-200 rounded-card p-6 hover:border-brand-200 hover:shadow-elevated transition-all duration-200"
              >
                <h3 className="text-lg font-semibold text-surface-900 mb-2">{svc.title}</h3>
                <p className="text-sm text-surface-500 leading-relaxed mb-5">{svc.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-brand-600">{svc.price}</span>
                  <Link
                    href="/programs"
                    className="text-sm font-medium text-surface-400 group-hover:text-brand-600 inline-flex items-center gap-1 transition-colors"
                  >
                    Learn more <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT / CREDIBILITY ── */}
      <section className="py-20 lg:py-28 bg-surface-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="relative aspect-[4/5] rounded-card overflow-hidden">
              <Image
                src="/images/brent-martinez.jpg"
                alt="Brent Martinez - NASM Certified Personal Trainer"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-brand-600 font-semibold text-sm tracking-wide uppercase mb-2">Your Trainer</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 mb-6">
                Brent Martinez
              </h2>
              <p className="text-surface-600 leading-relaxed mb-4">
                I know what it takes to transform your body because I&apos;ve done it myself — and now I help
                others do the same. With over 10 years of coaching experience and hundreds of clients served,
                I&apos;ll give you the tools and accountability to finally reach your goals.
              </p>
              <p className="text-surface-600 leading-relaxed mb-8">
                Every program I build is based on real science, real experience, and a genuine understanding
                of what it takes to stay consistent. No cookie-cutter plans. No generic advice.
                Just proven methods that get results.
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                {["NASM Certified", "10+ Years Coaching", "Nutrition Specialist", "Strength & Conditioning"].map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-surface-700 bg-white border border-surface-200 px-3 py-1.5 rounded-full"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
                    {tag}
                  </span>
                ))}
              </div>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 text-brand-600 font-semibold hover:text-brand-700 transition-colors"
              >
                Read my full story <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── RESULTS / GALLERY ── */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-brand-600 font-semibold text-sm tracking-wide uppercase mb-2">Results</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 mb-4">
              Real clients. Real progress.
            </h2>
            <p className="text-lg text-surface-500 max-w-2xl mx-auto">
              These results come from consistent training, proper nutrition, and a commitment to the process.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {results.map((r, i) => (
              <div key={i} className="relative aspect-[3/4] rounded-card overflow-hidden group">
                <Image src={r.image} alt={r.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 lg:py-28 bg-surface-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-brand-600 font-semibold text-sm tracking-wide uppercase mb-2">Testimonials</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-900">
              What clients are saying.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white border border-surface-200 rounded-card p-6">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-surface-700 leading-relaxed mb-5">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="font-semibold text-surface-900">{t.name}</p>
                  <p className="text-sm text-surface-500">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INVITATION CODE CTA ── */}
      <section className="py-16 bg-white border-y border-surface-200">
        <div className="max-w-3xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-surface-900 mb-3">
            Have an invitation code?
          </h2>
          <p className="text-surface-500 mb-6">
            If your trainer sent you a code, use it to create your account and access your personalized dashboard.
          </p>
          <Link
            href="/register-with-code"
            className="inline-flex items-center justify-center gap-2 bg-surface-900 text-white font-semibold px-6 py-3 rounded-btn hover:bg-surface-800 transition-colors"
          >
            Enter Invitation Code
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-sm text-surface-400 mt-4">
            Don&apos;t have a code? <Link href="/contact" className="text-brand-600 hover:text-brand-700 font-medium">Contact us</Link> to get started.
          </p>
        </div>
      </section>

      {/* ── CONTACT / LEAD CAPTURE ── */}
      <section id="contact" className="py-20 lg:py-28 bg-surface-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            <div>
              <p className="text-brand-600 font-semibold text-sm tracking-wide uppercase mb-2">Get Started</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 mb-6">
                Ready to start training?
              </h2>
              <p className="text-lg text-surface-500 leading-relaxed mb-8">
                Fill out the form and I&apos;ll get back to you within 24 hours to schedule your free consultation.
                No commitment required.
              </p>

              <div className="space-y-5 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Phone</p>
                    <p className="font-medium text-surface-900">(559) 365-2946</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Email</p>
                    <p className="font-medium text-surface-900">martinezfitness559@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Location</p>
                    <p className="font-medium text-surface-900">Synergy Personal Training</p>
                    <p className="text-sm text-surface-500">4774 N Blackstone Ave, Fresno, CA</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-surface-200 rounded-card p-5">
                <p className="font-semibold text-surface-900 mb-3">Your free consultation includes:</p>
                <ul className="space-y-2">
                  {[
                    "Fitness assessment & goal setting",
                    "Custom program recommendations",
                    "Nutrition guidance overview",
                    "No-obligation trial session",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-surface-600">
                      <CheckCircle2 className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <ContactForm />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-16 bg-surface-900">
        <div className="max-w-3xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Already a client?
          </h2>
          <p className="text-surface-400 mb-6">
            Log in to access your personalized dashboard, workouts, and progress tracking.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth/signin"
              className="inline-flex items-center justify-center bg-white text-surface-900 font-semibold px-6 py-3 rounded-btn hover:bg-surface-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register-with-code"
              className="inline-flex items-center justify-center border border-surface-600 text-surface-300 font-medium px-6 py-3 rounded-btn hover:bg-surface-800 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

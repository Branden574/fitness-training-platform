import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import HeroSection from "@/components/HeroSection";
import { Phone, Mail, MapPin, ArrowRight, CheckCircle2, Star, ChevronRight } from "lucide-react";
import Image from "next/image";

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
    <main className="bg-[#0f1219]">
      <HeroSection />

      {/* ── SERVICES ── */}
      <section className="py-20 lg:py-28 border-t border-[#2d3548]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <p className="text-[#6366f1] font-semibold text-sm tracking-wide uppercase mb-2">What I Offer</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Training that fits your life.
            </h2>
            <p className="text-lg text-[#9ca3af]">
              Whether you train in-person at our Fresno studio or remotely, every program is
              built around your goals, your schedule, and your body.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {services.map((svc) => (
              <div
                key={svc.title}
                className="group bg-[#1e2433] border border-[#2d3548] rounded-xl p-6 hover:border-[#6366f1]/40 hover:shadow-lg transition-all duration-200"
              >
                <h3 className="text-lg font-semibold text-white mb-2">{svc.title}</h3>
                <p className="text-sm text-[#9ca3af] leading-relaxed mb-5">{svc.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#818cf8]">{svc.price}</span>
                  <Link
                    href="/programs"
                    className="text-sm font-medium text-[#4b5563] group-hover:text-[#818cf8] inline-flex items-center gap-1 transition-colors"
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
      <section className="py-20 lg:py-28 border-t border-[#2d3548]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="relative aspect-[4/5] rounded-xl overflow-hidden">
              <Image
                src="/images/brent-martinez.jpg"
                alt="Brent Martinez - NASM Certified Personal Trainer"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-[#6366f1] font-semibold text-sm tracking-wide uppercase mb-2">Your Trainer</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Brent Martinez
              </h2>
              <p className="text-[#9ca3af] leading-relaxed mb-4">
                I know what it takes to transform your body because I&apos;ve done it myself — and now I help
                others do the same. With over 10 years of coaching experience and hundreds of clients served,
                I&apos;ll give you the tools and accountability to finally reach your goals.
              </p>
              <p className="text-[#9ca3af] leading-relaxed mb-8">
                Every program I build is based on real science, real experience, and a genuine understanding
                of what it takes to stay consistent. No cookie-cutter plans. No generic advice.
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                {["NASM Certified", "10+ Years Coaching", "Nutrition Specialist", "Strength & Conditioning"].map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#9ca3af] bg-[#1e2433] border border-[#2d3548] px-3 py-1.5 rounded-full"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#6366f1]" />
                    {tag}
                  </span>
                ))}
              </div>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 text-[#818cf8] font-semibold hover:text-[#6366f1] transition-colors"
              >
                Read my full story <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── RESULTS / GALLERY ── */}
      <section className="py-20 lg:py-28 border-t border-[#2d3548]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[#6366f1] font-semibold text-sm tracking-wide uppercase mb-2">Results</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Real clients. Real progress.
            </h2>
            <p className="text-lg text-[#9ca3af] max-w-2xl mx-auto">
              These results come from consistent training, proper nutrition, and a commitment to the process.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {results.map((r, i) => (
              <div key={i} className="relative aspect-[3/4] rounded-xl overflow-hidden group">
                <Image src={r.image} alt={r.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 lg:py-28 border-t border-[#2d3548]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[#6366f1] font-semibold text-sm tracking-wide uppercase mb-2">Testimonials</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              What clients are saying.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-[#1e2433] border border-[#2d3548] rounded-xl p-6">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-[#9ca3af] leading-relaxed mb-5">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="font-semibold text-white">{t.name}</p>
                  <p className="text-sm text-[#6b7280]">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INVITATION CODE ── */}
      <section className="py-16 border-t border-[#2d3548]">
        <div className="max-w-3xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white mb-3">
            Have an invitation code?
          </h2>
          <p className="text-[#9ca3af] mb-6">
            If your trainer sent you a code, use it to create your account and access your personalized dashboard.
          </p>
          <Link
            href="/register-with-code"
            className="inline-flex items-center justify-center gap-2 bg-[#6366f1] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#5558e3] transition-colors"
          >
            Enter Invitation Code <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-sm text-[#4b5563] mt-4">
            Don&apos;t have a code? <Link href="/contact" className="text-[#818cf8] hover:text-[#6366f1] font-medium">Contact us</Link> to get started.
          </p>
        </div>
      </section>

      {/* ── CONTACT / LEAD CAPTURE ── */}
      <section id="contact" className="py-20 lg:py-28 border-t border-[#2d3548]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            <div>
              <p className="text-[#6366f1] font-semibold text-sm tracking-wide uppercase mb-2">Get Started</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Ready to start training?
              </h2>
              <p className="text-lg text-[#9ca3af] leading-relaxed mb-8">
                Fill out the form and I&apos;ll get back to you within 24 hours to schedule your free consultation.
                No commitment required.
              </p>

              <div className="space-y-5 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#252d3d] flex items-center justify-center">
                    <Phone className="w-5 h-5 text-[#818cf8]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#6b7280]">Phone</p>
                    <p className="font-medium text-white">(559) 365-2946</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#252d3d] flex items-center justify-center">
                    <Mail className="w-5 h-5 text-[#818cf8]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#6b7280]">Email</p>
                    <p className="font-medium text-white">martinezfitness559@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#252d3d] flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-[#818cf8]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#6b7280]">Location</p>
                    <p className="font-medium text-white">Synergy Personal Training</p>
                    <p className="text-sm text-[#6b7280]">4774 N Blackstone Ave, Fresno, CA</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#1e2433] border border-[#2d3548] rounded-xl p-5">
                <p className="font-semibold text-white mb-3">Your free consultation includes:</p>
                <ul className="space-y-2">
                  {[
                    "Fitness assessment & goal setting",
                    "Custom program recommendations",
                    "Nutrition guidance overview",
                    "No-obligation trial session",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[#9ca3af]">
                      <CheckCircle2 className="w-4 h-4 text-[#6366f1] mt-0.5 shrink-0" />
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
      <section className="py-16 border-t border-[#2d3548] bg-[#1a1f2e]">
        <div className="max-w-3xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Already a client?
          </h2>
          <p className="text-[#9ca3af] mb-6">
            Log in to access your personalized dashboard, workouts, and progress tracking.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth/signin"
              className="inline-flex items-center justify-center bg-[#6366f1] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#5558e3] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register-with-code"
              className="inline-flex items-center justify-center border border-[#4b5563] text-[#9ca3af] font-medium px-6 py-3 rounded-lg hover:bg-white/5 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

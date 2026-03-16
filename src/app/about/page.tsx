import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Award, Target, Heart, Zap, Brain, Shield } from 'lucide-react';

const credentials = [
  { title: "NASM-CPT", subtitle: "Certified Personal Trainer", description: "Certified by the National Academy of Sports Medicine with advanced exercise science knowledge.", icon: Award },
  { title: "Corrective Exercise", subtitle: "Movement Specialist", description: "Specialized in injury prevention and proper movement mechanics for safe, effective training.", icon: Shield },
  { title: "Nutrition Coaching", subtitle: "Nutrition Specialist", description: "Evidence-based nutrition strategies designed to fuel progress without restrictive diets.", icon: Heart },
  { title: "Weight Loss", subtitle: "Transformation Specialist", description: "Fat loss, body composition changes, and sustainable approaches for long-term results.", icon: Target },
  { title: "Strength Training", subtitle: "Performance Coach", description: "Advanced programming for strength, muscle, and conditioning at all fitness levels.", icon: Zap },
  { title: "Behavioral Change", subtitle: "Lifestyle Coach", description: "Psychology-backed methods to build lasting habits and break through barriers.", icon: Brain },
];

export default function AboutPage() {
  return (
    <main>
      {/* Hero */}
      <section className="pt-28 pb-20 bg-surface-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <p className="text-brand-600 font-semibold text-sm tracking-wide uppercase mb-3">About</p>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-surface-900 leading-tight mb-6">
                Meet Brent Martinez
              </h1>
              <p className="text-lg text-surface-600 leading-relaxed mb-6">
                I know what it takes to transform your body because I&apos;ve done it myself — and now I help
                others do the same. With 10 years of coaching experience and hundreds of clients served,
                I&apos;ll give you the tools and accountability to finally reach your goals.
              </p>
              <div className="flex flex-wrap gap-3">
                {["NASM Certified", "Hundreds of Clients", "10+ Years Experience"].map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-surface-700 bg-white border border-surface-200 px-3 py-1.5 rounded-full"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative aspect-[4/5] rounded-card overflow-hidden">
              <Image
                src="/images/brent-martinez.jpg"
                alt="Brent Martinez - Certified Personal Trainer"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-surface-900 mb-12 text-center">My Fitness Journey</h2>

          <div className="space-y-16">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-surface-900 mb-3">The Beginning</h3>
                <p className="text-surface-600 leading-relaxed">
                  My passion for fitness started back in high school when I struggled with confidence and energy.
                  Training quickly became more than just a hobby — it was a way to push myself, build discipline,
                  and take control of my life. That early transformation inspired me to help others do the same.
                </p>
              </div>
              <div className="w-full md:w-72 aspect-[4/3] relative rounded-card overflow-hidden shrink-0">
                <Image src="/images/the beginning .jpg" alt="Brent's fitness journey" fill className="object-cover" />
              </div>
            </div>

            <div className="flex flex-col md:flex-row-reverse gap-8 items-center">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-surface-900 mb-3">Professional Development</h3>
                <p className="text-surface-600 leading-relaxed">
                  After earning my NASM certification, I&apos;ve spent the last 10 years coaching people at all
                  levels — from those just starting out to athletes chasing peak performance. My focus is on
                  building programs that deliver results while creating lasting habits clients can actually stick to.
                </p>
              </div>
              <div className="w-full md:w-72 aspect-[4/3] relative rounded-card overflow-hidden shrink-0">
                <Image src="/images/professional-development.jpg" alt="Professional development" fill className="object-cover" />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-surface-900 mb-3">My Mission</h3>
                <p className="text-surface-600 leading-relaxed">
                  Today, my mission is simple: to provide personalized, sustainable fitness solutions that fit
                  into real life. I believe that everyone deserves to feel confident, healthy, and strong.
                  Through this platform, I&apos;m able to reach more people and provide the same level of
                  personal attention and expertise that has helped hundreds of clients transform their lives.
                </p>
              </div>
              <div className="w-full md:w-72 aspect-[4/3] relative rounded-card overflow-hidden shrink-0">
                <Image src="/images/hero-slide-2.jpg" alt="Brent Martinez Fitness Studio" fill className="object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Credentials */}
      <section className="py-20 lg:py-28 bg-surface-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-brand-600 font-semibold text-sm tracking-wide uppercase mb-2">Expertise</p>
            <h2 className="text-3xl font-bold text-surface-900 mb-4">Credentials &amp; Specializations</h2>
            <p className="text-lg text-surface-500 max-w-2xl mx-auto">
              Continuous education and professional development ensure you receive the most effective,
              science-based training methods.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {credentials.map((cred) => (
              <div
                key={cred.title}
                className="bg-white border border-surface-200 rounded-card p-6 hover:border-brand-200 hover:shadow-elevated transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center mb-4">
                  <cred.icon className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="text-lg font-semibold text-surface-900 mb-1">{cred.title}</h3>
                <p className="text-sm font-medium text-brand-600 mb-3">{cred.subtitle}</p>
                <p className="text-sm text-surface-500 leading-relaxed">{cred.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-surface-900 mb-8">My Training Philosophy</h2>
          <div className="bg-surface-50 border border-surface-200 rounded-card p-8 md:p-12">
            <blockquote className="text-xl text-surface-700 italic leading-relaxed mb-4">
              &ldquo;Fitness is more than workouts — it&apos;s mindset, discipline, and consistency. I believe in
              celebrating small wins, building sustainable habits, and guiding you to become your strongest self.&rdquo;
            </blockquote>
            <p className="font-semibold text-surface-900">— Brent Martinez</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-surface-900">
        <div className="max-w-3xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-surface-400 mb-6">
            Let&apos;s work together to achieve your fitness goals with a personalized approach that fits your lifestyle.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white font-semibold px-6 py-3 rounded-btn hover:bg-brand-700 transition-colors"
            >
              Start Free Consultation <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/programs"
              className="inline-flex items-center justify-center border border-surface-600 text-surface-300 font-medium px-6 py-3 rounded-btn hover:bg-surface-800 transition-colors"
            >
              View Programs
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

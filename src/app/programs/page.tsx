import Link from 'next/link';
import { Check, ArrowRight, Clock, Users, Zap } from 'lucide-react';

interface Program {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  price: string;
  priceDetail?: string;
  duration: string;
  format: string;
  features: string[];
  popular?: boolean;
  bestValue?: boolean;
}

const programs: Program[] = [
  {
    id: 'personal-training',
    name: '1-on-1 Personal Training',
    subtitle: 'In-Person (Fresno Only)',
    description: 'Customized workouts with hands-on coaching, form correction, and maximum accountability.',
    price: '$75',
    priceDetail: 'per session',
    duration: '60 min sessions',
    format: '1 client',
    features: [
      'Customized workouts for your goals',
      'Hands-on coaching & form correction',
      'Flexible scheduling',
      'Maximum personal attention',
    ],
  },
  {
    id: 'semi-private',
    name: 'Semi-Private Training',
    subtitle: 'In-Person (2-4 clients)',
    description: 'Small group training with personal guidance. All the benefits at a reduced cost.',
    price: '$50',
    priceDetail: 'per session / person',
    duration: '60 min sessions',
    format: '2-4 clients',
    features: [
      'Small group for extra motivation',
      'Personal guidance in group setting',
      'Cost-effective training option',
      'Community-style environment',
    ],
  },
  {
    id: 'month-to-month',
    name: 'Month-to-Month',
    subtitle: 'Online Coaching',
    description: 'Flexible, no long-term contract. Perfect to try things out or if you need flexibility.',
    price: '$200',
    priceDetail: 'per month',
    duration: 'Monthly',
    format: 'Remote',
    features: [
      'Custom training & nutrition plan',
      '2x weekly accountability check-ins',
      'No long-term commitment',
      'Full app access',
    ],
  },
  {
    id: 'three-month',
    name: '3-Month Package',
    subtitle: 'Online Coaching',
    description: 'Save $100 vs month-to-month. Locked-in consistency and structure for real momentum.',
    price: '$167',
    priceDetail: 'per month ($500 total)',
    duration: '3 months',
    format: 'Remote',
    popular: true,
    features: [
      'Save $100 vs month-to-month',
      'Custom training & nutrition plan',
      '2x weekly accountability check-ins',
      'Full app access',
    ],
  },
  {
    id: 'six-month',
    name: '6-Month Package',
    subtitle: 'Online Coaching',
    description: 'Save $300 vs month-to-month. Serious commitment with monthly strategy calls to optimize your plan.',
    price: '$150',
    priceDetail: 'per month ($900 total)',
    duration: '6 months',
    format: 'Remote',
    bestValue: true,
    features: [
      'Save $300 vs month-to-month',
      'Custom training & nutrition plan',
      '2x weekly accountability check-ins',
      'Monthly strategy call',
      'Full app access',
    ],
  },
];

export default function ProgramsPage() {
  return (
    <main className="bg-[#0f1219]">
      {/* Hero */}
      <section className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[#6366f1] font-semibold text-sm tracking-wide uppercase mb-3">Programs &amp; Pricing</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-6">
              Find the right program for your goals.
            </h1>
            <p className="text-lg text-[#9ca3af] leading-relaxed">
              Every program is designed by Brent Martinez and tailored to your specific goals,
              schedule, and fitness level. Train in-person in Fresno or online from anywhere.
            </p>
          </div>
        </div>
      </section>

      {/* In-Person Section */}
      <section className="py-20 border-t border-[#2d3548]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#252d3d] flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#818cf8]" />
            </div>
            <h2 className="text-2xl font-bold text-white">In-Person Training</h2>
            <span className="text-sm text-[#6b7280] ml-auto">Fresno, CA</span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {programs.filter(p => p.id === 'personal-training' || p.id === 'semi-private').map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        </div>
      </section>

      {/* Online Section */}
      <section className="py-20 border-t border-[#2d3548]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#6366f1] flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Online Coaching</h2>
            <span className="text-sm text-[#6b7280] ml-auto">Train from anywhere</span>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {programs.filter(p => !['personal-training', 'semi-private'].includes(p.id)).map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-[#2d3548] bg-[#1a1f2e]">
        <div className="max-w-3xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Not sure which program is right for you?
          </h2>
          <p className="text-[#9ca3af] mb-6">
            Schedule a free consultation with Brent to discuss your goals and find the perfect fit.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 bg-[#6366f1] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#5558e3] transition-colors"
          >
            Schedule Free Consultation <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function ProgramCard({ program }: { program: Program }) {
  return (
    <div
      className={`relative bg-[#1e2433] border rounded-xl p-6 flex flex-col transition-all duration-200 ${
        program.popular
          ? 'border-[#6366f1] ring-1 ring-[#6366f1]/30'
          : program.bestValue
          ? 'border-emerald-500/50 ring-1 ring-emerald-500/20'
          : 'border-[#2d3548] hover:border-[#6366f1]/30'
      }`}
    >
      {(program.popular || program.bestValue) && (
        <div className="absolute -top-3 left-6">
          <span
            className={`inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full ${
              program.popular ? 'bg-[#6366f1] text-white' : 'bg-emerald-600 text-white'
            }`}
          >
            {program.popular ? 'Most Popular' : 'Best Value'}
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{program.name}</h3>
        <p className="text-sm text-[#6b7280]">{program.subtitle}</p>
      </div>

      <div className="mb-4">
        <span className="text-3xl font-bold text-white">{program.price}</span>
        {program.priceDetail && (
          <span className="text-sm text-[#6b7280] ml-1">/{program.priceDetail}</span>
        )}
      </div>

      <p className="text-sm text-[#9ca3af] leading-relaxed mb-5">{program.description}</p>

      <div className="flex gap-4 text-xs text-[#6b7280] mb-5 pb-5 border-b border-[#2d3548]">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {program.duration}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> {program.format}
        </span>
      </div>

      <ul className="space-y-2.5 mb-6 flex-1">
        {program.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-[#9ca3af]">
            <Check className="w-4 h-4 text-[#6366f1] mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <Link
        href="/contact"
        className={`inline-flex items-center justify-center gap-2 w-full font-semibold py-2.5 rounded-lg transition-colors text-sm ${
          program.popular
            ? 'bg-[#6366f1] text-white hover:bg-[#5558e3]'
            : 'bg-[#252d3d] text-[#9ca3af] hover:bg-[#2d3548] hover:text-white'
        }`}
      >
        Get Started <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

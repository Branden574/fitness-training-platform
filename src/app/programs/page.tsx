import ProgramsAnimations from '@/components/ProgramsAnimations';

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
  return <ProgramsAnimations programs={programs} />;
}

'use client';

import { motion } from 'framer-motion';
import { Check, Clock, Users, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import OptimizedImage from '@/components/OptimizedImage';
import { imagePlaceholders } from '@/lib/imagePlaceholders';

interface Program {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  duration: string;
  sessions: string;
  maxClients: string;
  price: string;
  features: string[];
  bestFor: string[];
  image: string;
  popular?: boolean;
}

const programs: Program[] = [
  {
    id: 'personal-training',
    name: 'Personal Training',
    subtitle: 'One-on-One Coaching',
    description: 'Intensive personal training sessions designed exclusively for you. Get Brent&rsquo;s undivided attention and accelerate your results.',
    duration: '60 minutes',
    sessions: '2-3 per week',
    maxClients: '1 client',
    price: '$150/session',
    image: imagePlaceholders.training,
    popular: true,
    features: [
      'Customized workout plans',
      'Real-time form correction',
      'Flexible scheduling',
      'Progress tracking',
      'Nutrition guidance',
      'Direct trainer access'
    ],
    bestFor: [
      'Beginners needing guidance',
      'Those with specific goals',
      'People with injuries',
      'Maximum accountability'
    ]
  },
  {
    id: 'semi-private',
    name: 'Semi-Private Training',
    subtitle: 'Small Group Sessions',
    description: 'Train with a friend or small group while still receiving personalized attention and custom programming.',
    duration: '60 minutes',
    sessions: '2-3 per week',
    maxClients: '2-4 clients',
    price: '$75/session',
    image: imagePlaceholders.workout,
    features: [
      'Partner/group motivation',
      'Shared workout experience',
      'Individual programming',
      'Cost-effective training',
      'Social accountability',
      'Flexible group formation'
    ],
    bestFor: [
      'Training with friends',
      'Motivation through others',
      'Budget-conscious clients',
      'Social fitness experience'
    ]
  },
  {
    id: 'online-coaching',
    name: 'Online Coaching',
    subtitle: 'Remote Training Program',
    description: 'Get expert coaching from anywhere with custom workout plans, nutrition guidance, and regular check-ins.',
    duration: 'Self-paced',
    sessions: 'Daily workouts',
    maxClients: 'Unlimited',
    price: '$97/month',
    image: imagePlaceholders.equipment,
    features: [
      'Custom workout programs',
      'Video exercise library',
      'Weekly check-ins',
      'Nutrition meal plans',
      'Progress tracking app',
      '24/7 message support'
    ],
    bestFor: [
      'Busy professionals',
      'Home gym users',
      'Travel frequently',
      'Self-motivated individuals'
    ]
  },
  {
    id: 'transformation',
    name: 'Transformation Program',
    subtitle: '12-Week Body Transformation',
    description: 'Comprehensive 12-week program combining personal training, nutrition coaching, and lifestyle changes for dramatic results.',
    duration: '12 weeks',
    sessions: '3 per week',
    maxClients: '1 client',
    price: '$2,997 (12 weeks)',
    image: imagePlaceholders.transformation,
    features: [
      'Complete body transformation',
      '36 personal training sessions',
      'Custom nutrition plan',
      'Weekly body assessments',
      'Lifestyle coaching',
      'Supplement recommendations',
      'Before/after photo shoot'
    ],
    bestFor: [
      'Major life changes',
      'Wedding preparation',
      'Health transformations',
      'Maximum results focus'
    ]
  },
  {
    id: 'nutrition-only',
    name: 'Nutrition Coaching',
    subtitle: 'Meal Planning & Guidance',
    description: 'Focus on nutrition with custom meal plans, macro coaching, and ongoing support to fuel your fitness goals.',
    duration: 'Ongoing',
    sessions: 'Weekly check-ins',
    maxClients: 'Multiple clients',
    price: '$197/month',
    image: imagePlaceholders.nutrition,
    features: [
      'Custom meal plans',
      'Macro calculation',
      'Recipe suggestions',
      'Grocery shopping lists',
      'Weekly adjustments',
      'Educational resources'
    ],
    bestFor: [
      'Diet optimization',
      'Weight management',
      'Sports performance',
      'Healthy lifestyle change'
    ]
  },
  {
    id: 'maintenance',
    name: 'Maintenance Program',
    subtitle: 'Ongoing Support',
    description: 'Perfect for established clients who want ongoing support to maintain their results and continue progressing.',
    duration: '60 minutes',
    sessions: '1-2 per week',
    maxClients: '1 client',
    price: '$125/session',
    image: imagePlaceholders.studio,
    features: [
      'Maintenance workouts',
      'Progress monitoring',
      'Program adjustments',
      'Injury prevention',
      'Motivation support',
      'Flexible scheduling'
    ],
    bestFor: [
      'Long-term clients',
      'Goal maintenance',
      'Injury prevention',
      'Lifestyle support'
    ]
  }
];

const ProgramsPage = () => {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
              Training Programs
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Choose the perfect training program tailored to your goals, schedule, and fitness level. 
              Each program is designed by Brent Martinez to deliver maximum results.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <div className="bg-white px-6 py-3 rounded-full shadow-sm">
                <span className="text-sm font-medium text-blue-600">✓ NASM Certified</span>
              </div>
              <div className="bg-white px-6 py-3 rounded-full shadow-sm">
                <span className="text-sm font-medium text-purple-600">✓ 500+ Success Stories</span>
              </div>
              <div className="bg-white px-6 py-3 rounded-full shadow-sm">
                <span className="text-sm font-medium text-green-600">✓ Proven Results</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Programs Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {programs.map((program, index) => (
              <motion.div
                key={program.id}
                className={`relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden ${
                  program.popular ? 'ring-2 ring-blue-500' : ''
                }`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
              >
                {program.popular && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <OptimizedImage
                    src={program.image}
                    alt={program.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-2xl font-bold">{program.name}</h3>
                    <p className="text-blue-200">{program.subtitle}</p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {program.description}
                  </p>

                  {/* Program Details */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-gray-600">{program.duration}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-purple-500" />
                      <span className="text-sm text-gray-600">{program.maxClients}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-600">{program.sessions}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-blue-600">{program.price}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 mb-3">Includes:</h4>
                    <ul className="space-y-2">
                      {program.features.slice(0, 4).map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center space-x-2">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm text-gray-600">{feature}</span>
                        </li>
                      ))}
                      {program.features.length > 4 && (
                        <li className="text-sm text-blue-600 font-medium">
                          +{program.features.length - 4} more features
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Best For */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 mb-3">Best For:</h4>
                    <div className="flex flex-wrap gap-2">
                      {program.bestFor.map((item, itemIndex) => (
                        <span 
                          key={itemIndex}
                          className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Link href="/">
                    <motion.button
                      className={`w-full py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
                        program.popular
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span>Get Started</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Consultation CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-white sm:text-4xl mb-6">
              Not Sure Which Program is Right for You?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Schedule a free consultation with Brent to discuss your goals and find the perfect program for your needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <motion.button 
                  className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Schedule Free Consultation
                </motion.button>
              </Link>
              <Link href="/about">
                <motion.button 
                  className="px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-xl hover:bg-white hover:text-blue-600 transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Learn About Brent
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default ProgramsPage;
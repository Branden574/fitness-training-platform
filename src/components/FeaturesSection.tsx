'use client';

import { motion } from 'framer-motion';
import OptimizedImage from './OptimizedImage';
import { imagePlaceholders } from '@/lib/imagePlaceholders';

interface Feature {
  icon: string;
  title: string;
  description: string;
  benefits: string[];
}

const features: Feature[] = [
  {
    icon: '🎯',
    title: 'Personalized Training Plans',
    description: 'Custom workouts designed specifically for your goals, fitness level, and schedule.',
    benefits: [
      'Tailored to your specific goals',
      'Adapts to your fitness level',
      'Flexible scheduling options',
      'Progressive difficulty increase'
    ]
  },
  {
    icon: '📊',
    title: 'Progress Tracking',
    description: 'Advanced analytics to monitor your improvements and celebrate milestones.',
    benefits: [
      'Visual progress charts',
      'Body measurement tracking',
      'Performance metrics',
      'Achievement milestones'
    ]
  },
  {
    icon: '🍎',
    title: 'Nutrition Guidance',
    description: 'Comprehensive meal planning and nutritional support for optimal results.',
    benefits: [
      'Custom meal plans',
      'Macro tracking',
      'Recipe suggestions',
      'Dietary accommodations'
    ]
  },
  {
    icon: '💬',
    title: '24/7 Support',
    description: 'Direct access to Brent for questions, motivation, and program adjustments.',
    benefits: [
      'Direct trainer communication',
      'Quick response times',
      'Form check videos',
      'Motivation & accountability'
    ]
  },
  {
    icon: '📱',
    title: 'Mobile App Access',
    description: 'Take your workouts anywhere with our mobile-friendly platform.',
    benefits: [
      'Workout videos on-the-go',
      'Exercise demonstrations',
      'Timer & rest periods',
      'Offline access capability'
    ]
  },
  {
    icon: '🏆',
    title: 'Community Support',
    description: 'Connect with other clients for motivation and shared experiences.',
    benefits: [
      'Client community forum',
      'Success story sharing',
      'Group challenges',
      'Peer motivation network'
    ]
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our comprehensive platform provides all the tools and support necessary for your fitness transformation
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
            >
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>

              <div className="space-y-3">
                {feature.benefits.map((benefit, benefitIndex) => (
                  <motion.div
                    key={benefitIndex}
                    className="flex items-center space-x-3"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: (index * 0.1) + (benefitIndex * 0.1) }}
                    viewport={{ once: true }}
                  >
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{benefit}</span>
                  </motion.div>
                ))}
              </div>


            </motion.div>
          ))}
        </div>

        {/* Success Stories with Client Photos */}
        <motion.div
          className="mt-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <div>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
              Real People, Real Results
            </h3>
            <p className="text-xl text-gray-600 mb-8">
              See how Brent&apos;s personalized approach has transformed the lives of clients just like you.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {imagePlaceholders.clients.slice(0, 5).map((clientImage, index) => (
                <motion.div
                  key={index}
                  className="relative aspect-square rounded-2xl overflow-hidden shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <img
                    src={clientImage}
                    alt={`Client transformation ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 text-white">
                    <p className="text-sm font-semibold">Success Story</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 md:p-12">
            <div className="text-center mb-8">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <img
                  src={imagePlaceholders.portrait}
                  alt="Brent Martinez - Personal Trainer"
                  className="w-full h-full rounded-full object-cover ring-4 ring-blue-200"
                />
              </div>
              <h4 className="text-2xl font-bold text-gray-800 mb-2">Brent Martinez</h4>
              <p className="text-blue-600 font-medium">Certified Personal Trainer</p>
            </div>
            
            <blockquote className="text-lg text-gray-700 italic text-center mb-6">
              &ldquo;Every client&apos;s journey is unique. My job is to provide the guidance, support, and expertise needed to help you achieve your personal best.&rdquo;
            </blockquote>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <span className="text-gray-600">Clients Trained</span>
                <span className="font-bold text-blue-600">500+</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <span className="text-gray-600">Years Experience</span>
                <span className="font-bold text-purple-600">10+</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <span className="text-gray-600">Success Rate</span>
                <span className="font-bold text-green-600">98%</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Additional Value Proposition */}
        <motion.div
          className="mt-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 md:p-12 text-white text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <h3 className="text-3xl md:text-4xl font-bold mb-6">
            Why Choose Brent Martinez Fitness?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl">
                🎓
              </div>
              <h4 className="text-xl font-semibold">Certified Expertise</h4>
              <p className="text-blue-100">
                NASM certified trainer with 10+ years of experience transforming lives
              </p>
            </div>
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl">
                📈
              </div>
              <h4 className="text-xl font-semibold">Proven Results</h4>
              <p className="text-blue-100">
                500+ successful transformations with a 95% client satisfaction rate
              </p>
            </div>
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl">
                🤝
              </div>
              <h4 className="text-xl font-semibold">Personal Approach</h4>
              <p className="text-blue-100">
                One-on-one attention with customized programs for your unique needs
              </p>
            </div>
          </div>
          <motion.button
            className="bg-white text-blue-600 font-semibold px-8 py-4 rounded-full hover:bg-gray-100 transition-all shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start Your Free Consultation
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
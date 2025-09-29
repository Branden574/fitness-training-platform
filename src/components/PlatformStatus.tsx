'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface FeatureStatus {
  name: string;
  status: 'complete' | 'partial' | 'todo';
  description: string;
}

const features: FeatureStatus[] = [
  {
    name: 'Responsive Navigation',
    status: 'complete',
    description: 'Animated mobile-friendly navigation with Brent Martinez branding'
  },
  {
    name: 'Hero Section with Slideshow',
    status: 'complete',
    description: 'Dynamic hero with image/video slideshow and call-to-action buttons'
  },
  {
    name: 'Features Section',
    status: 'complete',
    description: 'Comprehensive platform features with animated cards'
  },
  {
    name: 'Testimonials Section',
    status: 'complete',
    description: 'Client success stories with interactive carousel'
  },
  {
    name: 'Contact Form',
    status: 'complete',
    description: 'Professional contact form with validation and success states'
  },
  {
    name: 'Authentication System',
    status: 'complete',
    description: 'NextAuth.js with role-based access (trainer/client)'
  },
  {
    name: 'Client Dashboard',
    status: 'complete',
    description: 'Full client portal with progress tracking and workout access'
  },
  {
    name: 'Trainer Dashboard',
    status: 'complete',
    description: 'Complete trainer interface for managing clients and programs'
  },
  {
    name: 'Database Schema',
    status: 'complete',
    description: 'Prisma ORM with SQLite for users, workouts, nutrition, progress'
  },
  {
    name: 'About Page',
    status: 'complete',
    description: 'Professional about page showcasing Brent\'s credentials and story'
  },
  {
    name: 'Programs Page',
    status: 'complete',
    description: 'Detailed training programs with pricing and features'
  },
  {
    name: 'Contact Page',
    status: 'complete',
    description: 'Comprehensive contact page with FAQ and multiple contact methods'
  },
  {
    name: 'Optimized Images',
    status: 'partial',
    description: 'Image optimization component with placeholders (ready for real images)'
  },
  {
    name: 'SEO Optimization',
    status: 'partial',
    description: 'Basic meta tags implemented (can be enhanced further)'
  },
  {
    name: 'Real Workout System',
    status: 'todo',
    description: 'Exercise library and workout assignment functionality'
  },
  {
    name: 'Progress Photos',
    status: 'todo',
    description: 'Before/after photo upload and comparison system'
  },
  {
    name: 'Payment Integration',
    status: 'todo',
    description: 'Stripe integration for program payments and subscriptions'
  },
  {
    name: 'Mobile App',
    status: 'todo',
    description: 'React Native mobile application for iOS/Android'
  }
];

const PlatformStatus = () => {
  const completeCount = features.filter(f => f.status === 'complete').length;
  const partialCount = features.filter(f => f.status === 'partial').length;
  const todoCount = features.filter(f => f.status === 'todo').length;
  const completionPercentage = Math.round((completeCount / features.length) * 100);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'partial':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'todo':
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'todo':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
            Brent Martinez Fitness Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Development Status & Feature Overview
          </p>
          
          {/* Progress Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-3xl font-bold text-blue-600 mb-2">{completionPercentage}%</div>
              <div className="text-gray-600">Complete</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-3xl font-bold text-green-600 mb-2">{completeCount}</div>
              <div className="text-gray-600">Features Done</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-3xl font-bold text-yellow-600 mb-2">{partialCount}</div>
              <div className="text-gray-600">In Progress</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-3xl font-bold text-gray-600 mb-2">{todoCount}</div>
              <div className="text-gray-600">Planned</div>
            </div>
          </div>
        </motion.div>

        {/* Features List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Feature Status</h2>
          <div className="space-y-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(feature.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800">{feature.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(feature.status)}`}>
                      {feature.status === 'complete' ? 'Complete' : 
                       feature.status === 'partial' ? 'In Progress' : 'Planned'}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Tech Stack */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 bg-white rounded-2xl shadow-xl p-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Technology Stack</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Next.js 15', desc: 'React Framework' },
              { name: 'TypeScript', desc: 'Type Safety' },
              { name: 'Tailwind CSS', desc: 'Styling' },
              { name: 'Framer Motion', desc: 'Animations' },
              { name: 'Prisma ORM', desc: 'Database' },
              { name: 'NextAuth.js', desc: 'Authentication' },
              { name: 'SQLite', desc: 'Database Engine' },
              { name: 'Radix UI', desc: 'Components' }
            ].map((tech, index) => (
              <div key={index} className="text-center">
                <div className="font-semibold text-gray-800">{tech.name}</div>
                <div className="text-sm text-gray-600">{tech.desc}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white text-center"
        >
          <h2 className="text-2xl font-bold mb-4">Ready for Production</h2>
          <p className="text-blue-100 mb-6">
            The core platform is complete and ready for deployment. Add real images, 
            configure environment variables, and launch your fitness business!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="bg-white bg-opacity-20 px-6 py-3 rounded-lg">
              <div className="font-semibold">🚀 Production Ready</div>
            </div>
            <div className="bg-white bg-opacity-20 px-6 py-3 rounded-lg">
              <div className="font-semibold">📱 Mobile Optimized</div>
            </div>
            <div className="bg-white bg-opacity-20 px-6 py-3 rounded-lg">
              <div className="font-semibold">🔒 Secure Authentication</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PlatformStatus;
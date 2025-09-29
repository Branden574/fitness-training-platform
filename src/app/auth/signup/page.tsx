'use client';

import { motion } from 'framer-motion';
import { Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const SignUpPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-lg w-full"
      >
        {/* Back Link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Link 
            href="/"
            className="flex items-center text-gray-600 hover:text-blue-600 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6"
          >
            <Mail className="text-white w-8 h-8" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-2xl font-bold text-gray-900 mb-4"
          >
            Invitation Only
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-4 mb-8"
          >
            <p className="text-gray-600 text-lg">
              Brent Martinez Fitness is an exclusive personal training platform.
            </p>
            <p className="text-gray-500">
              To create an account, you need a personal invitation from Brent Martinez.
            </p>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4">Ready to Start Your Fitness Journey?</h3>
            <p className="text-gray-600 mb-4">
              Fill out our detailed consultation form so Brent can learn about your goals, experience, and create a personalized training plan just for you.
            </p>
            <p className="text-gray-500 text-sm mb-4">
              After reviewing your information, Brent will contact you to discuss next steps and send you an invitation to join the platform if you&apos;re a good fit.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-2 text-gray-700">
                <Mail className="w-4 h-4" />
                <span>martinezfitness559@gmail.com</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-gray-700">
                <span>📞</span>
                <span>(559) 365-2946</span>
              </div>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="space-y-3"
          >
            <Link
              href="/#contact"
              className="w-full block py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Fill Out Contact Form
            </Link>
            
            <p className="text-gray-500 text-sm">
              Already have an invitation?{' '}
              <Link 
                href="/auth/signin" 
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
              >
                Sign in here
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SignUpPage;
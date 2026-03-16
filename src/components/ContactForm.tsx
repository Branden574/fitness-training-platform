'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';

interface ContactFormProps {
  className?: string;
}

const inputClasses = "w-full px-4 py-3 bg-[#0f1219] border border-[#2d3548] rounded-lg text-white placeholder-[#4b5563] focus:ring-2 focus:ring-[#6366f1] focus:border-transparent transition-all";
const labelClasses = "block text-sm font-medium text-[#9ca3af] mb-2";

const ContactForm = ({ className = '' }: ContactFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    fitnessLevel: '',
    fitnessGoals: '',
    currentActivity: '',
    injuries: '',
    availability: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          message: formData.message,
          age: formData.age,
          fitnessLevel: formData.fitnessLevel,
          fitnessGoals: formData.fitnessGoals,
          currentActivity: formData.currentActivity,
          injuries: formData.injuries,
          availability: formData.availability,
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <motion.div
        className={`bg-[#1e2433] border border-[#2d3548] rounded-xl p-8 ${className}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center">
          <motion.div
            className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <span className="text-white text-2xl">&#10003;</span>
          </motion.div>
          <h3 className="text-2xl font-bold text-white mb-2">Message Sent!</h3>
          <p className="text-[#9ca3af] mb-6">
            Thank you for your interest! Brent will get back to you within 24 hours to discuss your fitness goals.
          </p>
          <button
            onClick={() => {
              setIsSubmitted(false);
              setFormData({
                name: '',
                email: '',
                phone: '',
                age: '',
                fitnessLevel: '',
                fitnessGoals: '',
                currentActivity: '',
                injuries: '',
                availability: '',
                message: ''
              });
            }}
            className="bg-[#6366f1] text-white px-6 py-2.5 rounded-lg hover:bg-[#5558e3] transition-colors font-semibold"
          >
            Send Another Message
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`bg-[#1e2433] border border-[#2d3548] rounded-xl p-8 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      <h3 className="text-2xl font-bold text-white mb-2">Get Your Free Consultation</h3>
      <p className="text-[#9ca3af] mb-6">Fill out this form so Brent can understand your fitness goals and create a personalized training plan for you.</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClasses}>Full Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className={inputClasses}
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className={labelClasses}>Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className={inputClasses}
              placeholder="your.email@example.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClasses}>Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={inputClasses}
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label className={labelClasses}>Age</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              min="16"
              max="100"
              className={inputClasses}
              placeholder="Your age"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClasses}>Current Fitness Level *</label>
            <select
              name="fitnessLevel"
              value={formData.fitnessLevel}
              onChange={handleChange}
              required
              className={inputClasses}
            >
              <option value="">Select your level</option>
              <option value="Beginner">Beginner (Little to no exercise experience)</option>
              <option value="Intermediate">Intermediate (Some exercise experience)</option>
              <option value="Advanced">Advanced (Regular, experienced exerciser)</option>
            </select>
          </div>
          <div>
            <label className={labelClasses}>Primary Fitness Goal *</label>
            <select
              name="fitnessGoals"
              value={formData.fitnessGoals}
              onChange={handleChange}
              required
              className={inputClasses}
            >
              <option value="">Select your main goal</option>
              <option value="Weight Loss">Weight Loss</option>
              <option value="Muscle Building">Muscle Building/Strength</option>
              <option value="General Fitness">General Fitness &amp; Health</option>
              <option value="Athletic Performance">Athletic Performance</option>
              <option value="Injury Recovery">Injury Recovery/Rehabilitation</option>
              <option value="Lifestyle Change">Overall Lifestyle Change</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClasses}>Current Activity Level *</label>
          <select
            name="currentActivity"
            value={formData.currentActivity}
            onChange={handleChange}
            required
            className={inputClasses}
          >
            <option value="">How active are you currently?</option>
            <option value="Sedentary">Sedentary (Little to no exercise)</option>
            <option value="Lightly Active">Lightly Active (1-3 days/week)</option>
            <option value="Moderately Active">Moderately Active (3-5 days/week)</option>
            <option value="Very Active">Very Active (6-7 days/week)</option>
            <option value="Extremely Active">Extremely Active (2x/day or intense training)</option>
          </select>
        </div>

        <div>
          <label className={labelClasses}>Injuries or Physical Limitations</label>
          <textarea
            name="injuries"
            value={formData.injuries}
            onChange={handleChange}
            rows={2}
            className={`${inputClasses} resize-none`}
            placeholder="Please list any current or past injuries, surgeries, or physical limitations..."
          />
        </div>

        <div>
          <label className={labelClasses}>Training Availability *</label>
          <select
            name="availability"
            value={formData.availability}
            onChange={handleChange}
            required
            className={inputClasses}
          >
            <option value="">How often can you train?</option>
            <option value="1-2 times per week">1-2 times per week</option>
            <option value="3-4 times per week">3-4 times per week</option>
            <option value="5-6 times per week">5-6 times per week</option>
            <option value="Daily">Daily training</option>
            <option value="Flexible">Flexible schedule</option>
          </select>
        </div>

        <div>
          <label className={labelClasses}>Additional Information &amp; Questions *</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={3}
            className={`${inputClasses} resize-none`}
            placeholder="Tell us more about your fitness journey, specific questions, or anything else you'd like Brent to know..."
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <motion.button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#6366f1] text-white font-semibold py-3.5 px-6 rounded-lg hover:bg-[#5558e3] focus:ring-2 focus:ring-[#6366f1] focus:ring-offset-2 focus:ring-offset-[#1e2433] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner size="sm" color="white" />
              <span>Sending Message...</span>
            </div>
          ) : (
            'Get Started Today'
          )}
        </motion.button>
      </form>

      <div className="mt-6 pt-6 border-t border-[#2d3548]">
        <div className="flex items-center justify-center gap-6 text-sm text-[#6b7280]">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400">&#10003;</span>
            <span>Free Consultation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400">&#10003;</span>
            <span>Custom Plan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400">&#10003;</span>
            <span>24/7 Support</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ContactForm;

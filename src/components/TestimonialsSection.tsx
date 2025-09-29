'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import OptimizedImage from './OptimizedImage';
import { imagePlaceholders } from '@/lib/imagePlaceholders';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  content: string;
  rating: number;
  image: string;
  achievement: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Marketing Executive",
    content: "Brent transformed my entire approach to fitness. In 6 months, I lost 35 pounds and gained confidence I never knew I had. His personalized program fit perfectly into my busy schedule.",
    rating: 5,
    image: imagePlaceholders.clients[0], // Client 1 photo
    achievement: "Lost 35 lbs in 6 months"
  },
  {
    id: 2,
    name: "Mike Chen",
    role: "Software Engineer",
    content: "As someone who spent 12+ hours at a desk, I thought I was doomed to be out of shape. Brent's program helped me build muscle, improve my posture, and boost my energy levels dramatically.",
    rating: 5,
    image: imagePlaceholders.clients[1], // Client 2 photo
    achievement: "Gained 15 lbs muscle"
  },
  {
    id: 3,
    name: "Jessica Martinez",
    role: "Stay-at-home Mom",
    content: "After having three kids, I felt like my body wasn't mine anymore. Brent's compassionate approach and effective workouts helped me feel strong and confident again. Best investment I've made!",
    rating: 5,
    image: imagePlaceholders.clients[2], // Client 3 photo
    achievement: "Increased strength by 200%"
  },
  {
    id: 4,
    name: "David Thompson",
    role: "Retired Teacher",
    content: "At 58, I thought my best physical days were behind me. Brent proved me wrong! His age-appropriate training has me feeling better than I did in my 40s. Highly recommend!",
    rating: 5,
    image: imagePlaceholders.clients[3], // Client 4 photo
    achievement: "Improved mobility & strength"
  },
  {
    id: 5,
    name: "Amanda Rodriguez",
    role: "Nurse",
    content: "Working long shifts left me exhausted and stressed. Brent's training program not only improved my physical health but also my mental well-being. I sleep better and have more energy for my family.",
    rating: 5,
    image: imagePlaceholders.clients[4], // Client 5 photo
    achievement: "Reduced stress & improved sleep"
  },
  {
    id: 6,
    name: "Tom Wilson",
    role: "Business Owner",
    content: "Brent understands the demands of running a business. His efficient, results-driven approach helped me stay in peak condition without sacrificing my work commitments. Phenomenal results!",
    rating: 5,
    image: imagePlaceholders.testimonial("Tom Wilson"), // Fallback to placeholder for 6th testimonial
    achievement: "Built lean muscle & endurance"
  }
];

const TestimonialsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`text-2xl ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}>
        ★
      </span>
    ));
  };

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Client Success Stories
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See how Brent Martinez has transformed lives through personalized fitness coaching
          </p>
        </motion.div>

        {/* Featured Testimonial */}
        <motion.div
          className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 mb-12 max-w-4xl mx-auto"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <div className="flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8">
            <div className="flex-shrink-0">
              <OptimizedImage
                src={testimonials[currentIndex].image}
                alt={testimonials[currentIndex].name}
                width={120}
                height={120}
                className="w-30 h-30 rounded-full"
              />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex justify-center md:justify-start mb-4">
                {renderStars(testimonials[currentIndex].rating)}
              </div>
              <blockquote className="text-lg md:text-xl text-gray-700 mb-6 italic">
                &ldquo;{testimonials[currentIndex].content}&rdquo;
              </blockquote>
              <div>
                <div className="font-bold text-gray-800 text-lg">
                  {testimonials[currentIndex].name}
                </div>
                <div className="text-gray-600">
                  {testimonials[currentIndex].role}
                </div>
                <div className="mt-2 inline-block bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
                  🎯 {testimonials[currentIndex].achievement}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center mt-8 space-x-4">
            <button
              onClick={prevTestimonial}
              className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              ←
            </button>
            <div className="flex space-x-2 items-center">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentIndex 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={nextTestimonial}
              className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              →
            </button>
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          {[
            { number: "500+", label: "Clients Transformed" },
            { number: "95%", label: "Success Rate" },
            { number: "10,000+", label: "Pounds Lost" },
            { number: "5★", label: "Average Rating" }
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {stat.number}
              </div>
              <div className="text-gray-600 text-sm md:text-base">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Call to Action */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
        >
          <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            Ready to Write Your Success Story?
          </h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join hundreds of satisfied clients who have transformed their lives with Brent&rsquo;s proven coaching methods.
          </p>
          <motion.button
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-8 py-4 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start Your Transformation Today
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
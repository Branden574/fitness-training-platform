'use client';

import { motion } from 'framer-motion';
import OptimizedImage from '@/components/OptimizedImage';
import { imagePlaceholders } from '@/lib/imagePlaceholders';
import Link from 'next/link';

const AboutPage = () => {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
                Meet Brent Martinez
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                I know what it takes to transform your body because I&rsquo;ve done it myself—and now I help others do the same. With 5 years of coaching experience and hundreds of clients served, I&rsquo;ll give you the tools and accountability to finally reach your goals.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="bg-white px-4 py-2 rounded-full shadow-sm">
                  <span className="text-sm font-medium text-blue-600">NASM Certified</span>
                </div>
                <div className="bg-white px-4 py-2 rounded-full shadow-sm">
                  <span className="text-sm font-medium text-purple-600">Hundreds of Clients</span>
                </div>
                <div className="bg-white px-4 py-2 rounded-full shadow-sm">
                  <span className="text-sm font-medium text-green-600">5+ Years Experience</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="relative z-10">
                <OptimizedImage
                  src={imagePlaceholders.portrait}
                  alt="Brent Martinez - Certified Personal Trainer"
                  width={500}
                  height={600}
                  className="rounded-2xl shadow-2xl"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-20"></div>
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full opacity-20"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
              My Fitness Journey
            </h2>
          </motion.div>

          <div className="space-y-12">
            <motion.div
              className="flex flex-col md:flex-row gap-8 items-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">The Beginning</h3>
                <p className="text-gray-600 leading-relaxed">
                  My passion for fitness started back in high school when I struggled with confidence and energy. 
                  Training quickly became more than just a hobby—it was a way to push myself, build discipline, 
                  and take control of my life. That early transformation inspired me to help others do the same.
                </p>
              </div>
              <div className="w-full md:w-80">
                <OptimizedImage
                  src={imagePlaceholders.transformation}
                  alt="Brent's early fitness journey"
                  width={320}
                  height={240}
                  className="rounded-xl shadow-lg"
                />
              </div>
            </motion.div>

            <motion.div
              className="flex flex-col md:flex-row-reverse gap-8 items-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Professional Development</h3>
                <p className="text-gray-600 leading-relaxed">
                  After earning my NASM certification, I&rsquo;ve spent the last 5 years coaching people at all levels—from 
                  those just starting out to athletes chasing peak performance. My focus is on building programs that 
                  deliver results while creating lasting habits clients can actually stick to.
                </p>
              </div>
              <div className="w-full md:w-80">
                <OptimizedImage
                  src={imagePlaceholders.training}
                  alt="Brent training clients"
                  width={320}
                  height={240}
                  className="rounded-xl shadow-lg"
                />
              </div>
            </motion.div>

            <motion.div
              className="flex flex-col md:flex-row gap-8 items-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Mission</h3>
                <p className="text-gray-600 leading-relaxed">
                  Today, my mission is simple: to provide personalized, sustainable fitness solutions that fit into 
                  real life. I believe that everyone deserves to feel confident, healthy, and strong. Through this 
                  platform, I&rsquo;m able to reach more people and provide the same level of personal attention and 
                  expertise that has helped hundreds of clients transform their lives.
                </p>
              </div>
              <div className="w-full md:w-80">
                <OptimizedImage
                  src={imagePlaceholders.studio}
                  alt="Brent Martinez Fitness Studio"
                  width={320}
                  height={240}
                  className="rounded-xl shadow-lg"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Credentials Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
              Credentials & Expertise
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Continuous education and professional development ensure you receive the most effective, 
              science-based training methods
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "NASM-CPT",
                subtitle: "Certified Personal Trainer",
                description: "Certified by the National Academy of Sports Medicine, equipped with advanced exercise science knowledge to design safe and effective programs.",
                icon: "🏆"
              },
              {
                title: "Corrective Exercise",
                subtitle: "Movement Specialist",
                description: "Specialized in injury prevention and proper movement mechanics to keep clients training safely while improving performance.",
                icon: "🔧"
              },
              {
                title: "Nutrition Coaching",
                subtitle: "Nutrition Specialist",
                description: "Evidence-based nutrition strategies and meal guidance designed to fuel progress without restrictive diets.",
                icon: "🥗"
              },
              {
                title: "Weight Loss",
                subtitle: "Transformation Specialist",
                description: "Expertise in fat loss, body composition changes, and sustainable approaches that deliver long-term results.",
                icon: "📉"
              },
              {
                title: "Strength Training",
                subtitle: "Performance Coach",
                description: "Advanced programming to build strength, muscle, and conditioning for all fitness levels.",
                icon: "💪"
              },
              {
                title: "Behavioral Change",
                subtitle: "Lifestyle Coach",
                description: "Psychology-backed methods to create lasting healthy habits and break through the barriers holding clients back.",
                icon: "🧠"
              }
            ].map((credential, index) => (
              <motion.div
                key={index}
                className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
              >
                <div className="text-4xl mb-4 text-center">{credential.icon}</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{credential.title}</h3>
                <h4 className="text-blue-600 font-medium mb-3">{credential.subtitle}</h4>
                <p className="text-gray-600 text-sm leading-relaxed">{credential.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8">
              My Training Philosophy
            </h2>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-8 md:p-12 rounded-2xl">
              <blockquote className="text-xl md:text-2xl text-gray-700 italic leading-relaxed mb-6">
                &ldquo;Fitness is more than workouts—it&rsquo;s mindset, discipline, and consistency. I believe in celebrating 
                small wins, building sustainable habits, and guiding you to become your strongest self.&rdquo;
              </blockquote>
              <div className="text-lg font-medium text-gray-800">— Brent Martinez</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-white sm:text-4xl mb-6">
              Ready to Start Your Journey?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Let&rsquo;s work together to achieve your fitness goals with a personalized approach that fits your lifestyle.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <motion.button 
                  className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Get Started Today
                </motion.button>
              </Link>
              <Link href="/auth/signin">
                <motion.button 
                  className="px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-xl hover:bg-white hover:text-blue-600 transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Client Login
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default AboutPage;
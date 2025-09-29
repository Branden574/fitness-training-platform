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
                Certified personal trainer with over 10 years of experience helping clients achieve their fitness goals. 
                Specializing in weight loss, strength training, and lifestyle transformation.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="bg-white px-4 py-2 rounded-full shadow-sm">
                  <span className="text-sm font-medium text-blue-600">NASM Certified</span>
                </div>
                <div className="bg-white px-4 py-2 rounded-full shadow-sm">
                  <span className="text-sm font-medium text-purple-600">500+ Clients</span>
                </div>
                <div className="bg-white px-4 py-2 rounded-full shadow-sm">
                  <span className="text-sm font-medium text-green-600">10+ Years Experience</span>
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
                  My passion for fitness began during my college years when I struggled with confidence and energy. 
                  Through consistent training and proper nutrition, I not only transformed my body but discovered 
                  my calling to help others do the same. This personal transformation ignited a lifelong commitment 
                  to health and wellness.
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
                  After earning my NASM certification and multiple specializations, I&rsquo;ve dedicated over a decade 
                  to mastering the art and science of fitness. I&rsquo;ve worked with clients of all ages and fitness 
                  levels, from complete beginners to competitive athletes, helping each achieve their unique goals.
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
                <h3 className="text-2xl font-bold text-gray-800 mb-4">The Mission</h3>
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
                description: "National Academy of Sports Medicine certification with advanced exercise science knowledge",
                icon: "🏆"
              },
              {
                title: "Corrective Exercise",
                subtitle: "Movement Specialist",
                description: "Specialized training in injury prevention and corrective exercise techniques",
                icon: "🔧"
              },
              {
                title: "Nutrition Coaching",
                subtitle: "Certified Nutrition Coach",
                description: "Evidence-based nutrition guidance and meal planning expertise",
                icon: "🥗"
              },
              {
                title: "Weight Loss",
                subtitle: "Transformation Specialist",
                description: "Proven strategies for sustainable weight loss and body composition changes",
                icon: "📉"
              },
              {
                title: "Strength Training",
                subtitle: "Performance Coach",
                description: "Advanced strength and conditioning for all fitness levels and goals",
                icon: "💪"
              },
              {
                title: "Behavioral Change",
                subtitle: "Lifestyle Coach",
                description: "Psychology-based approaches to creating lasting healthy habits",
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
                &ldquo;Fitness isn&rsquo;t about perfection—it&rsquo;s about progress. Every small step forward is a victory 
                worth celebrating. My role is to guide, support, and empower you to become the strongest version of yourself, 
                both physically and mentally.&rdquo;
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
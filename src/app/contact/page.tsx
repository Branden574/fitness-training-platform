'use client';

import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Clock, MessageCircle, Instagram } from 'lucide-react';
import ContactForm from '@/components/ContactForm';

const ContactPage = () => {
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
              Get In Touch
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Ready to start your fitness journey? Have questions about our programs? 
              Let&rsquo;s connect and discuss how we can help you achieve your goals.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Information & Form */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-6">
                  Let&rsquo;s Connect
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Whether you&rsquo;re ready to start training or just have questions, 
                  I&rsquo;m here to help. Reach out through any of the methods below, 
                  and I&rsquo;ll get back to you within 24 hours.
                </p>
              </div>

              {/* Contact Methods */}
              <div className="space-y-6">
                <motion.div
                  className="flex items-start space-x-4 p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Phone</h3>
                    <p className="text-gray-600 mb-2">(559) 365-2946</p>
                    <p className="text-sm text-gray-500">
                      Best for urgent questions or immediate scheduling
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  className="flex items-start space-x-4 p-6 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Email</h3>
                    <p className="text-gray-600 mb-2">martinezfitness559@gmail.com</p>
                    <p className="text-sm text-gray-500">
                      Detailed questions, program inquiries, or general information
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  className="flex items-start space-x-4 p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-xl"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Studio Location</h3>
                    <p className="text-gray-600 mb-2">
                      Synergy Personal Training<br />
                      4774 N Blackstone<br />
                      Fresno, CA 93726<br />
                      United States
                    </p>
                    <p className="text-sm text-gray-500">
                      Private training studio with state-of-the-art equipment
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  className="flex items-start space-x-4 p-6 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Training Hours</h3>
                    <div className="text-gray-600 space-y-1">
                      <p><strong>Monday - Friday:</strong> 5:00 AM - 8:00 PM</p>
                      <p><strong>Saturday:</strong> Closed</p>
                      <p><strong>Sunday:</strong> Closed</p>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Flexible scheduling available for busy professionals
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Social Media */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Follow My Journey</h3>
                <div className="flex space-x-4">
                  {[
                    { icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com/brentjmartinez/', color: 'bg-pink-500' },
                    { icon: MessageCircle, label: 'WhatsApp', href: 'https://wa.me/15593652946', color: 'bg-gray-800' }
                  ].map((social, index) => (
                    <motion.a
                      key={index}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-12 h-12 ${social.color} rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      aria-label={social.label}
                    >
                      <social.icon className="w-6 h-6" />
                    </motion.a>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <ContactForm />
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Quick answers to common questions about training and programs
            </p>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                question: "Do I need experience to start training?",
                answer: "Not at all! I work with clients of all fitness levels, from complete beginners to advanced athletes. Every program is customized to your current abilities and goals."
              },
              {
                question: "What should I bring to my first session?",
                answer: "Just bring comfortable workout clothes, athletic shoes, a water bottle, and a positive attitude! All equipment is provided at the studio."
              },
              {
                question: "How quickly will I see results?",
                answer: "Most clients start feeling stronger and more energetic within 2-3 weeks. Visible changes typically appear around 4-6 weeks with consistent training and nutrition."
              },
              {
                question: "Do you offer nutrition guidance?",
                answer: "Yes! Nutrition is a crucial part of achieving your goals. I provide meal planning, macro guidance, and ongoing nutrition support with all programs."
              },
              {
                question: "Can I train if I have injuries?",
                answer: "I&rsquo;m certified in corrective exercise and can work around most injuries. We&rsquo;ll assess your limitations and create a safe, effective program that supports your recovery."
              },
              {
                question: "What makes your approach different?",
                answer: "I focus on sustainable, science-based methods tailored to your lifestyle. It&rsquo;s not about quick fixes—it&rsquo;s about creating lasting habits and genuine transformation."
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <h3 className="font-semibold text-gray-800 mb-3">{faq.question}</h3>
                <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-white sm:text-4xl mb-6">
              Ready to Transform Your Life?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Your fitness journey starts with a single step. Let&rsquo;s take it together.
            </p>
            <motion.button
              className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Schedule Your Free Consultation
            </motion.button>
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default ContactPage;
'use client';

import { motion } from 'framer-motion';
import OptimizedImage from './OptimizedImage';
import { imagePlaceholders } from '@/lib/imagePlaceholders';

interface SuccessStory {
  id: number;
  name: string;
  achievement: string;
  image: string;
  timeframe: string;
}

const successStories: SuccessStory[] = [
  {
    id: 1,
    name: "Sarah J.",
    achievement: "Lost 35 lbs",
    image: imagePlaceholders.successStories[0],
    timeframe: "6 months"
  },
  {
    id: 2,
    name: "Mike C.",
    achievement: "Gained 15 lbs muscle",
    image: imagePlaceholders.successStories[1],
    timeframe: "8 months"
  },
  {
    id: 3,
    name: "Jessica M.",
    achievement: "Increased strength 200%",
    image: imagePlaceholders.successStories[2],
    timeframe: "1 year"
  },
  {
    id: 4,
    name: "David T.",
    achievement: "Improved mobility",
    image: imagePlaceholders.successStories[3],
    timeframe: "10 months"
  }
];

const SuccessGallery = () => {
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
            Real Results, Real People
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See the incredible transformations achieved by clients working with Brent Martinez
          </p>
        </motion.div>

        {/* Success Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12">
          {successStories.map((story, index) => (
            <motion.div
              key={story.id}
              className="group cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 p-1">
                <div className="relative aspect-square overflow-hidden rounded-xl">
                  <OptimizedImage
                    src={story.image}
                    alt={`${story.name} transformation`}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Achievement Badge */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <h4 className="font-semibold text-sm">{story.name}</h4>
                    <p className="text-xs opacity-90">{story.achievement}</p>
                    <p className="text-xs text-yellow-300">{story.timeframe}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Your Success Story Starts Here
            </h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Join our community of successful clients and start your transformation journey with personalized training from Brent Martinez.
            </p>
            <motion.button
              className="bg-white text-blue-600 font-semibold px-8 py-4 rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start Your Transformation
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SuccessGallery;
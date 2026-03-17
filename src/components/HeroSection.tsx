'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Dumbbell, Calendar, Award, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Counter, StaggerContainer, StaggerItem } from '@/components/ScrollAnimations';

const slides = [
  { src: '/images/hero-slide-1.jpg', alt: 'Brent Martinez Training Session' },
  { src: '/images/hero-slide-2.jpg', alt: 'Personal Training at Synergy' },
  { src: '/images/hero-slide-3.jpg', alt: 'Professional Fitness Studio' },
  { src: '/images/homescreen-slide-4.jpg', alt: 'Client Training Results' },
];

const stats = [
  { icon: Dumbbell, value: '150+', label: 'Clients Trained', counter: 150, suffix: '+' },
  { icon: Calendar, value: '10+', label: 'Years Experience', counter: 10, suffix: '+' },
  { icon: Award, value: 'NASM', label: 'Certified Trainer', counter: 0, suffix: '' },
  { icon: Star, value: '4.9', label: 'Client Rating', counter: 0, suffix: '' },
];

const avatars = [
  '/images/client-1.jpg',
  '/images/client-2.jpg',
  '/images/client-3.jpg',
  '/images/client-4.jpg',
];

export default function HeroSection() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 600], ['0%', '25%']);
  const textY = useTransform(scrollY, [0, 600], ['0%', '10%']);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);

  return (
    <section className="relative bg-[#0f1219]">
      {/* ── Hero Area ── */}
      <div className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background slideshow */}
        <motion.div className="absolute inset-0" style={{ y: bgY }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              <Image
                src={slides[current].src}
                alt={slides[current].alt}
                fill
                className="object-cover"
                priority={current === 0}
              />
            </motion.div>
          </AnimatePresence>
          {/* Gradient overlay — stronger on left for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f1219] via-[#0f1219]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1219] via-transparent to-[#0f1219]/30" />
        </motion.div>

        {/* Content */}
        <motion.div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-32 w-full" style={{ y: textY, opacity: heroOpacity }}>
          <motion.div
            className="max-w-xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
          >
            {/* Social proof avatars */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex -space-x-2">
                {avatars.map((src, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full border-2 border-[#1a1f2e] overflow-hidden relative"
                  >
                    <Image src={src} alt="" fill className="object-cover" />
                  </div>
                ))}
              </div>
              <p className="text-sm text-[#9ca3af]">
                Trusted by <span className="font-semibold text-white">150+</span> clients in Fresno and beyond
              </p>
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-bold text-white leading-[1.1] tracking-tight mb-6">
              Build the body you&apos;ve been working toward.
            </h1>

            {/* Description */}
            <p className="text-base text-[#9ca3af] leading-relaxed mb-8 max-w-lg">
              Personalized training programs, expert nutrition coaching, and real accountability
              with certified trainer Brent Martinez. In-person in Fresno or online anywhere.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-[#6366f1] text-white font-medium px-6 py-3.5 rounded-lg hover:bg-[#5558e3] hover:shadow-[0_10px_15px_-3px_rgba(99,102,241,0.3)] transition-all duration-200 text-sm"
              >
                Start Free Consultation
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/programs"
                className="inline-flex items-center justify-center border border-[#4b5563] text-white font-medium px-6 py-3.5 rounded-lg hover:bg-white/5 hover:border-[#6b7280] transition-all duration-200 text-sm"
              >
                View Programs
              </Link>
            </div>
          </motion.div>
        </motion.div>

        {/* Carousel dots — bottom right */}
        <div className="absolute bottom-6 right-8 lg:right-12 z-10 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === current ? 'bg-white w-6' : 'bg-[#4b5563] hover:bg-[#6b7280]'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* ── Stats Section ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pb-16 -mt-4">
        <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6" staggerDelay={0.1}>
          {stats.map((stat) => (
            <StaggerItem key={stat.label}>
              <div className="bg-[#1e2433] border border-[#2d3548] rounded-xl p-6">
                <div className="w-12 h-12 bg-[#252d3d] rounded-xl flex items-center justify-center mb-4">
                  <stat.icon className="w-6 h-6 text-[#818cf8]" />
                </div>
                <p className="text-[32px] font-bold text-white leading-tight">
                  {stat.counter ? (
                    <Counter target={stat.counter} suffix={stat.suffix} className="" />
                  ) : (
                    stat.value
                  )}
                </p>
                <p className="text-sm text-[#9ca3af] mt-1">{stat.label}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

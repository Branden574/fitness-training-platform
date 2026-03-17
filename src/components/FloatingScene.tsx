'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

export default function FloatingScene() {
  return (
    <section className="relative py-20 overflow-hidden border-t border-[#2d3548]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.07)_0%,_transparent_70%)]" />
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
        >
          <p className="text-[#6366f1] font-semibold text-sm tracking-wide uppercase mb-3">
            Results-Driven
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Train smarter.<br />Get stronger.
          </h2>
          <p className="text-[#9ca3af] leading-relaxed max-w-md">
            Every program is built around your goals — not a template.
            Real science, real accountability, and the kind of results
            that actually stick.
          </p>
        </motion.div>

        <motion.div
          className="relative h-[340px] lg:h-[440px] w-full flex items-center justify-center"
          style={{ perspective: '1000px' }}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1], delay: 0.15 }}
        >
          {/* Outer glow ring */}
          <motion.div
            className="absolute w-64 h-64 lg:w-80 lg:h-80 rounded-full border border-[#6366f1]/20"
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Inner glow ring */}
          <motion.div
            className="absolute w-52 h-52 lg:w-64 lg:h-64 rounded-full border border-[#818cf8]/25"
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          />

          {/* Ambient glow behind logo */}
          <motion.div
            className="absolute w-48 h-48 lg:w-56 lg:h-56 rounded-full bg-[#6366f1]/10 blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* 3D Floating Logo */}
          <motion.div
            className="relative w-44 h-44 lg:w-56 lg:h-56"
            animate={{
              rotateY: [0, 8, 0, -8, 0],
              rotateX: [0, -5, 0, 5, 0],
              y: [0, -12, 0, 12, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Logo shadow/reflection */}
            <motion.div
              className="absolute inset-0 rounded-full bg-[#6366f1]/5 blur-2xl"
              animate={{
                scale: [0.9, 1.1, 0.9],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            <Image
              src="/images/bm-logo.png"
              alt="Brent Martinez Fitness"
              fill
              className="object-contain drop-shadow-[0_0_30px_rgba(99,102,241,0.4)]"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

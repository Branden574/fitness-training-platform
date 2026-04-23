'use client';

import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useDeviceProfileContext } from '@/components/providers/DeviceProfileProvider';
import { itemVariants, pageVariants, pick } from '@/lib/motion/variants';

export interface RevealProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Page-level entrance wrapper. Uses the device-aware pageVariants so the
 * animation automatically adapts: spring/vertical on mobile, ease/desktop,
 * and opacity-only on reduced motion or low-end devices.
 *
 * When this wraps a RevealItem tree, the container's `staggerChildren`
 * cascades the children in sequence.
 */
export function RevealContainer({ children, className, style }: RevealProps) {
  const { animationVariant } = useDeviceProfileContext();
  return (
    <motion.div
      className={className}
      style={style}
      initial="initial"
      animate="enter"
      variants={pick(pageVariants, animationVariant)}
    >
      {children}
    </motion.div>
  );
}

/**
 * Child stagger item — wrap each card/tile/field inside a RevealContainer
 * with one of these to inherit the container's stagger.
 */
export function RevealItem({ children, className, style }: RevealProps) {
  const { animationVariant } = useDeviceProfileContext();
  return (
    <motion.div
      className={className}
      style={style}
      variants={pick(itemVariants, animationVariant)}
    >
      {children}
    </motion.div>
  );
}

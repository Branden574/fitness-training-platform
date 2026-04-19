'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props {
  keyId: string;
  children: ReactNode;
}

export function TabTransition({ keyId, children }: Props) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={keyId}
        initial={{ opacity: 0, y: -6, scale: 1.005 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.995 }}
        transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
        style={{ width: '100%', height: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

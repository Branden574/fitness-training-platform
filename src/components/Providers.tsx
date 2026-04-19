'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import ThemeProvider from './ThemeProvider';
import { CartProvider } from '@/lib/CartContext';
import { ToastProvider } from './Toast';
import {
  BootGate,
  CelebrationHost,
  CelebrationProvider,
} from './animations';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider
      basePath="/api/auth"
      refetchInterval={5 * 60}
      refetchOnWindowFocus={true}
    >
      <ThemeProvider>
        <CartProvider>
          <ToastProvider>
            <CelebrationProvider>
              <BootGate />
              {children}
              <CelebrationHost />
            </CelebrationProvider>
          </ToastProvider>
        </CartProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

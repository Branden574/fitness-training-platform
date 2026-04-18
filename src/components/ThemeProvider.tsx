'use client';

import { ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';

type Theme = 'light' | 'dark' | 'auto';

export default function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      storageKey="theme"
      themes={['light', 'dark']}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  const compatTheme: Theme = theme === 'system' ? 'auto' : (theme as Theme | undefined) ?? 'dark';
  const compatSet = (t: Theme) => setTheme(t === 'auto' ? 'system' : t);
  return {
    theme: compatTheme,
    resolvedTheme: (resolvedTheme as 'light' | 'dark' | undefined) ?? 'dark',
    setTheme: compatSet,
  };
}

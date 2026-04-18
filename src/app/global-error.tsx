'use client';

import ErrorPanel from '@/components/ui/mf/ErrorPanel';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>
        <ErrorPanel
          title="Something broke hard."
          message="The app hit an unexpected error at the root level. Refreshing usually clears it — if not, your trainer's dashboard and logs are safe."
          digest={error.digest}
          onRetry={reset}
        />
      </body>
    </html>
  );
}

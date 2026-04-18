'use client';

import ErrorPanel from '@/components/ui/mf/ErrorPanel';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPanel
      title="Admin console hiccup."
      message="The console failed to render. Platform data is safe. Retry or jump back to the overview."
      digest={error.digest}
      onRetry={reset}
      homeHref="/admin"
      homeLabel="Overview"
    />
  );
}

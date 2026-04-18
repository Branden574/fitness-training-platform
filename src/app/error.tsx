'use client';

import ErrorPanel from '@/components/ui/mf/ErrorPanel';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPanel
      title="This page didn't load."
      message="Something went wrong while rendering this view. You can retry or head home — your data is fine."
      digest={error.digest}
      onRetry={reset}
    />
  );
}

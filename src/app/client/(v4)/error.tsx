'use client';

import ErrorPanel from '@/components/ui/mf/ErrorPanel';

export default function ClientV4Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPanel
      variant="mobile"
      title="Couldn't load your dashboard."
      message="Retry usually fixes it. If not, sign out and back in — your logs are saved."
      digest={error.digest}
      onRetry={reset}
      homeHref="/client"
      homeLabel="Back to Today"
    />
  );
}

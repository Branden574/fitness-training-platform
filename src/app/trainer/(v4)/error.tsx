'use client';

import ErrorPanel from '@/components/ui/mf/ErrorPanel';

export default function TrainerV4Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPanel
      title="Couldn't load this trainer view."
      message="Retry usually fixes it. Roster + client data is intact — this is a rendering hiccup, not a data loss."
      digest={error.digest}
      onRetry={reset}
      homeHref="/trainer"
      homeLabel="Back to Roster"
    />
  );
}

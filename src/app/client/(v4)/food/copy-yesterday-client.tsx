'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy } from 'lucide-react';
import { Btn } from '@/components/ui/mf';

interface Props {
  viewDate: string;
  hasEntries: boolean;
}

function yyyyMmDdMinusOne(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() - 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export default function CopyYesterdayClient({ viewDate, hasEntries }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (hasEntries) {
      if (
        !confirm(
          'This day already has entries. Copying yesterday will fail — delete the existing entries first, or cancel.',
        )
      )
        return;
    } else if (
      !confirm(
        'Copy every meal logged yesterday into this day? Times will update to now.',
      )
    ) {
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const fromDate = yyyyMmDdMinusOne(viewDate);
      const res = await fetch('/api/food-entries/copy-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromDate, toDate: viewDate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Copy failed');
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Btn
        icon={Copy}
        onClick={run}
        disabled={busy}
        title={
          error ??
          (hasEntries
            ? 'Today already has entries — delete them first, then retry.'
            : `Copy yesterday's entries into ${viewDate}.`)
        }
      >
        {busy ? 'Copying…' : 'Copy yesterday'}
      </Btn>
      {error && (
        <span
          role="alert"
          className="mf-font-mono"
          style={{ fontSize: 10, color: '#fca5a5', marginLeft: 6 }}
        >
          {error}
        </span>
      )}
    </>
  );
}

'use client';

import { ArrowDown } from 'lucide-react';
import Btn from '@/components/ui/mf/Btn';

export interface ExportRow {
  type: string;
  createdAt: string;
  actor: string;
  action: string;
  target: string;
}

interface Props {
  range: string;
  rows: ExportRow[];
}

function toCsv(rows: ExportRow[]): string {
  const header = ['type', 'createdAt', 'actor', 'action', 'target'];
  const escape = (v: string) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [r.type, r.createdAt, r.actor, r.action, r.target].map(escape).join(','),
    );
  }
  return lines.join('\n');
}

export default function ExportCsvClient({ range, rows }: Props) {
  const handleClick = () => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Btn variant="ghost" icon={ArrowDown} onClick={handleClick} disabled={rows.length === 0}>
      Export CSV
    </Btn>
  );
}

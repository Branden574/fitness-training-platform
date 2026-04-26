/**
 * Format a UTC timestamp in a specific IANA timezone.
 *
 * Trainer-facing log views pass the CLIENT's timezone so "7:30 AM breakfast"
 * reads correctly regardless of where the trainer is sitting. Client-facing
 * views pass their own tz (or undefined to let the browser pick).
 *
 * `tz` accepts null/undefined for graceful degradation — unknown zones fall
 * back to the runtime's default, not a hard error, so a client who hasn't
 * picked a zone yet still gets readable times.
 */
export function formatTimeInZone(
  date: Date | string | null | undefined,
  tz: string | null | undefined,
  opts: { showSeconds?: boolean; hour12?: boolean } = {},
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleTimeString('en-US', {
      timeZone: tz ?? undefined,
      hour: 'numeric',
      minute: '2-digit',
      second: opts.showSeconds ? '2-digit' : undefined,
      hour12: opts.hour12 ?? true,
    });
  } catch {
    // Invalid timezone — render without the tz hint.
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: opts.hour12 ?? true,
    });
  }
}

/**
 * Date-only formatter scoped to a timezone. Useful when a trainer wants to
 * know which DAY a client's entry belongs to (so a 11:55 PM Pacific log
 * isn't reported as "tomorrow" just because the server is UTC).
 */
export function formatDateInZone(
  date: Date | string | null | undefined,
  tz: string | null | undefined,
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString('en-US', {
      timeZone: tz ?? undefined,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
}

/**
 * iMessage-style day divider for chat threads. Returns one of:
 *   TODAY · YESTERDAY · MONDAY (within last 6 days) · APR 22 (this year) · APR 22, 2025
 *
 * Always evaluated in the viewer's local timezone — both sides of a chat see
 * "Today" relative to where they're sitting, which is the conventional UX.
 */
export function formatMessageDayDivider(
  iso: string | Date,
  now: Date = new Date(),
): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';

  const today = new Date(now);
  const yest = new Date(now);
  yest.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'TODAY';
  if (d.toDateString() === yest.toDateString()) return 'YESTERDAY';

  // Within the last 6 days (excluding today/yesterday): show weekday name.
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((today.getTime() - d.getTime()) / dayMs);
  if (diffDays >= 0 && diffDays < 7) {
    return d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  }

  if (d.getFullYear() === today.getFullYear()) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  }

  return d
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase();
}

/**
 * Combined short format: "Mon · 7:30 AM". Used in compact log rows where
 * both the day and time matter to a trainer scanning a week of entries.
 */
export function formatDateTimeInZone(
  date: Date | string | null | undefined,
  tz: string | null | undefined,
): string {
  if (!date) return '';
  const datePart = formatDateInZone(date, tz);
  const timePart = formatTimeInZone(date, tz);
  if (!datePart && !timePart) return '';
  if (!datePart) return timePart;
  if (!timePart) return datePart;
  return `${datePart} · ${timePart}`;
}

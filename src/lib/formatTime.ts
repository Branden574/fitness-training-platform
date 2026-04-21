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

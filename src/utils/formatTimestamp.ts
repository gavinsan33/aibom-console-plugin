/**
 * Parses an ISO-8601 timestamp, reading one without a zone as UTC: the webhook
 * writes pod `start_time` as naive UTC (`2026-11-02T14:33:58.186022`), which
 * `new Date()` would otherwise take as local time.
 */
function parseTimestamp(raw: string): Date {
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  return new Date(/T\d/.test(raw) && !hasZone ? `${raw}Z` : raw);
}

const DATE_TIME: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };

/**
 * Human-readable local date/time for an ISO-8601 timestamp; falls back to the
 * raw string if unparseable and to an em dash if missing.
 */
export function formatTimestamp(raw: string | undefined): string {
  if (!raw) return '—';
  const date = parseTimestamp(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString(undefined, DATE_TIME);
}

/** "Nov 2, 2026, 9:33 AM → 9:38 AM", repeating the date only when the range crosses midnight. */
export function formatTimeRange(start: string, end: string | undefined): string {
  const from = parseTimestamp(start);
  const to = end ? parseTimestamp(end) : undefined;
  if (!to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return `${formatTimestamp(start)} → ${formatTimestamp(end)}`;
  }
  const sameDay = from.toDateString() === to.toDateString();
  const endText = sameDay
    ? to.toLocaleTimeString(undefined, { timeStyle: 'short' })
    : to.toLocaleString(undefined, DATE_TIME);
  return `${from.toLocaleString(undefined, DATE_TIME)} → ${endText}`;
}

import { formatTimeRange, formatTimestamp } from './formatTimestamp';

describe('formatTimestamp', () => {
  it('formats a valid RFC 3339 timestamp without the raw ISO markers', () => {
    const out = formatTimestamp('2026-09-01T13:45:00Z');
    expect(out).toContain('2026');
    expect(out).not.toContain('T13');
  });

  it('reads a timestamp without a zone as UTC', () => {
    expect(formatTimestamp('2026-11-02T14:33:58.186022')).toBe(
      formatTimestamp('2026-11-02T14:33:58Z'),
    );
  });

  it('returns the raw string when unparseable', () => {
    expect(formatTimestamp('not-a-timestamp')).toBe('not-a-timestamp');
  });

  it('returns an em dash when missing', () => {
    expect(formatTimestamp(undefined)).toBe('—');
    expect(formatTimestamp('')).toBe('—');
  });
});

describe('formatTimeRange', () => {
  it('shows the date once for a same-day range', () => {
    const out = formatTimeRange('2026-11-02T14:33:58', '2026-11-02T14:38:51Z');
    expect(out.match(/2026/g)).toHaveLength(1);
    expect(out).toContain(' → ');
  });

  it('repeats the date when the range crosses days', () => {
    const out = formatTimeRange('2026-11-01T12:00:00Z', '2026-11-03T12:00:00Z');
    expect(out.match(/2026/g)).toHaveLength(2);
  });

  it('falls back per side when the end is missing', () => {
    expect(formatTimeRange('2026-11-02T14:33:58Z', undefined)).toMatch(/ → —$/);
  });
});

const BYTE_STEPS = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];

/** Suffix for units that need no scaling. */
const PLAIN_SUFFIX: Record<string, string> = {
  seconds: ' s',
  cores: ' cores',
  watts: ' W',
  percent: '%',
  tokens_per_sec: ' tok/s',
  requests: '',
};

const compact = (value: number): string => String(Number(value.toPrecision(3)));

function scaleBytes(value: number, startStep: number): { scaled: number; step: number } {
  let scaled = value;
  let step = startStep;
  while (Math.abs(scaled) >= 1024 && step < BYTE_STEPS.length - 1) {
    scaled /= 1024;
    step++;
  }
  return { scaled, step };
}

/**
 * Compact axis/tooltip value for a metric in the raw base unit the webhook
 * stores (`bytes`, `bytes_per_sec`, `MiB`, `cores`, `watts`, `percent`,
 * `seconds`, `requests`, `tokens_per_sec`); bytes-like units scale to
 * KiB/MiB/GiB. Unknown or missing units print the bare number.
 */
export function formatMetricValue(value: number, unit?: string): string {
  if (unit === 'bytes' || unit === 'bytes_per_sec' || unit === 'MiB') {
    const { scaled, step } = scaleBytes(value, unit === 'MiB' ? 2 : 0);
    return `${compact(scaled)} ${BYTE_STEPS[step]}${unit === 'bytes_per_sec' ? '/s' : ''}`;
  }
  return `${compact(value)}${unit ? (PLAIN_SUFFIX[unit] ?? '') : ''}`;
}

/**
 * Factor from a `resource_utilization.metrics` limit's display unit back to the
 * raw base unit the stored telemetry series (and so the charts) use. The
 * webhook scales limits the same way it scales that metric's stats
 * (postprocess.py's resource `unit_map`), so an 8 GiB limit is stored as `8`
 * while the series stays in bytes -- plotting them together needs this inverse.
 * ponytail: mirrors the webhook's unit_map by hand; add a row if it grows.
 */
const LIMIT_UNIT_TO_BASE: Record<string, number> = {
  GiB: 1024 ** 3, // -> bytes
  GB: 1e9, // -> bytes (older label)
  Mbps: 1e6 / 8, // -> bytes_per_sec
  MBps: 1e6, // -> bytes_per_sec
};

/** A limit in its stored display unit, expressed in the series' raw base unit. */
export const limitInSeriesUnit = (limit: number, displayUnit?: string): number =>
  limit * (displayUnit ? (LIMIT_UNIT_TO_BASE[displayUnit] ?? 1) : 1);

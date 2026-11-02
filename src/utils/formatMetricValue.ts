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

/** How a chart shows one metric: raw value / `factor`, then `suffix`. One scale per chart, so every tick and tooltip reads in the same unit. */
export interface MetricScale {
  factor: number;
  suffix: string;
}

/**
 * Throughput is stored in bytes/s, but the AIBOM's own stats -- and so the
 * Performance tables -- give network in Mbps and storage in MB/s. Chart them
 * the same way so a table value can be found on the chart.
 */
const THROUGHPUT_SCALES: Record<string, MetricScale> = {
  network_receive: { factor: 1e6 / 8, suffix: ' Mbps' },
  network_transmit: { factor: 1e6 / 8, suffix: ' Mbps' },
  storage_read_throughput: { factor: 1e6, suffix: ' MB/s' },
  storage_write_throughput: { factor: 1e6, suffix: ' MB/s' },
};

/**
 * The display scale for a chart whose largest value is `maxValue`, in the raw
 * base unit the webhook stores (`bytes`, `bytes_per_sec`, `MiB`, `cores`,
 * `watts`, `percent`, `seconds`, `requests`, `tokens_per_sec`). Bytes-like
 * units pick KiB/MiB/GiB from the maximum; unknown units print bare numbers.
 */
export function metricScale(maxValue: number, unit?: string, metricKey?: string): MetricScale {
  if (unit === 'bytes_per_sec' && metricKey && metricKey in THROUGHPUT_SCALES) {
    return THROUGHPUT_SCALES[metricKey];
  }
  if (unit === 'bytes' || unit === 'bytes_per_sec' || unit === 'MiB') {
    const startStep = unit === 'MiB' ? 2 : 0;
    const { step } = scaleBytes(maxValue, startStep);
    return {
      factor: 1024 ** (step - startStep),
      suffix: ` ${BYTE_STEPS[step]}${unit === 'bytes_per_sec' ? '/s' : ''}`,
    };
  }
  return { factor: 1, suffix: unit ? (PLAIN_SUFFIX[unit] ?? '') : '' };
}

export const formatScaled = (value: number, scale: MetricScale): string =>
  `${compact(value / scale.factor)}${scale.suffix}`;

/**
 * Below this, in display units, a series is float noise from `rate()` over an
 * idle counter (a storage-read series of 2e-10 B/s), charted as zero on a 0-1
 * axis instead of an axis labelled in e-10s.
 */
const NOISE_FLOOR = 1e-6;

/**
 * Y-axis ticks from 0 up past `maxValue`, about four steps of 1/2/2.5/5 x
 * 10^n in the display unit -- so 0 / 2 / 4 / 6 / 8 GiB rather than the
 * 1.86 / 3.73 GiB a byte-based tick picker lands on. Returned in raw units.
 */
export function yAxisTicks(maxValue: number, scale: MetricScale): number[] {
  const scaledMax = maxValue / scale.factor;
  const top = scaledMax > NOISE_FLOOR ? scaledMax : 1;
  const rough = top / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * magnitude >= rough) ?? 10) * magnitude;
  const count = Math.ceil(top / step - 1e-9);
  return Array.from({ length: count + 1 }, (_, i) => i * step * scale.factor);
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

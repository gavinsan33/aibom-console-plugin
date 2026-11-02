import { formatScaled, limitInSeriesUnit, metricScale, yAxisTicks } from './formatMetricValue';

describe('metricScale / formatScaled', () => {
  const fmt = (value: number, unit?: string, metricKey?: string) =>
    formatScaled(value, metricScale(value, unit, metricKey));

  it('scales bytes-like units', () => {
    expect(fmt(2048, 'bytes')).toBe('2 KiB');
    expect(fmt(1024 * 1024, 'bytes_per_sec')).toBe('1 MiB/s');
    expect(fmt(2048, 'MiB')).toBe('2 GiB');
    expect(fmt(512, 'MiB')).toBe('512 MiB');
  });

  it('shows network in Mbps and storage in MB/s, like the tables', () => {
    expect(fmt(1.25e6, 'bytes_per_sec', 'network_receive')).toBe('10 Mbps');
    expect(fmt(3e6, 'bytes_per_sec', 'storage_write_throughput')).toBe('3 MB/s');
  });

  it('adds suffixes for plain units', () => {
    expect(fmt(0.25, 'seconds')).toBe('0.25 s');
    expect(fmt(3.14159, 'cores')).toBe('3.14 cores');
    expect(fmt(250, 'watts')).toBe('250 W');
    expect(fmt(87.5, 'percent')).toBe('87.5%');
  });

  it('prints the bare number for unknown or missing units', () => {
    expect(fmt(3.14159)).toBe('3.14');
    expect(fmt(7, 'mystery')).toBe('7');
  });

  it('formats every value on one chart in the same unit', () => {
    const scale = metricScale(8 * 1024 ** 3, 'bytes');
    expect(formatScaled(512 * 1024 ** 2, scale)).toBe('0.5 GiB');
  });
});

describe('yAxisTicks', () => {
  const labels = (max: number, unit?: string, metricKey?: string) => {
    const scale = metricScale(max, unit, metricKey);
    return yAxisTicks(max, scale).map((tick) => formatScaled(tick, scale));
  };

  it('puts ticks on round numbers in the display unit', () => {
    expect(labels(8 * 1024 ** 3, 'bytes')).toEqual(['0 GiB', '2 GiB', '4 GiB', '6 GiB', '8 GiB']);
    expect(labels(80, 'percent')).toEqual(['0%', '20%', '40%', '60%', '80%']);
    expect(labels(2, 'cores')).toEqual(['0 cores', '0.5 cores', '1 cores', '1.5 cores', '2 cores']);
  });

  it('reaches past the maximum', () => {
    expect(labels(48.8 * 1024 ** 3, 'bytes')).toEqual(['0 GiB', '20 GiB', '40 GiB', '60 GiB']);
  });

  it('treats float noise as zero instead of an axis of e-10s', () => {
    expect(labels(2e-10, 'bytes_per_sec', 'storage_read_throughput')).toEqual([
      '0 MB/s',
      '0.25 MB/s',
      '0.5 MB/s',
      '0.75 MB/s',
      '1 MB/s',
    ]);
    expect(labels(0, 'requests')).toEqual(['0', '0.25', '0.5', '0.75', '1']);
  });
});

describe('limitInSeriesUnit', () => {
  it('scales display-unit limits back to the series raw base unit', () => {
    expect(limitInSeriesUnit(8, 'GiB')).toBe(8 * 1024 ** 3); // -> bytes
    expect(limitInSeriesUnit(8, 'GB')).toBe(8e9);
    expect(limitInSeriesUnit(1000, 'Mbps')).toBe(1000 * (1e6 / 8)); // -> bytes_per_sec
    expect(limitInSeriesUnit(50, 'MBps')).toBe(50e6);
  });

  it('leaves unscaled and unknown/missing units as-is', () => {
    expect(limitInSeriesUnit(4, 'cores')).toBe(4);
    expect(limitInSeriesUnit(250, 'watts')).toBe(250);
    expect(limitInSeriesUnit(5, 'mystery')).toBe(5);
    expect(limitInSeriesUnit(5)).toBe(5);
  });
});

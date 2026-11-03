import type { StoredMetric } from '../types/telemetrySeries';
import { groupLimits, linesFromStored, sharedElapsedMax } from './compareLines';

const metric: StoredMetric = {
  unit: 'bytes',
  aggregation: 'sum',
  aggregate: [
    [100, 3],
    [130, 5],
  ],
  series: [
    { labels: { pod: 'a' }, points: [[100, 1]] },
    { labels: { pod: 'b' }, points: [[100, 2]] },
  ],
};

describe('linesFromStored', () => {
  it('draws one aggregate line relative to the window start by default', () => {
    expect(linesFromStored(metric, 100, false, 'run', 2)).toEqual([
      {
        name: 'run',
        colorIndex: 2,
        points: [
          { x: 0, y: 3 },
          { x: 30, y: 5 },
        ],
      },
    ]);
  });

  it('expands to one dashed-variant line per series in the same color', () => {
    const lines = linesFromStored(metric, 100, true, 'run', 2);
    expect(lines.map((l) => l.name)).toEqual(['run · a', 'run · b']);
    expect(new Set(lines.map((l) => l.colorIndex))).toEqual(new Set([2]));
    expect(lines[0].dash).toBeUndefined();
    expect(lines[1].dash).toBe('6 3');
  });

  it('stays aggregated when the series were omitted or there is only one', () => {
    expect(linesFromStored({ ...metric, series_omitted: true }, 100, true, 'run', 0)).toHaveLength(
      1,
    );
    expect(
      linesFromStored({ ...metric, series: metric.series?.slice(0, 1) }, 100, true, 'r', 0),
    ).toHaveLength(1);
  });
});

describe('sharedElapsedMax', () => {
  it('is the longest window across runs', () => {
    expect(
      sharedElapsedMax([
        { windowStart: 100, windowEnd: 700 },
        { windowStart: 5000, windowEnd: 6300 },
      ]),
    ).toBe(1300);
  });

  it('ignores runs that do not know their window end', () => {
    expect(sharedElapsedMax([{ windowStart: 100 }, { windowStart: 0, windowEnd: 90 }])).toBe(90);
  });

  it('is undefined when no run has a usable window', () => {
    expect(sharedElapsedMax([{ windowStart: 100 }])).toBeUndefined();
    expect(sharedElapsedMax([{ windowStart: 100, windowEnd: 100 }])).toBeUndefined();
    expect(sharedElapsedMax([])).toBeUndefined();
  });
});

describe('groupLimits', () => {
  const a = { name: 'a', colorIndex: 0 };
  const b = { name: 'b', colorIndex: 1 };
  const c = { name: 'c', colorIndex: 2 };

  it('is one unnamed line when every run has the same limit', () => {
    expect(
      groupLimits([
        { ...a, limit: 2 },
        { ...b, limit: 2 },
      ]),
    ).toEqual([{ value: 2 }]);
  });

  it('names the runs per distinct limit, highest first, leaving out runs with none', () => {
    expect(
      groupLimits([
        { ...a, limit: 2 },
        { ...b, limit: 4 },
        { ...c, limit: 2 },
        { name: 'd', colorIndex: 3 },
      ]),
    ).toEqual([
      { value: 4, runs: [b] },
      { value: 2, runs: [a, c] },
    ]);
  });

  it('names the runs when only some have the shared limit', () => {
    expect(groupLimits([{ ...a, limit: 2 }, b])).toEqual([{ value: 2, runs: [a] }]);
  });

  it('is empty when no run has a limit', () => {
    expect(groupLimits([a, { ...b, limit: 0 }])).toEqual([]);
  });
});

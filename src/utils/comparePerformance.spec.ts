import type { AIBOMResource } from '../types/aibom';
import { buildPerformanceRows, INFERENCE } from './comparePerformance';

function withInference(metrics: Record<string, number>): AIBOMResource {
  return {
    spec: {
      data: {
        inference: {
          performance: {
            metrics: Object.fromEntries(
              Object.entries(metrics).map(([k, avg]) => [k, { avg, unit: 's' }]),
            ),
          },
        },
      },
    },
  };
}

function withMetric(avg: number, note?: string): AIBOMResource {
  return {
    spec: {
      data: {
        resource_utilization: {
          note,
          metrics: { gpu_utilization: { avg, unit: '%' } },
        },
      },
    },
  };
}

describe('buildPerformanceRows', () => {
  it('computes delta and pct-change for exactly two items', () => {
    const rows = buildPerformanceRows([withMetric(50), withMetric(75)]);
    const gpu = rows.find((r) => r.metricKey === 'gpu_utilization');
    expect(gpu?.delta).toBe(25);
    expect(gpu?.pctChange).toBeCloseTo(50);
  });

  it('treats a zero starting value as an undefined pct-change, not NaN/Infinity', () => {
    const rows = buildPerformanceRows([withMetric(0), withMetric(10)]);
    const gpu = rows.find((r) => r.metricKey === 'gpu_utilization');
    expect(gpu?.delta).toBe(10);
    expect(gpu?.pctChange).toBeUndefined();
  });

  it('omits delta/pct-change when more than two items are compared', () => {
    const rows = buildPerformanceRows([withMetric(10), withMetric(20), withMetric(30)]);
    const gpu = rows.find((r) => r.metricKey === 'gpu_utilization');
    expect(gpu?.delta).toBeUndefined();
    expect(gpu?.pctChange).toBeUndefined();
    expect(gpu?.values).toHaveLength(3);
  });

  it('flags a cell unavailable when that item has a resource_utilization note', () => {
    const rows = buildPerformanceRows([withMetric(50), withMetric(0, 'telemetry unavailable')]);
    const gpu = rows.find((r) => r.metricKey === 'gpu_utilization');
    expect(gpu?.values[0].unavailable).toBe(false);
    expect(gpu?.values[1].unavailable).toBe(true);
  });

  it('flags an inference metric unavailable per metric, with no delta against it', () => {
    // TGI exports no TTFT: it must blank, not diff as -100% against vLLM's.
    const vllm = withInference({ time_to_first_token_seconds: 0.12, generation_throughput: 100 });
    const tgi = withInference({ generation_throughput: 150 });
    const rows = buildPerformanceRows([vllm, tgi], INFERENCE);
    const ttft = rows.find((r) => r.metricKey === 'time_to_first_token_seconds');
    const gen = rows.find((r) => r.metricKey === 'generation_throughput');
    expect(ttft?.values.map((v) => v.unavailable)).toEqual([false, true]);
    expect(ttft?.delta).toBeUndefined();
    expect(ttft?.pctChange).toBeUndefined();
    expect(gen?.delta).toBe(50);
    expect(gen?.pctChange).toBeCloseTo(50);
  });
});

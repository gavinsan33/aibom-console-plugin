import type { AIBOMResource } from '../types/aibom';
import {
  HARDWARE_METRIC_LABELS,
  HARDWARE_METRIC_ORDER,
  INFERENCE_METRIC_LABELS,
  INFERENCE_METRIC_ORDER,
} from '../types/aibom';
import {
  getInferenceMetricAvg,
  getInferenceMetricUnit,
  getMetricAvg,
  getMetricUnit,
  getResourceUtilizationNote,
  hasInferenceMetric,
} from './aibomFields';

export interface PerformanceCell {
  avg: number;
  unit: string;
  /** True when this item has no value for this metric (hardware: `resource_utilization.note` set; inference: the engine didn't export it) -- the avg is a meaningless 0 in that case, render "—" instead. */
  unavailable: boolean;
}

export interface PerformanceRow {
  metricKey: string;
  label: string;
  values: PerformanceCell[];
  /** Only populated when exactly 2 items are compared, mirroring `oc-aibom diff`'s pairwise-only Delta/% Change columns. */
  delta?: number;
  pctChange?: number;
}

export interface MetricSet {
  order: readonly string[];
  labels: Record<string, string>;
  getAvg: (a: AIBOMResource, key: string) => number;
  getUnit: (a: AIBOMResource, key: string) => string;
  unavailable: (a: AIBOMResource, key: string) => boolean;
}

const HARDWARE: MetricSet = {
  order: HARDWARE_METRIC_ORDER,
  labels: HARDWARE_METRIC_LABELS,
  getAvg: getMetricAvg,
  getUnit: getMetricUnit,
  unavailable: (a) => getResourceUtilizationNote(a) !== '',
};

export const INFERENCE: MetricSet = {
  order: INFERENCE_METRIC_ORDER,
  labels: INFERENCE_METRIC_LABELS,
  getAvg: getInferenceMetricAvg,
  getUnit: getInferenceMetricUnit,
  // Per metric: engines export different subsets (TGI has no TTFT, KV-cache
  // or prompt throughput), so a run with some inference metrics can still
  // lack this one.
  unavailable: (a, key) => !hasInferenceMetric(a, key),
};

/**
 * One row per metric (hardware by default), one value per selected item --
 * mirrors `oc-aibom`'s `DiffPerformance` (2 items: value + delta/pct-change)
 * and `compare` (N items: value only), unified into a single N-scalable shape.
 * Pass `INFERENCE` for the serving-engine metrics instead.
 */
export function buildPerformanceRows(
  items: AIBOMResource[],
  set: MetricSet = HARDWARE,
): PerformanceRow[] {
  return set.order.map((metricKey) => {
    const values = items.map((item) => ({
      avg: set.getAvg(item, metricKey),
      unit: set.getUnit(item, metricKey),
      unavailable: set.unavailable(item, metricKey),
    }));

    const row: PerformanceRow = {
      metricKey,
      label: set.labels[metricKey] ?? metricKey,
      values,
    };

    // No delta against a run without data: its 0 is a placeholder.
    if (items.length === 2 && !values[0].unavailable && !values[1].unavailable) {
      const [a, b] = values;
      row.delta = b.avg - a.avg;
      row.pctChange = a.avg === 0 ? undefined : ((b.avg - a.avg) / a.avg) * 100;
    }

    return row;
  });
}

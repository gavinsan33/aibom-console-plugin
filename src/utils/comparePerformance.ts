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
  hasNoInferenceMetrics,
} from './aibomFields';

export interface PerformanceCell {
  avg: number;
  unit: string;
  /** True when this item's own telemetry was unavailable (`resource_utilization.note` set) -- the avg is a meaningless 0 in that case, render "—" instead. */
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
  unavailable: (a: AIBOMResource) => boolean;
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
  unavailable: hasNoInferenceMetrics,
};

/**
 * One row per metric (hardware by default), one value per selected item --
 * mirrors `oc-aibom`'s `DiffPerformance` (2 items: value + delta/pct-change)
 * and `compare` (N items: value only), unified into a single N-scalable shape.
 * Pass `INFERENCE` for the vLLM serving metrics instead.
 */
export function buildPerformanceRows(
  items: AIBOMResource[],
  set: MetricSet = HARDWARE,
): PerformanceRow[] {
  return set.order.map((metricKey) => {
    const values = items.map((item) => ({
      avg: set.getAvg(item, metricKey),
      unit: set.getUnit(item, metricKey),
      unavailable: set.unavailable(item),
    }));

    const row: PerformanceRow = {
      metricKey,
      label: set.labels[metricKey] ?? metricKey,
      values,
    };

    if (items.length === 2) {
      const [a, b] = values;
      row.delta = b.avg - a.avg;
      row.pctChange = a.avg === 0 ? undefined : ((b.avg - a.avg) / a.avg) * 100;
    }

    return row;
  });
}

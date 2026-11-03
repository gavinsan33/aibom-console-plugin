import type { AIBOMResource } from '../types/aibom';
import {
  getAibomVersion,
  getArchitecture,
  getCudaVersion,
  getDeclaredDatasetLicense,
  getDeclaredDatasetName,
  getDeclaredDatasetVersion,
  getDirty,
  getDriverVersion,
  getDtype,
  getEnvironmentFrameworkVersion,
  getExperimentIntent,
  getFramework,
  getGitBranch,
  getGitCommit,
  getGitRepository,
  getGpuCount,
  getGpuType,
  getJobName,
  getLibraries,
  getLrScheduler,
  getModelName,
  getModelRevision,
  getModelVersion,
  getOptimizer,
  getPythonVersion,
  getQuantization,
  getTorchCudaVersion,
  hasDatasetDrift,
} from './aibomFields';
import {
  formatDeepSpeed,
  formatFsdp,
  formatParallelism,
  formatParallelSizes,
  formatTopology,
} from './trainingFields';

const training = (a: AIBOMResource) => a.spec?.data?.training;

export interface FieldRow {
  label: string;
  values: string[];
  /** True when not every selected item has the same value for this field. */
  differs: boolean;
}

/** One row per field `oc-aibom`'s `Diff` compares, applied across N items instead of just 2. */
const FIELD_ACCESSORS: { label: string; getValue: (a: AIBOMResource) => string }[] = [
  { label: 'Job', getValue: getJobName },
  { label: 'Experiment Intent', getValue: getExperimentIntent },
  { label: 'Model Name', getValue: getModelName },
  { label: 'Model Version', getValue: getModelVersion },
  { label: 'Model Revision', getValue: getModelRevision },
  { label: 'Architecture', getValue: getArchitecture },
  { label: 'Framework', getValue: getFramework },
  { label: 'Quantization', getValue: getQuantization },
  { label: 'Dtype', getValue: getDtype },
  { label: 'Declared Dataset', getValue: getDeclaredDatasetName },
  { label: 'Declared Dataset Version', getValue: getDeclaredDatasetVersion },
  { label: 'Declared Dataset License', getValue: getDeclaredDatasetLicense },
  { label: 'Dataset Drift', getValue: (a) => String(hasDatasetDrift(a)) },
  { label: 'Git Repository', getValue: getGitRepository },
  { label: 'Git Commit', getValue: getGitCommit },
  { label: 'Git Branch', getValue: getGitBranch },
  { label: 'Dirty', getValue: (a) => String(getDirty(a)) },
  { label: 'Optimizer', getValue: getOptimizer },
  { label: 'LR Scheduler', getValue: getLrScheduler },
  { label: 'Mixed Precision', getValue: (a) => training(a)?.mixed_precision ?? '' },
  { label: 'Parallelism', getValue: (a) => formatParallelism(training(a)) },
  { label: 'Topology', getValue: (a) => formatTopology(training(a)?.distributed) },
  { label: 'Parallel Sizes', getValue: (a) => formatParallelSizes(training(a)?.distributed) },
  { label: 'FSDP', getValue: (a) => formatFsdp(training(a)?.distributed?.fsdp) },
  { label: 'DeepSpeed', getValue: (a) => formatDeepSpeed(training(a)?.distributed?.deepspeed) },
  { label: 'GPU Type', getValue: getGpuType },
  { label: 'GPU Count', getValue: (a) => String(getGpuCount(a)) },
  { label: 'CUDA Version', getValue: getCudaVersion },
  { label: 'Driver Version', getValue: getDriverVersion },
  { label: 'Framework Version', getValue: getEnvironmentFrameworkVersion },
  { label: 'Python Version', getValue: getPythonVersion },
  { label: 'Torch CUDA Version', getValue: getTorchCudaVersion },
  { label: 'Libraries', getValue: getLibraries },
  { label: 'AIBOM Version', getValue: getAibomVersion },
];

/**
 * Each run's Libraries narrowed to the libraries whose version isn't the same
 * in every run ("not imported" where a run didn't import it), plus how many others
 * match, so a one-library change isn't a whole differing list. Runs that
 * recorded no libraries stay empty and don't count. As oc-aibom's
 * libraryDifferences.
 */
export function libraryDifferences(items: AIBOMResource[]): string[] {
  const libraries: Record<string, string>[] = items.map(
    (a) => a.spec?.data?.environment?.libraries ?? {},
  );
  const recorded = libraries.filter((libs) => Object.keys(libs).length > 0);
  const names = Array.from(new Set(recorded.flatMap((libs) => Object.keys(libs))));
  const differing = names
    .filter((name) => new Set(recorded.map((libs) => libs[name] ?? 'not imported')).size > 1)
    .sort();
  const same = names.length - differing.length;
  return libraries.map((libs) => {
    if (Object.keys(libs).length === 0) return '';
    const list = differing.map((name) => `${name} ${libs[name] ?? 'not imported'}`).join(', ');
    return same > 0 ? `${list} (+${String(same)} identical)` : list;
  });
}

export function buildFieldRows(items: AIBOMResource[]): FieldRow[] {
  return FIELD_ACCESSORS.map(({ label, getValue }) => {
    const values = items.map(getValue);
    const differs = new Set(values).size > 1;
    return {
      label,
      values: label === 'Libraries' && differs ? libraryDifferences(items) : values,
      differs,
    };
  });
}

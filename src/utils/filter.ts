import type { AIBOMResource } from '../types/aibom';
import {
  getAdaptationMethod,
  getArchitecture,
  getFramework,
  getGitBranch,
  getGitRepository,
  getGpuType,
  getJobName,
  getModelName,
  getOptimizer,
  getQuantization,
  getServingEngine,
  hasDatasetDrift,
  hasFineTuning,
  hasInference,
  hasTraining,
  getExperimentIntent,
} from './aibomFields';

/**
 * Narrows a list of AIBOMs by case-insensitive substring match on the given
 * criteria (the toolbar searches within one field at a time). Empty/undefined
 * fields are not filtered on. Mirrors `oc-aibom`'s interactive live filter.
 */
export interface AIBOMFilter {
  model?: string;
  intent?: string;
  quantization?: string;
  architecture?: string;
  framework?: string;
  gpuType?: string;
  jobName?: string;
  gitBranch?: string;
  gitRepository?: string;
  servingEngine?: string;
  adaptationMethod?: string;
  optimizer?: string;
  driftOnly?: boolean;
}

const contains = (haystack: string, needle: string): boolean =>
  haystack.toLowerCase().includes(needle.toLowerCase());

export function matchesFilter(a: AIBOMResource, f: AIBOMFilter): boolean {
  if (f.model && !contains(getModelName(a), f.model)) return false;
  if (f.intent && !contains(getExperimentIntent(a), f.intent)) return false;
  if (f.quantization && !contains(getQuantization(a), f.quantization)) return false;
  if (f.architecture && !contains(getArchitecture(a), f.architecture)) return false;
  if (f.framework && !contains(getFramework(a), f.framework)) return false;
  if (f.gpuType && !contains(getGpuType(a), f.gpuType)) return false;
  if (f.jobName && !contains(getJobName(a), f.jobName)) return false;
  if (f.gitBranch && !contains(getGitBranch(a), f.gitBranch)) return false;
  if (f.gitRepository && !contains(getGitRepository(a), f.gitRepository)) return false;
  if (f.servingEngine && (!hasInference(a) || !contains(getServingEngine(a), f.servingEngine)))
    return false;
  if (
    f.adaptationMethod &&
    (!hasFineTuning(a) || !contains(getAdaptationMethod(a), f.adaptationMethod))
  )
    return false;
  if (f.optimizer && (!hasTraining(a) || !contains(getOptimizer(a), f.optimizer))) return false;
  if (f.driftOnly && !hasDatasetDrift(a)) return false;
  return true;
}

export function applyFilter(items: AIBOMResource[], f: AIBOMFilter): AIBOMResource[] {
  return items.filter((a) => matchesFilter(a, f));
}

import type { AIBOMData } from '../types/aibom';

type Training = NonNullable<AIBOMData['training']>;

/** Mirrors `oc-aibom`'s describe output, so the CLI and console show the same strings. */
export const formatSettingValue = (value: unknown): string => {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(formatSettingValue).join(', ')}]`;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

/** `"k=v, ..."` in key order. */
export const formatSettings = (settings?: Record<string, unknown>): string =>
  Object.keys(settings ?? {})
    .sort()
    .map((k) => `${k}=${formatSettingValue(settings?.[k])}`)
    .join(', ');

/** One string per param group: its settings plus its `(N tensors)` count. */
export const formatParamGroups = (groups?: Record<string, unknown>[]): string[] =>
  (groups ?? []).map((g) => {
    const { param_tensors: tensors, ...settings } = g;
    const text = formatSettings(settings);
    return tensors === undefined ? text : `${text} (${formatSettingValue(tensors)} tensors)`;
  });

const SEED_GENERATORS = ['python', 'numpy', 'torch'];

/** python, numpy, torch first (what the webhook records), then anything else by name. */
const generatorOrder = (keys: string[]): string[] => [
  ...SEED_GENERATORS.filter((g) => keys.includes(g)),
  ...keys.filter((k) => !SEED_GENERATORS.includes(k)).sort(),
];

export const formatSeeds = (seeds?: Record<string, number | string>): string =>
  generatorOrder(Object.keys(seeds ?? {}))
    .map((g) => `${g}=${formatSettingValue(seeds?.[g])}`)
    .join(', ');

export const formatSeedHistory = (history?: Record<string, (number | string)[]>): string =>
  generatorOrder(Object.keys(history ?? {}))
    .map((g) => `${g}: ${(history?.[g] ?? []).map(formatSettingValue).join(' → ')}`)
    .join('; ');

export const formatDeterminismFlags = (d: NonNullable<Training['determinism']>): string => {
  const flags: string[] = [];
  if (d.cudnn_deterministic != null)
    flags.push(`cudnn deterministic ${String(d.cudnn_deterministic)}`);
  if (d.cudnn_benchmark != null) flags.push(`cudnn benchmark ${String(d.cudnn_benchmark)}`);
  if (d.deterministic_algorithms != null) {
    flags.push(
      `deterministic algorithms ${String(d.deterministic_algorithms)}${
        d.deterministic_algorithms_warn_only ? ' (warn only)' : ''
      }`,
    );
  }
  if (d.full_determinism) flags.push('full determinism');
  return flags.join(', ');
};

export const formatLrScheduler = (s: NonNullable<Training['lr_scheduler']>): string =>
  [
    s.type,
    s.warmup_ratio != null ? `warmup ratio ${String(s.warmup_ratio)}` : undefined,
    s.warmup_steps != null ? `warmup steps ${String(s.warmup_steps)}` : undefined,
  ]
    .filter(Boolean)
    .join(', ');

export const withVia = (value: string, via?: string): string =>
  value && via ? `${value} (via: ${via})` : value;

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

type Precision = NonNullable<Training['precision']>;

/** `"matmul true, cudnn true, float32 matmul precision high"`, as `oc aibom describe` prints it. */
export const formatTf32 = (p: Precision): string =>
  [
    p.tf32_matmul != null ? `matmul ${String(p.tf32_matmul)}` : undefined,
    p.tf32_cudnn != null ? `cudnn ${String(p.tf32_cudnn)}` : undefined,
    p.float32_matmul_precision
      ? `float32 matmul precision ${p.float32_matmul_precision}`
      : undefined,
  ]
    .filter(Boolean)
    .join(', ');

export const formatFp8 = (fp8: NonNullable<Precision['fp8']>): string =>
  `${fp8.backend ?? 'unknown backend'}${fp8.recipe ? ` (recipe ${fp8.recipe})` : ''}`;

/** `"MixedPrecision: param bfloat16, reduce float32, buffer bfloat16"`. */
export const formatFsdpPrecision = (f: NonNullable<Precision['fsdp_mixed_precision']>): string => {
  const dtypes = (
    [
      ['param', f.param_dtype],
      ['reduce', f.reduce_dtype],
      ['buffer', f.buffer_dtype],
      ['output', f.output_dtype],
    ] as const
  )
    .filter(([, d]) => d)
    .map(([label, d]) => `${label} ${String(d)}`)
    .join(', ');
  if (f.policy && dtypes) return `${f.policy}: ${dtypes}`;
  return f.policy ?? dtypes;
};

type Distributed = NonNullable<Training['distributed']>;

// Without `(via: ...)`: the Training section adds it, the compare page
// doesn't, so runs differing only in the source don't read as different.
// Same strings as oc-aibom's internal/aibom/distributed.go.

const plural = (n: number, one: string, many: string): string =>
  n === 1 ? `1 ${one}` : `${String(n)} ${many}`;
const orEnabled = (parts: (string | undefined)[]): string =>
  parts.filter(Boolean).join(', ') || 'enabled';

/** `"fsdp + tensor_parallel"`. */
export const formatParallelism = (d?: Distributed | null): string =>
  d?.strategies?.join(' + ') ?? '';

/** `"8 processes, 2 nodes, 4 per node"`. */
export const formatTopology = (d?: Distributed | null): string =>
  d
    ? [
        d.world_size != null ? plural(d.world_size, 'process', 'processes') : undefined,
        d.nodes != null ? plural(d.nodes, 'node', 'nodes') : undefined,
        d.processes_per_node != null ? `${String(d.processes_per_node)} per node` : undefined,
      ]
        .filter(Boolean)
        .join(', ')
    : '';

/** `"tensor 2, data 4"`. */
export const formatParallelSizes = (d?: Distributed | null): string =>
  d
    ? (
        [
          ['tensor', d.tensor_parallel_size],
          ['pipeline', d.pipeline_parallel_size],
          ['context', d.context_parallel_size],
          ['expert', d.expert_parallel_size],
          ['data', d.data_parallel_size],
        ] as const
      )
        .filter(([, v]) => v != null)
        .map(([name, v]) => `${name} ${String(v)}`)
        .join(', ')
    : '';

/** `"FSDP2, reshard after forward true, CPU offload false"`, or `"enabled"`. */
export const formatFsdp = (f?: Distributed['fsdp']): string =>
  f
    ? orEnabled([
        f.version != null ? `FSDP${String(f.version)}` : undefined,
        f.sharding_strategy,
        f.reshard_after_forward != null
          ? `reshard after forward ${String(f.reshard_after_forward)}`
          : undefined,
        f.cpu_offload != null ? `CPU offload ${String(f.cpu_offload)}` : undefined,
      ])
    : '';

/** `"ZeRO-3, optimizer offload cpu"`, or `"enabled"`. */
export const formatDeepSpeed = (z?: Distributed['deepspeed']): string =>
  z
    ? orEnabled([
        z.zero_stage != null ? `ZeRO-${String(z.zero_stage)}` : undefined,
        z.offload_optimizer ? `optimizer offload ${z.offload_optimizer}` : undefined,
        z.offload_param ? `param offload ${z.offload_param}` : undefined,
      ])
    : '';

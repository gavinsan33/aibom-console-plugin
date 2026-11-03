import type { AIBOMResource } from '../types/aibom';
import { buildFieldRows } from './compareFields';

function withModel(name: string, version: string): AIBOMResource {
  return { spec: { data: { model: { name, version } } } };
}

describe('buildFieldRows', () => {
  it('marks a field as not differing when all items agree', () => {
    const rows = buildFieldRows([withModel('granite', '1.0'), withModel('granite', '1.0')]);
    const modelName = rows.find((r) => r.label === 'Model Name');
    expect(modelName?.differs).toBe(false);
    expect(modelName?.values).toEqual(['granite', 'granite']);
  });

  it('marks a field as differing when values disagree', () => {
    const rows = buildFieldRows([withModel('granite', '1.0'), withModel('granite', '2.0')]);
    const modelVersion = rows.find((r) => r.label === 'Model Version');
    expect(modelVersion?.differs).toBe(true);
    expect(modelVersion?.values).toEqual(['1.0', '2.0']);
  });

  it('flags a changed model revision for a same-name model', () => {
    const at = (revision: string): AIBOMResource => ({
      spec: { data: { model: { name: 'Qwen/Qwen2.5-32B-Instruct', revision } } },
    });
    const rows = buildFieldRows([at('5ede1c97'), at('a1b2c3d4')]);
    const revision = rows.find((r) => r.label === 'Model Revision');
    expect(revision?.differs).toBe(true);
    expect(revision?.values).toEqual(['5ede1c97', 'a1b2c3d4']);
  });

  it('does not flag unrelated fields as differing', () => {
    const rows = buildFieldRows([withModel('granite', '1.0'), withModel('granite', '2.0')]);
    const modelName = rows.find((r) => r.label === 'Model Name');
    expect(modelName?.differs).toBe(false);
  });

  it('computes dataset drift independently per item', () => {
    const clean: AIBOMResource = {
      spec: { data: { dataset: { auto_detected: [{ matches_declared: true }] } } },
    };
    const drifted: AIBOMResource = {
      spec: { data: { dataset: { auto_detected: [{ matches_declared: false }] } } },
    };
    const rows = buildFieldRows([clean, drifted]);
    const drift = rows.find((r) => r.label === 'Dataset Drift');
    expect(drift?.values).toEqual(['false', 'true']);
    expect(drift?.differs).toBe(true);
  });

  it('scales to more than two items', () => {
    const rows = buildFieldRows([withModel('a', '1'), withModel('b', '1'), withModel('c', '1')]);
    const modelName = rows.find((r) => r.label === 'Model Name');
    expect(modelName?.values).toEqual(['a', 'b', 'c']);
    expect(modelName?.differs).toBe(true);
  });
});

describe('buildFieldRows training and software rows', () => {
  it('compares optimizer, scheduler and library versions like oc-aibom', () => {
    const run = (scheduler: string, trl: string): AIBOMResource => ({
      spec: {
        data: {
          training: { optimizer: 'adamw_torch', lr_scheduler: { type: scheduler } },
          environment: {
            python_version: '3.12.3',
            torch_cuda_version: '12.8',
            libraries: { trl, torch: '2.9.0' },
          },
        },
      },
    });
    const inference: AIBOMResource = { spec: { data: {} } };
    const rows = buildFieldRows([run('cosine', '0.24.0'), run('linear', '0.25.0'), inference]);
    const values = (label: string) => rows.find((r) => r.label === label)?.values;
    expect(values('Optimizer')).toEqual(['adamw_torch', 'adamw_torch', '']);
    expect(values('LR Scheduler')).toEqual(['cosine', 'linear', '']);
    expect(values('Python Version')).toEqual(['3.12.3', '3.12.3', '']);
    expect(values('Torch CUDA Version')).toEqual(['12.8', '12.8', '']);
    // Only the differing library; the run with none recorded stays empty.
    expect(values('Libraries')).toEqual([
      'trl 0.24.0 (+1 identical)',
      'trl 0.25.0 (+1 identical)',
      '',
    ]);
  });
});

describe('buildFieldRows parallelism and precision rows', () => {
  it('compares them without where each was found, like oc-aibom', () => {
    const fsdp: AIBOMResource = {
      spec: {
        data: {
          training: {
            mixed_precision: 'bf16',
            mixed_precision_declared_via: 'accelerator',
            parallelization_strategy: 'fsdp',
            distributed: {
              world_size: 3,
              nodes: 1,
              processes_per_node: 3,
              world_declared_via: 'environment',
              fsdp: {
                version: 2,
                reshard_after_forward: true,
                cpu_offload: false,
                declared_via: 'fsdp_module',
              },
              strategies: ['fsdp'],
            },
          },
        },
      },
    };
    const deepspeed: AIBOMResource = {
      spec: {
        data: {
          training: {
            mixed_precision: 'bf16',
            mixed_precision_declared_via: 'deepspeed',
            parallelization_strategy: 'deepspeed',
            distributed: {
              world_size: 2,
              nodes: 1,
              processes_per_node: 2,
              world_declared_via: 'cli_arg',
              deepspeed: { zero_stage: 3, offload_optimizer: 'cpu', offload_param: 'none' },
              strategies: ['deepspeed'],
            },
          },
        },
      },
    };
    const rows = buildFieldRows([fsdp, deepspeed, { spec: { data: {} } }]);
    const row = (label: string) => rows.find((r) => r.label === label);
    expect(row('Mixed Precision')?.values).toEqual(['bf16', 'bf16', '']);
    expect(row('Parallelization')?.values).toEqual(['fsdp', 'deepspeed', '']);
    expect(row('Parallelism')?.values).toEqual(['fsdp', 'deepspeed', '']);
    expect(row('Topology')?.values).toEqual([
      '3 processes, 1 node, 3 per node',
      '2 processes, 1 node, 2 per node',
      '',
    ]);
    expect(row('FSDP')?.values).toEqual([
      'FSDP2, reshard after forward true, CPU offload false',
      '',
      '',
    ]);
    expect(row('DeepSpeed')?.values).toEqual([
      '',
      'ZeRO-3, optimizer offload cpu, param offload none',
      '',
    ]);
    expect(buildFieldRows([fsdp, fsdp]).some((r) => r.differs)).toBe(false);
  });
});

describe('buildFieldRows Libraries row', () => {
  const run = (libraries: Record<string, string>): AIBOMResource => ({
    spec: { data: { environment: { libraries } } },
  });
  const same = { torch: '2.11.0', trl: '1.17.1' };

  it('lists every library when they all match', () => {
    const row = buildFieldRows([run(same), run(same)]).find((r) => r.label === 'Libraries');
    expect(row).toMatchObject({
      differs: false,
      values: ['torch 2.11.0, trl 1.17.1', 'torch 2.11.0, trl 1.17.1'],
    });
  });

  it('narrows to the libraries that differ', () => {
    const row = buildFieldRows([
      run(same),
      run({ ...same, deepspeed: '0.19.9', peft: '0.21.2' }),
      run({ ...same, peft: '0.20.0' }),
    ]).find((r) => r.label === 'Libraries');
    expect(row?.values).toEqual([
      'deepspeed —, peft — (+2 identical)',
      'deepspeed 0.19.9, peft 0.21.2 (+2 identical)',
      'deepspeed —, peft 0.20.0 (+2 identical)',
    ]);
  });
});

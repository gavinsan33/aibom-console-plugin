import { render, screen } from '@testing-library/react';
import type { AIBOMData } from '../../types/aibom';
import AIBOMTrainingSection from './AIBOMTrainingSection';

// As aibom-webhook-service's postprocess writes it for a Trainer run with
// weight decay (two param groups) and a reseeded torch RNG.
const observed: AIBOMData['training'] = {
  optimizer: 'adamw_torch_fused',
  optimizer_config: {
    class: 'torch.optim.adamw.AdamW',
    params: { lr: 0.0003, betas: [0.9, 0.95], eps: 1e-8, fused: true },
    param_groups: [
      { weight_decay: 0.1, param_tensors: 6 },
      { weight_decay: 0, param_tensors: 10 },
    ],
    declared_via: 'runtime_optimizer',
  },
  lr_scheduler: { type: 'cosine', warmup_steps: 0.05, declared_via: 'training_arguments' },
  mixed_precision: 'bf16',
  determinism: {
    seeds: { torch: 1234, python: 42, numpy: 42 },
    seed_history: { torch: [42, 1234] },
    data_seed: 7,
    full_determinism: true,
    cudnn_deterministic: true,
    cudnn_benchmark: false,
    deterministic_algorithms: true,
    deterministic_algorithms_warn_only: true,
    cublas_workspace_config: ':4096:8',
    python_hash_seed: '0',
  },
};

describe('AIBOMTrainingSection', () => {
  it('shows the observed optimizer, scheduler and determinism', () => {
    render(<AIBOMTrainingSection training={observed} />);
    for (const text of [
      'torch.optim.adamw.AdamW (via: runtime_optimizer)',
      'betas=[0.9, 0.95], eps=1e-8, fused=true, lr=0.0003',
      'weight_decay=0.1 (6 tensors)',
      'weight_decay=0 (10 tensors)',
      'cosine, warmup steps 0.05 (via: training_arguments)',
      'bf16',
      'python=42, numpy=42, torch=1234',
      'torch: 42 → 1234',
      'cudnn deterministic true, cudnn benchmark false, deterministic algorithms true (warn only), full determinism',
      ':4096:8',
    ]) {
      expect(screen.getByText(text)).toBeVisible();
    }
  });

  it('puts `via` on the params when a declared config has no class', () => {
    render(
      <AIBOMTrainingSection
        training={{
          optimizer_config: { params: { weight_decay: 0.05 }, declared_via: 'cli_arg' },
        }}
      />,
    );
    expect(screen.getByText('weight_decay=0.05 (via: cli_arg)')).toBeVisible();
    expect(screen.queryByText('Optimizer class')).toBeNull();
  });

  it('shows numerical precision and how mixed precision was found', () => {
    render(
      <AIBOMTrainingSection
        training={{
          mixed_precision: 'bf16',
          mixed_precision_declared_via: 'accelerator',
          precision: {
            tf32_matmul: true,
            tf32_cudnn: false,
            float32_matmul_precision: 'high',
            autocast: ['cuda:bfloat16', 'cpu:bfloat16'],
            fp8: { backend: 'transformer_engine', recipe: 'DelayedScaling' },
            fsdp_mixed_precision: {
              policy: 'MixedPrecision',
              param_dtype: 'bfloat16',
              reduce_dtype: 'float32',
              buffer_dtype: 'bfloat16',
            },
            deepspeed: 'no',
          },
        }}
      />,
    );
    for (const text of [
      'bf16 (via: accelerator)',
      'matmul true, cudnn false, float32 matmul precision high',
      'cuda:bfloat16, cpu:bfloat16',
      'transformer_engine (recipe DelayedScaling)',
      'MixedPrecision: param bfloat16, reduce float32, buffer bfloat16',
      'no',
    ]) {
      expect(screen.getByText(text)).toBeVisible();
    }
  });

  it('shows the distributed topology', () => {
    render(
      <AIBOMTrainingSection
        training={{
          distributed: {
            world_size: 8,
            nodes: 2,
            processes_per_node: 4,
            world_declared_via: 'environment',
            tensor_parallel_size: 2,
            data_parallel_size: 4,
            parallel_sizes_declared_via: 'device_mesh',
            device_mesh: { tp: 2, dp_shard: 4 },
            fsdp: {
              version: 2,
              reshard_after_forward: true,
              cpu_offload: false,
              declared_via: 'fsdp_module',
            },
            deepspeed: {
              zero_stage: 3,
              offload_optimizer: 'cpu',
              declared_via: 'deepspeed_engine',
            },
            strategies: ['fsdp', 'tensor_parallel'],
          },
        }}
      />,
    );
    for (const text of [
      'fsdp + tensor_parallel',
      '8 processes, 2 nodes, 4 per node (via: environment)',
      'tensor 2, data 4 (via: device_mesh)',
      'dp_shard=4, tp=2',
      'FSDP2, reshard after forward true, CPU offload false (via: fsdp_module)',
      'ZeRO-3, optimizer offload cpu (via: deepspeed_engine)',
    ]) {
      expect(screen.getByText(text)).toBeVisible();
    }
  });

  it('says FSDP is enabled when no detail was recorded', () => {
    render(
      <AIBOMTrainingSection
        training={{
          distributed: { fsdp: { declared_via: 'accelerate_config' }, strategies: ['fsdp'] },
        }}
      />,
    );
    expect(screen.getByText('enabled (via: accelerate_config)')).toBeVisible();
  });

  it('names no FP8 backend when accelerate reported none', () => {
    render(<AIBOMTrainingSection training={{ precision: { fp8: { backend: null } } }} />);
    expect(screen.getByText('unknown backend')).toBeVisible();
  });

  it('shows only the original fields for an older AIBOM', () => {
    render(<AIBOMTrainingSection training={{ optimizer: 'adamw_torch', determinism: null }} />);
    expect(screen.getByText('adamw_torch')).toBeVisible();
    for (const label of [
      'Seeds',
      'Optimizer params',
      'LR scheduler',
      'Determinism',
      'TF32',
      'Autocast',
    ]) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });
});

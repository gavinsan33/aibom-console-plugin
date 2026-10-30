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

  it('shows only the original fields for an older AIBOM', () => {
    render(<AIBOMTrainingSection training={{ optimizer: 'adamw_torch', determinism: null }} />);
    expect(screen.getByText('adamw_torch')).toBeVisible();
    for (const label of ['Seeds', 'Optimizer params', 'LR scheduler', 'Determinism']) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });
});

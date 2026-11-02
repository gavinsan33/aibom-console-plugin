import { render, screen } from '@testing-library/react';
import type { AIBOMData } from '../../types/aibom';
import AIBOMInferenceSection from './AIBOMInferenceSection';

// The webhook writes unset settings as JSON null, which the loose types don't model.
const inference = {
  serving_engine: 'vllm',
  enforce_eager: null,
  trust_remote_code: false,
  tensor_parallel_size: null,
  pipeline_parallel_size: null,
  data_parallel_size: null,
  max_tokens: null,
} as unknown as AIBOMData['inference'];

describe('AIBOMInferenceSection', () => {
  it('hides settings the webhook recorded as null instead of printing "null" or dashes', () => {
    render(<AIBOMInferenceSection inference={inference} />);
    expect(screen.getByText('vllm')).toBeVisible();
    expect(screen.getByText('false')).toBeVisible();
    expect(screen.queryByText('null')).toBeNull();
    expect(screen.queryByText('Enforce eager')).toBeNull();
    expect(screen.queryByText('Tensor / pipeline / data parallel')).toBeNull();
    expect(screen.queryByText('Max tokens')).toBeNull();
  });
});

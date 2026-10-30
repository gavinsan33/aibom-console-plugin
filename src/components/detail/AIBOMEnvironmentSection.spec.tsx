import { render, screen } from '@testing-library/react';
import AIBOMEnvironmentSection from './AIBOMEnvironmentSection';

describe('AIBOMEnvironmentSection software versions', () => {
  it('shows the Python version and torch build next to the driver CUDA', () => {
    render(
      <AIBOMEnvironmentSection
        environment={{
          cuda_version: '13.2',
          python_version: '3.12.16',
          torch_cuda_version: '13.0',
          cudnn_version: '9.24.0',
          nccl_version: '2.30.7',
        }}
      />,
    );
    expect(screen.getByText('13.2')).toBeVisible();
    expect(screen.getByText('3.12.16')).toBeVisible();
    expect(screen.getByText('CUDA 13.0, cuDNN 9.24.0, NCCL 2.30.7')).toBeVisible();
  });

  it('omits them on an older AIBOM', () => {
    render(<AIBOMEnvironmentSection environment={{ cuda_version: '12.4' }} />);
    expect(screen.queryByText('Python version')).toBeNull();
    expect(screen.queryByText('Torch build')).toBeNull();
  });
});

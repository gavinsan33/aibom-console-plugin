import { fireEvent, render, screen } from '@testing-library/react';
import AIBOMHardwareDetails from './AIBOMHardwareDetails';
import AIBOMEnvironmentSection from './AIBOMEnvironmentSection';

const environment = {
  gpu_memory_mb: [81920, 81920],
  cpu: { cpu_architecture: 'x86_64', cache_l3: '24 MiB' },
  storage: { block_devices: 'nvme0n1 894G\nsda 1T' },
};

const expand = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Show system details' }));
};

describe('AIBOMHardwareDetails', () => {
  it('renders nothing when the AIBOM predates the fields', () => {
    const { container } = render(<AIBOMHardwareDetails environment={{ gpu_type: 'A100' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('starts collapsed', () => {
    render(<AIBOMHardwareDetails environment={environment} />);
    expect(screen.getByText('x86_64')).not.toBeVisible();
  });

  it('lists the workload libraries by name', () => {
    render(
      <AIBOMHardwareDetails
        environment={{ libraries: { torch: '2.14.1+cu130', accelerate: '1.15.0' } }}
      />,
    );
    expand();
    expect(screen.getByText('Libraries')).toBeVisible();
    const names = screen.getAllByText(/^(accelerate|torch)$/).map((el) => el.textContent);
    expect(names).toEqual(['accelerate', 'torch']);
    expect(screen.getByText('2.14.1+cu130')).toBeVisible();
  });

  it('shows the formatted groups', () => {
    render(<AIBOMHardwareDetails environment={environment} />);
    expand();
    expect(screen.getByText('x86_64')).toBeVisible();
    expect(screen.getByText('nvme0n1 894G, sda 1T')).toBeVisible();
  });

  it('puts GPU memory in the Environment card main list', () => {
    render(<AIBOMEnvironmentSection environment={environment} />);
    expect(screen.getByText('2 × 80 GiB')).toBeVisible();
  });
});

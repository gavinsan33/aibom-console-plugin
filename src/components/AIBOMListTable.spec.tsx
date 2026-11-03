import type { ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { AIBOMResource } from '../types/aibom';
import AIBOMListTable from './AIBOMListTable';

const renderWithRouter = (ui: ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

type Model = NonNullable<NonNullable<AIBOMResource['spec']>['data']>['model'];

function item(
  name: string,
  model: Model = { name: 'granite-3.0-8b', quantization: 'int4' },
): AIBOMResource {
  return {
    metadata: { name, namespace: 'ns' },
    spec: {
      jobName: 'job-a',
      experimentIntent: 'training',
      collectedAt: '2026-01-01T00:00:00Z',
      data: {
        model,
        environment: { gpu_type: 'A100' },
        resource_utilization: { metrics: { gpu_utilization: { avg: 42, unit: '%' } } },
      },
    },
  };
}

describe('AIBOMListTable', () => {
  it('renders the base columns, not a metric column, when sorting by age', () => {
    renderWithRouter(
      <AIBOMListTable
        items={[item('run-a')]}
        sortKey="age"
        ascending={false}
        onSort={jest.fn()}
        selected={new Set()}
        onToggleSelect={jest.fn()}
      />,
    );
    expect(screen.getByText('Job')).toBeInTheDocument();
    expect(screen.getByText('granite-3.0-8b')).toBeInTheDocument();
    expect(screen.queryByText('gpu-utilization')).not.toBeInTheDocument();
  });

  it('adds a metric column when sorting by a performance metric', () => {
    renderWithRouter(
      <AIBOMListTable
        items={[item('run-a')]}
        sortKey="gpu-utilization"
        ascending={false}
        onSort={jest.fn()}
        selected={new Set()}
        onToggleSelect={jest.fn()}
      />,
    );
    expect(screen.getByText('gpu-utilization')).toBeInTheDocument();
    expect(screen.getByText('42.00%')).toBeInTheDocument();
  });

  it('shows the quantization as Precision, else the dtype', () => {
    const quantized = item('run-q', { name: 'm', quantization: 'awq', quantization_bits: 4 });
    const plain = item('run-p', { name: 'm', dtype: 'bfloat16' });
    renderWithRouter(
      <AIBOMListTable
        items={[item('run-a'), quantized, plain]}
        sortKey="age"
        ascending={false}
        onSort={jest.fn()}
        selected={new Set()}
        onToggleSelect={jest.fn()}
      />,
    );
    expect(screen.getByText('Precision')).toBeInTheDocument();
    expect(screen.getByText('int4')).toBeInTheDocument(); // bits already in the name
    expect(screen.getByText('awq 4-bit')).toBeInTheDocument();
    expect(screen.getByText('bfloat16')).toBeInTheDocument();
  });

  it('calls onToggleSelect with the item key when its checkbox is clicked', () => {
    const onToggleSelect = jest.fn();
    renderWithRouter(
      <AIBOMListTable
        items={[item('run-a')]}
        sortKey="age"
        ascending={false}
        onSort={jest.fn()}
        selected={new Set()}
        onToggleSelect={onToggleSelect}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggleSelect).toHaveBeenCalledWith('ns/run-a');
  });

  it('shows a Namespace column only when asked', () => {
    const props = {
      items: [item('run-a')],
      sortKey: 'age' as const,
      ascending: false,
      onSort: jest.fn(),
      selected: new Set<string>(),
      onToggleSelect: jest.fn(),
    };
    const { rerender } = renderWithRouter(<AIBOMListTable {...props} />);
    expect(screen.queryByText('Namespace')).not.toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <AIBOMListTable {...props} showNamespace />
      </MemoryRouter>,
    );
    expect(screen.getByText('Namespace')).toBeInTheDocument();
    expect(screen.getByText('ns')).toBeInTheDocument();
  });
});

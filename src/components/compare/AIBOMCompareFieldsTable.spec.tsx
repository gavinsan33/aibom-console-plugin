import { fireEvent, render, screen } from '@testing-library/react';
import type { AIBOMResource } from '../../types/aibom';
import AIBOMCompareFieldsTable from './AIBOMCompareFieldsTable';

const run = (model: string): AIBOMResource => ({
  metadata: { name: model, namespace: 'ns' },
  spec: { jobName: 'job', data: { model: { name: model } } },
});

describe('AIBOMCompareFieldsTable', () => {
  const renderTable = () =>
    render(<AIBOMCompareFieldsTable items={[run('m1'), run('m2')]} runNames={['a', 'b']} />);

  it('marks differing fields', () => {
    renderTable();
    expect(screen.getAllByLabelText('Differs between runs')).toHaveLength(1); // Model Name only
  });

  it('hides fields no run recorded only when asked', () => {
    renderTable();
    expect(screen.getByText('Model Version')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Hide fields no run recorded'));
    expect(screen.queryByText('Model Version')).not.toBeInTheDocument();
    expect(screen.getByText('Model Name')).toBeInTheDocument();
  });

  it('shows only differing fields when asked', () => {
    renderTable();
    fireEvent.click(screen.getByLabelText('Show only fields that differ'));
    expect(screen.getByText('Model Name')).toBeInTheDocument();
    expect(screen.queryByText('Job')).not.toBeInTheDocument();
    expect(screen.queryByText('Model Version')).not.toBeInTheDocument();
  });

  it('says so when no field differs', () => {
    render(<AIBOMCompareFieldsTable items={[run('m1'), run('m1')]} runNames={['a', 'b']} />);
    fireEvent.click(screen.getByLabelText('Show only fields that differ'));
    expect(screen.getByText('Every field is the same in all runs.')).toBeInTheDocument();
  });
});

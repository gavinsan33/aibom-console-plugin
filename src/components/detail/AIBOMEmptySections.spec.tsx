import { render, screen } from '@testing-library/react';
import AIBOMDatasetSection from './AIBOMDatasetSection';
import AIBOMModelSection from './AIBOMModelSection';

describe('empty Model and Dataset sections', () => {
  it('says so when the webhook emitted an all-null model', () => {
    render(<AIBOMModelSection model={{ name: undefined, size_bytes: 0 }} />);
    expect(screen.getByText('No model was detected for this workload.')).toBeVisible();
  });

  it('shows the model when one was detected', () => {
    render(<AIBOMModelSection model={{ name: 'llama-3' }} />);
    expect(screen.getByText('llama-3')).toBeVisible();
    expect(screen.queryByText('No model was detected for this workload.')).toBeNull();
  });

  it('says so when a training dataset block is empty', () => {
    render(<AIBOMDatasetSection dataset={{ declared: {} }} />);
    expect(screen.getByText('No dataset was detected for this workload.')).toBeVisible();
  });

  it('says so when there is no dataset block at all, as on inference AIBOMs', () => {
    render(<AIBOMDatasetSection dataset={undefined} />);
    expect(screen.getByText('Dataset')).toBeVisible();
    expect(screen.getByText('No dataset was detected for this workload.')).toBeVisible();
  });

  it('shows the dataset when one was declared', () => {
    render(<AIBOMDatasetSection dataset={{ declared: { name: 'tatsu-lab/alpaca' } }} />);
    expect(screen.getByText(/tatsu-lab\/alpaca/)).toBeVisible();
    expect(screen.queryByText('No dataset was detected for this workload.')).toBeNull();
  });
});

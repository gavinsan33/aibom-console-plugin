import { fireEvent, render, screen } from '@testing-library/react';
import type { StoredTelemetry } from '../../types/telemetrySeries';
import AIBOMStoredTelemetryCharts from './AIBOMStoredTelemetryCharts';

const stored = {
  schema_version: 1,
  window: { start: 1000, end: 1060, step_seconds: 30 },
  pods: ['a-pod'],
  metrics: {
    cpu_usage: {
      unit: 'cores',
      aggregation: 'sum',
      aggregate: [
        [1000, 1],
        [1030, 2],
      ],
    },
  },
} as unknown as StoredTelemetry;

describe('AIBOMStoredTelemetryCharts limits', () => {
  it('draws limits by default and, when hidden, rescales the axis to the data', () => {
    render(
      <AIBOMStoredTelemetryCharts
        stored={stored}
        name="run-a"
        expectsGpu={false}
        limits={{ cpu_usage: 8 }}
      />,
    );
    expect(screen.getAllByText('Limit').length).toBeGreaterThan(0);
    expect(screen.getByText('8 cores')).toBeInTheDocument(); // axis sized to the limit

    fireEvent.click(screen.getByLabelText('Show limits'));
    expect(screen.queryByText('Limit')).not.toBeInTheDocument();
    expect(screen.queryByText('8 cores')).not.toBeInTheDocument();
    expect(screen.getByText('2 cores')).toBeInTheDocument(); // axis now tops out at the data
  });

  it('offers no switch when no chart has a limit', () => {
    render(<AIBOMStoredTelemetryCharts stored={stored} name="run-a" expectsGpu={false} />);
    expect(screen.queryByLabelText('Show limits')).not.toBeInTheDocument();
  });
});

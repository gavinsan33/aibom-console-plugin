import { render, screen } from '@testing-library/react';
import AIBOMPodsSection from './AIBOMPodsSection';

describe('AIBOMPodsSection', () => {
  it("shows each pod's GPU count and container images with a short digest", () => {
    render(
      <AIBOMPodsSection
        pods={[
          {
            pod_name: 'p0',
            gpu_count: 8,
            containers: [
              {
                name: 'train',
                image: 'quay.io/x/train:v1',
                image_id: `quay.io/x/train@sha256:${'ab'.repeat(32)}`,
              },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText('8')).toBeVisible();
    expect(screen.getByText('train: quay.io/x/train:v1 (sha256:abababababab)')).toBeVisible();
  });
});

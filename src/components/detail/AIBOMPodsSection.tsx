import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { AIBOMPod } from '../../types/aibom';
import { podStatusColor } from '../../utils/podStatus';
import { formatTimestamp } from '../../utils/formatTimestamp';
import Section from './Section';

/** `sha256:` plus 12 hex characters of an image ID's digest, or the ID as is. */
const shortDigest = (imageId: string): string => {
  const m = /sha256:([0-9a-f]{12})/.exec(imageId);
  return m ? `sha256:${m[1]}` : imageId;
};

interface AIBOMPodsSectionProps {
  pods: AIBOMPod[] | undefined;
}

const AIBOMPodsSection: FC<AIBOMPodsSectionProps> = ({ pods }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  if (!pods || pods.length === 0) return null;

  return (
    <Section title={t('Pods')}>
      <Table aria-label={t('Pods')} variant="compact">
        <Thead>
          <Tr>
            <Th>{t('Name')}</Th>
            <Th>{t('Node')}</Th>
            <Th>{t('IP')}</Th>
            <Th>{t('Start')}</Th>
            <Th>{t('Status')}</Th>
            <Th>{t('GPUs')}</Th>
            <Th>{t('Images')}</Th>
          </Tr>
        </Thead>
        <Tbody>
          {pods.map((pod) => (
            <Tr key={pod.pod_uid ?? pod.pod_name}>
              <Td dataLabel={t('Name')}>{pod.pod_name ?? '—'}</Td>
              <Td dataLabel={t('Node')}>{pod.node_name ?? '—'}</Td>
              <Td dataLabel={t('IP')}>{pod.pod_ip ?? '—'}</Td>
              <Td dataLabel={t('Start')}>{formatTimestamp(pod.start_time)}</Td>
              <Td dataLabel={t('Status')}>
                {pod.status ? <Label color={podStatusColor(pod.status)}>{pod.status}</Label> : '—'}
              </Td>
              <Td dataLabel={t('GPUs')}>{pod.gpu_count ?? '—'}</Td>
              <Td dataLabel={t('Images')}>
                {pod.containers?.length
                  ? pod.containers.map((c) => (
                      <div key={c.name} title={c.image_id}>
                        {c.name}: {c.image}
                        {c.image_id && ` (${shortDigest(c.image_id)})`}
                      </div>
                    ))
                  : '—'}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Section>
  );
};

export default AIBOMPodsSection;

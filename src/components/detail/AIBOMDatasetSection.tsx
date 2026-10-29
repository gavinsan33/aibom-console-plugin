import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Content, DescriptionList, Flex, FlexItem, Label } from '@patternfly/react-core';
import type { AIBOMData } from '../../types/aibom';
import Field from './Field';
import Section from './Section';

interface AIBOMDatasetSectionProps {
  dataset: AIBOMData['dataset'];
}

const AIBOMDatasetSection: FC<AIBOMDatasetSectionProps> = ({ dataset }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  if (!dataset) return null;
  const declared = dataset.declared;
  const autoDetected = dataset.auto_detected ?? [];

  return (
    <Section title={t('Dataset')} md={6}>
      {/* Training workloads always get a `dataset` block, even when nothing was declared or detected. */}
      {!declared?.name && autoDetected.length === 0 ? (
        <Content component="p">{t('No dataset was detected for this workload.')}</Content>
      ) : (
        <DescriptionList isHorizontal isCompact>
          <Field label={t('Declared')}>
            {declared?.name &&
              `${declared.name} ${declared.version ?? ''} (license: ${declared.license ?? '—'}, via: ${
                declared.declared_via ?? '—'
              })`}
          </Field>
          {autoDetected.map((d, index) => (
            <Field key={index} label={t('Auto-detected')}>
              <Flex
                spaceItems={{ default: 'spaceItemsSm' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <FlexItem>
                  {d.dataset_name} {d.version ?? ''} (license: {d.license ?? '—'}, seen via:{' '}
                  {(d.seen_via ?? []).join(', ')})
                </FlexItem>
                <FlexItem>
                  {/* null/undefined = not reconciled (declared was itself inferred
                    from runtime, so there's nothing independent to compare) --
                    distinct from false, a genuine declared-vs-detected mismatch. */}
                  <Label
                    color={
                      d.matches_declared == null ? 'grey' : d.matches_declared ? 'green' : 'red'
                    }
                  >
                    {d.matches_declared == null
                      ? t('not reconciled (declared inferred from runtime)')
                      : d.matches_declared
                        ? t('matches declared')
                        : t('DOES NOT MATCH DECLARED')}
                  </Label>
                </FlexItem>
              </Flex>
            </Field>
          ))}
        </DescriptionList>
      )}
    </Section>
  );
};

export default AIBOMDatasetSection;

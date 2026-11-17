import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { DescriptionList } from '@patternfly/react-core';
import type { AIBOMData } from '../../types/aibom';
import { formatTimestamp } from '../../utils/formatTimestamp';
import Field from './Field';
import Section from './Section';

interface AIBOMMetadataSectionProps {
  metadata: AIBOMData['_metadata'];
}

const AIBOMMetadataSection: FC<AIBOMMetadataSectionProps> = ({ metadata }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  if (!metadata) return null;

  return (
    <Section title={t('AIBOM metadata')} md={6}>
      <DescriptionList isHorizontal isCompact>
        <Field label={t('Version')}>{metadata.aibom_version}</Field>
        <Field label={t('Generated at')}>
          {metadata.generated_at && formatTimestamp(metadata.generated_at)}
        </Field>
        <Field label={t('Generator')}>
          {[metadata.generator, metadata.generator_version].filter(Boolean).join(' ')}
        </Field>
      </DescriptionList>
    </Section>
  );
};

export default AIBOMMetadataSection;

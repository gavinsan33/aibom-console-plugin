import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { DescriptionList } from '@patternfly/react-core';
import type { AIBOMData } from '../../types/aibom';
import { formatFlexTuple } from '../../utils/flexible';
import Field from './Field';
import Section from './Section';

interface AIBOMFineTuningSectionProps {
  fineTuning: AIBOMData['fine_tuning'];
}

const AIBOMFineTuningSection: FC<AIBOMFineTuningSectionProps> = ({ fineTuning }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  if (!fineTuning) return null;

  return (
    <Section title={t('Fine-tuning')}>
      <DescriptionList isHorizontal isCompact columnModifier={{ default: '1Col', md: '2Col' }}>
        <Field label={t('Adaptation method')}>{fineTuning.adaptation_method}</Field>
        <Field label={t('LoRA rank / alpha')}>
          {formatFlexTuple([fineTuning.lora_rank, fineTuning.lora_alpha])}
        </Field>
      </DescriptionList>
    </Section>
  );
};

export default AIBOMFineTuningSection;

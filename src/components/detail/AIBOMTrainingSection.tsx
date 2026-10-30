import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { DescriptionList } from '@patternfly/react-core';
import type { AIBOMData } from '../../types/aibom';
import { formatFlexNumber } from '../../utils/flexible';
import {
  formatDeterminismFlags,
  formatLrScheduler,
  formatParamGroups,
  formatSeedHistory,
  formatSeeds,
  formatSettings,
  formatSettingValue,
  withVia,
} from '../../utils/trainingFields';
import Field from './Field';
import Section from './Section';

interface AIBOMTrainingSectionProps {
  training: AIBOMData['training'];
}

const AIBOMTrainingSection: FC<AIBOMTrainingSectionProps> = ({ training }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  if (!training) return null;
  const optimizer = training.optimizer_config;
  const scheduler = training.lr_scheduler;
  const determinism = training.determinism;
  const paramGroups = formatParamGroups(optimizer?.param_groups);
  const params = formatSettings(optimizer?.params);

  return (
    <Section title={t('Training')} md={6}>
      <DescriptionList isHorizontal isCompact columnModifier={{ default: '1Col', md: '2Col' }}>
        <Field label={t('Optimizer')}>{training.optimizer}</Field>
        <Field label={t('Learning rate')}>{formatFlexNumber(training.learning_rate)}</Field>
        <Field label={t('Batch size')}>{formatFlexNumber(training.batch_size)}</Field>
        <Field label={t('Epochs')}>{formatFlexNumber(training.epochs)}</Field>
        <Field label={t('Random seed')}>{formatFlexNumber(training.random_seed)}</Field>
        <Field label={t('Parallelization')}>{training.parallelization_strategy}</Field>
        <Field label={t('Mixed precision')}>{training.mixed_precision}</Field>
      </DescriptionList>
      {(optimizer ?? scheduler ?? determinism) && (
        <DescriptionList isHorizontal isCompact>
          <Field label={t('Optimizer class')}>
            {optimizer?.class && withVia(optimizer.class, optimizer.declared_via)}
          </Field>
          {/* A declared config has no class to hang `via` on. */}
          <Field label={t('Optimizer params')}>
            {optimizer?.class ? params : withVia(params, optimizer?.declared_via)}
          </Field>
          <Field label={t('Param groups')}>
            {paramGroups.length > 0 && (
              <>
                {paramGroups.map((g, i) => (
                  <div key={i}>{g}</div>
                ))}
              </>
            )}
          </Field>
          <Field label={t('Optim args')}>{optimizer?.optim_args}</Field>
          <Field label={t('LR scheduler')}>
            {scheduler && withVia(formatLrScheduler(scheduler), scheduler.declared_via)}
          </Field>
          <Field label={t('Seeds')}>{formatSeeds(determinism?.seeds)}</Field>
          <Field label={t('Seed history')}>{formatSeedHistory(determinism?.seed_history)}</Field>
          <Field label={t('Data seed')}>
            {determinism?.data_seed != null && formatSettingValue(determinism.data_seed)}
          </Field>
          <Field label={t('Determinism')}>
            {determinism && formatDeterminismFlags(determinism)}
          </Field>
          <Field label={t('CUBLAS workspace')}>{determinism?.cublas_workspace_config}</Field>
          <Field label="PYTHONHASHSEED">{determinism?.python_hash_seed}</Field>
        </DescriptionList>
      )}
    </Section>
  );
};

export default AIBOMTrainingSection;

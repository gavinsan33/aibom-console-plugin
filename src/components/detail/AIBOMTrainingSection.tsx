import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { DescriptionList } from '@patternfly/react-core';
import type { AIBOMData } from '../../types/aibom';
import { formatFlexNumber } from '../../utils/flexible';
import {
  formatDeepSpeed,
  formatDeterminismFlags,
  formatFp8,
  formatFsdp,
  formatFsdpPrecision,
  formatLrScheduler,
  formatParallelism,
  formatParallelSizes,
  formatParamGroups,
  formatSeedHistory,
  formatSeeds,
  formatSettings,
  formatSettingValue,
  formatTf32,
  formatTopology,
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
  const precision = training.precision;
  const distributed = training.distributed;
  const paramGroups = formatParamGroups(optimizer?.param_groups);
  const params = formatSettings(optimizer?.params);

  return (
    <Section title={t('Training')} md={6}>
      <DescriptionList isHorizontal isCompact>
        <Field label={t('Optimizer')}>{training.optimizer}</Field>
        <Field label={t('Learning rate')}>{formatFlexNumber(training.learning_rate)}</Field>
        <Field label={t('Batch size')}>{formatFlexNumber(training.batch_size)}</Field>
        <Field label={t('Epochs')}>{formatFlexNumber(training.epochs)}</Field>
        <Field label={t('Random seed')}>{formatFlexNumber(training.random_seed)}</Field>
        <Field label={t('Parallelism')}>{formatParallelism(training)}</Field>
        <Field label={t('Topology')}>
          {withVia(formatTopology(distributed), distributed?.world_declared_via)}
        </Field>
        <Field label={t('Parallel sizes')}>
          {withVia(formatParallelSizes(distributed), distributed?.parallel_sizes_declared_via)}
        </Field>
        <Field label={t('Device mesh')}>{formatSettings(distributed?.device_mesh)}</Field>
        <Field label="FSDP">
          {withVia(formatFsdp(distributed?.fsdp), distributed?.fsdp?.declared_via)}
        </Field>
        <Field label="DeepSpeed">
          {withVia(formatDeepSpeed(distributed?.deepspeed), distributed?.deepspeed?.declared_via)}
        </Field>
        <Field label={t('Mixed precision')}>
          {training.mixed_precision &&
            withVia(training.mixed_precision, training.mixed_precision_declared_via)}
        </Field>
        <Field label="TF32">{precision && formatTf32(precision)}</Field>
        <Field label={t('Autocast')}>{precision?.autocast?.join(', ')}</Field>
        <Field label="FP8">{precision?.fp8 && formatFp8(precision.fp8)}</Field>
        <Field label={t('FSDP precision')}>
          {precision?.fsdp_mixed_precision && formatFsdpPrecision(precision.fsdp_mixed_precision)}
        </Field>
        <Field label={t('DeepSpeed precision')}>{precision?.deepspeed}</Field>
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
        <Field label={t('Determinism')}>{determinism && formatDeterminismFlags(determinism)}</Field>
        <Field label={t('CUBLAS workspace')}>{determinism?.cublas_workspace_config}</Field>
        <Field label="PYTHONHASHSEED">{determinism?.python_hash_seed}</Field>
      </DescriptionList>
    </Section>
  );
};

export default AIBOMTrainingSection;

import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Checkbox } from '@patternfly/react-core';
import { SortByDirection, Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { AIBOMResource, SortKey } from '../types/aibom';
import {
  getCollectedAt,
  getExperimentIntent,
  getGpuType,
  getJobName,
  getMetricAvg,
  getMetricUnit,
  getModelName,
  getWeightPrecision,
  hasMetric,
} from '../utils/aibomFields';
import { SORTABLE_METRICS } from '../types/aibom';
import { withUnit } from '../utils/formatMetricValue';
import { formatTimestamp } from '../utils/formatTimestamp';
import { defaultAscending } from '../utils/listUrlState';

interface AIBOMListTableProps {
  items: AIBOMResource[];
  sortKey: SortKey;
  ascending: boolean;
  onSort: (sortKey: SortKey, ascending: boolean) => void;
  selected: Set<string>;
  onToggleSelect: (key: string) => void;
  /** Add a Namespace column -- set when viewing all projects, where runs of the same job in different namespaces otherwise look identical. */
  showNamespace?: boolean;
}

const itemKey = (item: AIBOMResource): string =>
  `${item.metadata?.namespace ?? ''}/${item.metadata?.name ?? ''}`;

const AIBOMListTable: FC<AIBOMListTableProps> = ({
  items,
  sortKey,
  ascending,
  onSort,
  selected,
  onToggleSelect,
  showNamespace = false,
}) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const metricKey = sortKey === 'age' ? undefined : SORTABLE_METRICS[sortKey];

  const onSortClick = (clicked: SortKey) => {
    onSort(clicked, clicked === sortKey ? !ascending : defaultAscending(clicked));
  };

  // Age's "ascending" means newest first, which reads as a descending date column.
  const displayAscending = sortKey === 'age' ? !ascending : ascending;
  const sortDirection: SortByDirection = displayAscending
    ? SortByDirection.asc
    : SortByDirection.desc;

  // Sortable columns' indexes shift by one when the Namespace column is shown.
  const collectedAtIndex = showNamespace ? 6 : 5;

  const sortParams = (key: SortKey, index: number) => ({
    sort: {
      sortBy: {
        index: sortKey === key ? index : -1,
        direction: sortDirection,
      },
      onSort: () => {
        onSortClick(key);
      },
      columnIndex: index,
    },
  });

  return (
    <Table aria-label={t('AIBOMs')} variant="compact">
      <Thead>
        <Tr>
          <Th screenReaderText={t('Selected')} />
          <Th>{t('Job')}</Th>
          {showNamespace && <Th>{t('Namespace')}</Th>}
          <Th>{t('Model')}</Th>
          <Th modifier="nowrap">{t('Intent')}</Th>
          <Th modifier="nowrap">{t('Precision')}</Th>
          <Th>{t('GPU type')}</Th>
          <Th {...sortParams('age', collectedAtIndex)} modifier="nowrap">
            {t('Collected at')}
          </Th>
          {metricKey && <Th {...sortParams(sortKey, collectedAtIndex + 1)}>{sortKey}</Th>}
        </Tr>
      </Thead>
      <Tbody>
        {items.map((item) => (
          <Tr key={itemKey(item)}>
            <Td dataLabel={t('Selected')}>
              <Checkbox
                id={`aibom-select-${itemKey(item)}`}
                aria-label={t('Select for comparison')}
                isChecked={selected.has(itemKey(item))}
                onChange={() => {
                  onToggleSelect(itemKey(item));
                }}
              />
            </Td>
            <Td dataLabel={t('Job')}>
              {item.metadata?.namespace && item.metadata.name ? (
                <Link to={`/aiboms/${item.metadata.namespace}/${item.metadata.name}`}>
                  {getJobName(item) || item.metadata.name}
                </Link>
              ) : (
                getJobName(item) || '—'
              )}
            </Td>
            {showNamespace && <Td dataLabel={t('Namespace')}>{item.metadata?.namespace ?? '—'}</Td>}
            <Td dataLabel={t('Model')}>{getModelName(item) || '—'}</Td>
            <Td dataLabel={t('Intent')} modifier="nowrap">
              {getExperimentIntent(item) || '—'}
            </Td>
            <Td dataLabel={t('Precision')} modifier="nowrap">
              {getWeightPrecision(item) || '—'}
            </Td>
            <Td dataLabel={t('GPU type')}>{getGpuType(item) || '—'}</Td>
            <Td dataLabel={t('Collected at')} modifier="nowrap">
              {formatTimestamp(getCollectedAt(item))}
            </Td>
            {metricKey && (
              <Td dataLabel={sortKey}>
                {hasMetric(item, metricKey)
                  ? withUnit(
                      getMetricAvg(item, metricKey).toFixed(2),
                      getMetricUnit(item, metricKey),
                    )
                  : '—'}
              </Td>
            )}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default AIBOMListTable;

import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@patternfly/react-core';
import { InnerScrollContainer, Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { AIBOMResource } from '../../types/aibom';
import { buildPerformanceRows, RUNTIME_KEY } from '../../utils/comparePerformance';
import type { MetricSet, PerformanceCell } from '../../utils/comparePerformance';
import { formatDuration } from '../../utils/executionMetadata';
import { withUnit } from '../../utils/formatMetricValue';
import { runColor } from '../../utils/runColors';

interface AIBOMComparePerformanceTableProps {
  items: AIBOMResource[];
  runNames: string[];
  /** Which metric family to compare; defaults to hardware (`resource_utilization`). */
  set?: MetricSet;
}

const signColor = (value: number): 'green' | 'red' | undefined => {
  if (value > 0) return 'green';
  if (value < 0) return 'red';
  return undefined;
};

const formatCell = (cell: PerformanceCell, metricKey: string): string => {
  if (cell.unavailable) return '—';
  if (metricKey === RUNTIME_KEY) return formatDuration(cell.avg) ?? '—';
  return withUnit(cell.avg.toFixed(2), cell.unit);
};

/** A delta, signed; runtime's as a duration ("+2m0s") rather than seconds. */
const formatDelta = (delta: number, metricKey: string): string => {
  const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';
  if (metricKey === RUNTIME_KEY) return `${sign}${formatDuration(Math.abs(delta)) ?? ''}`;
  return delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2);
};

const AIBOMComparePerformanceTable: FC<AIBOMComparePerformanceTableProps> = ({
  items,
  runNames,
  set,
}) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const rows = buildPerformanceRows(items, set);
  const showDelta = items.length === 2;

  return (
    // Run headers don't wrap, so their labels (and the suffix telling re-runs of
    // one job apart) are never cut off; with many runs the table scrolls sideways
    // with the Metric column pinned.
    <InnerScrollContainer>
      <Table aria-label={t('Performance comparison')} variant="compact">
        <Thead>
          <Tr>
            <Th isStickyColumn stickyMinWidth="10rem" hasRightBorder>
              {t('Metric')}
            </Th>
            {runNames.map((name, index) => (
              <Th key={index} modifier="nowrap">
                <Label color={runColor(index)}>{name}</Label>
              </Th>
            ))}
            {showDelta && (
              <>
                <Th>{t('Delta')}</Th>
                <Th>{t('Change')}</Th>
              </>
            )}
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row) => (
            <Tr key={row.metricKey}>
              <Td dataLabel={t('Metric')} isStickyColumn stickyMinWidth="10rem" hasRightBorder>
                {row.label}
              </Td>
              {row.values.map((cell, index) => (
                <Td key={index} dataLabel={runNames[index]}>
                  {formatCell(cell, row.metricKey)}
                </Td>
              ))}
              {showDelta && (
                <>
                  <Td dataLabel={t('Delta')}>
                    {row.delta === undefined ? (
                      '—'
                    ) : (
                      <Label color={signColor(row.delta)} isCompact>
                        {formatDelta(row.delta, row.metricKey)}
                      </Label>
                    )}
                  </Td>
                  <Td dataLabel={t('Change')}>
                    {row.pctChange === undefined ? (
                      t('N/A')
                    ) : (
                      <Label color={signColor(row.pctChange)} isCompact>
                        {row.pctChange > 0
                          ? `+${row.pctChange.toFixed(1)}%`
                          : `${row.pctChange.toFixed(1)}%`}
                      </Label>
                    )}
                  </Td>
                </>
              )}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </InnerScrollContainer>
  );
};

export default AIBOMComparePerformanceTable;

import type { FC } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, Label, Stack, Switch, Tooltip } from '@patternfly/react-core';
import { NotEqualIcon } from '@patternfly/react-icons';
import { InnerScrollContainer, Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { AIBOMResource } from '../../types/aibom';
import { buildFieldRows } from '../../utils/compareFields';
import { runColor } from '../../utils/runColors';

interface AIBOMCompareFieldsTableProps {
  items: AIBOMResource[];
  runNames: string[];
}

const AIBOMCompareFieldsTable: FC<AIBOMCompareFieldsTableProps> = ({ items, runNames }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  // Off by default: the view flags differences rather than hiding rows. Rows
  // no run recorded are pure noise, though, so offer to drop them.
  const [hideUnrecorded, setHideUnrecorded] = useState(false);
  const rows = buildFieldRows(items).filter(
    (row) => !hideUnrecorded || row.values.some((value) => value !== ''),
  );

  return (
    <Stack hasGutter>
      <Switch
        id="aibom-compare-hide-unrecorded"
        label={t('Hide fields no run recorded')}
        isChecked={hideUnrecorded}
        onChange={(_event, checked) => {
          setHideUnrecorded(checked);
        }}
      />
      {/* Run headers don't wrap, so their labels (and the suffix telling re-runs of
          one job apart) are never cut off; with many runs the table scrolls sideways
          with the Field column pinned. */}
      <InnerScrollContainer>
        <Table aria-label={t('Field comparison')} variant="compact">
          <Thead>
            <Tr>
              <Th isStickyColumn stickyMinWidth="14rem" hasRightBorder>
                {t('Field')}
              </Th>
              {runNames.map((name, index) => (
                <Th key={index} modifier="nowrap">
                  <Label color={runColor(index)}>{name}</Label>
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row) => (
              <Tr key={row.label}>
                <Td dataLabel={t('Field')} isStickyColumn stickyMinWidth="14rem" hasRightBorder>
                  {row.differs ? (
                    <>
                      {/* An icon, not a text badge: the badge wrapped under the label in
                          the narrow pinned column, giving rows uneven heights. */}
                      <strong>{row.label}</strong>{' '}
                      <Tooltip content={t('Differs between runs')}>
                        <Icon status="warning" isInline aria-label={t('Differs between runs')}>
                          <NotEqualIcon />
                        </Icon>
                      </Tooltip>
                    </>
                  ) : (
                    row.label
                  )}
                </Td>
                {row.values.map((value, index) => (
                  <Td key={index} dataLabel={runNames[index]}>
                    {value || '—'}
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </InnerScrollContainer>
    </Stack>
  );
};

export default AIBOMCompareFieldsTable;

import type { FC } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Checkbox,
  Content,
  FormSelect,
  FormSelectOption,
  MenuToggle,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Toolbar,
  ToolbarContent,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import type { MenuToggleElement } from '@patternfly/react-core';
import type { AIBOMFilter } from '../utils/filter';
import type { SortKey } from '../types/aibom';
import { HARDWARE_METRIC_LABELS, SORTABLE_METRICS } from '../types/aibom';
import { defaultAscending } from '../utils/listUrlState';

type FilterField = keyof Omit<AIBOMFilter, 'driftOnly'>;

const FIELD_CONFIG: { field: FilterField; label: string }[] = [
  { field: 'model', label: 'Model' },
  { field: 'intent', label: 'Experiment intent' },
  { field: 'quantization', label: 'Quantization' },
  { field: 'architecture', label: 'Architecture' },
  { field: 'framework', label: 'Framework' },
  { field: 'gpuType', label: 'GPU type' },
  { field: 'jobName', label: 'Job' },
  { field: 'gitBranch', label: 'Git branch' },
  { field: 'gitRepository', label: 'Git repository' },
  { field: 'servingEngine', label: 'Serving engine' },
  { field: 'adaptationMethod', label: 'Adaptation method' },
  { field: 'optimizer', label: 'Optimizer' },
];

interface AIBOMFilterToolbarProps {
  filter: AIBOMFilter;
  onFilterChange: (filter: AIBOMFilter) => void;
  sortKey: SortKey;
  onSortChange: (sortKey: SortKey, ascending: boolean) => void;
}

const AIBOMFilterToolbar: FC<AIBOMFilterToolbarProps> = ({
  filter,
  onFilterChange,
  sortKey,
  onSortChange,
}) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');

  // Which field the search box filters on. Applied filters live in `filter`
  // (URL state); this is just the toolbar's own attribute selection.
  const [activeField, setActiveField] = useState<FilterField>(FIELD_CONFIG[0].field);
  const [isAttrOpen, setAttrOpen] = useState(false);

  const activeLabel = FIELD_CONFIG.find((c) => c.field === activeField)?.label ?? '';

  return (
    <Toolbar
      clearAllFilters={() => {
        onFilterChange({});
      }}
      collapseListedFiltersBreakpoint="xl"
    >
      <ToolbarContent>
        <ToolbarGroup variant="filter-group" gap={{ default: 'gapMd' }}>
          {/* Attribute selector — pick which field to search within. */}
          <ToolbarItem>
            <Select
              aria-label={t('Filter by')}
              isOpen={isAttrOpen}
              onOpenChange={setAttrOpen}
              selected={activeField}
              onSelect={(_event, value) => {
                setActiveField(value as FilterField);
                setAttrOpen(false);
              }}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => {
                    setAttrOpen((open) => !open);
                  }}
                  isExpanded={isAttrOpen}
                >
                  {t(activeLabel)}
                </MenuToggle>
              )}
            >
              <SelectList>
                {FIELD_CONFIG.map(({ field, label }) => (
                  <SelectOption key={field} value={field}>
                    {t(label)}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </ToolbarItem>

          {/* One ToolbarFilter per field so every applied search shows a chip;
              only the active field's search input is visible. */}
          {FIELD_CONFIG.map(({ field, label }) => {
            const applied = filter[field];
            return (
              <ToolbarFilter
                key={field}
                categoryName={t(label)}
                labels={applied ? [applied] : []}
                deleteLabel={() => {
                  onFilterChange({ ...filter, [field]: undefined });
                }}
                showToolbarItem={field === activeField}
              >
                <SearchInput
                  aria-label={t('Search {{label}}', { label: t(label) })}
                  placeholder={t('Search {{label}}', { label: t(label) })}
                  value={applied ?? ''}
                  onChange={(_event, value) => {
                    onFilterChange({ ...filter, [field]: value || undefined });
                  }}
                  onClear={() => {
                    onFilterChange({ ...filter, [field]: undefined });
                  }}
                />
              </ToolbarFilter>
            );
          })}

          <ToolbarFilter
            categoryName={t('Drift')}
            labels={filter.driftOnly ? [t('Drift only')] : []}
            deleteLabel={() => {
              onFilterChange({ ...filter, driftOnly: undefined });
            }}
            showToolbarItem
          >
            <Checkbox
              id="aibom-drift-only"
              label={t('Drift only')}
              isChecked={!!filter.driftOnly}
              onChange={(_event, checked) => {
                onFilterChange({ ...filter, driftOnly: checked || undefined });
              }}
            />
          </ToolbarFilter>
        </ToolbarGroup>

        <ToolbarGroup align={{ default: 'alignEnd' }} gap={{ default: 'gapSm' }}>
          <ToolbarItem>
            <Content component="small">{t('Sort by')}</Content>
          </ToolbarItem>
          <ToolbarItem>
            <FormSelect
              aria-label={t('Sort by')}
              value={sortKey}
              onChange={(_event, value) => {
                onSortChange(value as SortKey, defaultAscending(value as SortKey));
              }}
            >
              <FormSelectOption value="age" label={t('Collected at')} />
              {Object.entries(SORTABLE_METRICS).map(([sortKeyOption, metricKey]) => (
                <FormSelectOption
                  key={sortKeyOption}
                  value={sortKeyOption}
                  label={HARDWARE_METRIC_LABELS[metricKey] ?? sortKeyOption}
                />
              ))}
            </FormSelect>
          </ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
  );
};

export default AIBOMFilterToolbar;

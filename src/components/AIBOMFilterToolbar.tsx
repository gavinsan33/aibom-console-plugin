import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Checkbox,
  Content,
  FormSelect,
  FormSelectOption,
  MenuToggle,
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
import type { AIBOMResource, SortKey } from '../types/aibom';
import { HARDWARE_METRIC_LABELS, SORTABLE_METRICS } from '../types/aibom';
import { defaultAscending } from '../utils/listUrlState';
import {
  getAdaptationMethod,
  getArchitecture,
  getExperimentIntent,
  getFramework,
  getGitBranch,
  getGitRepository,
  getGpuType,
  getJobName,
  getModelName,
  getOptimizer,
  getQuantization,
  getServingEngine,
} from '../utils/aibomFields';

type FilterField = keyof Omit<AIBOMFilter, 'driftOnly'>;

const FIELD_CONFIG: {
  field: FilterField;
  label: string;
  getValue: (a: AIBOMResource) => string;
}[] = [
  { field: 'model', label: 'Model', getValue: getModelName },
  { field: 'intent', label: 'Experiment intent', getValue: getExperimentIntent },
  { field: 'quantization', label: 'Quantization', getValue: getQuantization },
  { field: 'architecture', label: 'Architecture', getValue: getArchitecture },
  { field: 'framework', label: 'Framework', getValue: getFramework },
  { field: 'gpuType', label: 'GPU type', getValue: getGpuType },
  { field: 'jobName', label: 'Job', getValue: getJobName },
  { field: 'gitBranch', label: 'Git branch', getValue: getGitBranch },
  { field: 'gitRepository', label: 'Git repository', getValue: getGitRepository },
  { field: 'servingEngine', label: 'Serving engine', getValue: getServingEngine },
  { field: 'adaptationMethod', label: 'Adaptation method', getValue: getAdaptationMethod },
  { field: 'optimizer', label: 'Optimizer', getValue: getOptimizer },
];

interface AIBOMFilterToolbarProps {
  items: AIBOMResource[];
  filter: AIBOMFilter;
  onFilterChange: (filter: AIBOMFilter) => void;
  sortKey: SortKey;
  onSortChange: (sortKey: SortKey, ascending: boolean) => void;
}

const AIBOMFilterToolbar: FC<AIBOMFilterToolbarProps> = ({
  items,
  filter,
  onFilterChange,
  sortKey,
  onSortChange,
}) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');

  // Which field the value selector currently edits. Applied filters live in
  // `filter` (URL state); this is just the toolbar's own attribute selection.
  const [activeField, setActiveField] = useState<FilterField>(FIELD_CONFIG[0].field);
  const [isAttrOpen, setAttrOpen] = useState(false);
  const [isValueOpen, setValueOpen] = useState(false);

  const optionsByField = useMemo(() => {
    const result = {} as Record<FilterField, string[]>;
    for (const { field, getValue } of FIELD_CONFIG) {
      const values = new Set<string>();
      items.forEach((item) => {
        const value = getValue(item);
        if (value) values.add(value);
      });
      result[field] = Array.from(values).sort((a, b) => a.localeCompare(b));
    }
    return result;
  }, [items]);

  const activeLabel = FIELD_CONFIG.find((c) => c.field === activeField)?.label ?? '';

  return (
    <Toolbar
      clearAllFilters={() => {
        onFilterChange({});
      }}
      collapseListedFiltersBreakpoint="xl"
    >
      <ToolbarContent>
        <ToolbarGroup variant="filter-group">
          {/* Attribute selector — pick which field to filter on. */}
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

          {/* One ToolbarFilter per field so every applied value shows a chip;
              only the active field's value selector is visible. */}
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
                <Select
                  aria-label={t(label)}
                  isOpen={isValueOpen}
                  onOpenChange={setValueOpen}
                  selected={applied ?? null}
                  onSelect={(_event, value) => {
                    onFilterChange({ ...filter, [field]: (value as string) || undefined });
                    setValueOpen(false);
                  }}
                  toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                    <MenuToggle
                      ref={toggleRef}
                      onClick={() => {
                        setValueOpen((open) => !open);
                      }}
                      isExpanded={isValueOpen}
                      style={{ width: '18ch' }}
                    >
                      {applied ?? t('Filter by {{label}}', { label: t(label) })}
                    </MenuToggle>
                  )}
                >
                  <SelectList>
                    {optionsByField[field].map((value) => (
                      <SelectOption key={value} value={value}>
                        {value}
                      </SelectOption>
                    ))}
                  </SelectList>
                </Select>
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

        <ToolbarGroup align={{ default: 'alignEnd' }}>
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

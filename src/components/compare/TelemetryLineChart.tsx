import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart,
  ChartAxis,
  ChartLabel,
  ChartLine,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import type { ChartLimit, ChartLine as ChartLineModel } from '../../utils/compareLines';
import { formatDuration } from '../../utils/executionMetadata';
import type { MetricScale } from '../../utils/formatMetricValue';
import { formatScaled, metricScale, yAxisTicks } from '../../utils/formatMetricValue';
import { runChartColor } from '../../utils/runColors';

interface TelemetryLineChartProps {
  title: string;
  lines: ChartLineModel[];
  unit?: string;
  /** `HARDWARE_METRIC_ORDER`/`INFERENCE_METRIC_ORDER` key; picks Mbps/MB/s for throughput to match the tables. */
  metricKey?: string;
  /** Fixes the x-axis to `[0, xMax]` elapsed seconds; auto-fits to this chart's own data when omitted. */
  xMax?: number;
  /** Hardware metric limits, each drawn as a horizontal red line. */
  limits?: ChartLimit[];
}

const PLOT_HEIGHT = 220;
const FALLBACK_WIDTH = 600;
const PADDING = { top: 16, right: 24 };
/**
 * Victory doesn't size the y-axis gutter to its labels, so wide ones were
 * clipped on the left ("9.54 MiB/s" drew as ".54 MiB/s"). Size it from the
 * longest tick label instead.
 * ponytail: approximate glyph width, measure text if labels still clip.
 */
const TICK_CHAR_WIDTH = 8;
const TICK_GUTTER = 20;
const MIN_LEFT_PADDING = 48;
/**
 * Room under the plot for the x-axis ticks. No legend: on Compare the run
 * labels above the charts are the legend (same colors), and the Detail tab has
 * one run. Line names are in the tooltips.
 */
const BOTTOM_PADDING = 50;
/** Status-danger token rather than a fixed red, so the limit line follows dark mode. */
const LIMIT_COLOR = 'var(--pf-t--global--color--status--danger--default)';
/** A limit's label sits this far below its line (labels above get clipped at the top of the plot). */
const LIMIT_LABEL_DY = 24;
/** Minimum vertical gap between two limits' labels, so close limits don't print over each other. */
const LIMIT_LABEL_GAP = 16;

/** Tracks the container's width so the (fixed-size) Victory chart fills its card. */
function useContainerWidth(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(FALLBACK_WIDTH);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);
  return [ref, width];
}

/**
 * Each limit's label offset below its line. Limits come highest first; when a
 * line sits too close under the previous one, its label is pushed further down
 * so the two don't overlap.
 */
function limitLabelOffsets(limits: ChartLimit[], yMax: number) {
  let previousLabelY = -Infinity;
  return limits.map((limit) => {
    const lineY = yMax > 0 ? (1 - limit.value / yMax) * PLOT_HEIGHT : 0;
    const labelY = Math.max(lineY + LIMIT_LABEL_DY, previousLabelY + LIMIT_LABEL_GAP);
    previousLabelY = labelY;
    return { limit, dy: labelY - lineY };
  });
}

const tooltipLabel =
  (scale: MetricScale) =>
  ({ datum }: { datum: { x: number; y: number; name: string } }): string =>
    `${datum.name}\n${formatScaled(datum.y, scale)} at ${formatDuration(datum.x) ?? '0s'}`;

/**
 * Multi-run line chart on PatternFly's chart library. The x-axis is elapsed
 * time since each run's own start; every line is drawn in its run's color
 * (`runChartColor`), the same one its table `Label` uses.
 */
const TelemetryLineChart: FC<TelemetryLineChartProps> = ({
  title,
  lines,
  unit,
  metricKey,
  xMax,
  limits = [],
}) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const [ref, width] = useContainerWidth();
  const maxValue = Math.max(
    0,
    ...limits.map((limit) => limit.value),
    ...lines.flatMap((line) => line.points.map((p) => p.y)),
  );
  const scale = metricScale(maxValue, unit, metricKey);
  const ticks = yAxisTicks(maxValue, scale);
  const tickLabels = ticks.map((tick) => formatScaled(tick, scale));
  const left = Math.max(
    MIN_LEFT_PADDING,
    Math.max(...tickLabels.map((label) => label.length)) * TICK_CHAR_WIDTH + TICK_GUTTER,
  );
  return (
    <div ref={ref}>
      <Chart
        ariaTitle={title}
        width={width}
        height={PLOT_HEIGHT + PADDING.top + BOTTOM_PADDING}
        padding={{ ...PADDING, left, bottom: BOTTOM_PADDING }}
        domain={{
          y: [0, ticks[ticks.length - 1]],
          ...(xMax === undefined ? {} : { x: [0, xMax] as [number, number] }),
        }}
        containerComponent={
          <ChartVoronoiContainer constrainToVisibleArea labels={tooltipLabel(scale)} />
        }
      >
        <ChartAxis
          tickCount={5}
          fixLabelOverlap
          tickFormat={(x: number) => formatDuration(x) ?? '0s'}
        />
        <ChartAxis
          dependentAxis
          showGrid
          tickValues={ticks}
          tickFormat={(_y: number, index: number) => tickLabels[index]}
        />
        {/* Drawn first so a run that hits its limit (e.g. OOMKilled) stays visible on top. */}
        {limitLabelOffsets(limits, ticks[ticks.length - 1]).map(({ limit, dy }) => {
          const maxX = xMax ?? Math.max(0, ...lines.flatMap((l) => l.points.map((p) => p.x)));
          const runs = limit.runs ?? [];
          const name =
            runs.length > 0
              ? t('Limit: {{runs}}', { runs: runs.map((run) => run.name).join(', ') })
              : t('Limit');
          // "Limit" in red, then a swatch per run in its color, matching the run
          // labels above the charts. Names are too long for the plot; the
          // tooltip carries them.
          const text = [t('Limit'), ...runs.map(() => '\u25A0')];
          const styles = [
            { fill: LIMIT_COLOR },
            ...runs.map((run) => ({ fill: runChartColor(run.colorIndex) })),
          ];
          return (
            <ChartLine
              key={`limit-${String(limit.value)}`}
              data={[
                { x: 0, y: limit.value, name },
                { x: maxX, y: limit.value, name },
              ]}
              // Named on the line itself, since there is no legend.
              // A string[] label renders `inline` with one style per segment; Victory's
              // types only admit a string, hence the cast.
              labels={
                (({ datum }: { datum: { x: number } }) =>
                  datum.x === 0 ? text : '') as unknown as () => string
              }
              labelComponent={
                <ChartLabel dx={6} dy={dy} textAnchor="start" inline style={styles} />
              }
              style={{
                data: {
                  stroke: LIMIT_COLOR,
                  strokeWidth: 1.5,
                  strokeDasharray: '6,4',
                },
              }}
            />
          );
        })}
        {lines.map((line, i) => (
          <ChartLine
            key={`${line.name}-${String(i)}`}
            data={line.points.map((p) => ({ x: p.x, y: p.y, name: line.name }))}
            style={{
              data: {
                stroke: runChartColor(line.colorIndex),
                strokeWidth: 1.5,
                strokeDasharray: line.dash,
              },
            }}
          />
        ))}
      </Chart>
    </div>
  );
};

export default TelemetryLineChart;

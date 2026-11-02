import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Chart,
  ChartAxis,
  ChartLine,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import type { ChartLine as ChartLineModel } from '../../utils/compareLines';
import { formatDuration } from '../../utils/executionMetadata';
import type { MetricScale } from '../../utils/formatMetricValue';
import { formatScaled, metricScale, yAxisTicks } from '../../utils/formatMetricValue';
import { runChartColor } from '../../utils/runColors';

interface TelemetryLineChartProps {
  title: string;
  lines: ChartLineModel[];
  /** One legend entry per compared run (not per expanded series). */
  legend: { name: string; colorIndex: number }[];
  unit?: string;
  /** `HARDWARE_METRIC_ORDER`/`INFERENCE_METRIC_ORDER` key; picks Mbps/MB/s for throughput to match the tables. */
  metricKey?: string;
  /** Fixes the x-axis to `[0, xMax]` elapsed seconds; auto-fits to this chart's own data when omitted. */
  xMax?: number;
  /** Hardware metric limit to show as a horizontal red line. */
  limit?: number;
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
/** Room under the plot for the x-axis ticks before the legend starts. */
const AXIS_ALLOWANCE = 50;
const LEGEND_ROW_HEIGHT = 28;
const LEGEND_CHAR_WIDTH = 7.5;
const LEGEND_ITEM_CHROME = 40;

/**
 * Victory wraps the legend but doesn't grow the chart to fit it, so long run
 * names were clipped at the bottom. Estimate the wrapped row count (greedy
 * packing by approximate text width) so the chart can reserve the space.
 */
const legendRowCount = (names: string[], availableWidth: number): number => {
  let rows = 1;
  let used = 0;
  names.forEach((name) => {
    const itemWidth = name.length * LEGEND_CHAR_WIDTH + LEGEND_ITEM_CHROME;
    if (used > 0 && used + itemWidth > availableWidth) {
      rows += 1;
      used = 0;
    }
    used += itemWidth;
  });
  return rows;
};

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
  legend,
  unit,
  metricKey,
  xMax,
  limit,
}) => {
  const [ref, width] = useContainerWidth();
  const maxValue = Math.max(
    limit !== undefined && limit > 0 ? limit : 0,
    ...lines.flatMap((line) => line.points.map((p) => p.y)),
  );
  const scale = metricScale(maxValue, unit, metricKey);
  const ticks = yAxisTicks(maxValue, scale);
  const tickLabels = ticks.map((tick) => formatScaled(tick, scale));
  const left = Math.max(
    MIN_LEFT_PADDING,
    Math.max(...tickLabels.map((label) => label.length)) * TICK_CHAR_WIDTH + TICK_GUTTER,
  );
  const rows = legendRowCount(
    legend.map((run) => run.name),
    width - left - PADDING.right,
  );
  const bottom = AXIS_ALLOWANCE + rows * LEGEND_ROW_HEIGHT;
  return (
    <div ref={ref}>
      <Chart
        ariaTitle={title}
        width={width}
        height={PLOT_HEIGHT + PADDING.top + bottom}
        padding={{ ...PADDING, left, bottom }}
        domain={{
          y: [0, ticks[ticks.length - 1]],
          ...(xMax === undefined ? {} : { x: [0, xMax] as [number, number] }),
        }}
        legendData={legend.map((run) => ({
          name: run.name,
          symbol: { fill: runChartColor(run.colorIndex) },
        }))}
        legendPosition="bottom"
        legendAllowWrap
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
        {limit !== undefined &&
          limit > 0 &&
          (() => {
            const maxX = xMax ?? Math.max(0, ...lines.flatMap((l) => l.points.map((p) => p.x)));
            return (
              <ChartLine
                data={[
                  { x: 0, y: limit },
                  { x: maxX, y: limit },
                ]}
                style={{
                  data: {
                    stroke: '#C9190B',
                    strokeWidth: 1.5,
                  },
                }}
              />
            );
          })()}
      </Chart>
    </div>
  );
};

export default TelemetryLineChart;

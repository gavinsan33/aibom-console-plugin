import type { LabelProps } from '@patternfly/react-core';

/** Cycles through distinct colors per compared run, mirroring `oc-aibom`'s `runColor` (blue/magenta/yellow/green/red/cyan), using PatternFly's supported `Label` color names. */
const RUN_COLORS: NonNullable<LabelProps['color']>[] = [
  'blue',
  'purple',
  'yellow',
  'green',
  'red',
  'teal',
];

/** PatternFly chart color token family for each `RUN_COLORS` entry, so SVG strokes match the run's `Label` color (and follow dark mode). */
const RUN_CHART_TOKENS = ['blue', 'purple', 'yellow', 'green', 'red-orange', 'teal'];

/** CSS `var(...)` for the run's chart stroke color, matching `runColor(index)`. */
export const runChartColor = (index: number): string =>
  `var(--pf-t--chart--color--${RUN_CHART_TOKENS[index % RUN_CHART_TOKENS.length]}--300)`;

export const runColor = (index: number): NonNullable<LabelProps['color']> =>
  RUN_COLORS[index % RUN_COLORS.length];

/**
 * Each compared run's display name: its job name, plus the AIBOM name's
 * generated suffix (`aibom-x-jbg98` -> `jbg98`) when another compared run has
 * the same job name -- re-runs of one job otherwise look identical in table
 * headers, chart legends and the "left out" note.
 */
export function runLabels(runs: { jobName: string; name: string }[]): string[] {
  const bases = runs.map((run) => run.jobName || run.name);
  return runs.map((run, i) => {
    if (bases.filter((base) => base === bases[i]).length < 2) return bases[i];
    const suffix =
      run.jobName && run.name.startsWith(`${run.jobName}-`)
        ? run.name.slice(run.jobName.length + 1)
        : run.name;
    return suffix === bases[i] ? bases[i] : `${bases[i]} (${suffix})`;
  });
}

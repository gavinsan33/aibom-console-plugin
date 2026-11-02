import { runLabels } from './runColors';

describe('runLabels', () => {
  it('uses the job name alone when it is unique', () => {
    expect(
      runLabels([
        { jobName: 'job-a', name: 'job-a-abc12' },
        { jobName: 'job-b', name: 'job-b-def34' },
      ]),
    ).toEqual(['job-a', 'job-b']);
  });

  it('adds the generated suffix to repeated job names', () => {
    expect(
      runLabels([
        { jobName: 'job-a', name: 'job-a-abc12' },
        { jobName: 'job-a', name: 'job-a-def34' },
        { jobName: 'job-b', name: 'job-b-ghi56' },
      ]),
    ).toEqual(['job-a (abc12)', 'job-a (def34)', 'job-b']);
  });

  it('falls back to the whole AIBOM name when it does not extend the job name', () => {
    expect(
      runLabels([
        { jobName: 'job-a', name: 'custom-1' },
        { jobName: 'job-a', name: 'custom-2' },
        { jobName: '', name: 'orphan' },
      ]),
    ).toEqual(['job-a (custom-1)', 'job-a (custom-2)', 'orphan']);
  });
});

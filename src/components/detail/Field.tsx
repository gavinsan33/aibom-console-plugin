import type { FC, ReactNode } from 'react';
import {
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';

interface FieldProps {
  label: string;
  children: ReactNode;
}

/** Values that mean "not recorded": `formatFlexNumber`'s placeholder and a stringified JSON `null`. */
const MISSING_TEXT = new Set(['', '—', 'null']);

/** One label/value row. Renders nothing when the value is missing, so callers don't need their own presence checks. */
const Field: FC<FieldProps> = ({ label, children }) => {
  if (
    children === undefined ||
    children === null ||
    children === false ||
    (typeof children === 'string' && MISSING_TEXT.has(children))
  )
    return null;
  return (
    <DescriptionListGroup>
      <DescriptionListTerm>{label}</DescriptionListTerm>
      <DescriptionListDescription>{children}</DescriptionListDescription>
    </DescriptionListGroup>
  );
};

export default Field;

import type { FC, ReactNode } from 'react';
import { Card, CardBody, CardTitle, GridItem } from '@patternfly/react-core';
import type { gridSpans } from '@patternfly/react-core';

interface SectionProps {
  title: string;
  children: ReactNode;
  /** Grid columns (of 12) on small screens and up; defaults to full width. */
  span?: gridSpans;
  /** Grid columns (of 12) on medium screens and up; defaults to `span`. */
  md?: gridSpans;
  /** PF6 cards scroll (`overflow: auto`) when content is wider than them; set to instead wrap long unbroken values (`overflow-wrap: anywhere` also shrinks their min-content width, which `break-word` doesn't) so the card never scrolls. */
  wrapContent?: boolean;
}

/** A titled card in the Detail page's grid, the common wrapper every section renders itself in for consistent spacing/boundaries and horizontal layout. */
const Section: FC<SectionProps> = ({ title, children, span = 12, md, wrapContent }) => (
  <GridItem span={span} md={md ?? span}>
    <Card isFullHeight style={wrapContent ? { overflow: 'visible' } : undefined}>
      <CardTitle>{title}</CardTitle>
      <CardBody style={wrapContent ? { overflowWrap: 'anywhere' } : undefined}>{children}</CardBody>
    </Card>
  </GridItem>
);

export default Section;

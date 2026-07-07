import { useEffect, useRef, useState, type ReactNode } from 'react';
import { STATUS_LABELS } from '@core/shorepoint';
import type { ShorePointStatus } from '@core/schema';

/**
 * Badge — read-only indicator (badge.md). Five variants, one geometry.
 * - status: the canonical safety-critical variant. Renders the locked
 *   STATUS_LABELS word verbatim on the per-theme --status-* pair. Cross-fades
 *   color over --motion-status ONLY when the status prop changes after mount —
 *   never on first render (load noise). Sunlight (solid banner) and broadcast
 *   (text-only) escalations live in primitives.css per-theme blocks.
 * - count: a number, tabular figures.
 * - label: short categorical word (group index, "External", NIMS abbr).
 * - severity: condition needing attention — feedback palette, always a word.
 * - dot: smallest signal; the adjacent text is mandatory, never a bare dot.
 * No tap action, no ×, no shadow — anything interactive is a chip or button.
 */
export type BadgeProps =
  | { variant: 'status'; status: ShorePointStatus }
  | { variant: 'count'; value: number; srLabel?: string }
  | { variant: 'label'; children: ReactNode }
  | { variant: 'severity'; children: ReactNode }
  | { variant: 'dot'; tone?: 'accent' | 'danger' | 'warning'; text: string };

function StatusBadge({ status }: { status: ShorePointStatus }) {
  const prev = useRef(status);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (prev.current !== status) {
      prev.current = status;
      setAnimate(true);
    }
  }, [status]);

  return (
    <span
      className={`fs-badge fs-badge--status is-${status}${animate ? ' fs-badge--animate' : ''}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Badge(props: BadgeProps) {
  switch (props.variant) {
    case 'status':
      return <StatusBadge status={props.status} />;
    case 'count':
      return (
        <span className="fs-badge fs-badge--count" aria-label={props.srLabel}>
          {props.value}
        </span>
      );
    case 'label':
      return <span className="fs-badge fs-badge--label">{props.children}</span>;
    case 'severity':
      return <span className="fs-badge fs-badge--severity">{props.children}</span>;
    case 'dot':
      return (
        <span className={`fs-badge fs-badge--dot fs-badge--dot-${props.tone ?? 'accent'}`}>
          <span className="fs-badge-dot" aria-hidden="true" />
          {props.text}
        </span>
      );
  }
}

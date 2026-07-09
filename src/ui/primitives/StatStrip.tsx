import type { ReactNode } from 'react';

/** One figure in a stat strip: a dominant mono numeral beside a quiet caption. */
export interface Stat {
  /** The figure — a number or short string. */
  value: ReactNode;
  /** The lowercase caption label (singular/plural resolved by the caller). */
  label: string;
  /** The strip's one gold accent figure (≤1 per strip; craft.md §5). */
  accent?: boolean;
  /** Dim the figure to tertiary ink when it reads zero (calm chrome). */
  zero?: boolean;
}

export interface StatStripProps {
  stats: Stat[];
  /** Optional per-screen positioning hook (spacing only — not the recipe). */
  className?: string;
}

/**
 * StatStrip — the shared stat strip (craft.md §2): 2–4 figures under a screen's
 * context, each a dominant `--type-mono-stat` numeral beside a quiet caption, laid
 * out inline and whitespace-separated on one wrapping line. Operations and Command
 * both render through this — they had drifted to a column-stack vs. inline recipe;
 * unified to inline 2026-07-08 (Alex's call) so a single component owns the look.
 */
export function StatStrip({ stats, className }: StatStripProps) {
  return (
    <div className={className ? `fs-statstrip ${className}` : 'fs-statstrip'}>
      {stats.map((s, i) => (
        <span key={i} className="fs-statfig" data-zero={s.zero || undefined}>
          <span className={s.accent ? 'fs-statfig-v fs-statfig-v--accent' : 'fs-statfig-v'}>{s.value}</span>
          <span className="fs-statfig-k">{s.label}</span>
        </span>
      ))}
    </div>
  );
}

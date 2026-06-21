import type { OrgDrag } from './useOrgDragDrop';

/**
 * The drag overlay for the org chart (#323) — the floating ghost that follows the
 * pointer plus the absolute insertion-gap hitboxes. Rendered inside `.fs-org`
 * (position:relative); all coords are container-relative. The ghost is
 * pointer-events:none so it's transparent to elementFromPoint; the gaps are
 * pointer-events:auto so a drop between cards wins over the card beneath. Gaps are
 * overlays — never inserted <li>s — so the nested-<ul> connectors are untouched.
 */
export function OrgDragLayer({ drag, gapHot }: { drag: OrgDrag | null; gapHot: (parentId: string, index: number) => boolean }) {
  if (!drag) return null;
  return (
    <div className="fs-org-draglayer" aria-hidden="true">
      {drag.gaps.map((g) => (
        <div
          key={`${g.parentId}#${g.index}`}
          className={`fs-org-gap${g.vertical ? ' is-horiz' : ''}${gapHot(g.parentId, g.index) ? ' is-hot' : ''}`}
          data-org-gap=""
          data-gap-parent={g.parentId}
          data-gap-index={g.index}
          style={{ left: g.left, top: g.top, width: g.width, height: g.height }}
        >
          <span className="fs-org-gap-bar" />
        </div>
      ))}
      <div className="fs-org-ghost" style={{ left: drag.x, top: drag.y }}>
        <span className="fs-org-ghost-title">{drag.label}</span>
        <span className={`fs-org-ghost-action${drag.target?.type === 'lead' ? ' is-lead' : drag.target?.type === 'child' ? ' is-child' : ''}`}>{drag.action}</span>
      </div>
    </div>
  );
}

/* ============================================================
   FieldShore — Org Chart redesign mockup · VIEW ENGINE
   One reusable interactive chart. Instantiated twice (desktop CP +
   phone) against one shared store, so an edit in either reflects
   in both. Connectors are drawn from live node geometry (an SVG
   layer) — the fix for the broken / unevenly-sized parent→child
   links. Hand-rolled Pointer-Events drag (no deps), zoom, and the
   node sheet (assign / manage / move / role history).
   ============================================================ */
import {
  KIND, KIND_LABEL, ROSTER, HISTORY,
  rootOf, childrenOf, leaderOf, isAncestorOrSelf, spanOf, spanLevel,
} from './org-model.js';

const ICON = {
  grip: '<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="6" cy="4" r="1"/><circle cx="10" cy="4" r="1"/><circle cx="6" cy="8" r="1"/><circle cx="10" cy="8" r="1"/><circle cx="6" cy="12" r="1"/><circle cx="10" cy="12" r="1"/></svg>',
  assign: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>',
  rename: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  move: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>',
  add: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  history: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>',
  remove: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/></svg>',
};

// Library of positions the IC can add beneath a node (NIMS, ADR-008).
const LIBRARY = [
  { title: 'Search Group Supervisor', kind: KIND.group },
  { title: 'Medical Group Supervisor', kind: KIND.group },
  { title: 'Division Supervisor', kind: KIND.division },
  { title: 'Branch Director', kind: KIND.branch },
  { title: 'Planning Section Chief', kind: KIND.section },
  { title: 'Liaison Officer', kind: KIND.commandStaff },
  { title: 'Strike Team Leader', kind: KIND.strikeTeam },
  { title: 'Task Force Leader', kind: KIND.taskForce },
];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class OrgView {
  constructor(root, store, opts) {
    this.root = root;
    this.store = store;
    this.frame = opts.frame;       // .win / .phone-screen — where the sheet mounts
    this.editable = opts.editable !== false;
    this.surface = opts.surface || 'desktop';
    this.display = opts.display;   // shared { connector, density } object, mutated by the page
    this.scale = opts.scale || 1;
    this.openId = null;
    this.press = null;
    this.drag = null;
    this.suppressClick = false;

    this._build();
    this.unsub = store.subscribe(() => this.render());
    this.render();
    requestAnimationFrame(() => this.fit());
    window.addEventListener('resize', () => this.drawLinks());
  }

  _build() {
    this.root.classList.add('org');
    if (!this.editable) this.root.classList.add('is-readonly');
    this.root.innerHTML = '';

    if (this.surface === 'phone') {
      const head = el('div', 'org-head',
        `<span class="oh-title">Command — Org Chart</span>
         <div class="oh-actions"><button class="btn-quiet" data-myrole>My role</button></div>`);
      this.root.appendChild(head);
      head.querySelector('[data-myrole]')?.addEventListener('click', () => {
        const r = rootOf(this.store.positions); if (r) this.openSheet(r.id);
      });
    }

    if (this.editable && this.surface === 'desktop') {
      this.roster = el('div', 'org-roster');
      this.root.appendChild(this.roster);
    }

    this.viewport = el('div', 'org-viewport');
    this.canvas = el('div', 'org-canvas');
    this.canvas.style.transformOrigin = '0 0';
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'org-links');
    this.tree = el('ul', 'org-tree');
    this.dragLayer = el('div', 'org-draglayer');
    this.canvas.append(this.svg, this.tree, this.dragLayer);
    this.viewport.appendChild(this.canvas);
    this.root.appendChild(this.viewport);

    // zoom control
    this.zoomBar = el('div', 'org-zoom',
      `<button data-z="out" aria-label="Zoom out">−</button>
       <span class="z-val">100%</span>
       <button data-z="in" aria-label="Zoom in">+</button>
       <button class="z-fit" data-z="fit">Fit</button>`);
    this.root.appendChild(this.zoomBar);
    this.zoomBar.addEventListener('click', (e) => {
      const z = e.target.closest('[data-z]')?.dataset.z;
      if (z === 'in') this.setScale(this.scale + 0.15);
      else if (z === 'out') this.setScale(this.scale - 0.15);
      else if (z === 'fit') this.fit();
    });
    // ctrl/cmd + wheel to zoom inside the viewport
    this.viewport.addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      this.setScale(this.scale - Math.sign(e.deltaY) * 0.1);
    }, { passive: false });

    this.ghost = null;
    this._bindPointer();
  }

  /* ── render the tree, then draw connectors ──────────────── */
  render() {
    const P = this.store.positions;
    const root = rootOf(P);
    if (!root) return;
    this.root.style.setProperty('--tier-gap', this.display.density === 'compact' ? '30px' : '40px');
    this.root.classList.toggle('density-compact', this.display.density === 'compact');

    if (this.roster) this._renderRoster(P);
    this.tree.innerHTML = '';
    this.tree.appendChild(this._renderNode(P, root.id, root.id, 0));
    if (this.openId && P[this.openId]) this._renderSheetBody(P);
    else if (this.openId) this.closeSheet();
    requestAnimationFrame(() => this.drawLinks());
  }

  _renderRoster(P) {
    this.roster.innerHTML = '<span class="org-roster-label">Roster — drag to assign</span>';
    for (const r of ROSTER) {
      const chip = el('div', 'roster-chip',
        `<span class="rc-grip">${ICON.grip}</span>${esc(r.label)} <span class="rc-sub">${esc(r.sub || '')}</span>`);
      chip.addEventListener('pointerdown', (e) => this._beginPress(e, { kind: 'chip', resource: r }, 'immediate'));
      this.roster.appendChild(chip);
    }
  }

  _renderNode(P, id, rootId, depth) {
    const p = P[id];
    const kids = childrenOf(P, id);
    const staff = kids.filter((k) => k.kind === KIND.commandStaff);
    const reports = kids.filter((k) => k.kind !== KIND.commandStaff);
    const li = el('li');

    const row = el('div', 'org-row');
    row.appendChild(this._nodeCard(P, p, id === rootId, depth));
    if (staff.length) {
      const sc = el('div', 'org-staff');
      staff.forEach((s) => sc.appendChild(this._nodeCard(P, s, false, depth + 1)));
      row.appendChild(sc);
    }
    li.appendChild(row);

    if (reports.length) {
      const stacked = depth >= 2 && reports.every((r) => r.kind === KIND.single);
      const ul = el('ul', stacked ? 'is-stack' : '');
      reports.forEach((r) => ul.appendChild(this._renderNode(P, r.id, rootId, depth + 1)));
      li.appendChild(ul);
    }
    return li;
  }

  _nodeCard(P, p, isRoot, depth) {
    const leader = leaderOf(p);
    const extra = p.assignedResources.length - 1;
    const span = spanOf(P, p.id);
    const lvl = spanLevel(span);
    const isResource = p.kind === KIND.single;
    const cls = ['node'];
    if (isRoot) cls.push('is-ic');
    if (p.kind === KIND.commandStaff) cls.push('is-staff');
    if (p.kind === KIND.workstation) cls.push('is-workstation');
    if (isResource) cls.push('is-resource');
    if (!leader) cls.push('is-unassigned');

    const meta = [];
    if (extra > 0) meta.push(`<span class="badge count">+${extra} resource${extra > 1 ? 's' : ''}</span>`);
    if (p.kind === KIND.division && p.floor != null) meta.push(`<span class="badge loc">Div ${p.floor}${p.side ? ' · ' + p.side + ' side' : ''}</span>`);
    if (lvl !== 'ok') meta.push(`<span class="badge span-${lvl}">Span ${span} · ${lvl === 'over' ? 'over limit' : 'caution'}</span>`);

    const node = el('button', cls.join(' '),
      `<span class="node-dot"></span>
       <span class="node-body">
         <span class="node-eyebrow">${esc(KIND_LABEL[p.kind] || '')}</span>
         <span class="node-title">${esc(p.title)}</span>
         <span class="node-leader">${leader ? esc(leader.label) + (leader.sub ? ` <span class="nl-sub">${esc(leader.sub)}</span>` : '') : 'Unassigned'}</span>
         ${meta.length ? `<span class="node-meta">${meta.join('')}</span>` : ''}
       </span>`);
    node.type = 'button';
    node.dataset.node = p.id;
    // grab handle (desktop, non-root, editable)
    if (this.editable && this.surface === 'desktop' && !isRoot) {
      const grip = el('span', 'node-grip', ICON.grip);
      grip.addEventListener('pointerdown', (e) => { e.stopPropagation(); this._beginPress(e, { kind: 'node', id: p.id }, 'immediate'); });
      node.appendChild(grip);
    }
    // body press: phone hold-to-drag; tap opens sheet
    node.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.node-grip')) return;
      const mode = this.editable && this.surface === 'phone' && !isRoot ? 'hold' : 'tap';
      this._beginPress(e, { kind: 'node', id: p.id }, mode, () => this.openSheet(p.id));
    });
    node.addEventListener('click', () => { if (this._consumeClick()) return; this.openSheet(p.id); });
    return node;
  }

  /* untransformed layout position of `el` relative to the canvas content box —
     immune to the canvas transform/zoom (the fix for connectors detaching on zoom). */
  _localBox(el) {
    let x = 0, y = 0, n = el;
    while (n && n !== this.canvas) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    const w = el.offsetWidth, h = el.offsetHeight;
    return { l: x, t: y, r: x + w, b: y + h, mx: x + w / 2, my: y + h / 2 };
  }

  /* ── connectors (SVG, from live geometry) ───────────────── */
  drawLinks() {
    const P = this.store.positions;
    const w = this.canvas.offsetWidth, h = this.canvas.offsetHeight;
    this.svg.setAttribute('width', w); this.svg.setAttribute('height', h);
    this.svg.style.width = w + 'px'; this.svg.style.height = h + 'px';
    const box = (id) => {
      const e = this.tree.querySelector(`[data-node="${id}"]`);
      return e ? this._localBox(e) : null;
    };
    const style = this.display.connector;
    const segs = [];

    for (const parent of Object.values(P)) {
      const kids = childrenOf(P, parent.id);
      const pb = box(parent.id);
      if (!pb) continue;
      const reports = kids.filter((k) => k.kind !== KIND.commandStaff);
      const staff = kids.filter((k) => k.kind === KIND.commandStaff);

      // staff — dashed L connectors from parent right-mid
      for (const sNode of staff) {
        const sb = box(sNode.id); if (!sb) continue;
        const stemX = pb.r + 17;
        segs.push({ d: `M ${pb.r} ${pb.my} H ${stemX} V ${sb.my} H ${sb.l}`, staff: true });
      }

      if (!reports.length) continue;
      const stacked = parentIsStacked(P, parent.id, reports);
      const boxes = reports.map((r) => box(r.id)).filter(Boolean);
      if (!boxes.length) continue;

      if (stacked) {
        // vertical spine under the parent's left, elbows to each child
        const spineX = pb.l + 15;
        const last = boxes[boxes.length - 1];
        segs.push({ d: `M ${pb.mx} ${pb.b} V ${pb.b + 6} M ${spineX} ${pb.b} V ${last.my}` });
        for (const b of boxes) segs.push({ d: `M ${spineX} ${b.my} H ${b.l}` });
      } else {
        const busY = pb.b + (boxes[0].t - pb.b) / 2;
        const minX = Math.min(...boxes.map((b) => b.mx));
        const maxX = Math.max(...boxes.map((b) => b.mx));
        // down-stem from parent
        segs.push({ d: `M ${pb.mx} ${pb.b} V ${busY}` });
        if (style === 'taper') {
          for (const b of boxes) segs.push({ d: `M ${pb.mx} ${busY} L ${b.mx} ${b.t}` });
        } else if (style === 'bracket') {
          const r = 9;
          for (const b of boxes) {
            const dx = b.mx - pb.mx;
            if (Math.abs(dx) < 1) { segs.push({ d: `M ${b.mx} ${busY} V ${b.t}` }); continue; }
            const dir = Math.sign(dx);
            segs.push({ d: `M ${pb.mx} ${busY} H ${b.mx - dir * r} Q ${b.mx} ${busY} ${b.mx} ${busY + r} V ${b.t}` });
          }
        } else { // elbow (default)
          if (boxes.length > 1) segs.push({ d: `M ${minX} ${busY} H ${maxX}` });
          for (const b of boxes) segs.push({ d: `M ${b.mx} ${busY} V ${b.t}` });
        }
      }
    }
    // build svg paths
    this.svg.innerHTML = segs.map((sg) =>
      `<path d="${sg.d}"${sg.staff ? ' class="is-staff"' : ''}/>`).join('');
  }

  /* ── zoom ───────────────────────────────────────────────── */
  setScale(v, anim = true) {
    this.scale = clamp(round2(v), 0.4, 1.6);
    this.canvas.classList.toggle('no-anim', !anim);
    this.canvas.style.transform = `scale(${this.scale})`;
    this.zoomBar.querySelector('.z-val').textContent = Math.round(this.scale * 100) + '%';
    this.drawLinks();
  }
  fit() {
    const avail = this.viewport.clientWidth - 24;
    const content = this.tree.scrollWidth || this.canvas.scrollWidth;
    if (!content) return;
    const s = clamp(avail / (content + 96), 0.4, 1);
    this.setScale(this.surface === 'phone' ? Math.min(s, 0.9) : s, false);
    // center the viewport on the IC (root) node so both surfaces open sensibly
    requestAnimationFrame(() => {
      const root = rootOf(this.store.positions);
      const rootEl = root && this.tree.querySelector(`[data-node="${root.id}"]`);
      if (rootEl) {
        const b = this._localBox(rootEl);
        this.viewport.scrollLeft = b.mx * this.scale - this.viewport.clientWidth / 2;
      } else {
        this.viewport.scrollLeft = (this.canvas.offsetWidth * this.scale - this.viewport.clientWidth) / 2;
      }
      this.viewport.scrollTop = 0;
    });
  }

  /* ── drag + drop ────────────────────────────────────────── */
  _bindPointer() {
    this._onMove = (e) => this._winMove(e);
    this._onUp = (e) => this._winUp(e);
    this._onCancel = (e) => this._winCancel(e);
  }
  _beginPress(e, source, mode, onTap) {
    if (!this.editable && mode !== 'tap') return;
    if (mode === 'tap') { // still allow tap-to-open via click; no drag listeners needed for root/desktop body
      this.press = { source, sx: e.clientX, sy: e.clientY, id: e.pointerId, mode, onTap, armed: false, el: e.currentTarget, holdT: null };
      window.addEventListener('pointermove', this._onMove);
      window.addEventListener('pointerup', this._onUp);
      window.addEventListener('pointercancel', this._onCancel);
      return;
    }
    if (!this.editable) return;
    this.press = { source, sx: e.clientX, sy: e.clientY, id: e.pointerId, mode, onTap, armed: false, el: e.currentTarget, holdT: null };
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
    window.addEventListener('pointercancel', this._onCancel);
    if (mode === 'hold') this.press.holdT = setTimeout(() => this._arm(this.press.sx, this.press.sy), 200);
  }
  _arm(x, y) {
    const st = this.press; if (!st) return;
    st.armed = true;
    if (st.holdT) { clearTimeout(st.holdT); st.holdT = null; }
    this.suppressClick = true;
    try { st.el.setPointerCapture(st.id); } catch {}
    const P = this.store.positions;
    const label = st.source.kind === 'chip' ? st.source.resource.label : P[st.source.id]?.title || '';
    // ghost
    this.ghost = el('div', 'org-ghost', `<span class="org-ghost-title">${esc(label)}</span><span class="org-ghost-action">Drag onto a card…</span>`);
    document.body.appendChild(this.ghost);
    this.viewport.classList.add('is-dragging');
    this._buildGaps();
    this.drag = { target: null };
    this._update(x, y);
  }
  _buildGaps() {
    this.dragLayer.innerHTML = '';
    const st = this.press; if (!st || st.source.kind !== 'node') return;
    const P = this.store.positions;
    const parents = new Set(Object.values(P).filter((p) => p.parentId).map((p) => p.parentId));
    for (const Pid of parents) {
      if (Pid === st.source.id || isAncestorOrSelf(P, st.source.id, Pid)) continue;
      const sibs = childrenOf(P, Pid).filter((c) => c.id !== st.source.id && c.kind !== KIND.commandStaff);
      if (!sibs.length) continue;
      const rs = sibs.map((c) => { const e = this.tree.querySelector(`[data-node="${c.id}"]`); return e ? this._localBox(e) : null; }).filter(Boolean);
      if (rs.length !== sibs.length) continue;
      const vert = parentIsStacked(P, Pid, sibs);
      const minL = Math.min(...rs.map((r) => r.l)), maxR = Math.max(...rs.map((r) => r.r));
      const minT = Math.min(...rs.map((r) => r.t)), maxB = Math.max(...rs.map((r) => r.b));
      for (let i = 0; i <= sibs.length; i++) {
        let g;
        if (vert) {
          const cy = i === 0 ? rs[0].t - 10 : i === sibs.length ? rs[rs.length - 1].b + 10 : (rs[i - 1].b + rs[i].t) / 2;
          g = { left: minL - 8, top: cy - 11, width: maxR - minL + 16, height: 22, cls: 'h' };
        } else {
          const cx = i === 0 ? rs[0].l - 11 : i === sibs.length ? rs[rs.length - 1].r + 11 : (rs[i - 1].r + rs[i].l) / 2;
          g = { left: cx - 11, top: minT, width: 22, height: maxB - minT, cls: 'v' };
        }
        const box = el('div', `org-gap ${g.cls}`, '<span class="org-gap-bar"></span>');
        box.dataset.gap = ''; box.dataset.parent = Pid; box.dataset.index = i;
        box.style.cssText += `left:${g.left}px;top:${g.top}px;width:${g.width}px;height:${g.height}px;`;
        this.dragLayer.appendChild(box);
      }
    }
  }
  _winMove(e) {
    const st = this.press; if (!st || e.pointerId !== st.id) return;
    const dx = e.clientX - st.sx, dy = e.clientY - st.sy;
    if (!st.armed) {
      if (st.mode === 'immediate' && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) this._arm(e.clientX, e.clientY);
      else if (st.mode === 'hold' && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) this._cleanupPress();
      return;
    }
    if (e.cancelable) e.preventDefault();
    this._update(e.clientX, e.clientY);
    this._edgePan(e.clientX, e.clientY);
  }
  _winUp(e) {
    const st = this.press; if (!st || e.pointerId !== st.id) return;
    if (st.armed) { if (this.drag?.target) this._commit(this.drag.target, st.source); }
    else if (st.mode !== 'immediate' && Math.hypot(e.clientX - st.sx, e.clientY - st.sy) < 8) st.onTap?.();
    else if (st.mode === 'tap' && Math.hypot(e.clientX - st.sx, e.clientY - st.sy) < 8) { /* click handles it */ }
    this._cleanupPress();
  }
  _winCancel(e) { const st = this.press; if (st && e.pointerId === st.id) this._cleanupPress(); }
  _cleanupPress() {
    const st = this.press;
    if (st?.holdT) clearTimeout(st.holdT);
    if (st?.armed) { try { st.el.releasePointerCapture(st.id); } catch {} }
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    window.removeEventListener('pointercancel', this._onCancel);
    if (this.ghost) { this.ghost.remove(); this.ghost = null; }
    this.viewport.classList.remove('is-dragging');
    this.dragLayer.innerHTML = '';
    this._clearDragClasses();
    this.press = null; this.drag = null;
  }
  _update(x, y) {
    const P = this.store.positions;
    const target = this._hit(x, y);
    this.drag.target = target;
    // ghost
    if (this.ghost) {
      this.ghost.style.left = x + 'px'; this.ghost.style.top = y + 'px';
      const act = this.ghost.querySelector('.org-ghost-action');
      act.className = 'org-ghost-action';
      if (!target) act.textContent = 'Drag onto a card…';
      else if (target.type === 'gap') act.textContent = 'Reorder';
      else if (target.type === 'lead') { act.textContent = `Lead ${P[target.id]?.title || ''}`; act.classList.add('lead'); }
      else { act.textContent = `Subordinate of ${P[target.id]?.title || ''}`; act.classList.add('child'); }
    }
    this._paintDrag(target);
  }
  _hit(x, y) {
    const st = this.press; const P = this.store.positions;
    const elAt = document.elementFromPoint(x, y); if (!elAt) return null;
    if (st.source.kind === 'node') {
      const gap = elAt.closest('[data-gap]');
      if (gap) return { type: 'gap', parentId: gap.dataset.parent, index: +gap.dataset.index };
    }
    const nodeEl = elAt.closest('[data-node]');
    if (nodeEl) {
      const id = nodeEl.dataset.node;
      const r = nodeEl.getBoundingClientRect();
      if (this._isResource(st.source) && y < r.top + r.height / 2 && this._leadValid(st.source, id)) return { type: 'lead', id };
      if (this._childValid(st.source, id)) return { type: 'child', id };
    }
    return null;
  }
  _isResource(s) { return s.kind === 'chip' || this.store.positions[s.id]?.kind === KIND.single; }
  _leadValid(s, id) {
    if (!this._isResource(s)) return false;
    if (s.kind === 'node') { if (id === s.id) return false; if (isAncestorOrSelf(this.store.positions, s.id, id)) return false; }
    return true;
  }
  _childValid(s, id) {
    const P = this.store.positions;
    if (s.kind === 'chip') return true;
    if (id === s.id) return false;
    if (isAncestorOrSelf(P, s.id, id)) return false;
    if (P[s.id]?.parentId === id) return false;
    return true;
  }
  _paintDrag(target) {
    this._clearDragClasses();
    const st = this.press; if (!st) return;
    const P = this.store.positions;
    for (const node of this.tree.querySelectorAll('[data-node]')) {
      const id = node.dataset.node;
      if (st.source.kind === 'node' && st.source.id === id) { node.classList.add('is-lifted'); continue; }
      const valid = this._leadValid(st.source, id) || this._childValid(st.source, id);
      node.classList.add(valid ? 'is-valid' : 'is-blocked');
      if (this._leadValid(st.source, id)) node.classList.add('is-splitting');
    }
    for (const node of this.tree.querySelectorAll('[data-node]')) node.classList.remove('is-hot-top', 'is-hot-bottom');
    for (const g of this.dragLayer.querySelectorAll('.org-gap')) g.classList.remove('is-hot');
    if (!target) return;
    if (target.type === 'lead') this.tree.querySelector(`[data-node="${target.id}"]`)?.classList.add('is-hot-top');
    else if (target.type === 'child') this.tree.querySelector(`[data-node="${target.id}"]`)?.classList.add('is-hot-bottom');
    else if (target.type === 'gap') {
      for (const g of this.dragLayer.querySelectorAll('.org-gap'))
        if (g.dataset.parent === target.parentId && +g.dataset.index === target.index) g.classList.add('is-hot');
    }
  }
  _clearDragClasses() {
    void this.store;
    for (const n of this.tree.querySelectorAll('[data-node]'))
      n.classList.remove('is-lifted', 'is-valid', 'is-blocked', 'is-splitting', 'is-hot-top', 'is-hot-bottom');
  }
  _edgePan(x, y) {
    const r = this.viewport.getBoundingClientRect();
    const band = 48, sp = 16;
    if (x < r.left + band) this.viewport.scrollLeft -= sp * (1 - (x - r.left) / band);
    else if (x > r.right - band) this.viewport.scrollLeft += sp * (1 - (r.right - x) / band);
    if (y < r.top + band) this.viewport.scrollTop -= sp * (1 - (y - r.top) / band);
    else if (y > r.bottom - band) this.viewport.scrollTop += sp * (1 - (r.bottom - y) / band);
  }
  _commit(target, source) {
    const P = this.store.positions;
    if (target.type === 'gap') {
      if (source.kind !== 'node') return;
      this.store.reorder(source.id, target.parentId, target.index);
    } else if (target.type === 'lead') {
      if (source.kind === 'chip') this.store.assign(target.id, source.resource);
      else {
        const node = P[source.id]; if (!node) return;
        if (node.builtIn) { this.store.reparent(source.id, target.id); return; }
        node.assignedResources.forEach((r) => this.store.assign(target.id, r));
        this.store.remove(source.id);
      }
    } else { // child
      if (source.kind === 'chip') {
        const id = this.store.addChild(target.id, source.resource.label, KIND.single);
        this.store.assign(id, source.resource);
      } else this.store.reparent(source.id, target.id);
    }
  }
  _consumeClick() { if (!this.suppressClick) return false; this.suppressClick = false; return true; }

  /* ── node sheet ─────────────────────────────────────────── */
  openSheet(id) {
    this.openId = id;
    if (!this.scrim) {
      this.scrim = el('div', 'sheet-scrim');
      this.scrim.addEventListener('click', () => this.closeSheet());
      this.sheet = el('div', 'sheet');
      this.frame.append(this.scrim, this.sheet);
    }
    this._renderSheetBody(this.store.positions);
    requestAnimationFrame(() => { this.scrim.classList.add('open'); this.sheet.classList.add('open'); });
  }
  closeSheet() {
    this.openId = null;
    if (this.scrim) { this.scrim.classList.remove('open'); this.sheet.classList.remove('open'); }
  }
  _renderSheetBody(P) {
    if (!this.sheet) return;
    const p = P[this.openId]; if (!p) { this.closeSheet(); return; }
    const isRoot = p.parentId === null;
    const span = spanOf(P, p.id); const lvl = spanLevel(span);
    const reports = childrenOf(P, p.id);
    const hist = HISTORY[p.id];
    const editable = this.editable;

    const resHtml = p.assignedResources.length
      ? `<ul class="res-list">${p.assignedResources.map((r, i) => `
          <li class="res-row"><span class="res-name">${esc(r.label)}${i === 0 && !isRoot ? '<span class="rn-tag">Lead</span>' : ''}${r.sub ? `<span class="rn-sub">${esc(r.sub)}</span>` : ''}</span>
          ${editable ? `<button class="res-clear" data-clear="${esc(r.label)}">Clear</button>` : ''}</li>`).join('')}</ul>`
      : '<p class="sheet-empty">Unassigned — assign a resource below.</p>';

    const poolHtml = editable ? `
      <div class="assign-row">
        <input class="assign-input" data-assign-input placeholder="Name or rig…" />
        <button class="assign-add" data-assign-add>Assign</button>
      </div>
      <div class="assign-pool">${ROSTER.map((r) => `<button class="assign-pill" data-pool="${esc(r.label)}">+ ${esc(r.label)}</button>`).join('')}</div>` : '';

    const manageHtml = editable ? `
      <div class="sheet-section">Manage structure ${isRoot ? '· IC only' : ''}</div>
      <div class="manage-grid">
        <button class="manage-btn" data-add>${ICON.add} Add sub-role</button>
        <button class="manage-btn" data-rename>${ICON.rename} Rename</button>
        <button class="manage-btn" data-move ${isRoot ? 'disabled' : ''}>${ICON.move} Move under…</button>
        <button class="manage-btn danger" data-remove ${isRoot || p.builtIn ? 'disabled' : ''}>${ICON.remove} Remove</button>
      </div>` : '';

    const histHtml = `
      <div class="sheet-section">Role history</div>
      ${hist ? `<ul class="hist-list">${hist.map((h) => `<li class="hist-row"><span class="hist-at">${esc(h.at)}</span><span class="hist-main">${esc(h.who)}<span class="hist-note">${esc(h.note)}</span></span></li>`).join('')}</ul>`
        : '<p class="sheet-empty">No recorded changes for this position.</p>'}`;

    this.sheet.innerHTML = `
      <div class="sheet-grip"></div>
      <div class="sheet-head">
        <div><span class="sh-eyebrow">${esc(KIND_LABEL[p.kind] || '')}${lvl !== 'ok' ? ` · span ${span} ${lvl}` : ''}</span><h3>${esc(p.title)}</h3></div>
        <button class="sheet-close" aria-label="Close">×</button>
      </div>
      <div class="sheet-body">
        <div class="sheet-section">Assigned ${p.assignedResources.length ? `· ${p.assignedResources.length}` : ''}</div>
        ${resHtml}
        ${poolHtml}
        ${reports.length ? `<div class="sheet-section">Direct reports · ${reports.length}</div><ul class="res-list">${reports.map((r) => `<li class="res-row"><span class="res-name">${esc(r.title)}<span class="rn-sub">${esc(leaderOf(r)?.label || 'Unassigned')}</span></span></li>`).join('')}</ul>` : ''}
        ${manageHtml}
        ${histHtml}
      </div>`;
    this._wireSheet(p);
  }
  _wireSheet(p) {
    const sh = this.sheet;
    sh.querySelector('.sheet-close').onclick = () => this.closeSheet();
    sh.querySelectorAll('[data-clear]').forEach((b) => b.onclick = () => this.store.clear(p.id, b.dataset.clear));
    sh.querySelectorAll('[data-pool]').forEach((b) => b.onclick = () => this.store.assign(p.id, ROSTER.find((r) => r.label === b.dataset.pool)));
    const input = sh.querySelector('[data-assign-input]');
    const addRes = () => { const v = input.value.trim(); if (v) { this.store.assign(p.id, { ref: 'individual', value: v, label: v, sub: null }); input.value = ''; } };
    sh.querySelector('[data-assign-add]') && (sh.querySelector('[data-assign-add]').onclick = addRes);
    input && input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addRes(); });
    const addBtn = sh.querySelector('[data-add]'); if (addBtn) addBtn.onclick = () => this._openAddPicker(p);
    const rn = sh.querySelector('[data-rename]'); if (rn) rn.onclick = () => this._openRename(p);
    const mv = sh.querySelector('[data-move]'); if (mv && !mv.disabled) mv.onclick = () => this._openMovePicker(p);
    const rm = sh.querySelector('[data-remove]'); if (rm && !rm.disabled) rm.onclick = () => this._openRemoveConfirm(p);
  }
  _openRename(p) {
    const body = this.sheet.querySelector('.sheet-body');
    const wrap = el('div', 'sheet-inline', `<div class="sheet-section">Rename position</div>
      <div class="assign-row"><input class="assign-input" data-rn-input /><button class="assign-add" data-rn-save>Save</button></div>`);
    body.prepend(wrap);
    const input = wrap.querySelector('[data-rn-input]');
    input.value = p.title; input.focus(); input.select();
    const save = () => { const v = input.value.trim(); if (v) this.store.rename(p.id, v); };
    wrap.querySelector('[data-rn-save]').onclick = save;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
    body.scrollTop = 0;
  }
  _openRemoveConfirm(p) {
    const body = this.sheet.querySelector('.sheet-body');
    const wrap = el('div', 'sheet-inline', `<div class="sheet-section">Remove position</div>
      <p class="sheet-empty">Remove “${esc(p.title)}” and everything reporting to it? This can’t be undone.</p>
      <div class="assign-row"><button class="manage-btn danger" data-rm-yes style="flex:1;justify-content:center">Remove</button><button class="manage-btn" data-rm-no style="flex:1;justify-content:center">Cancel</button></div>`);
    body.prepend(wrap);
    wrap.querySelector('[data-rm-yes]').onclick = () => { this.store.remove(p.id); this.closeSheet(); };
    wrap.querySelector('[data-rm-no]').onclick = () => wrap.remove();
    body.scrollTop = 0;
  }
  _openAddPicker(p) {
    const body = this.sheet.querySelector('.sheet-body');
    const wrap = el('div', '', `<div class="sheet-section">Add a position under ${esc(p.title)}</div>
      <ul class="move-list">${LIBRARY.map((l, i) => `<li><button class="move-item" data-lib="${i}"><span>${esc(l.title)}</span><span class="mi-sub">${esc(KIND_LABEL[l.kind])}</span></button></li>`).join('')}</ul>`);
    body.prepend(wrap);
    wrap.querySelectorAll('[data-lib]').forEach((b) => b.onclick = () => { const l = LIBRARY[+b.dataset.lib]; this.store.addChild(p.id, l.title, l.kind); });
    body.scrollTop = 0;
  }
  _openMovePicker(p) {
    const P = this.store.positions;
    const targets = Object.values(P).filter((t) => t.id !== p.id && !isAncestorOrSelf(P, p.id, t.id) && t.kind !== KIND.single && t.parentId !== p.id || t.parentId === null && t.id !== p.id);
    const valid = Object.values(P).filter((t) => t.id !== p.id && !isAncestorOrSelf(P, p.id, t.id) && t.kind !== KIND.single && t.kind !== KIND.commandStaff);
    void targets;
    const body = this.sheet.querySelector('.sheet-body');
    const wrap = el('div', '', `<div class="sheet-section">Move ${esc(p.title)} under…</div>
      <ul class="move-list">${valid.map((t) => `<li><button class="move-item" data-mv="${t.id}"><span>${esc(t.title)}</span><span class="mi-sub">${esc(leaderOf(t)?.label || KIND_LABEL[t.kind])}</span></button></li>`).join('')}</ul>`);
    body.prepend(wrap);
    wrap.querySelectorAll('[data-mv]').forEach((b) => b.onclick = () => { this.store.reparent(p.id, b.dataset.mv); });
    body.scrollTop = 0;
  }
}

/* ── helpers ──────────────────────────────────────────────── */
function parentIsStacked(P, parentId, reports) {
  // mirror the renderer: a bottom-most parent whose every report is a single resource
  // stacks them on a vertical spine. depth ≥ 2 ⟺ parent is not the IC and not a section.
  const depthOk = (() => { let d = 0, cur = parentId; while (cur != null && d < 99) { cur = P[cur]?.parentId ?? null; d++; } return d - 1 >= 2; })();
  return depthOk && reports.length > 0 && reports.every((r) => r.kind === KIND.single);
}
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function round2(n) { return Math.round(n * 100) / 100; }

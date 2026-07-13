// Round-3 showpiece orchestration (#442) — desktop full mode only, loaded
// dynamically by welcome.ts after the capability gate. Owns: smooth scroll,
// act pinning, counters, the strut/rig 3D scenes, the horizontal app pan, and
// the filament stage lighting. The hero is deliberately NOT scroll-driven — it
// holds as a still ambient bed and scrolls away into the measurement.
// Scroll-time work is transforms/opacity/canvas only.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import type { StrutScene } from './welcome-strut';

// Pacing pass (Alex, 2026-07-12): every act reports its resting poses so a
// magnetic settle can glide the page to the nearest one after the scroll stops.
interface PacedAct {
  st: ScrollTrigger;
  rests: number[]; // resting poses as fractions of the act's pin [0..1]
}

/** Rest fractions for a timeline: its start plus each named label. */
function restsOf(tl: gsap.core.Timeline, labels: string[]): number[] {
  return [0, ...labels.map((l) => (tl.labels[l] ?? 0) / tl.duration())];
}

// Scenes are singletons per canvas: gsap.matchMedia reverts and rebuilds the
// acts on every 1100px crossing (iPad rotation crosses it both ways), and
// recreating a renderer on a canvas that already has one leaks GPU resources.
const truckScenes = new WeakMap<HTMLCanvasElement, import('./welcome-truck').TruckScene>();
const strutScenes = new WeakMap<HTMLCanvasElement, StrutScene>();
const cutScenes = new WeakMap<HTMLCanvasElement, import('./welcome-cut').CutScene>();

/** WebGL died or its chunk failed to load — reveal the act's static 2D art. */
function fallbackTo2D(act: HTMLElement, canvas: HTMLCanvasElement): void {
  canvas.style.display = 'none';
  const svg = act.querySelector<SVGElement>('svg');
  if (svg) svg.style.display = 'block';
}

/** Permanent 2D handoff if the GPU context is ever lost mid-visit. */
function guardContextLoss(act: HTMLElement, canvas: HTMLCanvasElement): void {
  canvas.addEventListener(
    'webglcontextlost',
    (e) => {
      e.preventDefault();
      fallbackTo2D(act, canvas);
    },
    { once: true },
  );
}

export function init(): void {
  gsap.registerPlugin(ScrollTrigger);
  // Android toolbar show/hide fires resize events mid-scroll; recomputing every
  // pin for those makes pinned content visibly jump.
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Heavier, softer scroll — one flick travels ~30% less and settles smoothly,
  // so a single trackpad gesture can no longer blow through an act. syncTouch
  // hands phone touch scrolling to Lenis too (keeps iOS pinning smooth).
  const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.7, syncTouch: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // The acts build per breakpoint: desktop keeps the approved wide blocking;
  // narrow viewports (< 1100px) get portrait re-blocking of the same beats.
  // matchMedia reverts and rebuilds everything if the viewport crosses over.
  // Complementary conditions (`not` of the same query) — a max-width mirror
  // leaves a fractional-pixel dead zone at browser zoom where NEITHER matches
  // and no acts build. 1100 must match the cine-phone gate in welcome.ts.
  const mm = gsap.matchMedia();
  mm.add({ isDesktop: '(min-width: 1100px)', isPhone: 'not all and (min-width: 1100px)' }, (ctx) => {
    const phone = (ctx.conditions as { isPhone?: boolean } | undefined)?.isPhone === true;

    const acts = [initMeasure(phone), initRig(phone), initStrut(), initCut(phone), initAppPan(phone)].filter(
      (a): a is PacedAct => a !== undefined,
    );
    if (!phone) initFilament(); // the filament rail is a wide-screen instrument

    // Magnetic settle, hand-rolled. (lenis/snap was tried first but its
    // 'proximity' mode PREDICTS the landing from the last raw input delta, which
    // flings a big flick past an act's intermediate beats — verified live.)
    // This version acts only from actual rest: momentum plays out naturally,
    // then — if the page stopped NEAR a resting pose — it eases onto it. A stop
    // in the free middle of an act stays exactly where the finger left it.
    let snapPoints: number[] = [];
    const rebuildSnaps = () => {
      snapPoints = acts.flatMap(({ st, rests }) =>
        rests.map((p) => st.start + p * (st.end - st.start)),
      );
    };
    ScrollTrigger.addEventListener('refresh', rebuildSnaps);
    rebuildSnaps();

    let settling = false;
    let settleGuard = 0;
    let idleTimer = 0;
    // Settle only after a real wheel/touch gesture. Scrollbar drags, PgDn/End,
    // Home, and find-in-page all arrive as native jumps — settling after those
    // yanks the page away from where the user deliberately put it.
    let gestureAt = 0;
    const markGesture = () => {
      gestureAt = performance.now();
      // A new gesture interrupts any in-flight settle glide — Lenis won't fire
      // that scrollTo's onComplete, so clear the latch here or it sticks
      // forever and the settle dies for the rest of the session.
      settling = false;
      window.clearTimeout(settleGuard);
    };
    window.addEventListener('wheel', markGesture, { passive: true });
    window.addEventListener('touchmove', markGesture, { passive: true });

    const offSettle = lenis.on('scroll', (l: Lenis) => {
      if (settling) return;
      window.clearTimeout(idleTimer);
      if (Math.abs(l.velocity) > 0.1) return; // still moving — wait for real rest
      idleTimer = window.setTimeout(() => {
        // 3s covers post-flick inertia (touchmove stops at finger-lift, the
        // glide runs on); a scrollbar/keyboard jump has no gesture for minutes.
        if (performance.now() - gestureAt > 3000) return; // not a wheel/touch stop
        const here = lenis.scroll;
        let best: number | null = null;
        for (const p of snapPoints) {
          if (best === null || Math.abs(p - here) < Math.abs(best - here)) best = p;
        }
        // Glide only when meaningfully off a pose but within grabbing distance.
        if (best === null || Math.abs(best - here) < 2 || Math.abs(best - here) > innerHeight * 0.4) return;
        settling = true;
        // Belt-and-suspenders latch clear — onComplete only fires on an
        // uninterrupted glide.
        settleGuard = window.setTimeout(() => {
          settling = false;
        }, 900);
        lenis.scrollTo(best, {
          duration: 0.7,
          easing: (t: number) => 1 - Math.pow(1 - t, 3),
          onComplete: () => {
            settling = false;
            window.clearTimeout(settleGuard);
          },
        });
      }, 250);
    });

    return () => {
      ScrollTrigger.removeEventListener('refresh', rebuildSnaps);
      window.clearTimeout(idleTimer);
      window.clearTimeout(settleGuard);
      window.removeEventListener('wheel', markGesture);
      window.removeEventListener('touchmove', markGesture);
      if (typeof offSettle === 'function') offSettle();
    };
  });
}

/* ---- Act 2 — the measurement ------------------------------------------------ */

function initMeasure(phone: boolean): PacedAct | undefined {
  const act = document.querySelector<HTMLElement>('#act2');
  const counterEl = act?.querySelector<HTMLElement>('.counter');
  if (!act || !counterEl) return undefined;

  const counter = { v: 0 };
  counterEl.textContent = '0';

  // The slabs part FIRST over black; the measurement content only fades in
  // once they're mostly apart (round 3.2 — no numerals colliding with the
  // moving slabs on entry). Second beat: once the ledger totals 40⅛″, the
  // measurement block glides LEFT and the app's real strut-selector answer
  // (shot-strutfit.png — same deductions, LS 304 first) fades in on the right.
  // A tail hold keeps the finished pose on screen before the pin releases.
  const tl = gsap
    .timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: act, start: 'top top', end: '+=270%', pin: true, scrub: 0.25 },
    })
    .fromTo('#act2 .slab-top', { y: '34vh' }, { y: 0, duration: 0.45, ease: 'power2.out' }, 0)
    .fromTo('#act2 .slab-bottom', { y: '-34vh' }, { y: 0, duration: 0.45, ease: 'power2.out' }, 0)
    .fromTo(
      '#act2 .measure-inner',
      { autoAlpha: 0, y: 26 },
      { autoAlpha: 1, y: 0, duration: 0.2, ease: 'power1.out' },
      0.32,
    )
    .to(
      counter,
      {
        v: 54,
        duration: 0.35,
        onUpdate: () => {
          counterEl.textContent = String(Math.round(counter.v));
        },
      },
      0.4,
    )
    .from('#act2 .ledger-line', { opacity: 0, y: 20, duration: 0.12, stagger: 0.09, ease: 'power1.out' }, 0.55)
    .from('#act2 .ledger-req b', { scale: 1.35, transformOrigin: 'right center', duration: 0.1, ease: 'back.out(2)' }, '>-0.04')
    .addLabel('ledger');

  // The ledger asks — the app answers. Desktop: the block glides LEFT and the
  // selector fades in from the right. Phone (portrait): the block settles UP
  // and the selector RISES from the bottom edge (storyboard, 2026-07-12).
  if (phone) {
    tl.to('#act2 .measure-inner', { yPercent: -7, scale: 0.94, duration: 0.3, ease: 'power2.inOut' }, '+=0.14')
      .fromTo(
        '#act2 .measure-phone',
        { autoAlpha: 0, y: 110 },
        { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power2.out' },
        '<+0.08',
      );
  } else {
    tl.to('#act2 .measure-inner', { x: '-21vw', duration: 0.3, ease: 'power2.inOut' }, '+=0.14')
      .fromTo(
        '#act2 .measure-phone',
        { autoAlpha: 0, x: 60, yPercent: -50 },
        { autoAlpha: 1, x: 0, yPercent: -50, duration: 0.28, ease: 'power2.out' },
        '<+0.08',
      );
  }
  tl.addLabel('answer').to({}, { duration: 0.45 }, '>'); // tail hold — the answer pose dwells

  // No rest at 0 — that pose is closed slabs on black with the content still at
  // alpha 0, and the settle would park visitors on an empty frame.
  return { st: tl.scrollTrigger as ScrollTrigger, rests: restsOf(tl, ['ledger', 'answer']).slice(1) };
}

/* ---- Act 3 — off the rig ------------------------------------------------------ */

function initRig(phone: boolean): PacedAct | undefined {
  const act = document.querySelector<HTMLElement>('#act3');
  const canvas = act?.querySelector<HTMLCanvasElement>('.rig-canvas');
  const countEl = act?.querySelector<HTMLElement>('.inv-count-n');
  const barEl = act?.querySelector<HTMLElement>('.inv-bar-fill');
  const noteEl = act?.querySelector<HTMLElement>('.inv-note');
  if (!act || !canvas || !countEl || !barEl || !noteEl) return undefined;

  let truck: import('./welcome-truck').TruckScene | null = null;
  const progress = { p: 0 };
  countEl.textContent = '6';
  barEl.style.width = '100%';

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: act,
      start: 'top top',
      end: '+=250%',
      pin: true,
      scrub: 0.25,
      onToggle: (self) => truck?.setActive(self.isActive),
    },
  });

  ScrollTrigger.create({
    trigger: act,
    start: 'top bottom',
    once: true,
    onEnter: () => {
      const cached = truckScenes.get(canvas);
      if (cached) {
        truck = cached;
        truck.setActive(tl.scrollTrigger?.isActive ?? true);
        truck.setProgress(progress.p);
        return;
      }
      void import('./welcome-truck')
        .then((m) => {
          truck = m.createTruckScene(canvas);
          truckScenes.set(canvas, truck);
          guardContextLoss(act, canvas);
          truck.setActive(tl.scrollTrigger?.isActive ?? true);
          truck.setProgress(progress.p);
        })
        .catch(() => fallbackTo2D(act, canvas));
    },
  });

  tl.to(
    progress,
    {
      p: 1,
      duration: 1,
      onUpdate: () => {
        truck?.setProgress(progress.p);
        // The card drains as each strut clears the rig (thresholds match the
        // truck scene's extraction beats).
        const removed = progress.p > 0.7 ? 3 : progress.p > 0.5 ? 2 : progress.p > 0.3 ? 1 : 0;
        countEl.textContent = String(6 - removed);
        barEl.style.width = `${((6 - removed) / 6) * 100}%`;
      },
    },
    0,
  )
    // Desktop: the card floats in from the right. Phone: it's a bottom strip
    // and rises from the lower edge instead.
    .from('#act3 .inv-card', { autoAlpha: 0, ...(phone ? { y: 24 } : { x: 40 }), duration: 0.12, ease: 'power1.out' }, 0.06)
    .fromTo('#act3 .inv-note', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08 }, 0.84)
    // Resting poses: each strut fully out of the bay, then the finished scene.
    .addLabel('strut1', 0.42)
    .addLabel('strut2', 0.62)
    .addLabel('strut3', 0.82)
    .addLabel('posed', 1.0)
    .to({}, { duration: 0.28 }, 1.0); // tail hold — truck + three shores dwell

  return { st: tl.scrollTrigger as ScrollTrigger, rests: restsOf(tl, ['strut1', 'strut2', 'strut3', 'posed']) };
}

/* ---- Act 3 — the strut assembles -------------------------------------------- */

function initStrut(): PacedAct | undefined {
  const act = document.querySelector<HTMLElement>('#act4');
  const canvas = act?.querySelector<HTMLCanvasElement>('.strut-canvas');
  const loadNum = act?.querySelector<HTMLElement>('.strut-load-num');
  if (!act || !canvas || !loadNum) return undefined;

  let strut: StrutScene | null = null;
  const progress = { p: 0 };
  const load = { v: 0 };
  loadNum.textContent = '0';

  const tl = gsap
    .timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: act,
        start: 'top top',
        end: '+=280%',
        pin: true,
        scrub: 0.25,
        onToggle: (self) => strut?.setActive(self.isActive),
      },
    });

  // Build the 3D scene just before it's needed, once. If the act is already
  // active by the time the module lands (fast scroll), switch rendering on —
  // otherwise the first paint would wait for the next toggle.
  ScrollTrigger.create({
    trigger: act,
    start: 'top bottom',
    once: true,
    onEnter: () => {
      const cached = strutScenes.get(canvas);
      if (cached) {
        strut = cached;
        strut.setActive(tl.scrollTrigger?.isActive ?? true);
        strut.setProgress(progress.p);
        return;
      }
      void import('./welcome-strut')
        .then((m) => {
          strut = m.createStrutScene(canvas);
          strutScenes.set(canvas, strut);
          guardContextLoss(act, canvas);
          strut.setActive(tl.scrollTrigger?.isActive ?? true);
          strut.setProgress(progress.p);
        })
        .catch(() => fallbackTo2D(act, canvas));
    },
  });

  tl
    .to(progress, { p: 1, duration: 0.86, onUpdate: () => strut?.setProgress(progress.p) }, 0)
    // The load line stays hidden until the count starts — "0 lb rated" under a
    // rescue strut is the one number this page must never rest on.
    .fromTo('#act4 .strut-load', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06, ease: 'power1.out' }, 0.42)
    .to(
      load,
      {
        v: 22000,
        duration: 0.3,
        onUpdate: () => {
          loadNum.textContent = Math.round(load.v).toLocaleString('en-US');
        },
      },
      0.45,
    )
    // Resting poses: the gold pin home, then the assembled 22,000 lb shore —
    // which HOLDS for a beat of scroll before the exit collapse begins.
    .addLabel('pinned', 0.64)
    .addLabel('assembled', 0.86)
    // Exit: the strut collapses away toward the next act (the cutting station).
    .to(canvas, { scale: 0.5, yPercent: 18, opacity: 0, duration: 0.14, ease: 'power2.in' }, 1.12)
    .to('#act4 .kicker, #act4 .strut-load, #act4 .strut-caption', { opacity: 0, duration: 0.1 }, 1.14);

  return { st: tl.scrollTrigger as ScrollTrigger, rests: restsOf(tl, ['pinned', 'assembled']) };
}

/* ---- Cutting station — the 4x4 gets its length ------------------------------- */

function initCut(phone: boolean): PacedAct | undefined {
  const act = document.querySelector<HTMLElement>('#actcut');
  const canvas = act?.querySelector<HTMLCanvasElement>('.cut-canvas');
  if (!act || !canvas) return undefined;

  let cut: import('./welcome-cut').CutScene | null = null;
  const progress = { p: 0 };

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: act,
      start: 'top top',
      end: '+=260%',
      pin: true,
      scrub: 0.25,
      onToggle: (self) => cut?.setActive(self.isActive),
    },
  });

  ScrollTrigger.create({
    trigger: act,
    start: 'top bottom',
    once: true,
    onEnter: () => {
      const cached = cutScenes.get(canvas);
      if (cached) {
        cut = cached;
        cut.setActive(tl.scrollTrigger?.isActive ?? true);
        cut.setProgress(progress.p);
        return;
      }
      void import('./welcome-cut')
        .then((m) => {
          cut = m.createCutScene(canvas);
          cutScenes.set(canvas, cut);
          guardContextLoss(act, canvas);
          cut.setActive(tl.scrollTrigger?.isActive ?? true);
          cut.setProgress(progress.p);
        })
        .catch(() => fallbackTo2D(act, canvas));
    },
  });

  tl.to(
    progress,
    { p: 1, duration: 1, onUpdate: () => cut?.setProgress(progress.p) },
    0,
  )
    // Desktop: the card floats in from the right (it lives at translateY(-50%),
    // so both tween poses restate yPercent). Phone: a bottom strip that rises.
    .fromTo(
      '#actcut .cut-card',
      { autoAlpha: 0, ...(phone ? { y: 24 } : { x: 40, yPercent: -50 }) },
      { autoAlpha: 1, ...(phone ? { y: 0 } : { x: 0, yPercent: -50 }), duration: 0.12, ease: 'power1.out' },
      0.04,
    )
    // The gold dimension callout lands with the laser mark and holds.
    .fromTo('#actcut .cut-dim', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.08, ease: 'power1.out' }, 0.08)
    // Resting poses: marked (laser on, blade up), the offcut clear, then done.
    .addLabel('marked', 0.2)
    .addLabel('severed', 0.78)
    .addLabel('done', 1.0)
    .to({}, { duration: 0.28 }, 1.0); // tail hold — the finished cut dwells

  // No rest at 0 (drop it like initMeasure): p=0 is the empty stage with the
  // beam still sliding in and the card at alpha 0 — settling there parks the
  // visitor on a blank frame.
  return { st: tl.scrollTrigger as ScrollTrigger, rests: restsOf(tl, ['marked', 'severed', 'done']).slice(1) };
}

/* ---- Act 4 — the app cross-pan ----------------------------------------------- */

function initAppPan(phone: boolean): PacedAct | undefined {
  const act = document.querySelector<HTMLElement>('#act5');
  const track = act?.querySelector<HTMLElement>('.pan-track');
  if (!act || !track) return undefined;

  // The first phone rises to meet the collapsing strut from act 3.
  gsap.from('.phone-morph-target', {
    scale: 0.6,
    yPercent: 24,
    opacity: 0,
    ease: 'power2.out',
    scrollTrigger: { trigger: act, start: 'top 90%', end: 'top 10%', scrub: 0.25 },
  });

  // Five panels, paced: each panel-width glide (power1.inOut, so the carriage
  // starts and stops softly) is followed by a DWELL where the panel holds —
  // one flick can no longer skate past a screen. Panel rest points feed the
  // magnetic settle, and a tail hold closes the act.
  const PAN = 0.16; // one panel-width glide
  const DWELL = 0.08; // the pause on each panel
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: act, start: 'top top', end: '+=420%', pin: true, scrub: 0.3 },
  });

  const items = gsap.utils.toArray<HTMLElement>('.pan-item');
  const restTimes: number[] = [0];
  items.forEach((item, i) => {
    if (i === 0) return;
    const at = DWELL + (i - 1) * (PAN + DWELL);
    tl.to(track, { xPercent: -20 * i, duration: PAN, ease: 'power1.inOut' }, at);
    const text = item.querySelector('.pan-text');
    if (text) tl.from(text, { opacity: 0, y: 30, duration: 0.07, ease: 'power1.out' }, at + PAN - 0.05);
    restTimes.push(at + PAN + DWELL / 2);
  });
  tl.to({}, { duration: 0.2 }, '>'); // tail hold on the last panel

  const total = tl.duration();
  const rests = restTimes.map((t) => t / total);

  // Phone: gold progress ticks under the pan (storyboard) — the active tick is
  // the panel whose rest point the scrub is nearest to.
  if (phone) {
    const ticks = Array.from(act.querySelectorAll<HTMLElement>('.pan-ticks span'));
    if (ticks.length) {
      tl.eventCallback('onUpdate', () => {
        const p = tl.progress();
        let active = 0;
        rests.forEach((r, i) => {
          if (Math.abs(r - p) < Math.abs((rests[active] ?? 0) - p)) active = i;
        });
        ticks.forEach((t, i) => t.classList.toggle('active', i === active));
      });
    }
  }

  return { st: tl.scrollTrigger as ScrollTrigger, rests };
}

/* ---- Filament stage lighting --------------------------------------------------- */

function initFilament(): void {
  const stages = document.querySelectorAll<HTMLElement>('.filament-stage');
  if (!stages.length) return;
  // Seven acts light the five lifecycle stages: the rig act is where equipment
  // gets ASSIGNED, the strut act is STRUT SET, the saw act is CUTTING (the app
  // tour keeps it lit) — the mapping is the real one.
  const acts: Array<[string, number]> = [
    ['#act1', 0],
    ['#act2', 0],
    ['#act3', 1],
    ['#act4', 2],
    ['#actcut', 3],
    ['#act5', 3],
    ['#act6', 4],
  ];
  acts.forEach(([sel, stage]) => {
    const el = document.querySelector(sel);
    if (!el) return;
    ScrollTrigger.create({
      trigger: el,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => {
        if (self.isActive) {
          stages.forEach((s, j) => s.classList.toggle('active', j <= stage));
        }
      },
    });
  });
}


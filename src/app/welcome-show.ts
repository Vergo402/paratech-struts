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

export function init(): void {
  gsap.registerPlugin(ScrollTrigger);

  // Heavier, softer scroll — one flick travels ~30% less and settles smoothly,
  // so a single trackpad gesture can no longer blow through an act. syncTouch
  // hands phone touch scrolling to Lenis too (keeps iOS pinning smooth).
  const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.7, syncTouch: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // The acts build per breakpoint: desktop keeps the approved wide blocking;
  // phones (< 900px) get portrait re-blocking of the same beats. matchMedia
  // reverts and rebuilds everything if the viewport crosses the boundary.
  const mm = gsap.matchMedia();
  mm.add({ isDesktop: '(min-width: 900px)', isPhone: '(max-width: 899.98px)' }, (ctx) => {
    const phone = (ctx.conditions as { isPhone?: boolean } | undefined)?.isPhone === true;

    const acts = [initMeasure(phone), initRig(phone), initStrut(), initAppPan(phone)].filter(
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
    let idleTimer = 0;
    const offSettle = lenis.on('scroll', (l: Lenis) => {
      if (settling) return;
      window.clearTimeout(idleTimer);
      if (Math.abs(l.velocity) > 0.1) return; // still moving — wait for real rest
      idleTimer = window.setTimeout(() => {
        const here = lenis.scroll;
        let best: number | null = null;
        for (const p of snapPoints) {
          if (best === null || Math.abs(p - here) < Math.abs(best - here)) best = p;
        }
        // Glide only when meaningfully off a pose but within grabbing distance.
        if (best === null || Math.abs(best - here) < 2 || Math.abs(best - here) > innerHeight * 0.4) return;
        settling = true;
        lenis.scrollTo(best, {
          duration: 0.7,
          easing: (t: number) => 1 - Math.pow(1 - t, 3),
          onComplete: () => {
            settling = false;
          },
        });
      }, 250);
    });

    return () => {
      ScrollTrigger.removeEventListener('refresh', rebuildSnaps);
      window.clearTimeout(idleTimer);
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
      scrollTrigger: { trigger: act, start: 'top top', end: '+=310%', pin: true, scrub: 0.4 },
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

  return { st: tl.scrollTrigger as ScrollTrigger, rests: restsOf(tl, ['ledger', 'answer']) };
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
      end: '+=290%',
      pin: true,
      scrub: 0.4,
      onToggle: (self) => truck?.setActive(self.isActive),
    },
  });

  ScrollTrigger.create({
    trigger: act,
    start: 'top bottom',
    once: true,
    onEnter: () => {
      void import('./welcome-truck').then((m) => {
        truck = m.createTruckScene(canvas);
        truck.setActive(tl.scrollTrigger?.isActive ?? true);
        truck.setProgress(progress.p);
      });
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
        scrub: 0.4,
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
      void import('./welcome-strut').then((m) => {
        strut = m.createStrutScene(canvas);
        strut.setActive(tl.scrollTrigger?.isActive ?? true);
        strut.setProgress(progress.p);
      });
    },
  });

  tl
    .to(progress, { p: 1, duration: 0.86, onUpdate: () => strut?.setProgress(progress.p) }, 0)
    .to(
      load,
      {
        v: 22000,
        duration: 0.3,
        onUpdate: () => {
          loadNum.textContent = Math.round(load.v).toLocaleString('en-US');
        },
      },
      0.5,
    )
    // Resting poses: the gold pin home, then the assembled 22,000 lb shore —
    // which HOLDS for a beat of scroll before the exit collapse begins.
    .addLabel('pinned', 0.64)
    .addLabel('assembled', 0.86)
    // Exit: the strut collapses toward the next act — it "enters the phone".
    .to(canvas, { scale: 0.5, yPercent: 18, opacity: 0, duration: 0.14, ease: 'power2.in' }, 1.12)
    .to('#act4 .kicker, #act4 .strut-load, #act4 .strut-caption', { opacity: 0, duration: 0.1 }, 1.14);

  return { st: tl.scrollTrigger as ScrollTrigger, rests: restsOf(tl, ['pinned', 'assembled']) };
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
    scrollTrigger: { trigger: act, start: 'top 90%', end: 'top 10%', scrub: 0.4 },
  });

  // Five panels, paced: each panel-width glide (power1.inOut, so the carriage
  // starts and stops softly) is followed by a DWELL where the panel holds —
  // one flick can no longer skate past a screen. Panel rest points feed the
  // magnetic settle, and a tail hold closes the act.
  const PAN = 0.16; // one panel-width glide
  const DWELL = 0.08; // the pause on each panel
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: act, start: 'top top', end: '+=520%', pin: true, scrub: 0.5 },
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
  // Six acts light the five lifecycle stages: the rig act is where equipment
  // gets ASSIGNED, the strut act is STRUT SET — the mapping is the real one.
  const acts: Array<[string, number]> = [
    ['#act1', 0],
    ['#act2', 0],
    ['#act3', 1],
    ['#act4', 2],
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


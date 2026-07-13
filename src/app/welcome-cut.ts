// Cutting station act (#442 round 4): a miter saw crosscuts a 4x4 in real-time
// 3D — the one lifecycle stage the page never staged. Built from primitives like
// the strut/truck scenes, no model downloads. The blade plane is PERPENDICULAR
// to the beam's length (a real crosscut, not a rip), viewed from a 3/4 angle so
// the disc reads as a tilted ellipse dropping through. Timeline scrubbed via
// setProgress(0..1): beam slides to the fence → gold laser marks the cut → blade
// spins up → the head drops through → offcut kicks loose → gold flash on the
// fresh face. Render-on-demand, DPR capped at 2, paused when off screen.
import * as THREE from 'three';

export interface CutScene {
  setProgress(p: number): void;
  setActive(active: boolean): void;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function createCutScene(canvas: HTMLCanvasElement): CutScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  // near 0.5 — same depth-precision reasoning as the truck/strut scenes.
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 40);

  const gunmetal = new THREE.MeshStandardMaterial({ color: 0x596068, metalness: 0.85, roughness: 0.42 });
  const housing = new THREE.MeshStandardMaterial({ color: 0x22262b, metalness: 0.6, roughness: 0.55 });
  // Modest metalness — full-metal with no envmap goes black at grazing angles.
  const bladeSteel = new THREE.MeshStandardMaterial({ color: 0xb7bcc2, metalness: 0.5, roughness: 0.46 });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xd4a017,
    metalness: 0.9,
    roughness: 0.32,
    emissive: 0xd4a017,
    emissiveIntensity: 0,
  });
  const wood = new THREE.MeshStandardMaterial({ color: 0xc79a63, metalness: 0, roughness: 0.85 });
  const woodEnd = new THREE.MeshStandardMaterial({ color: 0xa87e4e, metalness: 0, roughness: 0.9 });
  // The freshly cut faces — lighter, and they take the gold flash at the end.
  const woodCut = new THREE.MeshStandardMaterial({
    color: 0xe6c489,
    metalness: 0,
    roughness: 0.8,
    emissive: 0xd4a017,
    emissiveIntensity: 0,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14171a, metalness: 0.3, roughness: 0.8 });

  // The cut lives at x = 0. The beam runs along X, splits into a left "keep"
  // piece and a right "offcut" that meet at the kerf with a hairline gap.
  const BEAM_Y = -0.32; // beam centerline
  const BEAM_H = 0.42; // a 4x4

  // Ground pad + saw base + fence + turntable.
  const ground = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.2, 3.2), new THREE.MeshStandardMaterial({ color: 0x24272b, metalness: 0, roughness: 0.96 }));
  ground.position.y = -1.9;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 1.1), dark);
  legL.position.set(-1.5, -1.35, 0.1);
  const legR = legL.clone();
  legR.position.x = 1.5;
  const base = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.34, 1.55), dark);
  base.position.set(0, -0.72, 0);
  const baseTop = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.05, 1.55), housing);
  baseTop.position.set(0, -0.545, 0);
  // Fence runs behind the beam (−Z), the wood pressed against it.
  const fence = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.34, 0.16), gunmetal);
  fence.position.set(0, -0.4, -0.34);
  const turntable = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.07, 36), housing);
  turntable.position.set(0, -0.52, 0.02);
  scene.add(ground, legL, legR, base, baseTop, fence, turntable);

  // The 4x4 — two boxes meeting at x = 0 with a hairline gap, so "the cut" is
  // real geometry: the offcut kicks loose and both fresh faces (lighter wood)
  // are simply revealed. BoxGeometry face order: +x −x +y −y +z −z.
  const beamG = new THREE.Group();
  const keep = new THREE.Mesh(
    new THREE.BoxGeometry(2.55, BEAM_H, BEAM_H),
    [woodCut, woodEnd, wood, wood, wood, wood], // +x is the cut face
  );
  keep.position.set(-0.006 - 2.55 / 2, BEAM_Y, 0);
  const offcut = new THREE.Group();
  const offcutMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, BEAM_H, BEAM_H),
    [woodEnd, woodCut, wood, wood, wood, wood], // −x is the cut face
  );
  offcutMesh.position.set(0.006 + 1.6 / 2, BEAM_Y, 0);
  offcut.add(offcutMesh);
  beamG.add(keep, offcut);

  // Gold laser line on the wood at the kerf — top and front face, at x = 0.
  const laserMat = new THREE.MeshBasicMaterial({ color: 0xe9c34c, transparent: true, opacity: 0 });
  const laserTop = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.006, BEAM_H), laserMat);
  laserTop.position.set(0, BEAM_Y + BEAM_H / 2, 0);
  const laserFront = new THREE.Mesh(new THREE.BoxGeometry(0.02, BEAM_H, 0.006), laserMat);
  laserFront.position.set(0, BEAM_Y, BEAM_H / 2);
  beamG.add(laserTop, laserFront);

  // Dark kerf slot at x = 0 — grows downward with the blade, gone once the
  // offcut separates. Thin in X, spans the beam depth in Z.
  const kerf = new THREE.Mesh(new THREE.BoxGeometry(0.05, BEAM_H + 0.02, BEAM_H + 0.02), new THREE.MeshBasicMaterial({ color: 0x101315 }));
  kerf.visible = false;
  beamG.add(kerf);
  scene.add(beamG);

  // ---- Saw head: blade in the Y-Z plane (axis along X), drops vertically ------
  // A vertical slide column at the rear carries the head; the head rides down
  // the column so the blade descends straight through the beam at x = 0. Blade
  // axis is X (rotation.z = π/2 tips the default-Y cylinder onto X).
  const column = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.7, 0.24), housing);
  column.position.set(0, 0.25, -0.62);
  const columnFoot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.4), housing);
  columnFoot.position.set(0, -0.5, -0.62);
  scene.add(column, columnFoot);

  const HEAD_UP = 0.72;
  const HEAD_DOWN = -0.42;
  const head = new THREE.Group();
  head.position.set(0, HEAD_UP, 0);

  const BLADE_R = 0.62;
  const blade = new THREE.Group();
  blade.position.set(0, 0, 0.04);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(BLADE_R, BLADE_R, 0.05, 44), bladeSteel);
  disc.rotation.z = Math.PI / 2; // axis Y → X, disc lies in the Y-Z plane
  blade.add(disc);
  for (let i = 0; i < 22; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.05), gunmetal);
    const a = (i / 22) * Math.PI * 2;
    tooth.position.set(0, Math.sin(a) * (BLADE_R + 0.005), Math.cos(a) * (BLADE_R + 0.005));
    tooth.rotation.x = -a;
    blade.add(tooth);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.07, 24), housing);
  hub.rotation.z = Math.PI / 2;
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.09, 20), gold);
  bolt.rotation.z = Math.PI / 2;
  blade.add(hub, bolt);
  head.add(blade);

  // Upper blade guard — a half-torus hood over the top of the disc, in the
  // blade's plane (Y-Z), so it reads as a saw hood not a ring around the beam.
  const guard = new THREE.Mesh(new THREE.TorusGeometry(BLADE_R + 0.03, 0.09, 12, 30, Math.PI), housing);
  guard.rotation.y = Math.PI / 2; // torus X-Y plane → Y-Z plane
  guard.position.set(0, 0, 0.04);
  head.add(guard);

  // Motor barrel behind the blade on −X (away from the +X-side camera, so it
  // never hides the disc face) + a bracket back to the column + a top handle.
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.5, 24), gunmetal);
  motor.rotation.z = Math.PI / 2;
  motor.position.set(-0.42, 0.06, 0.04);
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.7), housing);
  bracket.position.set(0, 0.16, -0.32);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.6), gunmetal);
  handle.position.set(0, 0.42, 0.06);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.6), gold);
  grip.position.set(0, 0.5, 0.06);
  head.add(motor, bracket, handle, grip);
  scene.add(head);

  // Sawdust — a small deterministic particle burst at the kerf exit, positions
  // pure functions of progress so scrubbing backward replays it exactly.
  const DUST_N = 42;
  const dustPos = new Float32Array(DUST_N * 3);
  const dustDir: number[] = [];
  const dustOff: number[] = [];
  for (let i = 0; i < DUST_N; i++) {
    // Chips arc up and toward the camera (+Z, ±X), then gravity takes them.
    dustDir.push((Math.random() - 0.35) * 0.9, 0.25 + Math.random() * 0.35, 0.15 + Math.random() * 0.6);
    dustOff.push(Math.random());
  }
  const dustGeo = new THREE.BufferGeometry();
  const dustAttr = new THREE.BufferAttribute(dustPos, 3);
  dustGeo.setAttribute('position', dustAttr);
  const dustMat = new THREE.PointsMaterial({
    color: 0xdcb27a,
    size: 0.045,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  // Lights — same recipe as the strut scene: white key, gold rim, soft fill.
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(4, 4, 4.5);
  const rim = new THREE.DirectionalLight(0xd4a017, 1.0);
  rim.position.set(-4, 1, -3.5);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.42));

  let active = false;
  let dirty = true;
  let rafId = 0;

  const render = () => {
    rafId = 0;
    if (!dirty) return;
    dirty = false;
    renderer.render(scene, camera);
  };

  const requestRender = () => {
    dirty = true;
    if (active && !rafId) rafId = requestAnimationFrame(render);
  };

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    requestRender();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  const setProgress = (p: number) => {
    // 1 — the 4x4 slides in along the fence from the left.
    const slide = easeOutCubic(seg(p, 0, 0.18));
    beamG.position.x = -3.6 * (1 - slide);

    // 2 — the gold laser marks the cut, gone once the blade owns the kerf.
    laserMat.opacity = seg(p, 0.06, 0.14) * (1 - seg(p, 0.38, 0.46));

    // 3 — spin-up, then the head drops straight through and rises clear.
    blade.rotation.x = -Math.pow(seg(p, 0.22, 0.82), 1.25) * 46;
    const down = easeInOut(seg(p, 0.4, 0.6));
    const rise = easeOutCubic(seg(p, 0.62, 0.78));
    head.position.y = THREE.MathUtils.lerp(HEAD_UP, HEAD_DOWN, down) + (HEAD_UP - HEAD_DOWN) * rise;

    // The kerf slot chases the blade down; it stops mattering once the offcut
    // separates and the fresh faces carry the story.
    const cutP = seg(p, 0.44, 0.6);
    const sep = easeOutCubic(seg(p, 0.62, 0.78));
    kerf.visible = cutP > 0.02 && sep < 0.4;
    kerf.scale.y = Math.max(cutP, 0.001);
    kerf.position.set(0, BEAM_Y + (BEAM_H / 2 + 0.01) * (1 - cutP), 0);

    // 4 — the offcut kicks loose toward the camera-right, clearly parting.
    offcut.position.set(0.24 * sep, -0.03 * sep, 0.08 * sep);
    offcut.rotation.z = -0.06 * sep;
    offcut.rotation.y = 0.08 * sep;

    // Sawdust envelope — only while the blade is in the wood.
    const env = seg(p, 0.44, 0.49) * (1 - seg(p, 0.6, 0.68));
    dustMat.opacity = env * 0.9;
    if (env > 0) {
      const cycle = seg(p, 0.42, 0.68);
      for (let i = 0; i < DUST_N; i++) {
        const life = (cycle * 2.2 + (dustOff[i] ?? 0)) % 1;
        dustPos[i * 3] = (dustDir[i * 3] ?? 0) * life;
        dustPos[i * 3 + 1] = Math.max(BEAM_Y - 0.02 + (dustDir[i * 3 + 1] ?? 0) * life - 1.1 * life * life, -0.5);
        dustPos[i * 3 + 2] = 0.2 + (dustDir[i * 3 + 2] ?? 0) * life;
      }
      dustAttr.needsUpdate = true;
    }

    // 5 — done: one gold pulse on the fresh faces and the arbor bolt.
    const flash = Math.sin(seg(p, 0.8, 1) * Math.PI);
    woodCut.emissiveIntensity = flash * 0.55;
    gold.emissiveIntensity = flash * 0.8;

    // Camera holds a 3/4 view from the front-right so the blade reads as a
    // tilted disc crosscutting the beam (a face-on camera would hide the cut).
    const az = THREE.MathUtils.lerp(0.62, 0.86, p);
    const r = THREE.MathUtils.lerp(8.4, 7.4, p * p);
    camera.position.set(Math.sin(az) * r, THREE.MathUtils.lerp(0.7, 1.2, p), Math.cos(az) * r);
    camera.lookAt(0, -0.2, 0);
    requestRender();
  };

  setProgress(0);
  // One warm-up frame regardless of the active gate — same shader-compile
  // reasoning as the strut scene.
  renderer.render(scene, camera);

  return {
    setProgress,
    setActive(a: boolean) {
      active = a;
      if (a) requestRender();
      else if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    },
  };
}

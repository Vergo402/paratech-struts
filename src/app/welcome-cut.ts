// Cutting station act (#442 round 4): a miter saw drops through a 4x4 in real-
// time 3D — the one lifecycle stage the page never staged. Built from
// primitives like the strut/truck scenes, no model downloads. Timeline scrubbed
// via setProgress(0..1): beam slides to the fence → gold laser marks the cut →
// blade spins up → the arm drops through → offcut kicks loose → gold flash on
// the fresh face. Render-on-demand, DPR capped at 2, paused when off screen.
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
  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 40);

  const gunmetal = new THREE.MeshStandardMaterial({ color: 0x596068, metalness: 0.85, roughness: 0.42 });
  const housing = new THREE.MeshStandardMaterial({ color: 0x22262b, metalness: 0.6, roughness: 0.55 });
  // Modest metalness — full-metal with no envmap goes black at side angles.
  const bladeSteel = new THREE.MeshStandardMaterial({ color: 0xb7bcc2, metalness: 0.55, roughness: 0.45 });
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

  // Ground pad + saw base + fence + turntable.
  const ground = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.2, 3.4), new THREE.MeshStandardMaterial({ color: 0x24272b, metalness: 0, roughness: 0.96 }));
  ground.position.y = -1.9;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 1.2), dark);
  legL.position.set(-1.6, -1.35, 0);
  const legR = legL.clone();
  legR.position.x = 1.6;
  const base = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.36, 1.7), dark);
  base.position.y = -0.73;
  const baseTop = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.05, 1.7), housing);
  baseTop.position.y = -0.55;
  const fence = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.3, 0.18), gunmetal);
  fence.position.set(0, -0.4, -0.42);
  const turntable = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.07, 36), housing);
  turntable.position.set(0.15, -0.52, 0);
  scene.add(ground, legL, legR, base, baseTop, fence, turntable);

  // Pivot tower at the rear right — the arm swings on it. Kept fully behind
  // the beam's back face (z -0.21) so the offcut never intersects it.
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.5, 0.26), housing);
  tower.position.set(1.42, -0.05, -0.36);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 20), housing);
  axle.rotation.x = Math.PI / 2;
  axle.position.set(1.42, 0.72, -0.11);
  scene.add(tower, axle);

  // The 4x4 — two boxes meeting at the kerf plane (x = 0.15) with a hairline
  // gap, so "the cut" is real geometry: the offcut kicks loose and both fresh
  // faces (lighter wood) are simply revealed. Face order: +x -x +y -y +z -z.
  const KERF_X = 0.15;
  const beamG = new THREE.Group();
  const keep = new THREE.Mesh(
    new THREE.BoxGeometry(2.55, 0.42, 0.42),
    [woodCut, woodEnd, wood, wood, wood, wood],
  );
  keep.position.set(KERF_X - 0.006 - 2.55 / 2, -0.34, 0);
  const offcut = new THREE.Group();
  const offcutMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.42, 0.42),
    [woodEnd, woodCut, wood, wood, wood, wood],
  );
  offcutMesh.position.set(KERF_X + 0.006 + 1.6 / 2, -0.34, 0);
  offcut.add(offcutMesh);
  beamG.add(keep, offcut);

  // Gold laser mark on the wood — top and front face at the kerf line.
  const laserMat = new THREE.MeshBasicMaterial({ color: 0xe9c34c, transparent: true, opacity: 0 });
  const laserTop = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 0.44), laserMat);
  laserTop.position.set(KERF_X, -0.126, 0);
  const laserFront = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.42, 0.004), laserMat);
  laserFront.position.set(KERF_X, -0.34, 0.212);
  beamG.add(laserTop, laserFront);

  // Dark kerf slot — grows downward with the blade, gone once the offcut moves.
  const kerf = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.44, 0.46), new THREE.MeshBasicMaterial({ color: 0x101315 }));
  kerf.visible = false;
  beamG.add(kerf);
  scene.add(beamG);

  // Arm: pivot group at the tower top; blade + guard + handle hang off it.
  const ARM_UP = -0.46;
  const arm = new THREE.Group();
  arm.position.set(1.42, 0.72, 0);
  const armBar = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.2, 0.24), housing);
  armBar.position.set(-0.64, -0.06, 0);
  armBar.rotation.z = 0.06;
  arm.add(armBar);

  const blade = new THREE.Group();
  blade.position.set(-1.27, -0.74, 0);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.045, 40), bladeSteel);
  disc.rotation.x = Math.PI / 2;
  blade.add(disc);
  for (let i = 0; i < 20; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.055), gunmetal);
    const a = (i / 20) * Math.PI * 2;
    tooth.position.set(Math.cos(a) * 0.63, Math.sin(a) * 0.63, 0);
    tooth.rotation.z = a;
    blade.add(tooth);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 24), housing);
  hub.rotation.x = Math.PI / 2;
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.075, 20), gold);
  bolt.rotation.x = Math.PI / 2;
  blade.add(hub, bolt);
  arm.add(blade);

  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.09, 12, 30, Math.PI), housing);
  guard.position.set(-1.27, -0.74, 0);
  arm.add(guard);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.14), gunmetal);
  handle.position.set(-1.27, 0.055, 0);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.035, 0.15), gold);
  grip.position.set(-1.27, 0.12, 0);
  arm.add(handle, grip);
  scene.add(arm);

  // Sawdust — a small deterministic particle burst at the kerf exit, positions
  // pure functions of progress so scrubbing backward replays it exactly.
  const DUST_N = 42;
  const dustPos = new Float32Array(DUST_N * 3);
  const dustDir: number[] = [];
  const dustOff: number[] = [];
  for (let i = 0; i < DUST_N; i++) {
    // Chips arc up-and-right off the kerf, then gravity takes them (below).
    dustDir.push(0.3 + Math.random() * 1.0, 0.25 + Math.random() * 0.35, 0.05 + Math.random() * 0.4);
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
  key.position.set(3, 4, 4.5);
  const rim = new THREE.DirectionalLight(0xd4a017, 1.0);
  rim.position.set(-4, 1, -3.5);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.4));

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
    // 1 — the 4x4 slides in along the fence.
    const slide = easeOutCubic(seg(p, 0, 0.18));
    beamG.position.x = -3.4 * (1 - slide);

    // 2 — the gold laser marks the cut line, gone once the blade owns the kerf.
    laserMat.opacity = seg(p, 0.06, 0.14) * (1 - seg(p, 0.38, 0.46));

    // 3 — spin-up, then the arm drops through and rises clear.
    blade.rotation.z = -Math.pow(seg(p, 0.22, 0.82), 1.25) * 46;
    const down = easeInOut(seg(p, 0.4, 0.6));
    const rise = easeOutCubic(seg(p, 0.62, 0.76));
    arm.rotation.z = ARM_UP * (1 - down + rise);

    // The kerf slot chases the blade down; it stops mattering once the offcut
    // separates and the fresh faces carry the story.
    const cutP = seg(p, 0.42, 0.6);
    const sep = easeOutCubic(seg(p, 0.62, 0.78));
    kerf.visible = cutP > 0.02 && sep < 0.4;
    kerf.scale.y = Math.max(cutP, 0.001);
    kerf.position.set(KERF_X, -0.13 - 0.22 * cutP, 0);

    // 4 — the offcut kicks loose.
    offcut.position.set(0.14 * sep, -0.03 * sep, 0.05 * sep);
    offcut.rotation.z = -0.05 * sep;
    offcut.rotation.y = 0.07 * sep;

    // Sawdust envelope — only while the blade is in the wood.
    const env = seg(p, 0.42, 0.47) * (1 - seg(p, 0.6, 0.68));
    dustMat.opacity = env * 0.9;
    if (env > 0) {
      const cycle = seg(p, 0.4, 0.68);
      for (let i = 0; i < DUST_N; i++) {
        const life = (cycle * 2.2 + (dustOff[i] ?? 0)) % 1;
        dustPos[i * 3] = KERF_X + (dustDir[i * 3] ?? 0) * life;
        // Arc up off the kerf, fall under gravity, land on the table top.
        dustPos[i * 3 + 1] = Math.max(-0.32 + (dustDir[i * 3 + 1] ?? 0) * life - 1.1 * life * life, -0.52);
        dustPos[i * 3 + 2] = 0.18 + (dustDir[i * 3 + 2] ?? 0) * life;
      }
      dustAttr.needsUpdate = true;
    }

    // 5 — done: one gold pulse on the fresh faces and the arbor bolt.
    const flash = Math.sin(seg(p, 0.8, 1) * Math.PI);
    woodCut.emissiveIntensity = flash * 0.55;
    gold.emissiveIntensity = flash * 0.8;

    // Camera orbits the station.
    const az = THREE.MathUtils.lerp(-0.35, 0.3, p);
    const r = THREE.MathUtils.lerp(8.2, 7.2, p * p);
    camera.position.set(Math.sin(az) * r, THREE.MathUtils.lerp(0.5, 1.1, p), Math.cos(az) * r);
    camera.lookAt(0, -0.35, 0);
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

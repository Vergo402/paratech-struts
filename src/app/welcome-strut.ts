// Round-3 centerpiece (#442): a VERTICAL shore assembles in real-time 3D —
// floor below, sagging slab overhead, strut standing between (round 3.2 per
// Alex: vertical orientation, and the top plate rides the tube tip so the
// tube never pokes through it). Built from primitives, no model downloads.
// Timeline scrubbed via setProgress(0..1): extend → collar spin → pin set →
// final press flush against the overhead → gold flash. Render-on-demand,
// DPR capped at 2 (full retina), paused whenever the act is off screen.
import * as THREE from 'three';

export interface StrutScene {
  setProgress(p: number): void;
  setActive(active: boolean): void;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t: number) => {
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

export function createStrutScene(canvas: HTMLCanvasElement): StrutScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  // near 0.5 (not 0.1) — same depth-precision reasoning as the truck scene.
  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 40);

  const gunmetal = new THREE.MeshStandardMaterial({ color: 0x596068, metalness: 0.85, roughness: 0.42 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.9, roughness: 0.35 });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xd4a017,
    metalness: 0.9,
    roughness: 0.32,
    emissive: 0xd4a017,
    emissiveIntensity: 0,
  });
  const concrete = new THREE.MeshStandardMaterial({ color: 0x24272b, metalness: 0, roughness: 0.96 });

  // Floor and overhead slab. Overhead bottom face sits at y = 2.27.
  const slabGeo = new THREE.BoxGeometry(5.4, 0.9, 3.2);
  const floor = new THREE.Mesh(slabGeo, concrete);
  floor.position.y = -2.72;
  const overhead = new THREE.Mesh(slabGeo, concrete);
  overhead.position.y = 2.72;
  scene.add(floor, overhead);

  // Bottom plate (6" Rigid Base) — seated on the floor from the start.
  const plateBottom = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.5), steel);
  plateBottom.position.y = -2.21;
  scene.add(plateBottom);

  // Outer tube stands on the bottom plate: spans y = -2.16 .. 0.84.
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3.0, 40), gunmetal);
  outer.position.y = -0.66;
  scene.add(outer);

  // Inner tube pivots at the outer tube's mouth and extends upward.
  const INNER_LEN = 1.4;
  const MOUTH_Y = 0.7;
  const innerGroup = new THREE.Group();
  innerGroup.position.y = MOUTH_Y;
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, INNER_LEN, 40), steel);
  inner.position.y = INNER_LEN / 2;
  innerGroup.add(inner);
  innerGroup.scale.y = 0.1;
  scene.add(innerGroup);

  const tipY = () => MOUTH_Y + INNER_LEN * innerGroup.scale.y;

  // Top plate (6" Swivel Base) — ball + plate riding the tube tip, so the tube
  // can never extend through it. Flush against the overhead at full progress.
  const swivel = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 18), steel);
  ball.position.y = 0.02;
  const plateTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.5), steel);
  plateTop.position.y = 0.12;
  swivel.add(ball, plateTop);
  scene.add(swivel);

  // Gold collar with knurl blocks at the mouth; spins around the strut axis.
  const collarGroup = new THREE.Group();
  collarGroup.position.y = 0.78;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.55, 40), gold);
  collarGroup.add(collar);
  for (let i = 0; i < 10; i++) {
    const knurl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.07), gold);
    const a = (i / 10) * Math.PI * 2;
    knurl.position.set(Math.cos(a) * 0.375, 0, Math.sin(a) * 0.375);
    knurl.rotation.y = -a;
    collarGroup.add(knurl);
  }
  scene.add(collarGroup);

  // Lock pin — slides in horizontally through the collar, along X so it reads
  // in profile from the camera's orbit.
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.95, 20), gold);
  pin.rotation.z = Math.PI / 2;
  pin.position.set(2.0, 0.78, 0);
  pin.visible = false;
  scene.add(pin);

  // Lights.
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
    // 1 — the inner tube runs up toward the overhead.
    const extend = easeOutCubic(seg(p, 0, 0.45));
    // 2b — the final press closes the last gap (slow, deliberate).
    const press = easeOutCubic(seg(p, 0.68, 0.85));
    innerGroup.scale.y = 0.1 + 0.83 * extend + 0.07 * press;

    // Swivel assembly rides the tip; at full press the plate's top face kisses
    // the overhead's bottom face (tip 2.1 + plate offset 0.12 + half 0.05 = 2.27).
    swivel.position.y = tipY();

    // 2 — the collar spins down the threads.
    const spin = seg(p, 0.4, 0.62);
    collarGroup.rotation.y = -spin * Math.PI * 3;

    // 3 — the pin slides home with a small overshoot, left proud of the collar.
    const pinP = seg(p, 0.6, 0.74);
    pin.visible = pinP > 0;
    pin.position.x = THREE.MathUtils.lerp(2.0, 0.52, easeOutBack(pinP));

    // 4 — locked: one gold pulse.
    const flash = seg(p, 0.86, 1);
    gold.emissiveIntensity = Math.sin(flash * Math.PI) * 0.85;

    // Camera orbits the standing shore.
    const az = THREE.MathUtils.lerp(-0.38, 0.34, p);
    const r = THREE.MathUtils.lerp(8.2, 7.0, p * p);
    camera.position.set(Math.sin(az) * r, THREE.MathUtils.lerp(0.4, 1.0, p), Math.cos(az) * r);
    camera.lookAt(0, 0.1, 0);
    requestRender();
  };

  setProgress(0);

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

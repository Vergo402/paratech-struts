// Round-3.2 rig act (#442): a primitive-built American rescue box truck.
// Scrubbed via setProgress(0..1): compartment door rolls up, three struts
// slide out one by one and stand leaned in front of the rig (a 3-Post shore
// needs three), camera drifts. The floating inventory card beside the canvas
// is HTML — welcome-show.ts ticks it in sync. Same render-on-demand pattern
// as the strut scene.
import * as THREE from 'three';

export interface TruckScene {
  setProgress(p: number): void;
  setActive(active: boolean): void;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function createTruckScene(canvas: HTMLCanvasElement): TruckScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  // Full retina resolution — a 1.5 cap left the rig soft/pixelated on DPR-2 displays.
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  // Fog fades the ground into the act background so the canvas has no hard edge.
  scene.fog = new THREE.Fog(0x101315, 9, 20);
  // near 0.5 (not 0.1): the whole scene lives 6–20 units out, and a too-close
  // near plane starves the depth buffer — nearly-touching faces z-fight and
  // shimmer under camera motion (the "pixelated cab" during scroll).
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 40);

  const white = new THREE.MeshStandardMaterial({ color: 0xe8e5de, metalness: 0.15, roughness: 0.55 });
  const red = new THREE.MeshStandardMaterial({ color: 0xb03228, metalness: 0.25, roughness: 0.45 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14171a, metalness: 0.2, roughness: 0.8 });
  const tire = new THREE.MeshStandardMaterial({ color: 0x0c0e10, metalness: 0, roughness: 0.95 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fb4c8, metalness: 0.6, roughness: 0.15 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.9, roughness: 0.35 });
  const gunmetal = new THREE.MeshStandardMaterial({ color: 0x596068, metalness: 0.85, roughness: 0.42 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.9, roughness: 0.32 });

  // Ground.
  const ground = new THREE.Mesh(new THREE.BoxGeometry(80, 0.1, 80), new THREE.MeshStandardMaterial({ color: 0x0b0d0f, roughness: 1 }));
  ground.position.y = -1.1;
  scene.add(ground);

  const truck = new THREE.Group();
  scene.add(truck);

  // Chassis + box body + stripe.
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.35, 1.9), dark);
  chassis.position.y = -0.6;
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.2, 2.1), white);
  body.position.set(-0.6, 0.65, 0);
  // Stripe sits 0.03 proud of the body per side — near-coplanar faces z-fight.
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.06, 0.3, 2.16), red);
  stripe.position.set(-0.6, -0.1, 0);
  truck.add(chassis, body, stripe);

  // Cab — slightly WIDER than the chassis (1.96 vs 1.9): their sides were
  // exactly coplanar where the boxes interpenetrate, which z-fought a shimmering
  // band across the cab's bottom edge during the camera drift.
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.96), red);
  cab.position.set(2.15, 0.12, 0);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 1.5), glass);
  windshield.position.set(2.92, 0.42, 0);
  truck.add(cab, windshield);

  // Wheels.
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 24);
  const wheelSpots: Array<[number, number]> = [
    [2.15, 0.75],
    [2.15, -0.75],
    [-1.7, 0.75],
    [-1.7, -0.75],
    [-0.6, 0.75],
    [-0.6, -0.75],
  ];
  wheelSpots.forEach(([x, z]) => {
    const w = new THREE.Mesh(wheelGeo, tire);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, -0.85, z);
    truck.add(w);
  });

  // "RESCUE 2" lettering on the box side (canvas texture).
  const label = document.createElement('canvas');
  label.width = 512;
  label.height = 128;
  const lctx = label.getContext('2d');
  if (lctx) {
    lctx.fillStyle = '#b03228';
    lctx.font = '700 72px "Public Sans Variable", sans-serif';
    lctx.textBaseline = 'middle';
    lctx.fillText('RESCUE 2', 24, 64);
  }
  const labelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.6),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(label), transparent: true }),
  );
  labelMesh.position.set(0.05, 0.75, 1.09); // 0.04 proud of the body face — no z-fight
  truck.add(labelMesh);

  // Rear compartment on the visible side, with a roll-up door.
  const bay = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.12), dark);
  bay.position.set(-1.75, 0.45, 1.05);
  truck.add(bay);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.14, 1.44, 0.05), steel);
  const DOOR_Y = 0.45;
  door.position.set(-1.75, DOOR_Y, 1.12);
  truck.add(door);

  // Three struts — real shore anatomy, the same object that assembles in Act 4:
  // square base plate, gunmetal-over-steel telescoping tube, gold collar, and a
  // swivel top plate. They start racked lying in the bay, then slide out and
  // stand leaned in front of the rig (a 3-Post shore needs three).
  const makeStrut = (): THREE.Group => {
    const g = new THREE.Group();
    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.42), steel);
    basePlate.position.y = -0.72;
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.86, 24), gunmetal);
    lower.position.y = -0.26;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.16, 24), gold);
    collar.position.y = 0.14;
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.66, 24), steel);
    upper.position.y = 0.48;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), steel);
    ball.position.y = 0.8;
    // Swivel head plate — narrower than the base foot, so the strut reads as a
    // strut (wide foot, small head), not a stool.
    const topPlate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.3), steel);
    topPlate.position.y = 0.86;
    g.add(basePlate, lower, collar, upper, ball, topPlate);
    return g;
  };
  const struts: THREE.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const g = makeStrut();
    g.rotation.x = Math.PI / 2; // racked lying along Z
    g.position.set(-1.95 + i * 0.2, 0.45, 0.9);
    g.visible = false;
    truck.add(g);
    struts.push(g);
  }

  // Lights.
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(4, 5, 5);
  const rim = new THREE.DirectionalLight(0xd4a017, 0.8);
  rim.position.set(-5, 2, -4);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.45));

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
    // Door rolls up.
    const doorP = easeOutCubic(seg(p, 0.02, 0.18));
    door.position.y = DOOR_Y + doorP * 1.3;
    door.scale.y = 1 - doorP * 0.85;

    // Struts slide out one by one and stand leaned in front of the rig.
    struts.forEach((g, i) => {
      const sp = easeOutCubic(seg(p, 0.22 + 0.2 * i, 0.42 + 0.2 * i));
      g.visible = sp > 0;
      const outZ = THREE.MathUtils.lerp(0.9, 2.3, Math.min(1, sp * 1.6));
      const downY = THREE.MathUtils.lerp(0.45, -0.34, seg(sp, 0.45, 1));
      g.position.set(-1.95 + i * 0.55, downY, outZ);
      // Lying in the rack → standing with a working lean.
      g.rotation.x = THREE.MathUtils.lerp(Math.PI / 2, 0.12, seg(sp, 0.35, 1));
    });

    // Camera pulls from a three-quarter view in toward the open bay.
    const az = THREE.MathUtils.lerp(0.55, 0.2, p);
    const r = THREE.MathUtils.lerp(9.6, 7.6, easeOutCubic(p));
    camera.position.set(Math.sin(az) * r + 0.6, THREE.MathUtils.lerp(1.4, 0.7, p), Math.cos(az) * r);
    camera.lookAt(-0.7, 0, 0.5);
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

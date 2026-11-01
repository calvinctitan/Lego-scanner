// The 3D scene behind the intro: "LEGARÁ" built from 1×1 bricks on a dark baseplate, with a few
// loose bricks floating around it. Everything is drawn from simple shapes (rounded boxes and
// cylinders), so no LEGO models, photos or logos are used.
//
// It's plain three.js (no React) so it can be loaded only for the intro, as its own small file.
import {
  BoxGeometry,
  BufferGeometry,
  Clock,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Euler,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  PCFShadowMap,
  PCFSoftShadowMap,
  PMREMGenerator,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type BrickScene = {
  /** Plays the "bricks fly apart" exit; resolves when it's done. */
  enter(): Promise<void>;
  dispose(): void;
};

const BG = '#05131d'; // LEGO Black, the site's dark background
const H = 1.2; // a brick is 1 stud wide and 1.2 studs tall, like the real proportions
const STUD_R = 0.3;
const STUD_H = 0.18;
const PALETTE = { yellow: '#f2cd37', red: '#c91a09', blue: '#0055bf', white: '#f4f4f4', green: '#237841', plate: '#13293a' };

type Cell = { col: number; row: number; color: string; accent?: boolean };

// Bold letters, 6 bricks wide and 7 tall, drawn for this intro (the market's mosaics use a thinner set).
const BOLD: Record<string, string[]> = {
  L: ['##    ', '##    ', '##    ', '##    ', '##    ', '##    ', '######'],
  E: ['######', '##    ', '##    ', '##### ', '##    ', '##    ', '######'],
  G: [' #####', '##    ', '##    ', '## ###', '##  ##', '##  ##', ' #####'],
  A: [' #### ', '##  ##', '##  ##', '######', '##  ##', '##  ##', '##  ##'],
  R: ['##### ', '##  ##', '##  ##', '##### ', '## ## ', '##  ##', '##  ##'],
};
const W = 6; // letter width
const PITCH = W + 1; // with one empty column between letters
const ACCENT_ROWS = 3; // room above each line for the accent (2 rows) and a gap

/** The bricks for the word: one line on wide screens, "LEG" over "ARÁ" on tall ones. */
function wordCells(twoLines: boolean): { cells: Cell[]; cols: number; rows: number } {
  const lines = twoLines ? ['LEG', 'ARA'] : ['LEGARA'];
  const cells: Cell[] = [];
  const lineRows = 7 + ACCENT_ROWS + (twoLines ? 2 : 0);
  lines.forEach((line, li) => {
    line.split('').forEach((ch, i) => {
      BOLD[ch].forEach((row, r) => {
        for (let c = 0; c < W; c++) if (row[c] === '#') cells.push({ col: i * PITCH + c, row: li * lineRows + (lineRows - 7) + r, color: PALETTE.yellow });
      });
    });
  });
  // The accent on the last A: two red bricks floating above it, rising to the right.
  const lastLine = lines.length - 1;
  const lastA = (lines[lastLine].length - 1) * PITCH;
  const top = lastLine * lineRows + (lineRows - 7); // the A's top row
  cells.push({ col: lastA + 3, row: top - 2, color: PALETTE.red, accent: true });
  cells.push({ col: lastA + 4, row: top - 3, color: PALETTE.red, accent: true });
  const cols = Math.max(...lines.map((l) => l.length * PITCH - 1));
  return { cells, cols, rows: lines.length * lineRows };
}

type Brick = {
  target: Vector3;
  pos: Vector3;
  quat: Quaternion;
  delay: number;
  spin: Euler; // the little tilt it settles out of while dropping
  lift: number;
  vel: Vector3;
  ang: Vector3;
};

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// A tiny repeatable random, so the scene looks the same every visit.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createBrickScene(canvas: HTMLCanvasElement, opts: { still: boolean; onReady?: () => void }): BrickScene {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping; // keeps the plastic colours bright and true
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  scene.background = new Color(BG);
  const pmrem = new PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 0.45;

  const camera = new PerspectiveCamera(32, 1, 0.5, 400);

  // Light: a warm key from the upper left that casts the shadows, a cool rim from behind, and a soft fill.
  scene.add(new HemisphereLight('#cfe3ff', '#05131d', 0.7));
  const key = new DirectionalLight('#fff3dc', 3.2);
  key.position.set(-18, 30, 24);
  key.castShadow = true;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  key.shadow.camera.left = -30;
  key.shadow.camera.right = 30;
  key.shadow.camera.top = 30;
  key.shadow.camera.bottom = -20;
  key.shadow.camera.far = 120;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 4;
  scene.add(key);
  const rim = new DirectionalLight('#5b9bff', 1.6);
  rim.position.set(16, 12, -26);
  scene.add(rim);

  const disposables: { dispose(): void }[] = [pmrem, envTexture];
  const track = <T extends { dispose(): void }>(x: T) => {
    disposables.push(x);
    return x;
  };

  // The baseplate: a big dark plate covered in studs, fading into the background.
  const plateMat = track(new MeshStandardMaterial({ color: PALETTE.plate, roughness: 0.55 }));
  const plate = new Mesh(track(new BoxGeometry(240, 0.4, 200)), plateMat);
  plate.position.y = -0.2;
  plate.receiveShadow = true;
  scene.add(plate);
  const PLATE_X = 84;
  const PLATE_Z = 56;
  const plateStuds = new InstancedMesh(track(new CylinderGeometry(STUD_R, STUD_R, 0.16, 12)), plateMat, PLATE_X * PLATE_Z);
  const m = new Matrix4();
  let n = 0;
  for (let x = 0; x < PLATE_X; x++) {
    for (let z = 0; z < PLATE_Z; z++) {
      m.makeTranslation(x - PLATE_X / 2 + 0.5, 0.08, z - PLATE_Z / 2 - 14 + 0.5);
      plateStuds.setMatrixAt(n++, m);
    }
  }
  plateStuds.receiveShadow = true;
  scene.add(plateStuds);

  // The word.
  const brickGeo = track(new RoundedBoxGeometry(0.96, H - 0.04, 0.96, 2, 0.06));
  const studGeo = track(new CylinderGeometry(STUD_R, STUD_R, STUD_H, 20));
  const plastic = track(
    new MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.3, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
  );
  const word = new Group();
  scene.add(word);

  let layout = wordCells(false);
  const count = layout.cells.length;
  const brickMesh = new InstancedMesh(brickGeo, plastic, count);
  const studMesh = new InstancedMesh(studGeo, plastic, count);
  brickMesh.castShadow = studMesh.castShadow = true;
  brickMesh.receiveShadow = studMesh.receiveShadow = true;
  word.add(brickMesh, studMesh);
  layout.cells.forEach((cell, i) => {
    const color = new Color(cell.color);
    brickMesh.setColorAt(i, color);
    studMesh.setColorAt(i, color);
  });

  const accents = layout.cells.map((c) => !!c.accent);
  const rand = seeded(7);
  const bricks: Brick[] = layout.cells.map(() => ({
    target: new Vector3(),
    pos: new Vector3(),
    quat: new Quaternion(),
    delay: 0,
    spin: new Euler((rand() - 0.5) * 1.2, (rand() - 0.5) * 1.2, (rand() - 0.5) * 1.6),
    lift: 0,
    vel: new Vector3(),
    ang: new Vector3(),
  }));

  // Loose bricks drifting in the air around the word.
  type Loose = { group: Group; base: Vector3; phase: number; spin: Vector3; vel: Vector3 };
  const loose: Loose[] = [];
  const looseSpecs: [number, number, string, [number, number, number]][] = [
    [2, 4, PALETTE.red, [-24, 15, -10]],
    [2, 2, PALETTE.blue, [22, 17, -6]],
    [1, 2, PALETTE.white, [-15, 3, 12]],
    [2, 3, PALETTE.green, [26, 4, 6]],
    [1, 4, PALETTE.yellow, [-30, 8, 4]],
    [2, 2, PALETTE.white, [10, 20, -16]],
    [1, 1, PALETTE.red, [16, 2, 14]],
  ];
  for (const [w, l, color, p] of looseSpecs) {
    const mat = track(new MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.3 }));
    const group = new Group();
    const body = new Mesh(track(new RoundedBoxGeometry(w - 0.04, H - 0.04, l - 0.04, 2, 0.06)), mat);
    body.castShadow = true;
    group.add(body);
    const studs = new InstancedMesh(studGeo, mat, w * l);
    let k = 0;
    for (let x = 0; x < w; x++) for (let z = 0; z < l; z++) studs.setMatrixAt(k++, m.makeTranslation(x - w / 2 + 0.5, H / 2 + STUD_H / 2, z - l / 2 + 0.5));
    studs.castShadow = true;
    group.add(studs);
    group.rotation.set(rand() * 6, rand() * 6, rand() * 6);
    group.position.set(...p);
    scene.add(group);
    loose.push({ group, base: new Vector3(...p), phase: rand() * 6, spin: new Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.5), vel: new Vector3() });
  }

  // Where everything goes, depending on the screen's shape.
  let view = { lookAt: new Vector3(), distance: 40, height: 10 };
  let twoLines = false;
  function place(aspect: number) {
    twoLines = aspect < 0.95;
    layout = wordCells(twoLines);
    const x0 = (layout.cols - 1) / 2;
    layout.cells.forEach((cell, i) => {
      const b = bricks[i];
      // Row 0 is the top; the wall stands on the plate (y = 0).
      b.target.set(cell.col - x0, (layout.rows - 1 - cell.row) * H + H / 2, 0);
      // Bricks are placed left to right, bottom to top, like building it by hand.
      b.delay = 0.25 + ((cell.col / layout.cols) * 0.9 + ((layout.rows - cell.row) / layout.rows) * 0.45) * (twoLines ? 1.1 : 1);
    });
    word.rotation.y = twoLines ? -0.3 : -0.16;
    const wordWidth = layout.cols + 2;
    const wordHeight = layout.rows * H;
    const fovV = (camera.fov * Math.PI) / 180;
    const fitW = (wordWidth * (twoLines ? 1.12 : 1.18)) / (2 * Math.tan(fovV / 2) * aspect);
    const fitH = (wordHeight * 2.1) / (2 * Math.tan(fovV / 2));
    const distance = Math.max(fitW, fitH);
    // Aim below the word's middle so it sits in the upper part of the screen, above the words and button.
    const aim = twoLines ? Math.max(-wordHeight * 0.05, wordHeight * 0.5 - distance * Math.tan(fovV / 2) * 0.42) : wordHeight * 0.34;
    view = { lookAt: new Vector3(0, aim, 0), distance, height: wordHeight * 0.55 + distance * 0.28 };
    scene.fog = new Fog(BG, distance * 1.1, distance * 1.9);
  }

  function resize() {
    const parent = canvas.parentElement;
    const w = parent?.clientWidth || window.innerWidth;
    const h = parent?.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const wasTwo = twoLines;
    place(camera.aspect);
    if (wasTwo !== twoLines || !started) bricks.forEach((b) => b.pos.copy(b.target));
  }

  // Pointer: the camera leans toward it, and the bricks under it pop out of the wall.
  const pointer = new Vector2(0, 0);
  const smooth = new Vector2(0, 0);
  let pointerInside = false;
  const raycaster = new Raycaster();
  const hit = new Vector3();
  let hitActive = false;
  const onPointer = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1));
    pointerInside = e.pointerType === 'mouse';
  };
  const onLeave = () => {
    pointerInside = false;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('pointerleave', onLeave);

  const clock = new Clock();
  let started = false;
  let elapsed = opts.still ? 10 : 0;
  let exitAt = -1;
  let exitResolve: (() => void) | null = null;
  let frame = 0;
  const tmpQ = new Quaternion();
  const tmpE = new Euler();
  const studOffset = new Matrix4().makeTranslation(0, H / 2 + STUD_H / 2 - 0.02, 0);
  const one = new Vector3(1, 1, 1);
  const camPos = new Vector3();
  const local = new Vector3();

  resize();
  started = true;
  if (!opts.still) bricks.forEach((b) => b.pos.copy(b.target).add(new Vector3(0, 14, 0)));

  const EXIT = 1.25;

  // If the device is struggling (slow frames for a second), draw at a lower resolution, without soft shadows.
  let frames = 0;
  let lowered = false;
  function lowerQuality() {
    lowered = true;
    renderer.setPixelRatio(1);
    renderer.shadowMap.type = PCFShadowMap;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.map?.dispose();
    key.shadow.map = null;
    resize();
  }

  function tick() {
    frame = requestAnimationFrame(tick);
    // Timing follows the real clock (so a slow device still finishes on time); motion steps stay small.
    const real = Math.min(clock.getDelta(), 0.25);
    const dt = Math.min(real, 1 / 20);
    elapsed += real;
    // Measured over the first two seconds: fewer than 30 frames a second means "struggling".
    if (!lowered && elapsed < 2.5) {
      frames++;
      if (elapsed >= 2 && frames / elapsed < 30) lowerQuality();
    }
    const t = elapsed;
    const exiting = exitAt >= 0;
    const e = exiting ? clamp01((t - exitAt) / EXIT) : 0;

    // Camera: a slow drift, a lean toward the pointer, and a dive forward on the way out.
    smooth.lerp(pointer, 1 - Math.pow(0.001, dt));
    const sway = opts.still ? 0 : Math.sin(t * 0.25) * 0.6;
    const dive = easeOut(e) * view.distance * 0.55;
    camPos.set(smooth.x * view.distance * 0.12 + sway, view.height - smooth.y * view.distance * 0.06 - dive * 0.15, view.distance - dive);
    camera.position.copy(camPos);
    camera.lookAt(view.lookAt);

    // Which part of the wall is under the pointer.
    hitActive = false;
    if (pointerInside && !exiting && !opts.still && t > 2) {
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(brickMesh, false);
      if (hits.length) {
        hit.copy(hits[0].point);
        word.worldToLocal(hit);
        hitActive = true;
      }
    }

    bricks.forEach((b, i) => {
      if (exiting) {
        b.vel.y -= 9 * real;
        b.pos.addScaledVector(b.vel, real);
        tmpQ.setFromEuler(tmpE.set(b.ang.x * real, b.ang.y * real, b.ang.z * real));
        b.quat.multiply(tmpQ);
      } else {
        const p = clamp01((t - b.delay) / 0.7);
        const k = easeOut(p);
        b.pos.set(b.target.x, b.target.y + (1 - k) * 14, b.target.z + (1 - k) * 3);
        b.quat.setFromEuler(tmpE.set(b.spin.x * (1 - k), b.spin.y * (1 - k), b.spin.z * (1 - k)));
        // Pop out toward the pointer.
        let want = 0;
        if (hitActive && p >= 1) {
          const d = Math.hypot(b.target.x - hit.x, b.target.y - hit.y);
          want = Math.max(0, 1 - d / 2.6) * 0.9;
        }
        b.lift += (want - b.lift) * (1 - Math.pow(0.0005, dt));
        b.pos.z += b.lift;
        // The accent hovers above its letter.
        if (accents[i] && !opts.still) b.pos.y += Math.sin(t * 1.6 + i) * 0.12 + 0.15;
      }
      m.compose(b.pos, b.quat, one);
      brickMesh.setMatrixAt(i, m);
      studMesh.setMatrixAt(i, m.multiply(studOffset));
    });
    brickMesh.instanceMatrix.needsUpdate = true;
    studMesh.instanceMatrix.needsUpdate = true;

    for (const l of loose) {
      if (exiting) {
        l.group.position.addScaledVector(l.vel, real);
      } else if (!opts.still) {
        l.group.position.y = l.base.y + Math.sin(t * 0.7 + l.phase) * 0.6;
      }
      if (!opts.still) {
        l.group.rotation.x += l.spin.x * dt * (exiting ? 4 : 1);
        l.group.rotation.y += l.spin.y * dt * (exiting ? 4 : 1);
      }
    }

    renderer.render(scene, camera);
    if (exiting && e >= 1) {
      // Done: stop drawing, so the site underneath gets the device's full attention.
      cancelAnimationFrame(frame);
      exitResolve?.();
      exitResolve = null;
    }
  }

  const observer = new ResizeObserver(resize);
  if (canvas.parentElement) observer.observe(canvas.parentElement);
  // Prepare the shaders in the background where the browser can, so the page stays responsive meanwhile.
  let disposed = false;
  const start = () => {
    if (disposed) return;
    clock.getDelta();
    tick();
    opts.onReady?.();
  };
  renderer.compileAsync(scene, camera).then(start, start);

  return {
    enter() {
      if (opts.still) return Promise.resolve();
      if (exitAt >= 0) return new Promise((r) => (exitResolve = r));
      exitAt = elapsed;
      const r = seeded(11);
      bricks.forEach((b) => {
        // Each brick flies out from the middle of the word, mostly toward the camera.
        local.copy(b.pos).sub(view.lookAt);
        b.vel.set(local.x * 0.9 + (r() - 0.5) * 6, 5 + local.y * 0.6 + r() * 6, 14 + r() * 18);
        b.ang.set((r() - 0.5) * 10, (r() - 0.5) * 10, (r() - 0.5) * 10);
      });
      for (const l of loose) l.vel.copy(l.base).normalize().multiplyScalar(18).add(new Vector3(0, 4, 10));
      return new Promise((resolve) => (exitResolve = resolve));
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerleave', onLeave);
      scene.traverse((o) => {
        if (o instanceof Mesh || o instanceof InstancedMesh) (o.geometry as BufferGeometry).dispose();
        if (o instanceof InstancedMesh) o.dispose();
      });
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      exitResolve?.();
    },
  };
}

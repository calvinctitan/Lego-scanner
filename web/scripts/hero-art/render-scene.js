// Step 2 of the hero artwork: draw the settled pile (pile.json) with three.js and hand back pictures
// with a see-through background. Runs inside a browser page opened by make.mjs.
//
// Every brick is built here from simple shapes: a box with slightly rounded edges and a cylinder for
// each stud. No LEGO models, photos or logos are used, and nothing is printed on the studs.
import {
  CylinderGeometry,
  DoubleSide,
  DirectionalLight,
  HemisphereLight,
  InstancedMesh,
  Color,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  SRGBColorSpace,
  Scene,
  ShadowMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const STUD_H = 0.2125;

function brickGeometry(t) {
  const parts = [new RoundedBoxGeometry(t.w - 0.03, t.h, t.l - 0.03, 3, 0.05)];
  for (let i = 0; i < t.w; i++) {
    for (let j = 0; j < t.l; j++) {
      const stud = new CylinderGeometry(0.292, 0.3, STUD_H, 28).toNonIndexed();
      stud.translate(i - t.w / 2 + 0.5, t.h / 2 + STUD_H / 2 - 0.006, j - t.l / 2 + 0.5);
      parts.push(stud);
    }
  }
  return mergeGeometries(parts);
}

/** A dark studio with three soft lights, used only for what the gold brick reflects. */
function studioReflections(pmrem) {
  const studio = new Scene();
  studio.background = new Color(0.035, 0.03, 0.025);
  const panel = (w, h, brightness, position, tint = [1, 1, 1]) => {
    const mesh = new Mesh(
      new PlaneGeometry(w, h),
      new MeshBasicMaterial({ color: new Color(tint[0] * brightness, tint[1] * brightness, tint[2] * brightness), side: DoubleSide }),
    );
    mesh.position.set(...position);
    mesh.lookAt(0, 0, 0);
    studio.add(mesh);
  };
  panel(26, 18, 2.4, [-8, 22, 10]); // big light overhead, towards the camera
  panel(8, 26, 3.2, [24, 8, 14]); // tall strip on the right
  panel(10, 10, 2.6, [-22, 4, 16], [1, 0.95, 0.85]); // warm fill on the left
  panel(60, 60, 0.5, [0, -18, 0], [1, 0.8, 0.5]); // warm glow from the "table" below
  return pmrem.fromScene(studio, 0.02).texture;
}

function toDataUrl(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    }, type, quality);
  });
}

/**
 * opts: { width, height (drawing size), outputs: [{ name, width, quality }], previews: [{ name, width, background }],
 *         elevation, azimuth (degrees), fov }
 */
window.renderPile = async function renderPile(pile, opts) {
  const W = opts.width;
  const H = opts.height;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  const gl = renderer.getContext();
  const drawn = [gl.drawingBufferWidth, gl.drawingBufferHeight];

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = opts.environment ?? 0.5;

  // The pile's size, to aim the camera and the lights.
  const xs = pile.bricks.map((b) => b.p[0]);
  const ys = pile.bricks.map((b) => b.p[1]);
  const zs = pile.bricks.map((b) => b.p[2]);
  const min = new Vector3(Math.min(...xs) - 3.5, 0, Math.min(...zs) - 3.5);
  const max = new Vector3(Math.max(...xs) + 3.5, Math.max(...ys) + 2.2, Math.max(...zs) + 3.5);
  const centre = new Vector3((min.x + max.x) / 2, max.y * 0.42, (min.z + max.z) / 2);
  const reach = Math.max(max.x - min.x, max.z - min.z) / 2 + 6;

  // Light: a soft sky all round (several weak lights, each casting shadows, so the gaps between
  // bricks go dark the way they do in real life), one warm main light, and a cool light from behind.
  scene.add(new HemisphereLight(0xffffff, 0x9aa0a6, opts.sky ?? 0.35));
  const addLight = (color, intensity, pos, mapSize, radius) => {
    const light = new DirectionalLight(color, intensity);
    light.position.copy(centre).add(pos);
    light.target.position.copy(centre);
    scene.add(light, light.target);
    if (mapSize) {
      light.castShadow = true;
      light.shadow.mapSize.set(mapSize, mapSize);
      const cam = light.shadow.camera;
      cam.left = -reach; cam.right = reach; cam.top = reach; cam.bottom = -reach; cam.near = 1; cam.far = 220;
      light.shadow.bias = -0.0004;
      light.shadow.normalBias = 0.05;
      light.shadow.radius = radius;
    }
    return light;
  };
  addLight(0xfff3df, opts.key ?? 2.4, new Vector3(-30, 52, 38), opts.shadowMap ?? 4096, 3.5);
  const dome = opts.dome ?? 0.3;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    addLight(0xf2f6ff, dome, new Vector3(Math.cos(a) * 42, 58, Math.sin(a) * 42), 2048, 5);
  }
  addLight(0xbfd8ff, opts.rim ?? 0.9, new Vector3(34, 26, -44), 0, 0);

  // A faint shadow on the table under the pile (kept very light, see make.mjs).
  const table = new Mesh(new PlaneGeometry(600, 600), new ShadowMaterial({ opacity: opts.tableShadow ?? 0.085 }));
  table.rotation.x = -Math.PI / 2;
  table.position.y = 0.002;
  table.receiveShadow = true;
  scene.add(table);

  const plastic = new MeshPhysicalMaterial({ color: 0xffffff, roughness: opts.roughness ?? 0.4, metalness: 0, clearcoat: opts.clearcoat ?? 0.18, clearcoatRoughness: 0.35 });
  // Polished gold: a mirror-like metal. Metal only looks like metal when it has bright and dark things
  // to reflect, so it gets its own little photo studio: big soft lights on a dark room.
  const gold = new MeshPhysicalMaterial({
    color: opts.goldColor ?? 0xffbe3b,
    roughness: opts.goldRoughness ?? 0.2,
    metalness: 1,
    envMap: studioReflections(pmrem),
    envMapIntensity: opts.goldEnv ?? 1,
    emissive: 0xb07a10,
    emissiveIntensity: opts.goldGlow ?? 0.12,
  });
  const m = new Matrix4();
  const q = new Quaternion();
  const p = new Vector3();
  const one = new Vector3(1, 1, 1);
  pile.types.forEach((t, ti) => {
    const list = pile.bricks.filter((b) => b.t === ti && !b.gold);
    if (!list.length) return;
    const mesh = new InstancedMesh(brickGeometry(t), plastic, list.length);
    list.forEach((b, i) => {
      m.compose(p.fromArray(b.p), q.fromArray(b.q), one);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, new Color(pile.colors[b.c]));
    });
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
  });
  const g = pile.bricks.find((b) => b.gold);
  if (g) {
    const mesh = new Mesh(brickGeometry(pile.types[g.t]), gold);
    mesh.position.fromArray(g.p);
    mesh.quaternion.fromArray(g.q);
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // Camera: in front and a little above, far enough back that the whole pile is in the picture.
  const camera = new PerspectiveCamera(opts.fov ?? 22, W / H, 1, 2000);
  const el = ((opts.elevation ?? 20) * Math.PI) / 180;
  const az = ((opts.azimuth ?? 0) * Math.PI) / 180;
  const dir = new Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  let distance = 150;
  const corners = [];
  for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) corners.push(new Vector3(x, y, z));
  for (let i = 0; i < 12; i++) {
    camera.position.copy(centre).addScaledVector(dir, distance);
    camera.lookAt(centre);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    let far = 0;
    for (const c of corners) {
      const n = c.clone().project(camera);
      far = Math.max(far, Math.abs(n.x), Math.abs(n.y));
    }
    distance *= far / 0.95;
  }
  camera.position.copy(centre).addScaledVector(dir, distance);
  camera.lookAt(centre);

  renderer.render(scene, camera);

  // Find where the picture actually is, and crop to it with a little air around.
  const flat = document.createElement('canvas');
  flat.width = W;
  flat.height = H;
  const fctx = flat.getContext('2d', { willReadFrequently: true });
  fctx.drawImage(canvas, 0, 0);
  const data = fctx.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = 0, y1 = 0, maxShadow = 0;
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const a = data[(y * W + x) * 4 + 3];
      if (a > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const k = (y * W + x) * 4;
      if (a < 60 && a > maxShadow && data[k] + data[k + 1] + data[k + 2] === 0) maxShadow = a;
    }
  }
  const pad = Math.round((x1 - x0) * 0.012);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W, x1 + pad); y1 = Math.min(H, y1 + pad);
  const cw = x1 - x0;
  const ch = y1 - y0;

  const scaled = (width, background, part) => {
    // `part` zooms into a piece of the picture: [left, top, right, bottom] as fractions of it.
    const [fx0, fy0, fx1, fy1] = part ?? [0, 0, 1, 1];
    const px = x0 + cw * fx0, py = y0 + ch * fy0, pw = cw * (fx1 - fx0), ph = ch * (fy1 - fy0);
    const c = document.createElement('canvas');
    c.width = width;
    c.height = Math.round((width * ph) / pw);
    const ctx = c.getContext('2d');
    if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // Step down by halves for a cleaner result than one big shrink.
    let src = flat; let sx = px, sy = py, sw = pw, sh = ph;
    while (sw / 2 > width) {
      const half = document.createElement('canvas');
      half.width = Math.round(sw / 2); half.height = Math.round(sh / 2);
      const hctx = half.getContext('2d');
      hctx.imageSmoothingQuality = 'high';
      hctx.drawImage(src, sx, sy, sw, sh, 0, 0, half.width, half.height);
      src = half; sx = 0; sy = 0; sw = half.width; sh = half.height;
    }
    ctx.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return c;
  };

  const result = { drawn, crop: [x0, y0, cw, ch], aspect: cw / ch, maxShadowAlpha: maxShadow, files: {} };
  for (const o of opts.outputs ?? []) {
    const c = scaled(o.width);
    result.files[o.name] = { width: c.width, height: c.height, data: await toDataUrl(c, 'image/webp', o.quality ?? 0.86) };
  }
  for (const o of opts.previews ?? []) {
    const c = scaled(o.width, o.background, o.part);
    result.files[o.name] = { width: c.width, height: c.height, data: await toDataUrl(c, 'image/png') };
  }
  renderer.dispose();
  return result;
};

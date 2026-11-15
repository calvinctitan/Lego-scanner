// Step 1 of the hero artwork: drop a few hundred toy bricks onto a table with a physics engine
// and let them settle into a pile, then lay one gold brick on top. Writes pile.json.
//
// The bricks are plain studded boxes described by numbers (2 studs by 4, 1.2 studs tall…), so the
// picture made from them is original artwork: no photos, models or logos from anyone else.
//
// Run by make.mjs. Needs: npm install --no-save @dimforge/rapier3d-compat
import fs from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';

const out = process.argv[2] || 'pile.json';
const SEED = Number(process.argv[3] || 11);
const COUNT = Number(process.argv[4] || 620);

// A small repeatable random, so the same seed always builds the same pile.
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const gauss = () => {
  let u = 0; let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
function pick(list) {
  const total = list.reduce((s, x) => s + x.n, 0);
  let r = rand() * total;
  for (let i = 0; i < list.length; i++) { r -= list[i].n; if (r <= 0) return i; }
  return list.length - 1;
}

// Sizes in studs: w across, l along, h tall (a brick is 1.2 studs tall, a plate 0.4). n = how common.
export const TYPES = [
  { id: '2x4', w: 2, l: 4, h: 1.2, n: 20 },
  { id: '2x2', w: 2, l: 2, h: 1.2, n: 16 },
  { id: '1x2', w: 1, l: 2, h: 1.2, n: 13 },
  { id: '1x4', w: 1, l: 4, h: 1.2, n: 9 },
  { id: '2x3', w: 2, l: 3, h: 1.2, n: 8 },
  { id: '1x1', w: 1, l: 1, h: 1.2, n: 7 },
  { id: '1x3', w: 1, l: 3, h: 1.2, n: 5 },
  { id: '2x6', w: 2, l: 6, h: 1.2, n: 3 },
  { id: 'p2x4', w: 2, l: 4, h: 0.4, n: 5 },
  { id: 'p2x2', w: 2, l: 2, h: 0.4, n: 5 },
  { id: 'p1x2', w: 1, l: 2, h: 0.4, n: 4 },
  { id: 'p1x4', w: 1, l: 4, h: 0.4, n: 3 },
];
// No yellow or orange in the pile, so the one gold brick is the only warm, shiny thing in it.
export const COLORS = [
  { hex: '#c91a09', n: 18 }, // red
  { hex: '#0055bf', n: 17 }, // blue
  { hex: '#f4f4f4', n: 14 }, // white
  { hex: '#a0a5a9', n: 11 }, // light bluish gray
  { hex: '#6c6e68', n: 7 }, // dark bluish gray
  { hex: '#237841', n: 9 }, // green
  { hex: '#36aebf', n: 7 }, // medium azure
  { hex: '#923978', n: 4 }, // magenta
];

await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: -60, z: 0 });
world.timestep = 1 / 120;
world.createCollider(RAPIER.ColliderDesc.cuboid(300, 1, 300).setTranslation(0, -1, 0).setFriction(0.95).setRestitution(0.02));

const bodies = [];
function addBrick(type, color, x, y, z, quat, gold = false) {
  const t = TYPES[type];
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).setRotation(quat).setLinearDamping(0.12).setAngularDamping(0.55).setCcdEnabled(true),
  );
  // The box is a touch taller than the brick's body, to leave room for the studs on top.
  const collider = RAPIER.ColliderDesc.cuboid(t.w / 2 - 0.015, t.h / 2 + 0.05, t.l / 2 - 0.015)
    .setTranslation(0, 0.05, 0).setFriction(0.8).setRestitution(0.06).setDensity(1);
  world.createCollider(collider, body);
  bodies.push({ body, type, color, gold });
  return body;
}
function randomQuat() {
  // Uniform random rotation (Shoemake).
  const u1 = rand(); const u2 = rand(); const u3 = rand();
  const a = Math.sqrt(1 - u1); const b = Math.sqrt(u1);
  return { x: a * Math.sin(2 * Math.PI * u2), y: a * Math.cos(2 * Math.PI * u2), z: b * Math.sin(2 * Math.PI * u3), w: b * Math.cos(2 * Math.PI * u3) };
}

// Where bricks are poured: one tall heap in the middle and a lower shoulder on each side.
const HEAPS = [
  { x: 0, sx: 6.4, sz: 3.3, n: 58 },
  { x: -12.5, sx: 4.6, sz: 2.8, n: 22 },
  { x: 12, sx: 4.4, sz: 2.7, n: 20 },
];
let spawned = 0;
function pour(batch) {
  const placed = [];
  for (let i = 0; i < batch && spawned < COUNT; i++) {
    let x = 0; let z = 0;
    for (let tries = 0; tries < 30; tries++) {
      const heap = HEAPS[pick(HEAPS)];
      x = heap.x + gauss() * heap.sx;
      z = gauss() * heap.sz;
      if (placed.every((p) => Math.hypot(p.x - x, p.z - z) > 5.2)) break;
    }
    placed.push({ x, z });
    const body = addBrick(pick(TYPES), pick(COLORS), x, 24 + rand() * 7, z, randomQuat());
    body.setAngvel({ x: gauss() * 2, y: gauss() * 2, z: gauss() * 2 }, true);
    spawned++;
  }
}

let steps = 0;
const step = (n) => { for (let i = 0; i < n; i++) { world.step(); steps++; } };
while (spawned < COUNT) { pour(12); step(22); }
step(120 * 7); // let the pile come to rest

// The gold brick: lowered gently onto the highest point near the middle, studs up.
let peak = { y: 0, x: 0, z: 0 };
for (const b of bodies) {
  const p = b.body.translation();
  if (Math.abs(p.x) < 5 && Math.abs(p.z) < 4 && p.y > peak.y) peak = { x: p.x, y: p.y, z: p.z };
}
const yaw = 0.42;
addBrick(0, -1, peak.x * 0.6, peak.y + 2.2, peak.z * 0.6 + 0.4, { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }, true);
step(120 * 5);

// Every brick is a box, so turning it half a turn about its own length leaves it in the same place.
// Use that to show studs, not undersides: pick the way round whose studs face more up and forward.
const prefer = { x: 0, y: 0.8, z: 0.6 };
function rotate(q, v) {
  const { x, y, z, w } = q;
  const ix = w * v.x + y * v.z - z * v.y; const iy = w * v.y + z * v.x - x * v.z; const iz = w * v.z + x * v.y - y * v.x; const iw = -x * v.x - y * v.y - z * v.z;
  return { x: ix * w + iw * -x + iy * -z - iz * -y, y: iy * w + iw * -y + iz * -x - ix * -z, z: iz * w + iw * -z + ix * -y - iy * -x };
}
const mul = (a, b) => ({
  x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
  y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
  z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
});
const bricks = [];
let flipped = 0;
for (const b of bodies) {
  const p = b.body.translation();
  let q = b.body.rotation();
  q = { x: q.x, y: q.y, z: q.z, w: q.w };
  const up = rotate(q, { x: 0, y: 1, z: 0 });
  if (!b.gold && up.x * prefer.x + up.y * prefer.y + up.z * prefer.z < 0) { q = mul(q, { x: 0, y: 0, z: 1, w: 0 }); flipped++; }
  // Bricks that bounced far away from the pile are left out, to keep its outline tidy.
  if (Math.abs(p.x) > 29 || Math.abs(p.z) > 14 || p.y < -1) continue;
  bricks.push({ t: b.type, c: b.color, gold: b.gold || undefined, p: [p.x, p.y, p.z].map((n) => +n.toFixed(4)), q: [q.x, q.y, q.z, q.w].map((n) => +n.toFixed(5)) });
}
const xs = bricks.map((b) => b.p[0]); const ys = bricks.map((b) => b.p[1]); const zs = bricks.map((b) => b.p[2]);
const gold = bricks.find((b) => b.gold);
fs.writeFileSync(out, JSON.stringify({ seed: SEED, types: TYPES, colors: COLORS.map((c) => c.hex), bricks }));
console.log(`pile: ${bricks.length} bricks (${flipped} turned studs-up), ${steps} steps; x ${Math.min(...xs).toFixed(1)}..${Math.max(...xs).toFixed(1)}, top ${Math.max(...ys).toFixed(1)}, z ${Math.min(...zs).toFixed(1)}..${Math.max(...zs).toFixed(1)}; gold at ${gold ? gold.p.join(', ') : 'LOST'}`);

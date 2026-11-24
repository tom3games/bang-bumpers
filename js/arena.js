// 円形のアリーナ（半径100m）。形と高さの定義（sim と view の両方が読む。THREE にも DOM にも依存しない）
export const WORLD = 100          // 外周の壁までの半径
export const HALF = WORLD
export const BOWL = { x: 0, z: 0, r: 15, depth: 3.2 }
// 坂とジャンプ台: (x,z) が低い端、ang の向き(sin,cos)へ len だけ登って、その先は切り立った崖。形をばらけさせてある
const aimC = (x, z) => Math.atan2(-x, -z)     // 中央を向く角
export const RAMPS = [
  { x: -62, z: -26, ang: Math.PI / 2, len: 20, w: 10, h: 3.0, kind: 'long' },       // 長いゆるい台
  { x: 36, z: 42, ang: aimC(36, 42), len: 8, w: 7, h: 3.8, kind: 'steep' },          // 短くて急な台
  { x: 0, z: -80, ang: 0, len: 14, w: 18, h: 3.6, kind: 'wide' },                    // 幅の広い台
  { x: 76, z: -8, ang: -Math.PI / 2, len: 9, w: 8, h: 2.0, kind: 'step1' },          // 2段の台（1段目）
  { x: 56, z: -8, ang: -Math.PI / 2, len: 9, w: 8, h: 3.6, kind: 'step2' },          // 2段目（少し先）
  { x: -26, z: 66, ang: aimC(-26, 66), len: 12, w: 9, h: 3.2, kind: 'mid' },
]
// 柱（円）。top は十分高い。kind: pillar コンクリの柱 / tires タイヤの山
export const POLES = []
for (let i = 0; i < 6; i++) { const a = (i * 60 + 18) * Math.PI / 180; POLES.push({ x: Math.sin(a) * 46, z: Math.cos(a) * 46, r: 1.6, h: 11, kind: 'pillar' }) }
for (const [x, z] of [[-90, 10], [-88, 16], [88, -30], [90, -24], [20, 91], [26, 90], [-30, -88], [-36, -86]]) POLES.push({ x, z, r: 1.0, h: 1.8, kind: 'tires' })
// 箱（軸に沿った直方体）。バリアは数か所だけ
export const BOXES = [
  { x: 70, z: 32, w: 1.4, d: 10, h: 1.2, kind: 'barrier' }, { x: -72, z: 40, w: 1.4, d: 10, h: 1.2, kind: 'barrier' },
  { x: 38, z: -62, w: 10, d: 1.4, h: 1.2, kind: 'barrier' }, { x: -46, z: 72, w: 10, d: 1.4, h: 1.2, kind: 'barrier' },
]
export const DOORS = { S: [], E: [], W: [] }
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v
export function bowlH(x, z) {
  const dx = x - BOWL.x, dz = z - BOWL.z, r2 = dx * dx + dz * dz
  return r2 < BOWL.r * BOWL.r ? -BOWL.depth * (0.5 + 0.5 * Math.cos(Math.PI * Math.sqrt(r2) / BOWL.r)) : 0
}
export function H(x, z) {
  let h = bowlH(x, z)
  for (const p of RAMPS) {
    const ex = x - p.x, ez = z - p.z, s = Math.sin(p.ang), c = Math.cos(p.ang)
    const u = ex * s + ez * c, v = ex * c - ez * s
    if (u >= 0 && u <= p.len && Math.abs(v) <= p.w / 2) { const hh = p.h * u / p.len; if (hh > h) h = hh }
  }
  return h
}
for (const o of POLES) { o.base = H(o.x, o.z); o.top = o.base + o.h }
for (const o of BOXES) { o.base = H(o.x, o.z); o.top = o.base + o.h }
export const OBST = { poles: POLES, boxes: BOXES }

// ---- 格子（10m）。障害物ごとに近くの升目へ登録し、当たりと見通しはその升目だけ調べる
const CELL = 10, NC = Math.ceil(WORLD * 2 / CELL) + 1
const cellPoles = Array.from({ length: NC * NC }, () => []), cellBoxes = Array.from({ length: NC * NC }, () => [])
const ci = v => Math.max(0, Math.min(NC - 1, Math.floor((v + WORLD) / CELL)))
for (const o of POLES) { const m = o.r + 3; for (let i = ci(o.x - m); i <= ci(o.x + m); i++) for (let j = ci(o.z - m); j <= ci(o.z + m); j++) cellPoles[j * NC + i].push(o) }
for (const o of BOXES) { const mx = o.w / 2 + 3, mz = o.d / 2 + 3; for (let i = ci(o.x - mx); i <= ci(o.x + mx); i++) for (let j = ci(o.z - mz); j <= ci(o.z + mz); j++) cellBoxes[j * NC + i].push(o) }

export function pushOutCircle(x, y, z, r, hgt, out) {
  let hit = false
  const k = ci(z) * NC + ci(x)
  for (const o of cellPoles[k]) {
    if (y > o.top - 0.2 || y + hgt < o.base + 0.1) continue
    const dx = x - o.x, dz = z - o.z, rr = r + o.r, d2 = dx * dx + dz * dz
    if (d2 < rr * rr) { const d = Math.sqrt(d2) || 0.001; out.push([dx / d, dz / d, rr - d]); hit = true }
  }
  for (const o of cellBoxes[k]) {
    if (y > o.top - 0.2 || y + hgt < o.base + 0.1) continue
    const hx = o.w / 2, hz = o.d / 2
    const qx = Math.max(o.x - hx, Math.min(x, o.x + hx)), qz = Math.max(o.z - hz, Math.min(z, o.z + hz))
    const dx = x - qx, dz = z - qz, d2 = dx * dx + dz * dz
    if (d2 < r * r) {
      if (d2 > 1e-8) { const d = Math.sqrt(d2); out.push([dx / d, dz / d, r - d]) }
      else { const ox = hx - Math.abs(x - o.x), oz = hz - Math.abs(z - o.z); if (ox < oz) out.push([Math.sign(x - o.x) || 1, 0, ox + r]); else out.push([0, Math.sign(z - o.z) || 1, oz + r]) }
      hit = true
    }
  }
  return hit
}
export function solidAtPoint(x, y, z) {
  const k = ci(z) * NC + ci(x)
  for (const o of cellPoles[k]) { if (y < o.base || y > o.top) continue; const dx = x - o.x, dz = z - o.z; if (dx * dx + dz * dz < o.r * o.r) return o }
  for (const o of cellBoxes[k]) { if (y < o.base || y > o.top) continue; if (Math.abs(x - o.x) < o.w / 2 && Math.abs(z - o.z) < o.d / 2) return o }
  return null
}
export function lineClear(ax, ay, az, bx, by, bz) {
  const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / 1.6))
  for (let i = 1; i < n; i++) {
    const t = i / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t
    if (solidAtPoint(x, y, z)) return false
    if (y < H(x, z) - 0.05) return false
  }
  return true
}
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v
export { clamp01 }
export const inArena = (x, z, m = 0) => x * x + z * z < (WORLD - m) * (WORLD - m)
// 空いている場所を探す（車なら r=3.2 くらい）
export function freeSpot(x, z, r = 3.2) {
  const out = []
  for (let d = 0; d < 40; d += 2) for (let k = 0; k < (d ? 12 : 1); k++) {
    const a = k / 12 * 6.283, px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d
    if (!inArena(px, pz, 6)) continue
    out.length = 0; const y = H(px, pz)
    if (!pushOutCircle(px, y, pz, r, 2, out) && Math.abs(H(px + 4, pz) - y) < 0.3 && Math.abs(H(px - 4, pz) - y) < 0.3 && Math.abs(H(px, pz + 4) - y) < 0.3 && Math.abs(H(px, pz - 4) - y) < 0.3) return { x: px, z: pz }
  }
  return { x, z }
}
// 出発地点: 外側の輪に5チーム（中央を向く）。空き車と拾い物は輪ごとにばらまく
export const TEAM_SPAWNS = [0, 1, 2, 3, 4].map(i => { const a = i * 2 * Math.PI / 5 + 0.3; const p = freeSpot(74 * Math.sin(a), 74 * Math.cos(a), 4.5); return { x: p.x, z: p.z, yaw: Math.atan2(-p.x, -p.z) } })
const ring = (r, n, a0) => Array.from({ length: n }, (_, i) => { const a = a0 + i * 2 * Math.PI / n; return [Math.sin(a) * r, Math.cos(a) * r] })
export const SPARE_SPOTS = [...ring(88, 5, 0.9), ...ring(56, 3, 2.1)].map(([x, z]) => { const p = freeSpot(x, z, 3.6); return { x: p.x, z: p.z, yaw: Math.atan2(-p.x, -p.z) + 1.2 } })
for (const s of SPARE_SPOTS) for (const t of TEAM_SPAWNS) if (Math.hypot(s.x - t.x, s.z - t.z) < 18) { const p = freeSpot(s.x * 0.8, s.z * 0.8, 3.6); s.x = p.x; s.z = p.z }
export const PICKUP_SPOTS = [[7, 5], [-7, -5], ...ring(30, 4, 0.4), ...ring(60, 6, 1.1), ...ring(86, 4, 2.0)].map(([x, z]) => { const p = freeSpot(x, z, 2.4); return { x: p.x, z: p.z } })

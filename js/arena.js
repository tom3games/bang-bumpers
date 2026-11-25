// 円形のアリーナ（半径120m）。形と高さの定義（sim と view の両方が読む。THREE にも DOM にも依存しない）
export const WORLD = 120          // 外周の壁までの半径
export const HALF = WORLD
export const NTEAM = 6
// ジャンプ台: 円錐台（どの向きからも登れる）。中心(x,z)・裾の半径 r0・平らな上面の半径 r1・高さ h。崖は無く、全周がなだらかな斜面
export const RAMPS = [
  { x: -80, z: -34, r0: 14, r1: 5, h: 3.4, kind: 'big' },
  { x: 50, z: 58, r0: 10, r1: 3.6, h: 2.8, kind: 'small' },
  { x: 0, z: -108, r0: 13, r1: 4.5, h: 3.2, kind: 'big' },
  { x: 104, z: -12, r0: 11, r1: 4, h: 2.8, kind: 'mid' },
  { x: -36, z: 92, r0: 11, r1: 4, h: 3.0, kind: 'mid' },
  { x: 26, z: -22, r0: 9, r1: 3.4, h: 2.4, kind: 'small' },
]
// 柱（円）。top は十分高い。kind: pillar コンクリの柱 / tires タイヤの山
export const POLES = []
for (let i = 0; i < 6; i++) { const a = (i * 60 + 18) * Math.PI / 180; POLES.push({ x: Math.sin(a) * 56, z: Math.cos(a) * 56, r: 1.6, h: 11, kind: 'pillar' }) }
for (const [x, z] of [[-108, 12], [-106, 19], [106, -36], [108, -29], [24, 109], [31, 108], [-36, -106], [-43, -103]]) POLES.push({ x, z, r: 1.0, h: 1.8, kind: 'tires' })
// 箱（軸に沿った直方体）。バリアは数か所だけ
export const BOXES = [
  { x: 84, z: 38, w: 1.4, d: 10, h: 1.2, kind: 'barrier' }, { x: -86, z: 48, w: 1.4, d: 10, h: 1.2, kind: 'barrier' },
  { x: 46, z: -74, w: 10, d: 1.4, h: 1.2, kind: 'barrier' }, { x: -55, z: 86, w: 10, d: 1.4, h: 1.2, kind: 'barrier' },
]
export const DOORS = { S: [], E: [], W: [] }
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v
export function rampH(p, x, z) {
  const d = Math.hypot(x - p.x, z - p.z); if (d >= p.r0) return 0
  return p.h * (d <= p.r1 ? 1 : (p.r0 - d) / (p.r0 - p.r1))
}
// 真ん中のお椀（なだらかな半円のくぼみ）。縁で傾きが 0 になる余弦の形なので段差も尖りも無い。最大の傾き ≒ 0.2（約11度）
export const BOWL = { R: 22, d: 2.8 }
export function bowlH(x, z) { const r2 = x * x + z * z; if (r2 >= BOWL.R * BOWL.R) return 0; return -BOWL.d * 0.5 * (1 + Math.cos(Math.PI * Math.sqrt(r2) / BOWL.R)) }
export function H(x, z) {
  let h = bowlH(x, z)
  for (const p of RAMPS) { if (Math.abs(x - p.x) < p.r0 && Math.abs(z - p.z) < p.r0) { const hh = rampH(p, x, z); if (hh > h) h = hh } }
  return h
}
for (const o of POLES) { o.base = H(o.x, o.z); o.top = o.base + o.h }
// ---- 柱の崩れ。状態は sim の S.pillars（hp・stage）が持ち、applyPillars で当たりの高さ（o.top）へ写す
// stage 0 無傷 / 1 ひび / 2 上が欠けた / 3 折れた株 / 4 瓦礫（低く、車は乗り越えられる＝当たり判定なし）
export const PILLARS = POLES.filter(o => o.kind === 'pillar'); PILLARS.forEach((o, i) => { o.pid = i })
export const PILLAR_H = [11, 11, 7, 2.9, 0.05]
export const pillarStageOf = hp => hp > 70 ? 0 : hp > 40 ? 1 : hp > 15 ? 2 : hp > 0 ? 3 : 4
export function applyPillars(list) { for (let i = 0; i < PILLARS.length; i++) { const o = PILLARS[i], p = list && list[i]; o.top = o.base + (p ? PILLAR_H[p.stage] : PILLAR_H[0]); o.stage = p ? p.stage : 0 } }
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
    if (d2 < rr * rr) { const d = Math.sqrt(d2) || 0.001; out.push([dx / d, dz / d, rr - d, o]); hit = true }
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
// 出発地点: 外側の輪に6チーム（中央を向く）
export const TEAM_SPAWNS = Array.from({ length: NTEAM }, (_, i) => { const a = i * 2 * Math.PI / NTEAM + 0.3; const p = freeSpot(90 * Math.sin(a), 90 * Math.cos(a), 4.5); return { x: p.x, z: p.z, yaw: Math.atan2(-p.x, -p.z) } })
const ring = (r, n, a0) => Array.from({ length: n }, (_, i) => { const a = a0 + i * 2 * Math.PI / n; return [Math.sin(a) * r, Math.cos(a) * r] })
export const PICKUP_SPOTS = [...ring(24, 3, 0.4), ...ring(44, 5, 1.1), ...ring(72, 6, 0.2), ...ring(104, 5, 2.0)].map(([x, z]) => { const p = freeSpot(x, z, 2.4); return { x: p.x, z: p.z } })
// ステージの真ん中: たまに耐久回復の箱が出る
export const CENTER = { x: 0, z: 0 }

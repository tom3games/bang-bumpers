// 廃工場のアリーナ。形と高さの定義（sim と view の両方が読む。THREE にも DOM にも依存しない）
export const HALF = 60            // 壁は x,z = ±60
export const BOWL = { x: 0, z: 0, r: 20, depth: 4.5 }
// 坂とジャンプ台: (x,z) が低い端、ang の向き(sin,cos)へ len だけ登って、その先は切り立った崖
export const RAMPS = [
  { x: -52, z: 18, ang: Math.PI / 2, len: 12, w: 8, h: 3.3 },
  { x: 52, z: -18, ang: -Math.PI / 2, len: 12, w: 8, h: 3.3 },
  { x: 18, z: 52, ang: Math.PI, len: 12, w: 8, h: 3.3 },
  { x: -6, z: -34, ang: 0, len: 12, w: 8, h: 3.3 },
]
// 上の通路（北の壁沿い）。両端が坂
export const DECK = { x0: -40, x1: 40, z0: -60, z1: -47, h: 3.4, ramp: 14 }
// 柱（円）。top は十分高い
export const POLES = [
  { x: 0, z: 0, r: 2.4, h: 30, kind: 'core' },
  { x: 30, z: 30, r: 1.2, h: 30 }, { x: -30, z: 30, r: 1.2, h: 30 },
  { x: 38, z: -26, r: 1.2, h: 30 }, { x: -38, z: -26, r: 1.2, h: 30 },
  { x: 47, z: 4, r: 1.2, h: 30 }, { x: -47, z: -6, r: 1.2, h: 30 },
  { x: 8, z: 42, r: 1.2, h: 30 }, { x: -14, z: -46.2, r: 0.9, h: 30, deck: true }, { x: 20, z: -52, r: 0.9, h: 30, deck: true },
]
// 箱（軸に沿った直方体）。h は高さ
export const BOXES = [
  { x: -14, z: 36, w: 4, d: 4, h: 3, kind: 'crate' }, { x: -18.4, z: 39, w: 4, d: 4, h: 3, kind: 'crate' }, { x: -14, z: 36, w: 4, d: 4, h: 3, kind: 'crate', y0: 3 },
  { x: 40, z: 32, w: 4, d: 4, h: 3, kind: 'crate' }, { x: 44.4, z: 30, w: 3, d: 3, h: 2.2, kind: 'crate' },
  { x: -42, z: 42, w: 14, d: 5, h: 4.5, kind: 'machine' }, { x: 42, z: -38, w: 12, d: 5, h: 4.5, kind: 'machine' },
  { x: -8, z: 29, w: 9, d: 1.4, h: 1.2, kind: 'barrier' }, { x: 8, z: -29, w: 9, d: 1.4, h: 1.2, kind: 'barrier' },
  { x: 29, z: 8, w: 1.4, d: 9, h: 1.2, kind: 'barrier' }, { x: -29, z: -8, w: 1.4, d: 9, h: 1.2, kind: 'barrier' },
  { x: -26, z: -54, w: 3, d: 3, h: 2.4, kind: 'crate', deck: true }, { x: 8, z: -55, w: 3, d: 3, h: 2.4, kind: 'crate', deck: true },
  { x: -50, z: -38, w: 3, d: 3, h: 2.4, kind: 'crate' },
]
export const TEAM_SPAWNS = [0, 1, 2, 3, 4].map(i => { const a = i * 2 * Math.PI / 5; return { x: 46 * Math.sin(a), z: 46 * Math.cos(a), yaw: a + Math.PI } })
export const SPARE_SPOTS = [[0, -40, 0], [-50, 44, 2], [52, 40, 3.9], [50, -4, 1.57], [-52, -22, -1.57], [4, 20, 3]].map(([x, z, yaw]) => ({ x, z, yaw }))
export const PICKUP_SPOTS = [[9, 6], [-9, -6], [0, -53.5], [-46, -32], [48, 36], [-30, 52], [30, -50], [-22, 14], [24, -12], [-4, 56]].map(([x, z]) => ({ x, z }))

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
  if (z <= DECK.z1 && z >= DECK.z0) {
    if (x >= DECK.x0 && x <= DECK.x1) h = Math.max(h, DECK.h)
    else if (x > DECK.x1 && x < DECK.x1 + DECK.ramp) h = Math.max(h, DECK.h * (DECK.x1 + DECK.ramp - x) / DECK.ramp)
    else if (x < DECK.x0 && x > DECK.x0 - DECK.ramp) h = Math.max(h, DECK.h * (x - (DECK.x0 - DECK.ramp)) / DECK.ramp)
  }
  return h
}
// 障害物の足元の高さ（いちど計算）
for (const o of POLES) o.base = o.deck ? DECK.h : H(o.x, o.z)
for (const o of BOXES) { o.base = (o.y0 || 0) + (o.deck ? DECK.h : H(o.x, o.z)); o.top = o.base + o.h }
for (const o of POLES) o.top = o.base + o.h
export const OBST = { poles: POLES, boxes: BOXES }

// 円(cx,cz,cr, 足元cy)が障害物にめり込んでいるか。めり込んでいたら押し出し量を返す
export function pushOutCircle(x, y, z, r, hgt, out) {
  let hit = false
  for (const o of POLES) {
    if (y > o.top - 0.2 || y + hgt < o.base + 0.1) continue
    const dx = x - o.x, dz = z - o.z, rr = r + o.r, d2 = dx * dx + dz * dz
    if (d2 < rr * rr) { const d = Math.sqrt(d2) || 0.001; out.push([dx / d, dz / d, rr - d]); hit = true }
  }
  for (const o of BOXES) {
    if (y > o.top - 0.2 || y + hgt < o.base + 0.1) continue
    const hx = o.w / 2, hz = o.d / 2
    const qx = Math.max(o.x - hx, Math.min(x, o.x + hx)), qz = Math.max(o.z - hz, Math.min(z, o.z + hz))
    const dx = x - qx, dz = z - qz, d2 = dx * dx + dz * dz
    if (d2 < r * r) {
      if (d2 > 1e-8) { const d = Math.sqrt(d2); out.push([dx / d, dz / d, r - d]) }
      else { // 中心が箱の中: 一番近い辺から出す
        const ox = hx - Math.abs(x - o.x), oz = hz - Math.abs(z - o.z)
        if (ox < oz) out.push([Math.sign(x - o.x) || 1, 0, ox + r]); else out.push([0, Math.sign(z - o.z) || 1, oz + r])
      }
      hit = true
    }
  }
  return hit
}
// 点が障害物の中か（弾・見通し用）。y は点の高さ
export function solidAtPoint(x, y, z) {
  for (const o of POLES) { if (y < o.base || y > o.top) continue; const dx = x - o.x, dz = z - o.z; if (dx * dx + dz * dz < o.r * o.r) return o }
  for (const o of BOXES) { if (y < o.base || y > o.top) continue; if (Math.abs(x - o.x) < o.w / 2 && Math.abs(z - o.z) < o.d / 2) return o }
  return null
}
// 見通し: (ax,ay,az) から (bx,by,bz) まで障害物と地面で遮られないか
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

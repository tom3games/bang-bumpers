// 廃工場のアリーナ。形と高さの定義（sim と view の両方が読む。THREE にも DOM にも依存しない）
export const HALF = 60            // 工場の建屋は x,z = ±60
export const WORLD = 110          // 敷地ぜんぶ（外のヤードをふくむ）は x,z = ±110
export const BOWL = { x: 0, z: 0, r: 20, depth: 4.5 }
// 坂とジャンプ台: (x,z) が低い端、ang の向き(sin,cos)へ len だけ登って、その先は切り立った崖
export const RAMPS = [
  { x: -52, z: 18, ang: Math.PI / 2, len: 12, w: 8, h: 3.3 },
  { x: 52, z: -18, ang: -Math.PI / 2, len: 12, w: 8, h: 3.3 },
  { x: 18, z: 52, ang: Math.PI, len: 12, w: 8, h: 3.3 },
  { x: -6, z: -34, ang: 0, len: 12, w: 8, h: 3.3 },
  // 外のヤード: 外周路の直線に大きなジャンプ台
  { x: -26, z: -98, ang: Math.PI / 2, len: 14, w: 9, h: 5.4 }, { x: 26, z: 98, ang: -Math.PI / 2, len: 14, w: 9, h: 5.4 },
  { x: 98, z: -26, ang: 0, len: 14, w: 9, h: 5.4 }, { x: -98, z: 26, ang: Math.PI, len: 14, w: 9, h: 5.4 },
  { x: 74, z: 62, ang: Math.PI, len: 12, w: 8, h: 3.3 }, { x: -74, z: -62, ang: 0, len: 12, w: 8, h: 3.3 },
]
// 上の通路（北の壁沿い）。両端が坂
export const DECK = { x0: -40, x1: 40, z0: -60, z1: -47, h: 3.4, ramp: 14 }
// 柱（円）。top は十分高い。kind: core 中央の柱 / mast 照明塔 / crane クレーンの脚 / silo タンク
export const POLES = [
  { x: 0, z: 0, r: 2.4, h: 30, kind: 'core' },
  { x: 30, z: 30, r: 1.2, h: 30 }, { x: -30, z: 30, r: 1.2, h: 30 },
  { x: 38, z: -26, r: 1.2, h: 30 }, { x: -38, z: -26, r: 1.2, h: 30 },
  { x: 47, z: 4, r: 1.2, h: 30 }, { x: -47, z: -6, r: 1.2, h: 30 },
  { x: 8, z: 42, r: 1.2, h: 30 }, { x: -14, z: -46.2, r: 0.9, h: 30, deck: true }, { x: 20, z: -52, r: 0.9, h: 30, deck: true },
  // クレーン（北東）: 4本の脚。下を車が通れる
  { x: 72, z: -100, r: 1.3, h: 30, kind: 'crane' }, { x: 72, z: -74, r: 1.3, h: 30, kind: 'crane' }, { x: 106, z: -100, r: 1.3, h: 30, kind: 'crane' }, { x: 106, z: -74, r: 1.3, h: 30, kind: 'crane' },
  // タンク（西のヤード）
  { x: -86, z: -50, r: 6, h: 16, kind: 'silo' }, { x: -86, z: -34, r: 6, h: 16, kind: 'silo' }, { x: -90, z: 62, r: 5, h: 12, kind: 'silo' },
  // 照明塔
  ...[[-100, -100], [0, -104], [100, -100], [-104, 0], [104, 4], [-100, 100], [0, 104], [100, 100], [-72, -72], [72, 72], [-72, 72], [72, -52]].map(([x, z]) => ({ x, z, r: 0.5, h: 16, kind: 'mast' })),
]
// 箱（軸に沿った直方体）。h は高さ。kind: crate 木箱 / machine 機械 / barrier バリア / hwall 建屋の壁 / cont コンテナ
export const BOXES = [
  { x: -14, z: 36, w: 4, d: 4, h: 3, kind: 'crate' }, { x: -18.4, z: 39, w: 4, d: 4, h: 3, kind: 'crate' }, { x: -14, z: 36, w: 4, d: 4, h: 3, kind: 'crate', y0: 3 },
  { x: 40, z: 32, w: 4, d: 4, h: 3, kind: 'crate' }, { x: 44.4, z: 30, w: 3, d: 3, h: 2.2, kind: 'crate' },
  { x: -42, z: 42, w: 14, d: 5, h: 4.5, kind: 'machine' }, { x: 42, z: -38, w: 12, d: 5, h: 4.5, kind: 'machine' },
  { x: -8, z: 29, w: 9, d: 1.4, h: 1.2, kind: 'barrier' }, { x: 8, z: -29, w: 9, d: 1.4, h: 1.2, kind: 'barrier' },
  { x: 29, z: 8, w: 1.4, d: 9, h: 1.2, kind: 'barrier' }, { x: -29, z: -8, w: 1.4, d: 9, h: 1.2, kind: 'barrier' },
  { x: -26, z: -54, w: 3, d: 3, h: 2.4, kind: 'crate', deck: true }, { x: 8, z: -55, w: 3, d: 3, h: 2.4, kind: 'crate', deck: true },
  { x: -50, z: -38, w: 3, d: 3, h: 2.4, kind: 'crate' },
]
// 建屋の壁（厚さ2・高さ20）。出入口は 南=-32,0,32 / 東西=-30,0,30（幅14）。北は上の通路があるので壁のまま
const WT = 2, WHT = 20, DOORW = 14
const segs = (len0, len1, doors) => { const out = []; let p = len0; for (const d of doors) { out.push([p, d - DOORW / 2]); p = d + DOORW / 2 } out.push([p, len1]); return out }
export const DOORS = { S: [-32, 0, 32], E: [-30, 0, 30], W: [-30, 0, 30] }
BOXES.push({ x: 0, z: -HALF - 1, w: HALF * 2 + 4, d: WT, h: WHT, kind: 'hwall' })
for (const [a, b] of segs(-HALF - 2, HALF + 2, DOORS.S)) BOXES.push({ x: (a + b) / 2, z: HALF + 1, w: b - a, d: WT, h: WHT, kind: 'hwall' })
for (const [a, b] of segs(-HALF - 2, HALF + 2, DOORS.E)) BOXES.push({ x: HALF + 1, z: (a + b) / 2, w: WT, d: b - a, h: WHT, kind: 'hwall' })
for (const [a, b] of segs(-HALF - 2, HALF + 2, DOORS.W)) BOXES.push({ x: -HALF - 1, z: (a + b) / 2, w: WT, d: b - a, h: WHT, kind: 'hwall' })
// コンテナ（外のヤード）。12 x 2.6 x 2.6。色は種類ごと
export const CONT_COLORS = [0xb5442f, 0x2f5e9c, 0x3f7b4a, 0xc99a2a, 0x7a7e82, 0xd0cfc4, 0x8a3b6a]
{
  let n = 0
  const cont = (x, z, alongX, stack = 1) => { for (let k = 0; k < stack; k++) BOXES.push({ x, z, w: alongX ? 12 : 2.6, d: alongX ? 2.6 : 12, h: 2.6, y0: k * 2.6, kind: 'cont', color: CONT_COLORS[(n++ * 3 + (k * 2)) % CONT_COLORS.length] }) }
  // 東のヤード: 縦に2列。間は通れる
  for (let i = 0; i < 4; i++) { cont(80, -38 + i * 15, false, i % 2 ? 2 : 1); cont(91, -30 + i * 15, false, i === 1 ? 2 : 1) }
  // 西のヤード: 横向きの列
  for (let i = 0; i < 3; i++) { cont(-80, 8 + i * 4.2, true, i === 0 ? 2 : 1) }
  for (let i = 0; i < 3; i++) cont(-70, -10 - i * 15, false, i === 1 ? 2 : 1)
  // 南のヤード: 出入口の前は空ける
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { cont(sx * (24 + i * 15), 76, true, (i + (sx > 0 ? 1 : 0)) % 2 ? 2 : 1); cont(sx * (30 + i * 15), 88, true, 1) }
  // 北のヤード: 散らす
  for (const [x, z, ax, st] of [[-60, -80, true, 1], [-44, -84, false, 2], [-20, -78, true, 1], [10, -80, false, 1], [26, -84, true, 2], [48, -80, true, 1], [-52, -96, true, 1]]) cont(x, z, ax, st)
  // クレーンの下: 積み込み場
  for (const [x, z, ax, st] of [[84, -94, true, 1], [84, -88, true, 1], [96, -84, false, 2]]) cont(x, z, ax, st)
}
// 木箱・機械をヤードにも
for (const [x, z, w, d, h, k] of [[-62, 70, 4, 4, 3, 'crate'], [-66, 74, 4, 4, 3, 'crate'], [64, 40, 4, 4, 3, 'crate'], [66, -56, 5, 5, 3, 'crate'], [-70, 40, 14, 5, 4.5, 'machine'], [48, 86, 12, 5, 4.5, 'machine'], [-48, -88, 12, 5, 4.5, 'machine']]) BOXES.push({ x, z, w, d, h, kind: k })

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
// ドラム缶の固まりとタイヤの山（コンテナの脇・出入口のそば・角）。ぶつかれる
{
  const clusters = [[88, -50], [86, 28], [-84, 30], [-90, -70], [18, -70], [-24, -68], [92, 44], [-94, 60], [70, 100], [-100, -16], [100, 20]]
  let k = 0
  for (const [cx, cz] of clusters) for (let i = 0; i < 4; i++) { const a = i * 1.9 + k, r = i ? 1.15 : 0; POLES.push({ x: cx + Math.sin(a) * r, z: cz + Math.cos(a) * r, r: 0.55, h: 1.2, kind: 'barrel', col: [0xb23a2a, 0x2c5ea8, 0x3a7a4c, 0xc89a2a, 0x555a5e][(k + i) % 5] }); } k++
  for (const [x, z] of [[-84, -98], [84, -98], [-84, 98], [84, 98], [-100, 84], [100, -84], [100, 84], [-100, -84], [20, 104], [-20, -104]]) POLES.push({ x, z, r: 0.95, h: 1.6, kind: 'tires' })
}
for (const o of POLES) o.base = o.deck ? DECK.h : H(o.x, o.z)
for (const o of BOXES) { o.base = (o.y0 || 0) + (o.deck ? DECK.h : H(o.x, o.z)); o.top = o.base + o.h }
for (const o of POLES) o.top = o.base + o.h
export const OBST = { poles: POLES, boxes: BOXES }

// ---- 格子（10m）。障害物ごとに近くの升目へ登録し、当たりと見通しはその升目だけ調べる
const CELL = 10, NC = Math.ceil(WORLD * 2 / CELL) + 1
const cellPoles = Array.from({ length: NC * NC }, () => []), cellBoxes = Array.from({ length: NC * NC }, () => [])
const ci = v => Math.max(0, Math.min(NC - 1, Math.floor((v + WORLD) / CELL)))
for (const o of POLES) { const m = o.r + 3; for (let i = ci(o.x - m); i <= ci(o.x + m); i++) for (let j = ci(o.z - m); j <= ci(o.z + m); j++) cellPoles[j * NC + i].push(o) }
for (const o of BOXES) { const mx = o.w / 2 + 3, mz = o.d / 2 + 3; for (let i = ci(o.x - mx); i <= ci(o.x + mx); i++) for (let j = ci(o.z - mz); j <= ci(o.z + mz); j++) cellBoxes[j * NC + i].push(o) }

// 円(x,z,r, 足元y, 高さhgt)が障害物にめり込んでいるか。めり込んでいたら押し出し量を out に足す
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
// 点が障害物の中か（弾・見通し用）。y は点の高さ
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
// 空いている場所を探す（車なら r=3.2 くらい）
export function freeSpot(x, z, r = 3.2) {
  const out = []
  for (let d = 0; d < 40; d += 2) for (let k = 0; k < (d ? 12 : 1); k++) {
    const a = k / 12 * 6.283, px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d
    if (Math.abs(px) > WORLD - 6 || Math.abs(pz) > WORLD - 6) continue
    out.length = 0; const y = H(px, pz)
    if (!pushOutCircle(px, y, pz, r, 2, out) && H(px + 4, pz) - y < 0.3 && H(px - 4, pz) - y < 0.3 && H(px, pz + 4) - y < 0.3 && H(px, pz - 4) - y < 0.3 && Math.abs(H(px + 4, pz) - y) < 0.3 && Math.abs(H(px, pz + 4) - y) < 0.3) return { x: px, z: pz }
  }
  return { x, z }
}
// 出発地点: 外のヤードの輪に5チーム。空き車と拾い物は建屋の中と外にばらまく
export const TEAM_SPAWNS = [0, 1, 2, 3, 4].map(i => { const a = i * 2 * Math.PI / 5; const p = freeSpot(86 * Math.sin(a), 86 * Math.cos(a), 4.5); return { x: p.x, z: p.z, yaw: Math.atan2(-p.x, -p.z) } })
export const SPARE_SPOTS = [[0, -40, 0], [-50, 44, 2], [52, 40, 3.9], [50, -4, 1.57], [-52, -22, -1.57], [4, 20, 3],
  [-100, 70, 1], [-60, 98, 0], [60, 98, 3], [100, 60, 2], [100, -50, 1.57], [60, -100, 0], [-60, -104, 3.14], [-100, -60, 1.57], [0, -88, 0], [88, 0, 4.7], [-88, 8, 1.6], [-30, 94, 3.14]].map(([x, z, yaw]) => { const p = freeSpot(x, z, 3.6); return { x: p.x, z: p.z, yaw } })
for (const s of SPARE_SPOTS) for (const t of TEAM_SPAWNS) if (Math.hypot(s.x - t.x, s.z - t.z) < 16) { const p = freeSpot(s.x * 0.85, s.z * 0.85, 3.6); s.x = p.x; s.z = p.z }
export const PICKUP_SPOTS = [[9, 6], [-9, -6], [0, -53.5], [-46, -32], [48, 36], [-30, 52], [30, -50], [-22, 14], [24, -12], [-4, 56],
  [0, 70], [-45, 80], [45, 80], [75, 20], [75, -20], [-75, 20], [-75, -40], [-40, -70], [40, -70], [90, -62], [-90, 90], [90, 90], [-90, -90], [0, -96], [0, 96], [96, 0], [-96, 0], [60, -15], [-60, 12], [-18, 66]].map(([x, z]) => { const p = freeSpot(x, z, 2.4); return { x: p.x, z: p.z } })

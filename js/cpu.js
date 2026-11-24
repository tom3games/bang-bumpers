// CPU の頭。運転役・射手役・歩きを別々に作り、makeInputs で人の入力と混ぜて チームごとの入力 にする。
// 状態(S)は読むだけ。サーバーに移しても同じ関数がそのまま動く。
import { H, HALF, pushOutCircle, lineClear, clamp } from './arena.js'
import { angDiff, enemiesOf, circles, WEAPONS, specialWeapon, CAR_R } from './sim.js'

const MEM = new WeakMap()
const mem = t => { let m = MEM.get(t); if (!m) { m = { stuckT: 0, revT: 0, lx: 0, lz: 0, lt: 0, tgt: -1, tgtT: 0, gtgt: -1, gT: 0, noise: 0, burst: 0, rest: 0.5, aim: null, side: 1, seed: t.id * 7.13 + 1, walkStuck: 0, wlx: 0, wlz: 0, wt: 0, wside: 1, dropT: 3 + t.id }; MEM.set(t, m) } return m }
export const STYLE = ['flank', 'rammer', 'circler', 'rammer', 'circler']

function blocked(S, x, z, y, self) {
  if (Math.abs(x) > HALF - 2.2 || Math.abs(z) > HALF - 2.2) return true
  if (H(x, z) - y > 0.5) return true
  const out = []
  if (pushOutCircle(x, y, z, CAR_R + 0.35, 1.6, out)) return true
  for (const c of S.cars) { if (c === self || c.alive) continue; if (Math.hypot(c.x - x, c.z - z) < 2.8 && Math.abs(c.y - y) < 1.5) return true }
  return false
}
// ある向きに進んで、どこまで空いているか
function freeDist(S, c, ang, maxL) {
  const sx = Math.sin(ang), sz = Math.cos(ang)
  for (let d = 2.5; d <= maxL; d += 2.5) if (blocked(S, c.x + sx * d, c.z + sz * d, c.y, c)) return d - 2.5
  return maxL
}

function pickTarget(S, t, c, m, dt, humanGunAim) {
  m.tgtT -= dt
  const en = enemiesOf(S, t.id)
  if (!en.length) { m.tgt = -1; return null }
  let cur = en.find(e => e.id === m.tgt)
  if (!cur || m.tgtT <= 0) {
    m.tgtT = 1.2 + (m.seed % 1)
    let best = null, bs = 1e9
    for (const e of en) {
      const d = Math.hypot(e.x - c.x, e.z - c.z)
      let s = d - (e.hp < 40 ? 14 : 0) - (e.id === m.tgt ? 10 : 0) + (e.team === m.avoid ? 25 : 0)
      if (humanGunAim != null) { const a = Math.abs(angDiff(Math.atan2(e.x - c.x, e.z - c.z), humanGunAim)); s += a * 25 }
      if (s < bs) { bs = s; best = e }
    }
    cur = best; m.tgt = best ? best.id : -1
  }
  return cur
}

export function cpuDrive(S, t, c, dt, humanGunAim = null) {
  const m = mem(t), style = humanGunAim != null ? 'flank' : STYLE[t.id]
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), sp = c.vx * fx + c.vz * fz
  // 詰まり検知
  m.lt += dt
  if (m.lt > 1.2) { const moved = Math.hypot(c.x - m.lx, c.z - m.lz); if (moved < 0.9 && !c.air && m.revT <= 0 && S.phase === 'play') { m.revT = 1.1; m.side = -m.side } m.lx = c.x; m.lz = c.z; m.lt = 0 }
  if (m.revT > 0) { m.revT -= dt; return { throttle: -1, steer: m.side * 0.9, boost: false } }
  const tg = pickTarget(S, t, c, m, dt, humanGunAim)
  let gx = 0, gz = 0, mode = 'idle', want = 1, boost = false
  // 拾い物
  let pk = null
  if (!tg || Math.hypot(tg.x - c.x, tg.z - c.z) > 16 || c.hp < 50) {
    let bd = 1e9
    for (const p of S.pickups) {
      if (p.t > 0) continue
      const d = Math.hypot(p.x - c.x, p.z - c.z)
      const need = c.hp < 55 ? (p.type === 'repair' ? 1 : 0.35) : (t.item ? (p.type === 'repair' && c.hp < 85 ? 0.8 : 0) : 1)
      if (need <= 0 || d > (need >= 1 ? 52 : 26)) continue
      if (d / need < bd) { bd = d / need; pk = p }
    }
  }
  if (pk && (c.hp < 50 || !tg || Math.hypot(tg.x - c.x, tg.z - c.z) > 22)) { gx = pk.x; gz = pk.z; mode = 'pick' }
  else if (tg) {
    const dx = tg.x - c.x, dz = tg.z - c.z, d = Math.hypot(dx, dz)
    if (c.hp < 28 && d < 30) { // 逃げる
      const a = Math.atan2(-dx, -dz); gx = c.x + Math.sin(a) * 30; gz = c.z + Math.cos(a) * 30; mode = 'flee'; boost = true
    } else if (style === 'rammer') {
      const lead = Math.min(1.2, d / 25); gx = tg.x + tg.vx * lead; gz = tg.z + tg.vz * lead; mode = 'ram'; boost = d > 18
    } else if (style === 'circler') {
      const ph = Math.atan2(c.x - tg.x, c.z - tg.z) + 0.75 * m.side, R = 14
      gx = tg.x + Math.sin(ph) * R; gz = tg.z + Math.cos(ph) * R; mode = 'circle'
      if (d < 8) { gx = tg.x; gz = tg.z; mode = 'ram' }
    } else { // flank: 敵の後ろ・横に回り込んで射手に撃たせる
      const tfx = Math.sin(tg.yaw), tfz = Math.cos(tg.yaw), tsp = tg.vx * tfx + tg.vz * tfz
      const sd = m.side
      gx = tg.x - tfx * 9 + tfz * 4.5 * sd; gz = tg.z - tfz * 9 - tfx * 4.5 * sd; mode = 'flank'
      if (d < 12) { want = clamp((tsp + (d - 9) * 0.9) / 16, 0.25, 1) }
      boost = d > 28
    }
  } else { gx = 0; gz = 0; mode = 'idle'; want = 0.6 }
  let goal = Math.atan2(gx - c.x, gz - c.z)
  // よける: 目標の向きから左右にずらして一番近い空いた向き
  const L = 6 + Math.max(0, sp) * 0.5
  let ang = goal
  const cands = [0, 0.35, -0.35, 0.7, -0.7, 1.1, -1.1, 1.6, -1.6]
  let found = false, bestFree = -1, bestAng = goal
  for (const off of cands) {
    const a = goal + off, fd = freeDist(S, c, a, L)
    if (fd >= L - 0.1) { ang = a; found = true; break }
    if (fd > bestFree) { bestFree = fd; bestAng = a }
  }
  if (!found) { ang = bestAng; want = Math.min(want, 0.5) }
  const cur = freeDist(S, c, c.yaw, L)
  const diff = angDiff(ang, c.yaw)
  let steer = clamp(-diff * 2.0, -1, 1), thr = want
  if (Math.abs(diff) > 1.2 && sp > 9) thr = 0
  if (cur < 7 && sp > 11) thr = -1
  else if (cur < 12 && sp > 16) thr = 0
  if (!found && bestFree < 3 && sp < 3) { m.revT = 0.9; m.side = -m.side }
  if (Math.abs(diff) > 2.4 && sp < 3) { thr = -0.6; steer = -steer }
  if (c.oilT > 0) { thr = Math.min(thr, 0.4) }
  return { throttle: thr, steer, boost: boost && Math.abs(diff) < 0.35 && c.boost > 0.5 && cur > 12 }
}

// 射手: 見える敵を選び、先読みして追う。人の速さの遅れとぶれを入れる
export function cpuGun(S, t, c, dt) {
  const m = mem(t)
  m.gT -= dt
  let tgt = null
  const my = c.y + 2.15
  if (m.gT <= 0) {
    m.gT = 0.25 + (m.seed % 0.2)
    let best = null, bs = 1e9
    for (const e of S.cars) {
      if (!e.alive || e.team === t.id || e.team < 0) continue
      const d = Math.hypot(e.x - c.x, e.z - c.z); if (d > 52) continue
      if (!lineClear(c.x, my, c.z, e.x, e.y + 1.1, e.z)) continue
      const sc = d - (e.hp < 40 ? 10 : 0) - (e.id === m.gtgt ? 8 : 0)
      if (sc < bs) { bs = sc; best = { kind: 'car', id: e.id } }
    }
    if (!best) for (const p of S.people) {
      if (p.state !== 'walk' || p.team === t.id || p.invT > 0) continue
      const d = Math.hypot(p.x - c.x, p.z - c.z); if (d > 40 || !lineClear(c.x, my, c.z, p.x, p.y + 1, p.z)) continue
      if (d < bs) { bs = d; best = { kind: 'p', t: p.team, i: p.idx } }
    }
    m.gt = best; m.gtgt = best && best.kind === 'car' ? best.id : -1
  }
  const g = m.gt
  let tx = null, tz = null, dist = 99
  if (g) {
    if (g.kind === 'car') { const e = S.cars.find(q => q.id === g.id); if (e && e.alive) { dist = Math.hypot(e.x - c.x, e.z - c.z); const lead = dist / WEAPONS.paint.speed; tx = e.x + e.vx * lead * 0.9; tz = e.z + e.vz * lead * 0.9 } }
    else { const p = S.teams[g.t].p[g.i]; if (p.state === 'walk') { dist = Math.hypot(p.x - c.x, p.z - c.z); tx = p.x + p.vx * 0.1; tz = p.z + p.vz * 0.1 } }
  }
  m.noise += (Math.sin(S.t * 2.1 + m.seed) * 0.5 + (S.rng() - 0.5) * 2 - m.noise) * Math.min(1, 3 * dt)
  const want = tx != null ? Math.atan2(tx - c.x, tz - c.z) + m.noise * (0.025 + dist * 0.0012) : c.yaw + Math.sin(S.t * 0.7 + m.seed) * 1.4
  const dv = angDiff(want, c.gunYaw), rate = 2.8
  const aim = c.gunYaw + clamp(dv, -rate * dt, rate * dt)
  // 撃つ: 一定の長さで撃って休む（熱くしない）
  m.burst -= dt
  let fire = false
  const sp = specialWeapon(t)
  if (tx != null && Math.abs(angDiff(want, aim)) < 0.08 + 1.5 / Math.max(8, dist) * 0.5 && dist < 50) {
    if (m.burst > 0) fire = true
    else if (m.burst < -m.rest) { m.burst = 0.7 + S.rng() * 0.9; m.rest = 0.25 + S.rng() * 0.5 }
    if (sp && sp.type === 'rocket' && dist < 9) fire = false
    if (sp && sp.type === 'confetti' && dist > 24) fire = false
    if (c.heat > 0.8) fire = false
  }
  // アイテム: 敵が近くにいる時に地雷とオイルを落とす
  m.dropT -= dt
  let use = false
  if (t.item && (t.item.type === 'mine' || t.item.type === 'oil') && m.dropT <= 0) {
    const near = enemiesOf(S, t.id).some(e => Math.hypot(e.x - c.x, e.z - c.z) < 20)
    if (near) { use = true; m.dropT = 7 + S.rng() * 5 } else m.dropT = 1
  }
  return { aim, fire, reload: c.mag < 6 && !fire, use }
}

export function cpuWalk(S, t, dt) {
  const m = mem(t), p0 = t.p[0].state === 'walk' ? t.p[0] : t.p[1]
  if (p0.state !== 'walk') return { walkX: 0, walkZ: 0 }
  let best = null, bd = 1e9
  for (const c of S.cars) { if (!c.alive || c.team >= 0) continue; const d = Math.hypot(c.x - p0.x, c.z - p0.z); if (d < bd) { bd = d; best = c } }
  if (!best) return { walkX: 0, walkZ: 0 }
  // 詰まり
  m.wt += dt
  if (m.wt > 1) { if (Math.hypot(p0.x - m.wlx, p0.z - m.wlz) < 1.2) { m.walkStuck = 1.4; m.wside = -m.wside } m.wlx = p0.x; m.wlz = p0.z; m.wt = 0 }
  let ang = Math.atan2(best.x - p0.x, best.z - p0.z)
  if (m.walkStuck > 0) { m.walkStuck -= dt; ang += 1.5 * m.wside }
  else {
    const probe = (a) => { for (let d = 1.5; d <= 4.5; d += 1.5) { const out = []; if (pushOutCircle(p0.x + Math.sin(a) * d, p0.y, p0.z + Math.cos(a) * d, 0.7, 1.8, out) || H(p0.x + Math.sin(a) * d, p0.z + Math.cos(a) * d) - p0.y > 0.7) return false } return true }
    for (const off of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6]) if (probe(ang + off)) { ang += off; break }
  }
  return { walkX: Math.sin(ang), walkZ: Math.cos(ang) }
}

// 人の入力 human = { drive:{throttle,steer,boost}, gun:{aim,fire,reload,assist}, use, swap, walkX, walkZ } と混ぜる
export function makeInputs(S, dt, human) {
  const out = {}
  for (const t of S.teams) {
    if (t.out) continue
    const isH = t.id === S.humanTeam && human
    const c = t.car >= 0 ? S.cars.find(q => q.id === t.car) : null
    const o = {}
    if (t.walking || !c || !c.alive) {
      Object.assign(o, isH ? { walkX: human.walkX || 0, walkZ: human.walkZ || 0 } : cpuWalk(S, t, dt))
      out[t.id] = o; continue
    }
    const humanDrives = isH && t.driver === 0, humanGuns = isH && t.driver === 1
    const dr = humanDrives ? human.drive : cpuDrive(S, t, c, dt, humanGuns ? c.gunYaw : null)
    const gn = humanGuns ? human.gun : cpuGun(S, t, c, dt)
    Object.assign(o, { throttle: dr.throttle, steer: dr.steer, boost: dr.boost, aim: gn.aim, fire: gn.fire, reload: gn.reload, assist: gn.assist, use: !!(gn.use || (isH && human.use)), swap: !!(isH && human.swap) })
    out[t.id] = o
  }
  return out
}

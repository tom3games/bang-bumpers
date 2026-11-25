// CPU の頭。運転役・射手役・歩きを別々に作り、makeInputs で人の入力と混ぜて チームごとの入力 にする。
// 状態(S)は読むだけ。サーバーに移しても同じ関数がそのまま動く。
import { H, WORLD, POLES, pushOutCircle, lineClear, clamp } from './arena.js?v=13'
import { angDiff, enemiesOf, circles, WEAPONS, CAR_R, smokeBlocks } from './sim.js?v=13'

const MEM = new WeakMap()
const mem = t => { let m = MEM.get(t); if (!m) { m = { stuckT: 0, revT: 0, lx: 0, lz: 0, lt: 0, tgt: -1, tgtT: 0, gtgt: -1, gT: 0, noise: 0, burst: 0, rest: 0.5, aim: null, side: 1, seed: t.id * 7.13 + 1, walkStuck: 0, wlx: 0, wlz: 0, wt: 0, wside: 1, dropT: 3 + t.id }; MEM.set(t, m) } return m }
export const STYLE = ['flank', 'rammer', 'circler', 'rammer', 'circler', 'flank']

function blocked(S, x, z, y, self) {
  if (x * x + z * z > (WORLD - 3) * (WORLD - 3)) return true
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
  if (c.flashT > 0.05) return { throttle: 0.75, steer: 0, boost: false }   // 目がくらんでいる間は、ただまっすぐ走る
  const m = mem(t), style = humanGunAim != null ? 'flank' : STYLE[t.id]
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), sp = c.vx * fx + c.vz * fz
  // 詰まり検知
  m.lt += dt
  if (m.lt > 1.2) { const moved = Math.hypot(c.x - m.lx, c.z - m.lz); if (moved < 0.9 && !c.air && m.revT <= 0 && S.phase === 'play') { m.revT = 1.1; m.side = -m.side; m.stuckN = (S.t - (m.stuckAt || -99) < 9 ? (m.stuckN || 0) + 1 : 1); m.stuckAt = S.t; if (m.stuckN >= 3) m.unstick = true
      if (m.stuckN >= 2) { let bestA = 0, bestD = -1; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283, fd = freeDist(S, c, a, 40); if (fd > bestD + S.rng() * 3) { bestD = fd; bestA = a } } m.wander = { x: c.x + Math.sin(bestA) * 35, z: c.z + Math.cos(bestA) * 35, until: S.t + 6 } } } m.lx = c.x; m.lz = c.z; m.lt = 0 }
  if (m.revT > 0) { m.revT -= dt; const un = !!m.unstick; m.unstick = false; return { throttle: -1, steer: m.side * 0.9, boost: false, unstick: un } }
  const tg = pickTarget(S, t, c, m, dt, humanGunAim)
  let gx = 0, gz = 0, mode = 'idle', want = 1, boost = false
  const wandering = m.wander && S.t < m.wander.until
  // 拾い物
  let pk = null
  if (!tg || Math.hypot(tg.x - c.x, tg.z - c.z) > 24 || c.hp < 50) {
    let bd = 1e9
    for (const p of S.pickups) {
      if (p.t > 0) continue
      const d = Math.hypot(p.x - c.x, p.z - c.z)
      const slotFull = p.type === 'repair' ? false : (['turbo', 'spear', 'oil', 'mine'].includes(p.type) ? t.iD : t.iG)
      const need = c.hp < 55 ? (p.type === 'repair' ? 1 : 0.35) : (p.type === 'repair' ? (c.hp < 85 ? 0.8 : 0) : (slotFull ? 0 : 1))
      if (need <= 0 || d > (need >= 1 ? 95 : 45)) continue
      if (d / need < bd) { bd = d / need; pk = p }
    }
  }
  if (wandering) { gx = m.wander.x; gz = m.wander.z; mode = 'wander' }
  else if (pk && (c.hp < 50 || !tg || Math.hypot(tg.x - c.x, tg.z - c.z) > 34)) { gx = pk.x; gz = pk.z; mode = 'pick' }
  else if (tg) {
    const dx = tg.x - c.x, dz = tg.z - c.z, d = Math.hypot(dx, dz)
    if (c.hp < 28 && d < 40) { // 逃げる
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
  // 役のアイテム（運転）
  m.useT = (m.useT ?? 2) - dt
  let useD = false
  if (t.iD && m.useT <= 0) {
    const it = t.iD.type, en = enemiesOf(S, t.id)
    let behind = false, dnear = 999; for (const e of en) { const d = Math.hypot(e.x - c.x, e.z - c.z); dnear = Math.min(dnear, d); const lx = (e.x - c.x) * fx + (e.z - c.z) * fz; if (lx < -2 && d < 22) behind = true }
    if (it === 'turbo' && ((mode === 'ram' || mode === 'flank') && tg && Math.hypot(tg.x - c.x, tg.z - c.z) > 30 || mode === 'flee') && Math.abs(diff) < 0.4) useD = true
    else if (it === 'spear' && tg && mode === 'ram' && Math.hypot(tg.x - c.x, tg.z - c.z) < 26 && Math.abs(diff) < 0.3) useD = true
    else if ((it === 'oil' || it === 'mine') && behind) useD = true
    m.useT = useD ? 4 : 0.8
  }
  const unstick = !!m.unstick; m.unstick = false
  return { throttle: thr, steer, boost: boost && Math.abs(diff) < 0.35 && c.boost > 0.5 && cur > 12, useD, unstick }
}

// 射手: 見える敵を選び、先読みして追う。人の速さの遅れとぶれを入れる。距離で銃を持ち替え、役のアイテムも使う
function chooseWeapon(t, dist) {
  let best = t.wSel, bs = -1
  t.ws.forEach((w, i) => {
    const W = WEAPONS[w.id]; let s = 0.5
    if (w.mag <= 0 || w.reloadT > 0) s = -1
    else if (w.id === 'rocket') s = dist > 14 && dist < 62 ? 3 : 0.6
    else if (w.id === 'confetti') s = dist < 19 ? 3 : 0.3
    else if (w.id === 'cork') s = dist > 26 ? 2.6 : 1
    else if (w.id === 'spring') s = dist > 8 && dist < 36 ? 2 : 0.8
    else s = 1.6 + (w.heat < 0.6 ? 0.5 : -0.5)
    if (i === t.wSel) s += 0.7
    void W
    if (s > bs) { bs = s; best = i }
  })
  return best
}
export function cpuGun(S, t, c, dt) {
  const m = mem(t)
  m.gT -= dt
  const my = c.y + 2.15
  if (m.gT <= 0) {
    m.gT = 0.25 + (m.seed % 0.2)
    let best = null, bs = 1e9
    for (const e of S.cars) {
      if (!e.alive || e.team === t.id || e.team < 0) continue
      const d = Math.hypot(e.x - c.x, e.z - c.z); if (d > 72) continue
      if (!lineClear(c.x, my, c.z, e.x, e.y + 1.1, e.z) || smokeBlocks(S, c.x, c.z, e.x, e.z)) continue
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
  const blind = c.flashT > 0.05 ? (S.rng() - 0.5) * 0.9 : 0
  const want = tx != null ? Math.atan2(tx - c.x, tz - c.z) + blind + m.noise * (0.025 + dist * 0.0012) : c.yaw + Math.sin(S.t * 0.7 + m.seed) * 1.4
  const dv = angDiff(want, c.gunYaw), rate = 2.8
  const aim = c.gunYaw + clamp(dv, -rate * dt, rate * dt)
  const wsel = tx != null ? chooseWeapon(t, dist) : t.wSel
  const w = t.ws[wsel], W = WEAPONS[w.id]
  m.burst -= dt
  let fire = false
  const range = w.id === 'confetti' ? 20 : w.id === 'spring' ? 36 : w.id === 'rocket' ? 62 : w.id === 'cork' ? 72 : 62
  if (wsel === t.wSel && tx != null && Math.abs(angDiff(want, aim)) < 0.08 + 1.5 / Math.max(8, dist) * 0.5 && dist < range && !(w.id === 'rocket' && dist < 9)) {
    if (w.id !== 'paint') fire = true
    else if (m.burst > 0) fire = true
    else if (m.burst < -m.rest) { m.burst = 0.7 + S.rng() * 0.9; m.rest = 0.25 + S.rng() * 0.5 }
    if (w.id === 'paint' && w.heat > 0.8) fire = false
  }
  // 役のアイテム（射手）
  m.dropT -= dt
  let useG = false
  if (t.iG && m.dropT <= 0) {
    const it = t.iG.type, en = enemiesOf(S, t.id), near = en.reduce((d, e) => Math.min(d, Math.hypot(e.x - c.x, e.z - c.z)), 999)
    if (it === 'grenade' && tx != null && dist > 8 && dist < 32) useG = true
    else if (it === 'flash' && tx != null && dist > 7 && dist < 24) useG = true
    else if (it === 'smoke' && (c.hp < 45 && near < 38)) useG = true
    else if (it === 'ricochet' && near < 46) useG = true
    else if (it === 'turret' && near < 38) useG = true
    if (useG) m.dropT = it === 'grenade' ? 1.4 : 6 + S.rng() * 4; else m.dropT = 0.6
  }
  return { aim, fire, reload: w.mag < W.mag * 0.25 && !fire, useG, wsel }
}

// 歩いている間（再スタートまで）: 一番近い敵の車から逃げる。敵が遠ければ、柱のかげへ寄る
export function cpuWalk(S, t, dt) {
  const m = mem(t), p0 = t.p[0].state === 'walk' ? t.p[0] : t.p[1]
  if (p0.state !== 'walk') return { walkX: 0, walkZ: 0 }
  let near = null, bd = 1e9
  for (const c of S.cars) { if (!c.alive || c.team === t.id || c.team < 0) continue; const d = Math.hypot(c.x - p0.x, c.z - p0.z); if (d < bd) { bd = d; near = c } }
  // 詰まり
  m.wt += dt
  if (m.wt > 1) { if (Math.hypot(p0.x - m.wlx, p0.z - m.wlz) < 1.2) { m.walkStuck = 1.4; m.wside = -m.wside } m.wlx = p0.x; m.wlz = p0.z; m.wt = 0 }
  let ang
  if (near && bd < 45) {
    ang = Math.atan2(p0.x - near.x, p0.z - near.z)                      // 敵から離れる向き
    ang += m.wside * Math.min(0.9, Math.max(0, (22 - bd) / 22) * 0.9)  // 近いほど横へ振って、まっすぐ轢かれない
  } else {
    let bp = null, pd = 1e9
    for (const o of POLES) { if (o.kind !== 'pillar' || o.top - o.base < 3) continue; const d = Math.hypot(o.x - p0.x, o.z - p0.z); if (d < pd) { pd = d; bp = o } }
    ang = bp && pd > 3.5 ? Math.atan2(bp.x - p0.x, bp.z - p0.z) : p0.yaw + Math.sin(S.t * 1.3 + m.seed) * 0.8
  }
  if (m.walkStuck > 0) { m.walkStuck -= dt; ang += 1.5 * m.wside }
  else {
    const probe = (a) => { for (let d = 1.5; d <= 4.5; d += 1.5) { const out = []; const x = p0.x + Math.sin(a) * d, z = p0.z + Math.cos(a) * d; if (pushOutCircle(x, p0.y, z, 0.7, 1.8, out) || H(x, z) - p0.y > 0.7 || x * x + z * z > (WORLD - 3) * (WORLD - 3)) return false } return true }
    for (const off of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.4]) if (probe(ang + off)) { ang += off; break }
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
    Object.assign(o, { throttle: dr.throttle, steer: dr.steer, boost: dr.boost, hb: !!dr.hb, unstick: !!dr.unstick, aim: gn.aim, fire: gn.fire, reload: gn.reload, assist: gn.assist, aimPitch: gn.aimPitch, wsel: gn.wsel, wswap: !!(humanGuns && human.wswap), useD: humanDrives ? !!human.use : !!dr.useD, useG: humanGuns ? !!human.use : !!gn.useG, swap: !!(isH && human.swap) })
    out[t.id] = o
  }
  return out
}

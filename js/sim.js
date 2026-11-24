// 試合の中身（状態と進め方）。THREE にも DOM にも依存しない。入力は チームごとに
//   { throttle, steer, boost, aim, fire, reload, use, swap, walkX, walkZ }
// の形で渡す（運転役が throttle/steer/boost、射手役が aim/fire/reload/use、歩きは walkX/walkZ）。
// サーバーに移す時は、この step(S, inputs, dt) をそのまま動かして、events を配るだけでよい。
import { H, HALF, TEAM_SPAWNS, SPARE_SPOTS, PICKUP_SPOTS, pushOutCircle, solidAtPoint, lineClear, clamp } from './arena.js'

export const DT = 1 / 60
export const G = 24
export const MATCH_SEC = 210
export const COUNTDOWN = 3.2
export const STOCK = 3
export const TEAM_NAMES = ['あか', 'あお', 'きいろ', 'みどり', 'もも']
export const TEAM_COLORS = [0xe8452e, 0x2f78e6, 0xf2c230, 0x38b25a, 0xe05cb4]
export const CAR_R = 1.15, CAR_OFF = 0.95, CAR_H = 1.7
export const MAXF = 21, MAXR = 8, BOOST_MAXF = 31
export const WEAPONS = {
  paint: { name: 'ペイント弾', speed: 58, dmg: 2.6, life: 1.3, cd: 0.105, mag: 36, reload: 1.7 },
  confetti: { name: '紙吹雪', speed: 44, dmg: 3.1, life: 0.5, n: 9, spread: 0.17 },
  rocket: { name: '花火ロケット', speed: 30, dmg: 34, r: 7.5, life: 2.6 },
}
export const ITEM_AMMO = { rocket: 3, confetti: 5, mine: 2, oil: 2 }
export const ITEM_NAMES = { rocket: 'ロケット', confetti: '散弾', mine: '地雷', oil: 'オイル', repair: '修理' }

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }

let UID = 1
function newCar(S, x, z, yaw, team) {
  const c = {
    id: UID++, team, x, z, y: H(x, z), yaw, vx: 0, vz: 0, vy: 0, steer: 0, pitch: 0, roll: 0, air: false,
    hp: 100, alive: true, wreckT: 0, boost: 1, boostLock: false, gunYaw: yaw, mag: WEAPONS.paint.mag, heat: 0, overT: 0, fireCd: 0, reloadT: 0,
    lastHit: null, oilT: 0, invT: 0, spin: 0, speedKmh: 0, dmgFlash: 0, spot: -1, wreckV: [0, 0],
  }
  c.px = c.x; c.py = c.y; c.pz = c.z; c.pyaw = c.yaw; c.pgun = c.gunYaw; c.ppitch = 0; c.proll = 0
  S.cars.push(c); return c
}
function newPerson(t, idx) { return { team: t, idx, state: 'ride', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, px: 0, py: 0, pz: 0, walkT: 0, invT: 0 } }

export function createState(seed = 1, opts = {}) {
  const S = {
    seed, rng: mulberry(seed), t: 0, tMatch: 0, T: opts.matchSec || MATCH_SEC, cd: opts.noCountdown ? 0 : COUNTDOWN, over: false, overT: 0, phase: opts.noCountdown ? 'play' : 'count', winner: -1,
    teams: [], cars: [], people: [], bullets: [], mines: [], oils: [], pickups: [], respawns: [], events: [], humanTeam: opts.humanTeam ?? 0, ranking: [], outCount: 0, wrecks: 0,
  }
  for (let i = 0; i < 5; i++) {
    const sp = TEAM_SPAWNS[i], car = newCar(S, sp.x, sp.z, sp.yaw, i); car.invT = 1
    const tm = { id: i, name: TEAM_NAMES[i], color: TEAM_COLORS[i], stock: STOCK, kills: 0, out: false, outT: 0, car: car.id, driver: 0, item: null, swapReq: false, swapT: 0, footHp: 0, footLast: null, walking: false, stats: { shots: 0, hits: 0, rams: 0, pick: 0 }, p: [newPerson(i, 0), newPerson(i, 1)] }
    S.teams.push(tm); S.people.push(tm.p[0], tm.p[1])
  }
  SPARE_SPOTS.forEach((sp, i) => { const c = newCar(S, sp.x, sp.z, sp.yaw, -1); c.spot = i; c.hp = 100 })
  PICKUP_SPOTS.forEach((sp, i) => S.pickups.push({ x: sp.x, z: sp.z, type: pickType(S), t: 0, id: i }))
  return S
}
const PICK_W = [['rocket', 3], ['confetti', 3], ['mine', 2], ['oil', 2], ['repair', 3]]
function pickType(S) { let r = S.rng() * 13, a = 0; for (const [k, w] of PICK_W) { a += w; if (r < a) return k } return 'repair' }
export const carById = (S, id) => S.cars.find(c => c.id === id)
export const teamCar = (S, t) => t.car >= 0 ? carById(S, t.car) : null
export const ev = (S, o) => S.events.push(o)
const fwd = c => [Math.sin(c.yaw), Math.cos(c.yaw)]
export function circles(c) { const s = Math.sin(c.yaw), co = Math.cos(c.yaw); return [[c.x + s * CAR_OFF, c.z + co * CAR_OFF], [c.x - s * CAR_OFF, c.z - co * CAR_OFF]] }
export function driverIdx(t) { return t.driver }
export function gunnerIdx(t) { return 1 - t.driver }

// ---------------------------------------------------------------- 1 ステップ
export function step(S, inputs, dt = DT) {
  S.t += dt
  for (const c of S.cars) { c.px = c.x; c.py = c.y; c.pz = c.z; c.pyaw = c.yaw; c.pgun = c.gunYaw; c.ppitch = c.pitch; c.proll = c.roll }
  for (const p of S.people) { p.px = p.x; p.py = p.y; p.pz = p.z }
  if (S.cd > 0) { S.cd -= dt; if (S.cd <= 0) { S.phase = 'play'; ev(S, { k: 'go' }) } else { const n = Math.ceil(S.cd); if (n !== S.lastCd) { S.lastCd = n; ev(S, { k: 'count', n }) } } }
  const live = S.phase === 'play' && !S.over
  if (live) S.tMatch += dt
  const blank = {}
  for (const t of S.teams) {
    if (t.out) continue
    const inp = inputs[t.id] || blank
    teamControl(S, t, inp, dt, live)
  }
  for (const c of S.cars) updateCar(S, c, dt)
  collideCars(S, dt)
  updateBullets(S, dt)
  updateMines(S, dt)
  updatePeople(S, inputs, dt, live)
  updatePickups(S, dt)
  updateRespawns(S, dt)
  // 壊れた車
  for (const c of S.cars) if (c.alive && c.hp <= 0) wreckCar(S, c)
  for (const t of S.teams) if (!t.out && t.walking && t.footHp <= 0) footDeath(S, t)
  // 決着
  if (live) {
    const alive = S.teams.filter(t => !t.out)
    if (alive.length <= 1 || S.tMatch >= S.T) { if (!S.endAt) S.endAt = S.t + (alive.length <= 1 ? 2.4 : 0.4) }
    if (S.endAt && S.t >= S.endAt) finish(S)
  }
  if (S.over) S.overT += dt
  return S
}

function finish(S) {
  S.over = true; S.phase = 'over'
  const key = t => t.out ? -1000 + t.outT : 1000 + t.stock * 100 + t.kills * 3 + (teamCar(S, t)?.hp || 0) / 100
  S.ranking = [...S.teams].sort((a, b) => key(b) - key(a)).map(t => t.id)
  S.winner = S.ranking[0]
  ev(S, { k: 'over', winner: S.winner })
}

// ---------------------------------------------------------------- チーム操作（役・射撃・アイテム・役交代）
function teamControl(S, t, inp, dt, live) {
  const c = teamCar(S, t)
  if (!c || !c.alive) return
  t.inp = inp
  // 役交代: 止まって3秒
  if (inp.swap) { t.swapReq = !t.swapReq; if (!t.swapReq) t.swapT = 0 }
  if (t.swapReq && Math.hypot(c.vx, c.vz) > 3 ) { t.swapReq = false; t.swapT = 0 }
  if (t.swapReq) {
    if (Math.hypot(c.vx, c.vz) < 1.6 && !c.air) { t.swapT += dt; if (t.swapT >= 3) { t.driver = 1 - t.driver; t.swapReq = false; t.swapT = 0; ev(S, { k: 'swap', team: t.id }) } }
    else t.swapT = Math.max(0, t.swapT - dt * 2)
  }
  if (!live) return
  // 射撃
  c.gunYaw = inp.aim ?? c.gunYaw
  c.fireCd -= dt; c.invT -= dt
  if (c.overT > 0) { c.overT -= dt; if (c.overT <= 0) c.heat = 0.5 }
  else c.heat = Math.max(0, c.heat - 0.28 * dt)
  if (c.reloadT > 0) { c.reloadT -= dt; if (c.reloadT <= 0) { c.mag = WEAPONS.paint.mag; ev(S, { k: 'reloaded', team: t.id, x: c.x, y: c.y, z: c.z }) } }
  else if ((inp.reload && c.mag < WEAPONS.paint.mag) || (c.mag <= 0 && !specialWeapon(t))) { c.reloadT = WEAPONS.paint.reload; ev(S, { k: 'reload', team: t.id, x: c.x, y: c.y, z: c.z }) }
  if (inp.fire && c.fireCd <= 0) fire(S, t, c, inp)
  // アイテム（地雷・オイル）
  if (inp.use && t.item && (t.item.type === 'mine' || t.item.type === 'oil')) {
    const [fx, fz] = fwd(c), px = c.x - fx * 3.2, pz = c.z - fz * 3.2
    if (t.item.type === 'mine') { S.mines.push({ x: px, z: pz, y: H(px, pz), team: t.id, arm: 1.1, life: 45, id: UID++ }); ev(S, { k: 'dropMine', team: t.id, x: px, y: H(px, pz), z: pz }) }
    else { S.oils.push({ x: px, z: pz, y: H(px, pz), team: t.id, life: 14, r: 4, id: UID++ }); ev(S, { k: 'dropOil', team: t.id, x: px, y: H(px, pz), z: pz }) }
    if (--t.item.ammo <= 0) t.item = null
  }
}
export function specialWeapon(t) { return t.item && (t.item.type === 'rocket' || t.item.type === 'confetti') ? t.item : null }

function fire(S, t, c, inp) {
  const sp = specialWeapon(t)
  const yaw = c.gunYaw, dirx = Math.sin(yaw), dirz = Math.cos(yaw)
  const mx = c.x + dirx * 0.9, mz = c.z + dirz * 0.9, my = c.y + 2.15
  const assist = inp.assist || null   // { pitch } 人が撃つ時の見上げ見下ろし
  const pitch = assist && assist.pitch ? assist.pitch : 0
  const cp = Math.cos(pitch), sp_ = Math.sin(pitch)
  if (sp && sp.type === 'rocket') {
    c.fireCd = 0.6; S.bullets.push({ type: 'rocket', team: t.id, x: mx, y: my, z: mz, px: mx, py: my, pz: mz, vx: dirx * 12 * cp, vz: dirz * 12 * cp, vy: 12 * sp_, speed: 12, yaw, life: WEAPONS.rocket.life, id: UID++, tgt: -1 })
    ev(S, { k: 'shot', w: 'rocket', team: t.id, x: mx, y: my, z: mz })
    if (--sp.ammo <= 0) t.item = null
    t.stats.shots++; return
  }
  if (sp && sp.type === 'confetti') {
    c.fireCd = 0.55
    const W = WEAPONS.confetti
    for (let i = 0; i < W.n; i++) {
      const a = yaw + (S.rng() - 0.5) * W.spread * 2, v = W.speed * (0.8 + S.rng() * 0.35), pp = pitch + (S.rng() - 0.5) * 0.1
      S.bullets.push({ type: 'confetti', team: t.id, x: mx, y: my, z: mz, px: mx, py: my, pz: mz, vx: Math.sin(a) * v * Math.cos(pp), vz: Math.cos(a) * v * Math.cos(pp), vy: Math.sin(pp) * v, life: W.life, id: UID++, hue: i })
    }
    ev(S, { k: 'shot', w: 'confetti', team: t.id, x: mx, y: my, z: mz })
    if (--sp.ammo <= 0) t.item = null
    t.stats.shots++; return
  }
  // ペイント弾
  if (c.reloadT > 0 || c.mag <= 0 || c.overT > 0) return
  const W = WEAPONS.paint
  c.fireCd = W.cd * (c.heat > 0.7 ? 1.25 : 1); c.mag--
  c.heat += 0.09; if (c.heat >= 1) { c.heat = 1; c.overT = 1.7; ev(S, { k: 'overheat', team: t.id, x: c.x, y: c.y, z: c.z }) }
  const sd = 0.012 + c.heat * 0.03, a = yaw + (S.rng() - 0.5) * 2 * sd, pp = pitch + (S.rng() - 0.5) * sd
  S.bullets.push({ type: 'paint', team: t.id, x: mx, y: my, z: mz, px: mx, py: my, pz: mz, vx: Math.sin(a) * W.speed * Math.cos(pp), vz: Math.cos(a) * W.speed * Math.cos(pp), vy: Math.sin(pp) * W.speed, life: W.life, id: UID++ })
  t.stats.shots++
  ev(S, { k: 'shot', w: 'paint', team: t.id, x: mx, y: my, z: mz })
}

// ---------------------------------------------------------------- 車の動き
function updateCar(S, c, dt) {
  const t = c.team >= 0 ? S.teams[c.team] : null
  const live = S.phase === 'play' && !S.over
  if (!c.alive) { c.wreckT += dt; stepBody(S, c, dt, null, null); return }
  let inp = null
  if (t && !t.out && t.car === c.id && t.inp) inp = t.inp
  if (!live) inp = null
  c.dmgFlash = Math.max(0, c.dmgFlash - dt)
  c.oilT = Math.max(0, c.oilT - dt)
  // ブースト残量
  const boosting = !!(inp && inp.boost && c.boost > 0 && !c.boostLock && !c.air && (inp.throttle || 0) > 0)
  if (boosting) { c.boost -= dt / 1.7; if (c.boost <= 0) { c.boost = 0; c.boostLock = true } } else { c.boost = Math.min(1, c.boost + dt / 6); if (c.boostLock && c.boost > 0.3) c.boostLock = false }
  c.boosting = boosting
  // 煙・火の段階（画面の演出用）
  stepBody(S, c, dt, inp, boosting)
}

function stepBody(S, c, dt, inp, boosting) {
  const hulk = !c.alive
  const spare = c.team < 0 && c.alive
  // 向きと速度
  const gE = 0.6
  if (!c.air) {
    let [fx, fz] = fwd(c)
    // ハンドル
    const want = inp ? clamp(inp.steer || 0, -1, 1) : 0
    const rate = Math.abs(want) > Math.abs(c.steer) || Math.sign(want) !== Math.sign(c.steer) && want !== 0 ? 2.4 : 1.8
    const d = want - c.steer
    c.steer += Math.sign(d) * Math.min(Math.abs(d), rate * dt)
    let sp = c.vx * fx + c.vz * fz
    const vmax = boosting ? BOOST_MAXF : MAXF
    // 先に向きを変える（速度はそのまま。向きが変わった分が横滑りになる）
    const maxSteer = 0.62 - 0.4 * clamp(Math.abs(sp) / 30, 0, 1)
    const yawRate = sp * Math.tan(c.steer * maxSteer) / 2.7
    c.yaw -= yawRate * dt
    ;[fx, fz] = fwd(c)
    const rx = -Math.cos(c.yaw), rz = Math.sin(c.yaw)
    sp = c.vx * fx + c.vz * fz
    let lat = c.vx * rx + c.vz * rz
    const thr = inp ? (inp.throttle || 0) : 0
    if (!hulk) {
      if (thr > 0.02) { if (sp < -0.5) sp += 30 * dt; else { const a = 15 * (1 - Math.pow(Math.max(0, sp) / vmax, 2) * 0.85) + (boosting ? 16 : 0); sp = Math.min(sp + a * thr * dt, Math.max(sp, vmax)) } }
      else if (thr < -0.02) { if (sp > 0.6) sp -= 30 * dt; else sp = Math.max(sp - 10 * dt, -MAXR) }
      else sp -= Math.sign(sp) * Math.min(Math.abs(sp), (inp ? 3.4 : 9) * dt)
    } else sp -= Math.sign(sp) * Math.min(Math.abs(sp), 14 * dt)
    const grip = c.oilT > 0 ? 0.5 : 7.5
    lat *= Math.exp(-grip * dt)
    if (c.oilT > 0 && inp) c.yaw += (Math.sin(S.t * 7 + c.id) * 0.9) * dt * (Math.abs(sp) / 12)
    c.vx = fx * sp + rx * lat; c.vz = fz * sp + rz * lat
    // 坂道の重さ
    const e = 0.5, gx = (H(c.x + e, c.z) - H(c.x - e, c.z)) / (2 * e), gz = (H(c.x, c.z + e) - H(c.x, c.z - e)) / (2 * e)
    c.vx -= 8 * gx * dt; c.vz -= 8 * gz * dt
  } else {
    c.yaw -= (inp ? (inp.steer || 0) : 0) * 0.5 * dt
    c.vx *= 1 - 0.05 * dt; c.vz *= 1 - 0.05 * dt
  }
  // 移動（崖は壁）
  let nx = c.x + c.vx * dt, nz = c.z + c.vz * dt
  const hh = 0.5
  if (H(nx, nz) - c.y > hh) {
    const okx = H(nx, c.z) - c.y <= hh, okz = H(c.x, nz) - c.y <= hh
    const sp = Math.hypot(c.vx, c.vz)
    if (okx && !okz) { nz = c.z; c.vz *= -0.2 } else if (okz && !okx) { nx = c.x; c.vx *= -0.2 } else { nx = c.x; nz = c.z; c.vx *= -0.2; c.vz *= -0.2 }
    if (sp > 8 && c.alive) hurt(S, c, (sp - 7) * 1.3, null, c.x, c.z, 'cliff')
  }
  c.x = nx; c.z = nz
  // 壁
  const lim = HALF - 3
  let hit = 0
  if (c.x > lim) { c.x = lim; if (c.vx > 0) { hit = c.vx; c.vx *= -0.3 } } else if (c.x < -lim) { c.x = -lim; if (c.vx < 0) { hit = -c.vx; c.vx *= -0.3 } }
  if (c.z > lim) { c.z = lim; if (c.vz > 0) { hit = Math.max(hit, c.vz); c.vz *= -0.3 } } else if (c.z < -lim) { c.z = -lim; if (c.vz < 0) { hit = Math.max(hit, -c.vz); c.vz *= -0.3 } }
  if (hit > 5) { if (c.alive) hurt(S, c, Math.max(0, (hit - 6)) * 1.2, null, c.x, c.z, 'wall'); ev(S, { k: 'wall', x: c.x, y: c.y + 1, z: c.z, power: hit }) }
  // 上下
  const nh = H(c.x, c.z)
  if (!c.air) {
    const vyT = (nh - c.y) / dt
    if (vyT < c.vy - G * dt - 1.2 && Math.hypot(c.vx, c.vz) > 4) { c.air = true; c.vy = Math.max(c.vy, -2); c.vy -= G * dt; c.y += c.vy * dt; c.airT = 0; ev(S, { k: 'takeoff', x: c.x, y: c.y, z: c.z, id: c.id }) }
    else { c.vy = clamp(vyT, -40, 14); c.y = nh }
  } else {
    c.airT = (c.airT || 0) + dt
    c.vy -= G * dt; c.y += c.vy * dt
    if (c.y <= nh) {
      const imp = -c.vy
      c.y = nh; c.air = false; c.vy = 0
      if (imp > 5) { ev(S, { k: 'land', x: c.x, y: c.y, z: c.z, power: imp, id: c.id }); c.spin *= 0.3 }
    }
  }
  // 傾き（見た目）
  const [fx, fz] = fwd(c), rx = -fz, rz = fx   // 右は (-cos, sin) → (−fz, fx)
  let tp, tr
  if (!c.air) {
    const hf = H(c.x + fx * 1.5, c.z + fz * 1.5), hb = H(c.x - fx * 1.5, c.z - fz * 1.5), hr = H(c.x + rx * 0.9, c.z + rz * 0.9), hl = H(c.x - rx * 0.9, c.z - rz * 0.9)
    tp = Math.atan2(hf - hb, 3); tr = Math.atan2(hr - hl, 1.8)
    const k = Math.min(1, 12 * dt); c.pitch += (clamp(tp, -0.6, 0.6) - c.pitch) * k; c.roll += (clamp(tr, -0.5, 0.5) - c.roll) * k
  } else {
    const sp = c.vx * fx + c.vz * fz
    tp = Math.atan2(c.vy, Math.max(4, Math.abs(sp))); const k = Math.min(1, 3 * dt)
    c.pitch += (clamp(tp, -0.6, 0.6) - c.pitch) * k; c.roll += (0 - c.roll) * k
  }
  // 障害物の押し出し（円2つ）
  const cs = circles(c)
  for (const [cx, cz] of cs) {
    const out = []
    if (!pushOutCircle(cx, c.y, cz, CAR_R, CAR_H, out)) continue
    let best = out[0]; for (const o of out) if (o[2] > best[2]) best = o
    for (const o of out) { c.x += o[0] * o[2] * 0.9; c.z += o[1] * o[2] * 0.9 }
    const vn = c.vx * best[0] + c.vz * best[1]
    if (vn < 0) {
      c.vx -= 1.3 * vn * best[0]; c.vz -= 1.3 * vn * best[1]
      if (-vn > 4) { if (c.alive) hurt(S, c, Math.max(0, -vn - 6) * 1.4, null, cx, cz, 'obst'); ev(S, { k: 'wall', x: cx, y: c.y + 1, z: cz, power: -vn }) }
    }
  }
  c.speedKmh = Math.hypot(c.vx, c.vz) * 3.6
  // ひっくり返った壊れ車の回転
  if (hulk) { c.spin *= 1 - 1.5 * dt }
}

// ダメージ（車）。by は相手のチーム番号（null なら自爆）
const HOW_K = { bullet: 0.38, ram: 0.5, rocket: 0.75, mine: 0.75 }
export function hurt(S, c, dmg, by, x, z, how) {
  if (!c.alive || dmg <= 0 || c.invT > 0 || S.phase !== 'play' || S.over) return 0
  dmg *= HOW_K[how] ?? 0.8
  c.hp -= dmg; c.dmgFlash = 0.25
  if (by !== null && by !== undefined && by !== c.team) c.lastHit = { team: by, t: S.t }
  return dmg
}

// ---------------------------------------------------------------- 車どうし
function collideCars(S, dt) {
  const cs = S.cars
  for (let i = 0; i < cs.length; i++) {
    const A = cs[i]
    for (let j = i + 1; j < cs.length; j++) {
      const B = cs[j]
      if (!A.alive && !B.alive) continue
      if (Math.abs(A.x - B.x) > 4.6 || Math.abs(A.z - B.z) > 4.6) continue
      if (Math.abs(A.y - B.y) > 1.7) continue
      const ca = circles(A), cb = circles(B)
      let pen = 0, nx = 0, nz = 0, ax = 0, az = 0
      for (const [px, pz] of ca) for (const [qx, qz] of cb) {
        const dx = px - qx, dz = pz - qz, d = Math.hypot(dx, dz), p = 2 * CAR_R - d
        if (p > pen && d > 1e-4) { pen = p; nx = dx / d; nz = dz / d; ax = (px + qx) / 2; az = (pz + qz) / 2 }
      }
      if (pen <= 0) continue
      const iA = A.alive ? 1 : 0, iB = B.alive ? 1 : 0, sum = iA + iB
      A.x += nx * pen * iA / sum; A.z += nz * pen * iA / sum; B.x -= nx * pen * iB / sum; B.z -= nz * pen * iB / sum
      const vn = (A.vx - B.vx) * nx + (A.vz - B.vz) * nz
      if (vn < 0) {
        const e = 0.5, jn = -(1 + e) * vn / sum
        A.vx += nx * jn * iA; A.vz += nz * jn * iA; B.vx -= nx * jn * iB; B.vz -= nz * jn * iB
        const closing = -vn
        // ぶつかり方でひねる
        const [afx, afz] = fwd(A), [bfx, bfz] = fwd(B)
        const sA = (-nx) * (-afz) + (-nz) * afx, sB = nx * (-bfz) + nz * bfx
        if (A.alive) A.yaw -= clamp(sA * closing * 0.012, -0.35, 0.35)
        if (B.alive) B.yaw -= clamp(sB * closing * 0.012, -0.35, 0.35)
        if (closing > 3.5 && S.phase === 'play') {
          const base = (closing - 3.5) * 1.9
          const frontA = -nx * afx + -nz * afz, frontB = nx * bfx + nz * bfz
          const mult = f => f > 0.55 ? 0.7 : f < -0.35 ? 1.5 : 1.1
          const tA = A.team, tB = B.team
          if (A.alive) { hurt(S, A, base * mult(frontA), tB >= 0 ? tB : null, ax, az, 'ram') }
          if (B.alive) { hurt(S, B, base * mult(frontB), tA >= 0 ? tA : null, ax, az, 'ram') }
          if (tB >= 0 && A.alive) S.teams[tB].stats.rams++
          if (tA >= 0 && B.alive) S.teams[tA].stats.rams++
          ev(S, { k: 'ram', x: ax, y: Math.max(A.y, B.y) + 0.9, z: az, power: closing, a: A.id, b: B.id })
        }
      }
    }
  }
}

// ---------------------------------------------------------------- 弾
const HITR = { car: CAR_R + 0.35 }
function segCircle(px, pz, qx, qz, cx, cz, r) {
  const dx = qx - px, dz = qz - pz, l2 = dx * dx + dz * dz
  let t = l2 > 1e-9 ? ((cx - px) * dx + (cz - pz) * dz) / l2 : 0; t = clamp(t, 0, 1)
  const ex = px + dx * t - cx, ez = pz + dz * t - cz
  return ex * ex + ez * ez <= r * r ? t : -1
}
function updateBullets(S, dt) {
  const B = S.bullets
  for (let i = B.length - 1; i >= 0; i--) {
    const b = B[i]
    b.px = b.x; b.py = b.y; b.pz = b.z
    b.life -= dt
    if (b.type === 'rocket') {
      b.speed = Math.min(WEAPONS.rocket.speed, b.speed + 40 * dt)
      // ゆるく追う
      let best = null, bd = 1e9
      for (const c of S.cars) {
        if (!c.alive || c.team === b.team || c.team < 0) continue
        const dx = c.x - b.x, dz = c.z - b.z, d = Math.hypot(dx, dz); if (d > 60) continue
        const ang = Math.abs(angDiff(Math.atan2(dx, dz), b.yaw)); if (ang > 0.6) continue
        if (d + ang * 15 < bd) { bd = d + ang * 15; best = c }
      }
      if (best) { const want = Math.atan2(best.x - b.x, best.z - b.z), dv = angDiff(want, b.yaw); b.yaw += clamp(dv, -1.7 * dt, 1.7 * dt); const dy = (best.y + 1 - b.y) / Math.max(5, Math.hypot(best.x - b.x, best.z - b.z)); b.vy += (dy * b.speed - b.vy) * Math.min(1, 3 * dt) } else b.vy *= 1 - 0.8 * dt
      b.vx = Math.sin(b.yaw) * b.speed; b.vz = Math.cos(b.yaw) * b.speed
    } else if (b.type === 'confetti') { b.vy -= 6 * dt; b.vx *= 1 - 1.2 * dt; b.vz *= 1 - 1.2 * dt }
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt
    let hitK = null, hitObj = null
    // 壁・地面・障害物
    if (Math.abs(b.x) > HALF || Math.abs(b.z) > HALF) { hitK = 'wall'; b.x = clamp(b.x, -HALF, HALF); b.z = clamp(b.z, -HALF, HALF) }
    else if (b.y < H(b.x, b.z)) { hitK = 'ground'; b.y = H(b.x, b.z) + 0.05 }
    else if (solidAtPoint(b.x, b.y, b.z)) hitK = 'obst'
    else if (b.y > 25) hitK = 'sky'
    // 車
    if (!hitK) for (const c of S.cars) {
      if (c.team === b.team && c.team >= 0) continue
      if (b.y < c.y - 0.3 || b.y > c.y + 2.5) continue
      const cs = circles(c)
      for (const [cx, cz] of cs) if (segCircle(b.px, b.pz, b.x, b.z, cx, cz, HITR.car) >= 0) { hitK = 'car'; hitObj = c; break }
      if (hitK) break
    }
    if (!hitK) for (const p of S.people) {
      if (p.state !== 'walk' || p.team === b.team || p.invT > 0) continue
      if (b.y < p.y - 0.2 || b.y > p.y + 2.1) continue
      if (segCircle(b.px, b.pz, b.x, b.z, p.x, p.z, 0.7) >= 0) { hitK = 'person'; hitObj = p; break }
    }
    if (hitK) {
      if (b.type === 'rocket') explode(S, b.x, b.y, b.z, b.team, WEAPONS.rocket.r, WEAPONS.rocket.dmg, 'rocket')
      else {
        const dmg = (b.type === 'paint' ? WEAPONS.paint.dmg : WEAPONS.confetti.dmg)
        if (hitK === 'car') {
          const c = hitObj; if (c.alive) { const d = hurt(S, c, dmg, b.team, b.x, b.z, 'bullet'); if (d && b.team >= 0) S.teams[b.team].stats.hits++ }
          const m = Math.hypot(b.vx, b.vz) || 1; c.vx += b.vx / m * 0.12; c.vz += b.vz / m * 0.12
        } else if (hitK === 'person') {
          const t = S.teams[hitObj.team]; t.footHp -= dmg * 1.4; t.footLast = { team: b.team, t: S.t }; if (b.team >= 0) S.teams[b.team].stats.hits++
        }
        ev(S, { k: 'bhit', w: b.type, what: hitK, team: b.team, x: b.x, y: b.y, z: b.z, vx: b.vx, vz: b.vz })
      }
      B.splice(i, 1); continue
    }
    if (b.life <= 0) { if (b.type === 'rocket') explode(S, b.x, b.y, b.z, b.team, WEAPONS.rocket.r, WEAPONS.rocket.dmg, 'rocket'); B.splice(i, 1) }
  }
}
export function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d }

export function explode(S, x, y, z, by, R, dmg, how) {
  ev(S, { k: 'boom', x, y, z, r: R, how, team: by })
  for (const c of S.cars) {
    if (!c.alive && c.team >= 0) continue
    const dx = c.x - x, dz = c.z - z, dy = c.y + 0.8 - y, d = Math.hypot(dx, dz, dy)
    if (d > R + 1.5) continue
    const k = clamp(1 - d / (R + 1.5), 0, 1)
    const self = c.team === by ? 0.35 : 1
    if (c.alive) hurt(S, c, dmg * Math.pow(k, 0.7) * self, c.team === by ? null : by, x, z, how)
    const dd = Math.max(0.5, Math.hypot(dx, dz))
    if (c.alive || true) { c.vx += dx / dd * 16 * k; c.vz += dz / dd * 16 * k; if (c.alive && !c.air) { c.vy = 5 + 7 * k; c.air = true; c.airT = 0 } }
    if (!c.alive) c.spin += 1
  }
  for (const p of S.people) {
    if (p.state !== 'walk' || p.invT > 0) continue
    const d = Math.hypot(p.x - x, p.z - z, p.y - y)
    if (d < R) { const t = S.teams[p.team]; t.footHp -= dmg * 1.1 * (1 - d / R); t.footLast = { team: by, t: S.t }; const dd = Math.max(0.4, Math.hypot(p.x - x, p.z - z)); p.vx += (p.x - x) / dd * 8; p.vz += (p.z - z) / dd * 8; p.vy = 6; p.state = 'fly' }
  }
}

// ---------------------------------------------------------------- 地雷・オイル
function updateMines(S, dt) {
  for (let i = S.mines.length - 1; i >= 0; i--) {
    const m = S.mines[i]; m.life -= dt; m.arm -= dt
    if (m.life <= 0) { S.mines.splice(i, 1); continue }
    if (m.arm > 0) continue
    for (const c of S.cars) {
      if (!c.alive || c.team === m.team || c.team < 0 || c.y > m.y + 1.2) continue
      if (Math.hypot(c.x - m.x, c.z - m.z) < 2.0) {
        explode(S, m.x, m.y + 0.3, m.z, m.team, 5.5, 28, 'mine'); S.mines.splice(i, 1); break
      }
    }
  }
  for (let i = S.oils.length - 1; i >= 0; i--) {
    const o = S.oils[i]; o.life -= dt
    if (o.life <= 0) { S.oils.splice(i, 1); continue }
    for (const c of S.cars) if (!c.air && Math.hypot(c.x - o.x, c.z - o.z) < o.r) { if (c.oilT <= 0) ev(S, { k: 'slip', x: c.x, y: c.y, z: c.z, team: c.team }); c.oilT = 0.35 }
  }
}

// ---------------------------------------------------------------- 拾える物
function updatePickups(S, dt) {
  for (const p of S.pickups) {
    if (p.t > 0) { p.t -= dt; if (p.t <= 0) p.type = pickType(S); continue }
    for (const c of S.cars) {
      if (!c.alive || c.team < 0 || Math.hypot(c.x - p.x, c.z - p.z) > 2.6 || Math.abs(c.y - H(p.x, p.z)) > 2) continue
      const t = S.teams[c.team]
      if (p.type === 'repair') { const before = c.hp; c.hp = Math.min(100, c.hp + 45); ev(S, { k: 'repair', team: t.id, x: c.x, y: c.y, z: c.z, gain: c.hp - before }) }
      else {
        if (t.item && t.item.type === p.type) t.item.ammo += ITEM_AMMO[p.type]; else t.item = { type: p.type, ammo: ITEM_AMMO[p.type] }
        ev(S, { k: 'pickup', team: t.id, type: p.type, x: p.x, y: H(p.x, p.z), z: p.z })
      }
      t.stats.pick++
      p.t = 16; break
    }
  }
}
function updateRespawns(S, dt) {
  for (let i = S.respawns.length - 1; i >= 0; i--) {
    const r = S.respawns[i]; r.t -= dt
    if (r.t > 0) continue
    const sp = SPARE_SPOTS[r.spot]
    // 誰かが居座っていたら少し待つ
    if (S.cars.some(c => Math.hypot(c.x - sp.x, c.z - sp.z) < 4 && c.team < 0 || (c.alive === false && Math.hypot(c.x - sp.x, c.z - sp.z) < 4) || (c.alive && Math.hypot(c.x - sp.x, c.z - sp.z) < 4))) { r.t = 2; continue }
    const c = newCar(S, sp.x, sp.z, sp.yaw, -1); c.spot = r.spot; c.invT = 0
    ev(S, { k: 'spare', x: sp.x, y: c.y, z: sp.z })
    S.respawns.splice(i, 1)
  }
  // 古い壊れ車を片づける
  for (let i = S.cars.length - 1; i >= 0; i--) { const c = S.cars[i]; if (!c.alive && c.wreckT > 16) { ev(S, { k: 'vanish', x: c.x, y: c.y, z: c.z, id: c.id }); S.cars.splice(i, 1) } }
}

// ---------------------------------------------------------------- 壊れる・降りる・歩く
function wreckCar(S, c) {
  c.alive = false; c.wreckT = 0; c.hp = 0; c.vy = Math.max(c.vy, 8); c.air = true; c.airT = 0; c.spin = 1
  c.vx *= 0.6; c.vz *= 0.6
  S.wrecks++
  ev(S, { k: 'explode', x: c.x, y: c.y + 1, z: c.z, id: c.id, team: c.team })
  if (c.spot >= 0 && c.team < 0) S.respawns.push({ spot: c.spot, t: 12 })
  if (c.team < 0) return
  const t = S.teams[c.team], by = c.lastHit && S.t - c.lastHit.t < 7 ? c.lastHit.team : null
  t.stock--; t.car = -1
  if (by !== null && by !== t.id) { S.teams[by].kills++; }
  ev(S, { k: 'kill', by, victim: t.id, how: 'car' })
  if (t.stock <= 0) { eliminate(S, t); return }
  ejectPeople(S, t, c)
}
function ejectPeople(S, t, c) {
  t.walking = true; t.footHp = 60; t.footLast = null; t.swapReq = false; t.swapT = 0
  for (const p of t.p) {
    p.state = 'fly'; p.x = c.x + (S.rng() - 0.5); p.z = c.z + (S.rng() - 0.5); p.y = c.y + 1.4
    const a = S.rng() * 6.28, v = 3 + S.rng() * 5
    p.vx = Math.sin(a) * v + c.vx * 0.3; p.vz = Math.cos(a) * v + c.vz * 0.3; p.vy = 9 + S.rng() * 4; p.px = p.x; p.py = p.y; p.pz = p.z; p.invT = 0; p.yaw = a
  }
}
function eliminate(S, t) {
  t.out = true; t.outT = S.t; t.walking = false; S.outCount++
  for (const p of t.p) { if (p.state !== 'dead') ev(S, { k: 'pdie', x: p.x, y: p.y, z: p.z, team: t.id }); p.state = 'dead' }
  ev(S, { k: 'out', team: t.id })
}
function footDeath(S, t) {
  const by = t.footLast && S.t - t.footLast.t < 7 ? t.footLast.team : null
  t.stock--
  if (by !== null && by !== t.id) S.teams[by].kills++
  ev(S, { k: 'kill', by, victim: t.id, how: 'foot' })
  for (const p of t.p) ev(S, { k: 'pdie', x: p.x, y: p.y, z: p.z, team: t.id })
  if (t.stock <= 0) { eliminate(S, t); return }
  // 空き車のそばへ戻って歩き直し
  const spares = S.cars.filter(c => c.alive && c.team < 0)
  let best = null, bd = 1e9
  for (const c of spares) { const d = Math.hypot(c.x - t.p[0].x, c.z - t.p[0].z); if (d > 12 && d < bd) { bd = d; best = c } }
  const sp = best || TEAM_SPAWNS[t.id]
  t.footHp = 60; t.footLast = null
  for (const p of t.p) { p.state = 'walk'; p.x = sp.x + (p.idx ? 2 : -2); p.z = sp.z - 4; p.y = H(p.x, p.z); p.invT = 2.5; p.vx = p.vz = p.vy = 0 }
}
function updatePeople(S, inputs, dt, live) {
  for (const t of S.teams) {
    if (t.out || !t.walking) continue
    const inp = inputs[t.id] || {}
    const [p0, p1] = t.p
    for (const p of t.p) {
      p.invT -= dt
      if (p.state === 'fly') {
        p.vy -= G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt
        p.x = clamp(p.x, -HALF + 1, HALF - 1); p.z = clamp(p.z, -HALF + 1, HALF - 1)
        const h = H(p.x, p.z)
        if (p.y <= h) { p.y = h; p.state = 'walk'; p.vx = p.vz = p.vy = 0; p.invT = Math.max(p.invT, 1.2); ev(S, { k: 'plant', x: p.x, y: p.y, z: p.z }) }
        else if (solidAtPoint(p.x, p.y + 0.5, p.z)) { p.vx *= -0.3; p.vz *= -0.3 }
      }
    }
    if (p0.state !== 'walk' && p1.state !== 'walk') continue
    // 歩き
    const wx = inp.walkX || 0, wz = inp.walkZ || 0, wl = Math.hypot(wx, wz)
    const spd = live ? 6.4 : 0
    for (const p of t.p) {
      if (p.state !== 'walk') continue
      let dx = 0, dz = 0
      if (p === p0) { if (wl > 0.05) { dx = wx / Math.max(1, wl) * spd; dz = wz / Math.max(1, wl) * spd; p.yaw = Math.atan2(dx, dz) } }
      else { const ex = p0.x - p.x - 1.6, ez = p0.z - p.z + 1.2, d = Math.hypot(ex, ez); if (d > 1.2 && p0.state === 'walk') { dx = ex / d * Math.min(spd * 1.05, d * 3); dz = ez / d * Math.min(spd * 1.05, d * 3); p.yaw = Math.atan2(dx, dz) } }
      let nx = p.x + dx * dt, nz = p.z + dz * dt
      if (H(nx, nz) - p.y > 0.7) { if (H(nx, p.z) - p.y <= 0.7) nz = p.z; else if (H(p.x, nz) - p.y <= 0.7) nx = p.x; else { nx = p.x; nz = p.z } }
      p.x = clamp(nx, -HALF + 1, HALF - 1); p.z = clamp(nz, -HALF + 1, HALF - 1)
      const out = []
      for (let k = 0; k < 2; k++) { out.length = 0; if (pushOutCircle(p.x, p.y, p.z, 0.55, 1.8, out)) for (const o of out) { p.x += o[0] * o[2]; p.z += o[1] * o[2] } }
      p.y = H(p.x, p.z)
      p.walkT += Math.hypot(dx, dz) * dt
      // 車にひかれる
      for (const c of S.cars) {
        if (!c.alive || c.team === p.team) continue
        const sp = Math.hypot(c.vx, c.vz)
        if (sp > 4 && Math.abs(c.y - p.y) < 1.5 && p.invT <= 0) {
          for (const [cx, cz] of circles(c)) if (Math.hypot(cx - p.x, cz - p.z) < CAR_R + 0.4) { t.footHp -= 18 + sp * 1.5; t.footLast = { team: c.team, t: S.t }; p.invT = 0.5; ev(S, { k: 'runover', x: p.x, y: p.y, z: p.z }); break }
        }
      }
    }
    // 空き車に乗る
    if (p0.state === 'walk' || p1.state === 'walk') {
      const lead = p0.state === 'walk' ? p0 : p1
      for (const c of S.cars) {
        if (!c.alive || c.team >= 0) continue
        if (Math.hypot(c.x - lead.x, c.z - lead.z) < 3.0 && Math.abs(c.y - lead.y) < 2) { boardCar(S, t, c); break }
      }
    }
  }
}
function boardCar(S, t, c) {
  c.team = t.id; t.car = c.id; t.walking = false; c.hp = Math.max(c.hp, 70); c.invT = 1.4; c.mag = WEAPONS.paint.mag; c.heat = 0; c.reloadT = 0; c.gunYaw = c.yaw; c.boost = 1
  for (const p of t.p) p.state = 'ride'
  if (c.spot >= 0) { S.respawns.push({ spot: c.spot, t: 14 }); c.spot = -1 }
  ev(S, { k: 'board', team: t.id, x: c.x, y: c.y, z: c.z, id: c.id })
}

// ---------------------------------------------------------------- 問い合わせ（人の照準補助・CPU が使う）
export function enemiesOf(S, team) { return S.cars.filter(c => c.alive && c.team >= 0 && c.team !== team) }
// 人が狙う時の補助: 照準の近く(±cone)にいる敵を探して、先読みした向きを返す
export function assistAim(S, car, yaw, cone = 0.14, range = 55) {
  let best = null, bs = 1e9
  const my = car.y + 2.15
  for (const c of S.cars) {
    if (!c.alive || c.team === car.team || c.team < 0) continue
    const dx = c.x - car.x, dz = c.z - car.z, d = Math.hypot(dx, dz); if (d > range || d < 3) continue
    const lead = d / WEAPONS.paint.speed
    const ax = c.x + c.vx * lead - car.x, az = c.z + c.vz * lead - car.z
    const a = Math.atan2(ax, az), dv = angDiff(a, yaw)
    if (Math.abs(dv) > cone + 1.5 / d) continue
    if (!lineClear(car.x, my, car.z, c.x, c.y + 1.2, c.z)) continue
    if (Math.abs(dv) + d * 0.0015 < bs) { bs = Math.abs(dv) + d * 0.0015; best = { c, yaw: a, d, pitch: Math.atan2(c.y + 1.2 - my, d) } }
  }
  return best
}
export function standings(S) {
  const key = t => t.out ? -1000 + t.outT : 1000 + t.stock * 100 + t.kills * 3
  return [...S.teams].sort((a, b) => key(b) - key(a))
}

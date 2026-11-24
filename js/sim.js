// 試合の中身（状態と進め方）。THREE にも DOM にも依存しない。入力は チームごとに
//   { throttle, steer, boost, aim, fire, reload, use, swap, walkX, walkZ }
// の形で渡す（運転役が throttle/steer/boost、射手役が aim/fire/reload/use、歩きは walkX/walkZ）。
// サーバーに移す時は、この step(S, inputs, dt) をそのまま動かして、events を配るだけでよい。
import { H, WORLD, TEAM_SPAWNS, SPARE_SPOTS, PICKUP_SPOTS, pushOutCircle, solidAtPoint, lineClear, clamp, freeSpot } from './arena.js?v=3'

export const DT = 1 / 60
export const G = 24
export const MATCH_SEC = 240
export const COUNTDOWN = 10
export const STOCK = 3
export const TEAM_NAMES = ['あか', 'あお', 'きいろ', 'みどり', 'もも']
export const TEAM_COLORS = [0xe8452e, 0x2f78e6, 0xf2c230, 0x38b25a, 0xe05cb4]
export const CAR_R = 1.15, CAR_OFF = 0.95, CAR_H = 1.7
export const MAXF = 21, MAXR = 8, BOOST_MAXF = 31
// 銃（射手が2つ選んで持ち替える）
export const WEAPONS = {
  paint: { name: 'ペイント弾', kind: 'gun', speed: 58, dmg: 3.6, life: 1.3, cd: 0.105, mag: 36, reload: 1.7, stat: [3, 5, 3] },
  rocket: { name: '花火ロケット', kind: 'rocket', speed: 30, dmg: 27, r: 7.5, life: 2.6, cd: 0.95, mag: 3, reload: 4.2, stat: [4, 1, 4] },
  confetti: { name: '紙吹雪', kind: 'confetti', speed: 44, dmg: 3.0, life: 0.5, n: 9, spread: 0.17, cd: 0.6, mag: 5, reload: 2.4, stat: [4, 2, 1] },
  spring: { name: 'バネの鉄球', kind: 'spring', speed: 34, dmg: 21, life: 2.8, cd: 0.5, mag: 6, reload: 2.4, bounces: 3, stat: [4, 2, 3] },
  cork: { name: 'コルク砲', kind: 'cork', speed: 95, dmg: 20, life: 1.1, cd: 0.8, mag: 5, reload: 2.6, stat: [5, 2, 5] },
}
export const WEAPON_IDS = ['paint', 'rocket', 'confetti', 'spring', 'cork']
// 車（運転が1つ選ぶ）。dur は壊れにくさ（ダメージを割る）。mass は体当たりの重さ
export const CAR_TYPES = [
  { id: 'std', name: 'バランス', note: 'どれも平均点。迷ったらこれ', thrUp: 2.4, thrDown: 1.9, brake: 13, roll: 0.8, yawTau: 0.14, maxF: 21, acc: 8.0, dur: 1.0, mass: 1.0, steer: 1.0, grip: 4.2, boostK: 1.0, scale: 1.0, stat: [3, 3, 3, 3] },
  { id: 'fast', name: 'ビュン', note: '速くて軽い。壊れやすい', thrUp: 3.4, thrDown: 2.5, brake: 12, roll: 0.65, yawTau: 0.11, maxF: 25.5, acc: 11.5, dur: 0.7, mass: 0.8, steer: 0.9, grip: 3.6, boostK: 1.0, scale: 0.96, stat: [5, 1, 3, 1] },
  { id: 'heavy', name: 'ドスン', note: '遅いけど硬くて体当たりが強い', thrUp: 1.5, thrDown: 1.2, brake: 9, roll: 0.5, yawTau: 0.26, maxF: 17.5, acc: 5.6, dur: 1.55, mass: 1.8, steer: 0.8, grip: 3.3, boostK: 0.8, scale: 1.1, stat: [1, 5, 2, 5] },
  { id: 'agile', name: 'ヒラリ', note: '小回りが利く。ブースト長め', thrUp: 2.7, thrDown: 2.1, brake: 13.5, roll: 0.85, yawTau: 0.08, maxF: 21, acc: 8.4, dur: 0.9, mass: 0.9, steer: 1.5, grip: 5.2, boostK: 1.5, scale: 0.97, stat: [3, 2, 5, 2] },
]
// アイテム。role D=運転だけが使う・G=射手だけが使う
export const ITEMS = {
  turbo: { role: 'D', name: 'ターボ', ammo: 1 }, spear: { role: 'D', name: '槍', ammo: 1 }, oil: { role: 'D', name: 'オイル', ammo: 2 }, mine: { role: 'D', name: '地雷', ammo: 2 }, repair: { role: 'S', name: '修理', instant: true },
  grenade: { role: 'G', name: '手榴弾', ammo: 3 }, flash: { role: 'G', name: '閃光弾', ammo: 2 }, smoke: { role: 'G', name: '煙幕', ammo: 2 }, ricochet: { role: 'G', name: '跳弾', ammo: 1 }, turret: { role: 'G', name: 'タレット', ammo: 1 },
}
export const ITEM_NAMES = Object.fromEntries(Object.entries(ITEMS).map(([k, v]) => [k, v.name]))
export const ITEM_AMMO = Object.fromEntries(Object.entries(ITEMS).map(([k, v]) => [k, v.ammo || 1]))

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }

let UID = 1
function newCar(S, x, z, yaw, team, type = 0) {
  const c = {
    id: UID++, team, type, x, z, y: H(x, z), yaw, vx: 0, vz: 0, vy: 0, steer: 0, pitch: 0, roll: 0, air: false,
    hp: 100, alive: true, wreckT: 0, boost: 1, boostLock: false, gunYaw: yaw, turboT: 0, spearT: 0, flashT: 0, flashDur: 1, thr: 0, brk: 0, hb: 0, yawRate: 0, ax: 0, slip: 0,
    lastHit: null, oilT: 0, invT: 0, spin: 0, speedKmh: 0, dmgFlash: 0, spot: -1, wreckV: [0, 0],
  }
  c.px = c.x; c.py = c.y; c.pz = c.z; c.pyaw = c.yaw; c.pgun = c.gunYaw; c.ppitch = 0; c.proll = 0
  S.cars.push(c); return c
}
function newPerson(t, idx) { return { team: t, idx, state: 'ride', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, px: 0, py: 0, pz: 0, walkT: 0, invT: 0 } }

export function randLoadout(rng) {
  const ids = [...WEAPON_IDS]; const a = ids.splice((rng() * ids.length) | 0, 1)[0], b = ids[(rng() * ids.length) | 0]
  return { car: (rng() * CAR_TYPES.length) | 0, weapons: [a, b] }
}
export function setLoadout(S, t, lo) {   // 準備のあいだに選び直せる（車は見た目も変わる）
  t.loadout = lo
  t.ws = lo.weapons.map(id => ({ id, mag: WEAPONS[id].mag, reloadT: 0, heat: 0, overT: 0 })); t.wSel = 0
  const c = teamCar(S, t); if (c && S.phase !== 'play') c.type = lo.car
}
export function createState(seed = 1, opts = {}) {
  const S = {
    seed, rng: mulberry(seed), t: 0, tMatch: 0, T: opts.matchSec || MATCH_SEC, cd: opts.noCountdown ? 0 : (opts.prepSec ?? COUNTDOWN), over: false, overT: 0, phase: opts.noCountdown ? 'play' : 'prep', winner: -1,
    teams: [], cars: [], people: [], bullets: [], mines: [], oils: [], smokes: [], turrets: [], pickups: [], respawns: [], events: [], humanTeam: opts.humanTeam ?? 0, ranking: [], outCount: 0, wrecks: 0,
  }
  for (let i = 0; i < 5; i++) {
    const lo = randLoadout(S.rng)
    const sp = TEAM_SPAWNS[i], car = newCar(S, sp.x, sp.z, sp.yaw, i, lo.car); car.invT = 1
    const tm = { id: i, name: TEAM_NAMES[i], color: TEAM_COLORS[i], stock: STOCK, kills: 0, out: false, outT: 0, car: car.id, driver: 0, iD: null, iG: null, ricT: 0, cd: 0, wSel: 0, ws: [], loadout: lo, swapReq: false, swapT: 0, footHp: 0, footLast: null, walking: false, stats: { shots: 0, hits: 0, rams: 0, pick: 0 }, p: [newPerson(i, 0), newPerson(i, 1)] }
    S.teams.push(tm); S.people.push(tm.p[0], tm.p[1]); setLoadout(S, tm, lo)
  }
  SPARE_SPOTS.forEach((sp, i) => { const c = newCar(S, sp.x, sp.z, sp.yaw, -1, (S.rng() * CAR_TYPES.length) | 0); c.spot = i; c.hp = 100 })
  PICKUP_SPOTS.forEach((sp, i) => S.pickups.push({ x: sp.x, z: sp.z, type: pickType(S), t: 0, id: i }))
  return S
}
const PICK_W = [['turbo', 2], ['spear', 2], ['oil', 2], ['mine', 2], ['repair', 3], ['grenade', 3], ['smoke', 2], ['ricochet', 2], ['turret', 2], ['flash', 2]]
function pickType(S) { let r = S.rng() * 22, a = 0; for (const [k, w] of PICK_W) { a += w; if (r < a) return k } return 'repair' }
export const carById = (S, id) => S.cars.find(c => c.id === id)
export const teamCar = (S, t) => t.car >= 0 ? carById(S, t.car) : null
export const ev = (S, o) => S.events.push(o)
const fwd = c => [Math.sin(c.yaw), Math.cos(c.yaw)]
export const carR = c => CAR_R * (1 + ((CAR_TYPES[c.type] || CAR_TYPES[0]).scale - 1) * 0.9)
export function circles(c) { const s = Math.sin(c.yaw), co = Math.cos(c.yaw), k = carR(c) / CAR_R, o = CAR_OFF * k; return [[c.x + s * o, c.z + co * o], [c.x - s * o, c.z - co * o]] }
export function driverIdx(t) { return t.driver }
export function gunnerIdx(t) { return 1 - t.driver }

// ---------------------------------------------------------------- 1 ステップ
export function step(S, inputs, dt = DT) {
  S.t += dt
  for (const c of S.cars) { c.px = c.x; c.py = c.y; c.pz = c.z; c.pyaw = c.yaw; c.pgun = c.gunYaw; c.ppitch = c.pitch; c.proll = c.roll }
  for (const p of S.people) { p.px = p.x; p.py = p.y; p.pz = p.z }
  if (S.cd > 0) { S.cd -= dt; if (S.cd <= 0) { S.phase = 'play'; ev(S, { k: 'go' }) } else { const n = Math.ceil(S.cd); if (n !== S.lastCd) { S.lastCd = n; ev(S, { k: 'count', n }) } } }
  if (S.phase === 'prep' && S.cd <= 0) S.phase = 'play'
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
  if (inp.swap) { t.swapReq = !t.swapReq; if (!t.swapReq) t.swapT = 0 }
  if (t.swapReq && Math.hypot(c.vx, c.vz) > 3) { t.swapReq = false; t.swapT = 0 }
  if (t.swapReq) {
    if (Math.hypot(c.vx, c.vz) < 1.6 && !c.air) { t.swapT += dt; if (t.swapT >= 3) { t.driver = 1 - t.driver; t.swapReq = false; t.swapT = 0; ev(S, { k: 'swap', team: t.id }) } }
    else t.swapT = Math.max(0, t.swapT - dt * 2)
  }
  if (!live) return
  if (inp.unstick) { const p = freeSpot(c.x + Math.sin(c.yaw) * 6, c.z + Math.cos(c.yaw) * 6, 3.4); if (Math.hypot(p.x - c.x, p.z - c.z) < 30) { c.x = p.x; c.z = p.z; c.y = H(p.x, p.z); c.vx = c.vz = 0; c.invT = Math.max(c.invT, 0.6); ev(S, { k: 'unstick', x: c.x, y: c.y, z: c.z }) } }
  c.gunYaw = inp.aim ?? c.gunYaw
  t.cd -= dt; c.invT -= dt; c.turboT = Math.max(0, c.turboT - dt); c.spearT = Math.max(0, c.spearT - dt); t.ricT = Math.max(0, t.ricT - dt)
  // 銃の持ち替え
  if (inp.wswap) { t.wSel ^= 1; ev(S, { k: 'wswap', team: t.id, w: t.ws[t.wSel].id, x: c.x, y: c.y, z: c.z }) }
  else if (inp.wsel != null && inp.wsel !== t.wSel) { t.wSel = inp.wsel; ev(S, { k: 'wswap', team: t.id, w: t.ws[t.wSel].id, x: c.x, y: c.y, z: c.z }) }
  for (const w of t.ws) {
    if (w.overT > 0) { w.overT -= dt; if (w.overT <= 0) w.heat = 0.5 } else w.heat = Math.max(0, w.heat - 0.28 * dt)
    if (w.reloadT > 0) { w.reloadT -= dt; if (w.reloadT <= 0) { w.mag = WEAPONS[w.id].mag; ev(S, { k: 'reloaded', team: t.id, x: c.x, y: c.y, z: c.z }) } }
  }
  const w = t.ws[t.wSel], W = WEAPONS[w.id]
  if (w.reloadT <= 0 && ((inp.reload && w.mag < W.mag) || w.mag <= 0)) { w.reloadT = W.reload; ev(S, { k: 'reload', team: t.id, x: c.x, y: c.y, z: c.z }) }
  if (inp.fire && t.cd <= 0 && w.reloadT <= 0 && w.mag > 0 && w.overT <= 0) fire(S, t, c, inp, w, W)
  // 役ごとのアイテム
  if (inp.useD && t.iD) useDriverItem(S, t, c)
  if (inp.useG && t.iG) useGunnerItem(S, t, c)
}
function useDriverItem(S, t, c) {
  const it = t.iD, [fx, fz] = fwd(c)
  if (it.type === 'turbo') { c.turboT = 6; c.boost = 1; c.boostLock = false; ev(S, { k: 'turbo', team: t.id, x: c.x, y: c.y, z: c.z }) }
  else if (it.type === 'spear') { c.spearT = 9; ev(S, { k: 'spear', team: t.id, x: c.x, y: c.y, z: c.z }) }
  else if (it.type === 'mine') { const px = c.x - fx * 3.2, pz = c.z - fz * 3.2; S.mines.push({ x: px, z: pz, y: H(px, pz), team: t.id, arm: 1.1, life: 45, id: UID++ }); ev(S, { k: 'dropMine', team: t.id, x: px, y: H(px, pz), z: pz }) }
  else if (it.type === 'oil') { const px = c.x - fx * 3.2, pz = c.z - fz * 3.2; S.oils.push({ x: px, z: pz, y: H(px, pz), team: t.id, life: 14, r: 4, id: UID++ }); ev(S, { k: 'dropOil', team: t.id, x: px, y: H(px, pz), z: pz }) }
  if (--it.ammo <= 0) t.iD = null
}
function useGunnerItem(S, t, c) {
  const it = t.iG, dx = Math.sin(c.gunYaw), dz = Math.cos(c.gunYaw)
  if (it.type === 'grenade') { S.bullets.push({ type: 'grenade', team: t.id, x: c.x + dx * 1.4, y: c.y + 2.4, z: c.z + dz * 1.4, px: c.x, py: c.y + 2.4, pz: c.z, vx: dx * 20 + c.vx * 0.6, vz: dz * 20 + c.vz * 0.6, vy: 9, life: 2.1, id: UID++ }); ev(S, { k: 'throw', team: t.id, x: c.x, y: c.y + 2.4, z: c.z }) }
  else if (it.type === 'flash') { S.bullets.push({ type: 'grenade', flash: true, team: t.id, x: c.x + dx * 1.4, y: c.y + 2.4, z: c.z + dz * 1.4, px: c.x, py: c.y + 2.4, pz: c.z, vx: dx * 22 + c.vx * 0.6, vz: dz * 22 + c.vz * 0.6, vy: 8, life: 1.5, id: UID++ }); ev(S, { k: 'throw', team: t.id, x: c.x, y: c.y + 2.4, z: c.z }) }
  else if (it.type === 'smoke') { const px = c.x + dx * 9, pz = c.z + dz * 9; S.smokes.push({ x: px, z: pz, y: H(px, pz), r: 7.5, life: 10, team: t.id, id: UID++ }); ev(S, { k: 'smoke', team: t.id, x: px, y: H(px, pz), z: pz }) }
  else if (it.type === 'ricochet') { t.ricT = 14; ev(S, { k: 'ricochet', team: t.id, x: c.x, y: c.y, z: c.z }) }
  else if (it.type === 'turret') { const px = c.x + dx * 4, pz = c.z + dz * 4; if (solidAtPoint(px, c.y + 1, pz) || solidAtPoint(px, c.y + 0.3, pz) || Math.abs(px) > WORLD - 3 || Math.abs(pz) > WORLD - 3) { ev(S, { k: 'noTurret', team: t.id, x: c.x, y: c.y, z: c.z }); return }
    S.turrets.push({ team: t.id, x: px, z: pz, y: H(px, pz), yaw: c.gunYaw, hp: 40, life: 18, cd: 0.5, id: UID++ }); ev(S, { k: 'turret', team: t.id, x: px, y: H(px, pz), z: pz }) }
  if (--it.ammo <= 0) t.iG = null
}
export function curWeapon(t) { return t.ws[t.wSel] }

function fire(S, t, c, inp, w, W) {
  const yaw = c.gunYaw, dirx = Math.sin(yaw), dirz = Math.cos(yaw)
  const mx = c.x + dirx * 0.9, mz = c.z + dirz * 0.9, my = c.y + 2.15
  const pitch = inp.assist && inp.assist.pitch ? inp.assist.pitch : 0
  const cp = Math.cos(pitch), sp_ = Math.sin(pitch)
  t.cd = W.cd; w.mag--; t.stats.shots++
  const base = { team: t.id, x: mx, y: my, z: mz, px: mx, py: my, pz: mz, id: UID++ }
  const ric = t.ricT > 0 ? 2 : 0
  if (W.kind === 'rocket') {
    S.bullets.push({ ...base, type: 'rocket', vx: dirx * 12 * cp, vz: dirz * 12 * cp, vy: 12 * sp_, speed: 12, yaw, life: W.life, bounces: ric ? 1 : 0 })
    ev(S, { k: 'shot', w: 'rocket', team: t.id, x: mx, y: my, z: mz })
  } else if (W.kind === 'confetti') {
    for (let i = 0; i < W.n; i++) {
      const a = yaw + (S.rng() - 0.5) * W.spread * 2, v = W.speed * (0.8 + S.rng() * 0.35), pp = pitch + (S.rng() - 0.5) * 0.1
      S.bullets.push({ ...base, id: UID++, type: 'confetti', vx: Math.sin(a) * v * Math.cos(pp), vz: Math.cos(a) * v * Math.cos(pp), vy: Math.sin(pp) * v, life: W.life, hue: i, bounces: ric ? 1 : 0 })
    }
    ev(S, { k: 'shot', w: 'confetti', team: t.id, x: mx, y: my, z: mz })
  } else if (W.kind === 'spring') {
    S.bullets.push({ ...base, type: 'spring', vx: dirx * W.speed * cp + c.vx * 0.3, vz: dirz * W.speed * cp + c.vz * 0.3, vy: W.speed * sp_ + 4, life: W.life, bounces: W.bounces + ric })
    ev(S, { k: 'shot', w: 'spring', team: t.id, x: mx, y: my, z: mz })
  } else if (W.kind === 'cork') {
    S.bullets.push({ ...base, type: 'cork', vx: dirx * W.speed * cp, vz: dirz * W.speed * cp, vy: W.speed * sp_, life: W.life, bounces: ric })
    ev(S, { k: 'shot', w: 'cork', team: t.id, x: mx, y: my, z: mz })
  } else {
    w.heat += 0.09; if (w.heat >= 1) { w.heat = 1; w.overT = 1.7; ev(S, { k: 'overheat', team: t.id, x: c.x, y: c.y, z: c.z }) }
    t.cd = W.cd * (w.heat > 0.7 ? 1.25 : 1)
    const sd = 0.012 + w.heat * 0.03, a = yaw + (S.rng() - 0.5) * 2 * sd, pp = pitch + (S.rng() - 0.5) * sd
    S.bullets.push({ ...base, type: 'paint', vx: Math.sin(a) * W.speed * Math.cos(pp), vz: Math.cos(a) * W.speed * Math.cos(pp), vy: Math.sin(pp) * W.speed, life: W.life, bounces: ric })
    ev(S, { k: 'shot', w: 'paint', team: t.id, x: mx, y: my, z: mz })
  }
}

// ---------------------------------------------------------------- 車の動き
function updateCar(S, c, dt) {
  const t = c.team >= 0 ? S.teams[c.team] : null
  const live = S.phase === 'play' && !S.over
  if (!c.alive) { c.wreckT += dt; stepBody(S, c, dt, null, null); return }
  let inp = null
  if (t && !t.out && t.car === c.id && t.inp) inp = t.inp
  if (!live) inp = null
  c.dmgFlash = Math.max(0, c.dmgFlash - dt); c.flashT = Math.max(0, c.flashT - dt)
  c.oilT = Math.max(0, c.oilT - dt)
  // ブースト残量
  const T = CAR_TYPES[c.type] || CAR_TYPES[0]
  const turbo = c.turboT > 0
  const boosting = !!(inp && (inp.boost || turbo) && (c.boost > 0 || turbo) && (!c.boostLock || turbo) && !c.air && (inp.throttle || 0) > 0)
  if (boosting && !turbo) { c.boost -= dt / (1.7 * T.boostK); if (c.boost <= 0) { c.boost = 0; c.boostLock = true } } else if (!boosting) { c.boost = Math.min(1, c.boost + dt / 6); if (c.boostLock && c.boost > 0.3) c.boostLock = false }
  c.boosting = boosting
  // 煙・火の段階（画面の演出用）
  stepBody(S, c, dt, inp, boosting)
}

function stepBody(S, c, dt, inp, boosting) {
  const T = CAR_TYPES[c.type] || CAR_TYPES[0]
  const hulk = !c.alive
  const spare = c.team < 0 && c.alive
  // 向きと速度
  const gE = 0.6
  if (!c.air) {
    let [fx, fz] = fwd(c)
    let sp = c.vx * fx + c.vz * fz
    const vmax = boosting ? T.maxF * 1.48 : T.maxF
    const thrIn = inp ? clamp(inp.throttle || 0, -1, 1) : 0
    c.hb += ((inp && inp.hb && Math.abs(sp) > 4 ? 1 : 0) - c.hb) * Math.min(1, 9 * dt)
    // ハンドル: ゆっくり切れて、ゆっくり戻る。重い車ほど鈍い
    const want = inp ? clamp(inp.steer || 0, -1, 1) : 0
    const rate = (Math.abs(want) > Math.abs(c.steer) || Math.sign(want) !== Math.sign(c.steer) && want !== 0 ? 2.4 : 1.8) * (1.15 - 0.2 * T.mass)
    const d = want - c.steer
    c.steer += Math.sign(d) * Math.min(Math.abs(d), rate * dt)
    // 曲がり: 切った角から目標の向きの回り方が決まり、車体の向きはそれに遅れてついてくる
    const spN = clamp(Math.abs(sp) / Math.max(10, vmax), 0, 1.3)
    const maxSteer = (0.62 - 0.4 * clamp(Math.abs(sp) / 30, 0, 1)) * T.steer
    const under = 1 - 0.42 * clamp(spN * spN * Math.abs(c.steer) * 1.4, 0, 1)         // 速い時に強く切ると前輪が負けて外へふくらむ
    const hard = clamp((Math.abs(c.steer) - 0.5) / 0.25, 0, 1) * clamp((Math.abs(sp) / vmax - 0.45) / 0.2, 0, 1) * (thrIn > 0.3 ? 1 : 0)  // 速い時の大きな舵は後ろが流れる（なめらかに効く）
    let yawT = sp * Math.tan(c.steer * maxSteer) / 2.7 * under * (1 + 0.16 * hard) * (1 + 0.55 * c.hb)
    c.yawRate += (yawT - c.yawRate) * (1 - Math.exp(-dt / T.yawTau))
    c.yaw -= c.yawRate * dt
    ;[fx, fz] = fwd(c)
    const rx = -Math.cos(c.yaw), rz = Math.sin(c.yaw)
    sp = c.vx * fx + c.vz * fz
    let lat = c.vx * rx + c.vz * rz
    // 踏み込みと離しにも慣性
    const k = thrIn > c.thr ? T.thrUp : T.thrDown
    c.thr += clamp(thrIn - c.thr, -k * dt, k * dt)
    const brkIn = thrIn < -0.02 ? 1 : 0
    c.brk += clamp(brkIn - c.brk, -8 * dt, 6 * dt)
    let ax = 0
    if (!hulk) {
      if (c.thr > 0.02 && thrIn > -0.02) {
        if (sp < -0.5) ax = 26
        else ax = T.acc * c.thr * (1 - Math.pow(Math.max(0, sp) / vmax, 3.4) * 0.92) + (boosting ? 14 : 0)
      } else if (c.brk > 0.05) {
        if (sp > 0.6) ax = -T.brake * c.brk; else ax = -10 * c.brk * (sp > -MAXR ? 1 : 0)
      } else {
        const drag = (inp ? T.roll * 1.45 : 6) + 0.0036 * sp * sp   // 離すと転がる。重い車ほど長く転がる
        ax = -Math.sign(sp) * Math.min(Math.abs(sp) / Math.max(dt, 1e-3), drag)
      }
      if (sp > vmax && ax < -5) ax = -5   // ブーストが切れた後は、ゆるやかに通常の最高速へ
      sp = Math.min(sp + ax * dt, Math.max(sp, vmax))
    } else sp -= Math.sign(sp) * Math.min(Math.abs(sp), 14 * dt)
    c.ax = ax
    // 横の滑り: 一気には止まらず、グリップが戻るまで流れる
    let grip = c.oilT > 0 ? 0.5 : T.grip
    grip *= (1 - 0.42 * clamp(Math.abs(c.steer) * Math.abs(sp) / 20, 0, 1) * (1 + 0.35 * hard)) * (1 - 0.86 * c.hb)
    if (c.hb > 0.3) sp -= Math.sign(sp) * 0.9 * c.hb * dt
    { const lat0 = lat; lat *= Math.exp(-grip * dt); if (sp > 2) sp += (Math.abs(lat0) - Math.abs(lat)) * 0.55 }   // 消した横の速さの一部は前へ戻る（曲がっても失速しすぎない）
    if (c.oilT > 0 && inp) c.yaw += (Math.sin(S.t * 7 + c.id) * 0.9) * dt * (Math.abs(sp) / 12)
    c.slip = Math.abs(lat)
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
    if (sp > 8 && c.alive) hurt(S, c, (sp - 7) * 1.3 * 0.6, null, c.x, c.z, 'cliff')
  }
  c.x = nx; c.z = nz
  // 壁
  const lim = WORLD - 3
  let hit = 0
  if (c.x > lim) { c.x = lim; if (c.vx > 0) { hit = c.vx; c.vx *= -0.5 } } else if (c.x < -lim) { c.x = -lim; if (c.vx < 0) { hit = -c.vx; c.vx *= -0.5 } }
  if (c.z > lim) { c.z = lim; if (c.vz > 0) { hit = Math.max(hit, c.vz); c.vz *= -0.5 } } else if (c.z < -lim) { c.z = -lim; if (c.vz < 0) { hit = Math.max(hit, -c.vz); c.vz *= -0.5 } }
  if (hit > 5) { if (c.alive) hurt(S, c, Math.max(0, (hit - 6)) * 1.2 * 0.6, null, c.x, c.z, 'wall'); ev(S, { k: 'wall', x: c.x, y: c.y + 1, z: c.z, power: hit }) }
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
    if (!pushOutCircle(cx, c.y, cz, carR(c), CAR_H, out)) continue
    let best = out[0]; for (const o of out) if (o[2] > best[2]) best = o
    for (const o of out) { c.x += o[0] * o[2] * 0.9; c.z += o[1] * o[2] * 0.9 }
    const vn = c.vx * best[0] + c.vz * best[1]
    if (vn < 0) {
      c.vx -= 1.5 * vn * best[0]; c.vz -= 1.5 * vn * best[1]; c.yawRate += (S.rng() - 0.5) * Math.min(2, -vn * 0.08)
      if (-vn > 4) { if (c.alive) hurt(S, c, Math.max(0, -vn - 6) * 1.4 * 0.6, null, cx, cz, 'obst'); ev(S, { k: 'wall', x: cx, y: c.y + 1, z: cz, power: -vn }) }
    }
  }
  c.speedKmh = Math.hypot(c.vx, c.vz) * 3.6
  // ひっくり返った壊れ車の回転
  if (hulk) { c.spin *= 1 - 1.5 * dt }
}

// ダメージ（車）。by は相手のチーム番号（null なら自爆）
const HOW_K = { bullet: 0.46, ram: 0.56, rocket: 0.42, mine: 0.9 }
export function hurt(S, c, dmg, by, x, z, how) {
  if (!c.alive || dmg <= 0 || c.invT > 0 || S.phase !== 'play' || S.over) return 0
  dmg *= (HOW_K[how] ?? 0.6) / (CAR_TYPES[c.type] || CAR_TYPES[0]).dur * (1 + clamp((S.tMatch - 120) / 240, 0, 0.6))
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
        const dx = px - qx, dz = pz - qz, d = Math.hypot(dx, dz), p = carR(A) + carR(B) - d
        if (p > pen && d > 1e-4) { pen = p; nx = dx / d; nz = dz / d; ax = (px + qx) / 2; az = (pz + qz) / 2 }
      }
      if (pen <= 0) continue
      const mA = (CAR_TYPES[A.type] || CAR_TYPES[0]).mass, mB = (CAR_TYPES[B.type] || CAR_TYPES[0]).mass
      const iA = A.alive ? 1 / mA : 0, iB = B.alive ? 1 / mB : 0, sum = iA + iB
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
          const spA = A.spearT > 0 && frontA > 0.55 ? 2.4 : 1, spB = B.spearT > 0 && frontB > 0.55 ? 2.4 : 1
          if (A.alive) { hurt(S, A, base * mult(frontA) * Math.sqrt(mB / mA) * spB, tB >= 0 ? tB : null, ax, az, 'ram') }
          if (B.alive) { hurt(S, B, base * mult(frontB) * Math.sqrt(mA / mB) * spA, tA >= 0 ? tA : null, ax, az, 'ram') }
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
    if (b.type === 'grenade') {   // 弧を描いて転がり、時間で爆発
      b.vy -= G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt
      const h = H(b.x, b.z)
      if (b.y < h + 0.15) { b.y = h + 0.15; if (b.vy < -2) { b.vy = -b.vy * 0.45; ev(S, { k: 'bounce', x: b.x, y: b.y, z: b.z }) } else b.vy = 0; b.vx *= 0.82; b.vz *= 0.82 }
      if (solidAtPoint(b.x, b.y, b.z) || Math.abs(b.x) > WORLD || Math.abs(b.z) > WORLD) { b.x = b.px; b.z = b.pz; b.vx *= -0.5; b.vz *= -0.5 }
      if (b.life <= 0) { if (b.flash) flashBurst(S, b.x, b.y, b.z, b.team); else explode(S, b.x, b.y, b.z, b.team, 6.5, 40, 'rocket'); B.splice(i, 1) }
      continue
    }
    if (b.type === 'rocket') {
      b.speed = Math.min(WEAPONS.rocket.speed, b.speed + 40 * dt)
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
    else if (b.type === 'spring') b.vy -= 14 * dt
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt
    let hitK = null, hitObj = null
    { const L = Math.hypot(b.x - b.px, b.z - b.pz, b.y - b.py), n = Math.ceil(L / 0.7); for (let k = 1; k < n && !hitK; k++) { const f = k / n, qx = b.px + (b.x - b.px) * f, qy = b.py + (b.y - b.py) * f, qz = b.pz + (b.z - b.pz) * f; if (solidAtPoint(qx, qy, qz) || qy < H(qx, qz)) { b.x = qx; b.y = qy; b.z = qz; break } } }
    if (Math.abs(b.x) > WORLD || Math.abs(b.z) > WORLD) { hitK = 'wall'; b.x = clamp(b.x, -WORLD, WORLD); b.z = clamp(b.z, -WORLD, WORLD) }
    else if (b.y < H(b.x, b.z)) { hitK = 'ground'; b.y = H(b.x, b.z) + 0.05 }
    else if (solidAtPoint(b.x, b.y, b.z)) hitK = 'obst'
    else if (b.y > 30) hitK = 'sky'
    // 反射（バネの鉄球・跳弾）
    if (hitK && hitK !== 'sky' && (b.bounces || 0) > 0) {
      b.bounces--
      if (hitK === 'ground') { b.vy = Math.abs(b.vy) * (b.type === 'spring' ? 0.9 : 0.8) + (b.type === 'spring' ? 3 : 0); if (b.type === 'rocket') b.yaw += 0 }
      else {
        b.x = b.px; b.y = b.py; b.z = b.pz
        if (Math.abs(b.px + b.vx * dt) > WORLD || solidAtPoint(b.px + b.vx * dt, b.py, b.pz)) b.vx = -b.vx; else b.vz = -b.vz
        if (b.type === 'rocket') b.yaw = Math.atan2(b.vx, b.vz)
        if (Math.abs(b.pz + b.vz * dt) > WORLD) b.vz = -b.vz
      }
      ev(S, { k: 'bounce', x: b.x, y: b.y, z: b.z })
      continue
    }
    if (!hitK) for (const c of S.cars) {
      if (c.team === b.team && c.team >= 0) continue
      if (b.y < c.y - 0.3 || b.y > c.y + 2.5) continue
      const cs = circles(c)
      for (const [cx, cz] of cs) if (segCircle(b.px, b.pz, b.x, b.z, cx, cz, carR(c) + 0.35) >= 0) { hitK = 'car'; hitObj = c; break }
      if (hitK) break
    }
    if (!hitK) for (const p of S.people) {
      if (p.state !== 'walk' || p.team === b.team || p.invT > 0) continue
      if (b.y < p.y - 0.2 || b.y > p.y + 2.1) continue
      if (segCircle(b.px, b.pz, b.x, b.z, p.x, p.z, 0.7) >= 0) { hitK = 'person'; hitObj = p; break }
    }
    if (!hitK) for (const tu of S.turrets) {
      if (tu.team === b.team || b.y < tu.y || b.y > tu.y + 1.8) continue
      if (segCircle(b.px, b.pz, b.x, b.z, tu.x, tu.z, 0.9) >= 0) { hitK = 'turret'; hitObj = tu; break }
    }
    if (hitK) {
      if (b.type === 'rocket') explode(S, b.x, b.y, b.z, b.team, WEAPONS.rocket.r, WEAPONS.rocket.dmg, 'rocket')
      else {
        const dmg = b.type === 'paint' ? WEAPONS.paint.dmg : b.type === 'confetti' ? WEAPONS.confetti.dmg : b.type === 'spring' ? WEAPONS.spring.dmg : b.type === 'cork' ? WEAPONS.cork.dmg : b.dmg || 2.6
        if (hitK === 'car') {
          const c = hitObj; if (c.alive) { const d = hurt(S, c, dmg, b.team, b.x, b.z, 'bullet'); if (d && b.team >= 0) S.teams[b.team].stats.hits++ }
          const m = Math.hypot(b.vx, b.vz) || 1; c.vx += b.vx / m * (b.type === 'cork' ? 1.6 : b.type === 'spring' ? 3.4 : 0.12); c.vz += b.vz / m * (b.type === 'cork' ? 1.6 : b.type === 'spring' ? 3.4 : 0.12)
        } else if (hitK === 'person') {
          const t = S.teams[hitObj.team]; t.footHp -= dmg * 1.4; t.footLast = { team: b.team, t: S.t }; if (b.team >= 0) S.teams[b.team].stats.hits++
        } else if (hitK === 'turret') { hitObj.hp -= dmg * 1.5; if (b.team >= 0) S.teams[b.team].stats.hits++ }
        ev(S, { k: 'bhit', w: b.type, what: hitK, team: b.team, x: b.x, y: b.y, z: b.z, vx: b.vx, vz: b.vz })
      }
      B.splice(i, 1); continue
    }
    if (b.life <= 0) { if (b.type === 'rocket') explode(S, b.x, b.y, b.z, b.team, WEAPONS.rocket.r, WEAPONS.rocket.dmg, 'rocket'); B.splice(i, 1) }
  }
}
// 閃光弾: 近いほど長く・強く。敵は最大約3秒、自分たち（投げた車も）は4割まで。壁ごしは半分
export const FLASH_R = 24
function flashBurst(S, x, y, z, by) {
  ev(S, { k: 'flash', x, y, z, team: by })
  for (const c of S.cars) {
    if (!c.alive || c.team < 0) continue
    const d = Math.hypot(c.x - x, c.z - z, c.y + 1.5 - y); if (d > FLASH_R) continue
    let dur = 3.0 * Math.pow(1 - d / FLASH_R, 0.8) + 0.25
    if (!lineClear(x, y, z, c.x, c.y + 1.5, c.z)) dur *= 0.5
    if (c.team === by) dur *= 0.4
    if (dur > c.flashT) { c.flashT = dur; c.flashDur = dur }
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
    if (c.alive || true) { c.vx += dx / dd * 16 * k; c.vz += dz / dd * 16 * k; if (c.alive && !c.air) { c.vy = 3 + 4 * k; c.air = true; c.airT = 0 } }
    if (!c.alive) c.spin += 1
  }
  for (const p of S.people) {
    if (p.state !== 'walk' || p.invT > 0) continue
    const d = Math.hypot(p.x - x, p.z - z, p.y - y)
    if (d < R) { const t = S.teams[p.team]; t.footHp -= dmg * 1.1 * (1 - d / R); t.footLast = { team: by, t: S.t }; const dd = Math.max(0.4, Math.hypot(p.x - x, p.z - z)); p.vx += (p.x - x) / dd * 8; p.vz += (p.z - z) / dd * 8; p.vy = 6; p.state = 'fly' }
  }
}

// ---------------------------------------------------------------- 地雷・オイル・煙幕・タレット
function updateGadgets(S, dt) {
  for (let i = S.smokes.length - 1; i >= 0; i--) { S.smokes[i].life -= dt; if (S.smokes[i].life <= 0) S.smokes.splice(i, 1) }
  for (let i = S.turrets.length - 1; i >= 0; i--) {
    const tu = S.turrets[i]; tu.life -= dt
    if (tu.life <= 0 || tu.hp <= 0) { ev(S, { k: 'turretEnd', x: tu.x, y: tu.y, z: tu.z, dead: tu.hp <= 0 }); S.turrets.splice(i, 1); continue }
    tu.cd -= dt
    let best = null, bd = 42
    for (const c of S.cars) { if (!c.alive || c.team === tu.team || c.team < 0) continue; const d = Math.hypot(c.x - tu.x, c.z - tu.z); if (d < bd && lineClear(tu.x, tu.y + 1.2, tu.z, c.x, c.y + 1.2, c.z) && !smokeBlocks(S, tu.x, tu.z, c.x, c.z)) { bd = d; best = c } }
    if (best) {
      const want = Math.atan2(best.x + best.vx * 0.3 - tu.x, best.z + best.vz * 0.3 - tu.z); tu.yaw += clamp(angDiff(want, tu.yaw), -3.2 * dt, 3.2 * dt)
      if (tu.cd <= 0 && Math.abs(angDiff(want, tu.yaw)) < 0.12) { tu.cd = 0.16; const a = tu.yaw + (S.rng() - 0.5) * 0.05; S.bullets.push({ type: 'paint', team: tu.team, x: tu.x, y: tu.y + 1.3, z: tu.z, px: tu.x, py: tu.y + 1.3, pz: tu.z, vx: Math.sin(a) * 56, vz: Math.cos(a) * 56, vy: 0, life: 1, id: UID++ }); ev(S, { k: 'shot', w: 'paint', team: tu.team, x: tu.x, y: tu.y + 1.3, z: tu.z }) }
    }
  }
}
function updateMines(S, dt) {
  updateGadgets(S, dt)
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
      const t = S.teams[c.team], IT = ITEMS[p.type]
      if (p.type === 'repair') { const before = c.hp; c.hp = Math.min(100, c.hp + 45); ev(S, { k: 'repair', team: t.id, x: c.x, y: c.y, z: c.z, gain: c.hp - before }) }
      else {
        const slot = IT.role === 'D' ? 'iD' : 'iG'
        if (t[slot] && t[slot].type === p.type) t[slot].ammo += IT.ammo; else t[slot] = { type: p.type, ammo: IT.ammo }
        ev(S, { k: 'pickup', team: t.id, type: p.type, role: IT.role, x: p.x, y: H(p.x, p.z), z: p.z })
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
        p.x = clamp(p.x, -WORLD + 1.5, WORLD - 1.5); p.z = clamp(p.z, -WORLD + 1.5, WORLD - 1.5)
        const h = H(p.x, p.z)
        if (p.y <= h) { p.y = h; p.state = 'walk'; p.vx = p.vz = p.vy = 0; p.invT = Math.max(p.invT, 1.2); ev(S, { k: 'plant', x: p.x, y: p.y, z: p.z }) }
        else if (solidAtPoint(p.x, p.y + 0.5, p.z)) { p.vx *= -0.3; p.vz *= -0.3 }
      }
    }
    if (p0.state !== 'walk' && p1.state !== 'walk') continue
    // 歩き
    const wx = inp.walkX || 0, wz = inp.walkZ || 0, wl = Math.hypot(wx, wz)
    const spd = live ? 7.6 : 0
    for (const p of t.p) {
      if (p.state !== 'walk') continue
      let dx = 0, dz = 0
      if (p === p0) { if (wl > 0.05) { dx = wx / Math.max(1, wl) * spd; dz = wz / Math.max(1, wl) * spd; p.yaw = Math.atan2(dx, dz) } }
      else { const ex = p0.x - p.x - 1.6, ez = p0.z - p.z + 1.2, d = Math.hypot(ex, ez); if (d > 1.2 && p0.state === 'walk') { dx = ex / d * Math.min(spd * 1.05, d * 3); dz = ez / d * Math.min(spd * 1.05, d * 3); p.yaw = Math.atan2(dx, dz) } }
      let nx = p.x + dx * dt, nz = p.z + dz * dt
      if (H(nx, nz) - p.y > 0.7) { if (H(nx, p.z) - p.y <= 0.7) nz = p.z; else if (H(p.x, nz) - p.y <= 0.7) nx = p.x; else { nx = p.x; nz = p.z } }
      p.x = clamp(nx, -WORLD + 1.5, WORLD - 1.5); p.z = clamp(nz, -WORLD + 1.5, WORLD - 1.5)
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
  c.team = t.id; t.car = c.id; t.walking = false; c.hp = Math.max(c.hp, 70); c.invT = 1.4; c.gunYaw = c.yaw; c.boost = 1; for (const w of t.ws) { w.mag = WEAPONS[w.id].mag; w.reloadT = 0; w.heat = 0; w.overT = 0 }
  for (const p of t.p) p.state = 'ride'
  if (c.spot >= 0) { S.respawns.push({ spot: c.spot, t: 14 }); c.spot = -1 }
  ev(S, { k: 'board', team: t.id, x: c.x, y: c.y, z: c.z, id: c.id })
}

// ---------------------------------------------------------------- 問い合わせ（人の照準補助・CPU が使う）
// 煙幕が、a から b への線をさえぎるか
export function smokeBlocks(S, ax, az, bx, bz) {
  for (const m of S.smokes) {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1; let t = ((m.x - ax) * dx + (m.z - az) * dz) / l2; t = clamp(t, 0, 1)
    if (Math.hypot(ax + dx * t - m.x, az + dz * t - m.z) < m.r * 0.85) return true
  }
  return false
}
export function enemiesOf(S, team) { return S.cars.filter(c => c.alive && c.team >= 0 && c.team !== team) }
// 人が狙う時の補助: 照準の近く(±cone)にいる敵を探して、先読みした向きを返す
export function assistAim(S, car, yaw, cone = 0.14, range = 70) {
  let best = null, bs = 1e9
  const my = car.y + 2.15
  for (const c of S.cars) {
    if (!c.alive || c.team === car.team || c.team < 0) continue
    const dx = c.x - car.x, dz = c.z - car.z, d = Math.hypot(dx, dz); if (d > range || d < 3) continue
    const lead = d / WEAPONS.paint.speed
    const ax = c.x + c.vx * lead - car.x, az = c.z + c.vz * lead - car.z
    const a = Math.atan2(ax, az), dv = angDiff(a, yaw)
    if (Math.abs(dv) > cone + 1.5 / d) continue
    if (!lineClear(car.x, my, car.z, c.x, c.y + 1.2, c.z) || smokeBlocks(S, car.x, car.z, c.x, c.z)) continue
    if (Math.abs(dv) + d * 0.0015 < bs) { bs = Math.abs(dv) + d * 0.0015; best = { c, yaw: a, d, pitch: Math.atan2(c.y + 1.2 - my, d) } }
  }
  return best
}
export function standings(S) {
  const key = t => t.out ? -1000 + t.outT : 1000 + t.stock * 100 + t.kills * 3
  return [...S.teams].sort((a, b) => key(b) - key(a))
}

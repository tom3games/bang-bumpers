import re
s=open('js/sim.js').read()
def rep_fn(name, new):
    global s
    m=re.search(r'(export )?function '+name+r'\(', s); assert m, name
    a=m.start()
    n=re.search(r'\n(?=(export )?(function |const |let |// -{10}))', s[a+10:])
    b=a+10+n.start()+1
    s=s[:a]+new.rstrip('\n')+'\n'+s[b:]

# ---- createState + pickType
a=s.index("export function createState"); b=s.index("export const carById")
s=s[:a]+'''export function randLoadout(rng) {
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
const PICK_W = [['turbo', 2], ['spear', 2], ['oil', 2], ['mine', 2], ['repair', 3], ['grenade', 3], ['smoke', 2], ['ricochet', 2], ['turret', 2]]
function pickType(S) { let r = S.rng() * 20, a = 0; for (const [k, w] of PICK_W) { a += w; if (r < a) return k } return 'repair' }
'''+s[b:]

# ---- step(): go event after prep
s=s.replace("if (S.cd > 0) { S.cd -= dt; if (S.cd <= 0) { S.phase = 'play'; ev(S, { k: 'go' }) } else { const n = Math.ceil(S.cd); if (n !== S.lastCd) { S.lastCd = n; ev(S, { k: 'count', n }) } } }","if (S.cd > 0) { S.cd -= dt; if (S.cd <= 0) { S.phase = 'play'; ev(S, { k: 'go' }) } else { const n = Math.ceil(S.cd); if (n !== S.lastCd) { S.lastCd = n; ev(S, { k: 'count', n }) } } }\n  if (S.phase === 'prep' && S.cd <= 0) S.phase = 'play'")

# ---- teamControl + fire
a=s.index("function teamControl("); b=s.index("// ---------------------------------------------------------------- 車の動き")
s=s[:a]+'''function teamControl(S, t, inp, dt, live) {
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
  else if (it.type === 'smoke') { const px = c.x + dx * 9, pz = c.z + dz * 9; S.smokes.push({ x: px, z: pz, y: H(px, pz), r: 7.5, life: 10, team: t.id, id: UID++ }); ev(S, { k: 'smoke', team: t.id, x: px, y: H(px, pz), z: pz }) }
  else if (it.type === 'ricochet') { t.ricT = 14; ev(S, { k: 'ricochet', team: t.id, x: c.x, y: c.y, z: c.z }) }
  else if (it.type === 'turret') { const px = c.x + dx * 4, pz = c.z + dz * 4; if (!solidAtPoint(px, c.y + 1, pz)) S.turrets.push({ team: t.id, x: px, z: pz, y: H(px, pz), yaw: c.gunYaw, hp: 40, life: 18, cd: 0.5, id: UID++ }); ev(S, { k: 'turret', team: t.id, x: px, y: H(px, pz), z: pz }) }
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
    S.bullets.push({ ...base, type: 'rocket', vx: dirx * 12 * cp, vz: dirz * 12 * cp, vy: 12 * sp_, speed: 12, yaw, life: W.life })
    ev(S, { k: 'shot', w: 'rocket', team: t.id, x: mx, y: my, z: mz })
  } else if (W.kind === 'confetti') {
    for (let i = 0; i < W.n; i++) {
      const a = yaw + (S.rng() - 0.5) * W.spread * 2, v = W.speed * (0.8 + S.rng() * 0.35), pp = pitch + (S.rng() - 0.5) * 0.1
      S.bullets.push({ ...base, id: UID++, type: 'confetti', vx: Math.sin(a) * v * Math.cos(pp), vz: Math.cos(a) * v * Math.cos(pp), vy: Math.sin(pp) * v, life: W.life, hue: i })
    }
    ev(S, { k: 'shot', w: 'confetti', team: t.id, x: mx, y: my, z: mz })
  } else if (W.kind === 'spring') {
    S.bullets.push({ ...base, type: 'spring', vx: dirx * W.speed * cp + c.vx * 0.3, vz: dirz * W.speed * cp + c.vz * 0.3, vy: W.speed * sp_ + 4, life: W.life, bounces: W.bounces })
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

'''+s[b:]

# ---- updateCar: turbo
s=s.replace("const boosting = !!(inp && inp.boost && c.boost > 0 && !c.boostLock && !c.air && (inp.throttle || 0) > 0)\n  if (boosting) { c.boost -= dt / 1.7; if (c.boost <= 0) { c.boost = 0; c.boostLock = true } } else { c.boost = Math.min(1, c.boost + dt / 6); if (c.boostLock && c.boost > 0.3) c.boostLock = false }",
"const T = CAR_TYPES[c.type] || CAR_TYPES[0]\n  const turbo = c.turboT > 0\n  const boosting = !!(inp && (inp.boost || turbo) && (c.boost > 0 || turbo) && (!c.boostLock || turbo) && !c.air && (inp.throttle || 0) > 0)\n  if (boosting && !turbo) { c.boost -= dt / (1.7 * T.boostK); if (c.boost <= 0) { c.boost = 0; c.boostLock = true } } else if (!boosting) { c.boost = Math.min(1, c.boost + dt / 6); if (c.boostLock && c.boost > 0.3) c.boostLock = false }")
# ---- stepBody: type params
s=s.replace("function stepBody(S, c, dt, inp, boosting) {\n  const hulk = !c.alive","function stepBody(S, c, dt, inp, boosting) {\n  const T = CAR_TYPES[c.type] || CAR_TYPES[0]\n  const hulk = !c.alive")
s=s.replace("const vmax = boosting ? BOOST_MAXF : MAXF","const vmax = boosting ? T.maxF * 1.48 : T.maxF")
s=s.replace("const maxSteer = 0.62 - 0.4 * clamp(Math.abs(sp) / 30, 0, 1)","const maxSteer = (0.62 - 0.4 * clamp(Math.abs(sp) / 30, 0, 1)) * T.steer")
s=s.replace("const a = 15 * (1 - Math.pow(Math.max(0, sp) / vmax, 2) * 0.85) + (boosting ? 16 : 0)","const a = T.acc * (1 - Math.pow(Math.max(0, sp) / vmax, 2) * 0.85) + (boosting ? 16 : 0)")
s=s.replace("const grip = c.oilT > 0 ? 0.5 : 7.5","const grip = c.oilT > 0 ? 0.5 : T.grip")
# ---- hurt: durability
s=s.replace("  dmg *= HOW_K[how] ?? 0.6\n","  dmg *= (HOW_K[how] ?? 0.6) / (CAR_TYPES[c.type] || CAR_TYPES[0]).dur\n")
open('js/sim.js','w').write(s)

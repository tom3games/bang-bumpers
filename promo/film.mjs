import '../mute-auto.mjs'   // ブラウザでは絶対に音を出さない。音は記録して ffmpeg で後から重ねる
// X 用の縦長プレイ動画（1080x1920・30fps）。node promo/film.mjs   SCENES=1,2,3,4,5,6 で一部だけ（確認用）
// 1) 準備10秒カウントで車と銃を選ぶ 2) 2人1組で走り出す 3) ドリフト 4) 体当たり→煙→爆発→放り出し 5) 槍と手榴弾 6) 勝ち→題名
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { serve, open, Recorder, mix, encode, inspect, stills } from '../../_shared/promo-film.mjs'

const ROOT = new URL('..', import.meta.url).pathname
const SLUG = 'bang-bumpers'
const TMP = process.env.FRAMES || join(tmpdir(), `${SLUG}-frames-${Date.now()}`)
const OUT_DIR = join(homedir(), 'Desktop/バカゲー動画'); mkdirSync(OUT_DIR, { recursive: true })
const SC = (process.env.SCENES || '1,2,3,4,5,6,7').split(',').map(Number)
const SEED = process.env.SEED || 5

const srv = await serve(ROOT)
const { b, p, errs } = await open({ chromium, port: srv.port, path: `/?seed=${SEED}&touch=0`, ready: '__bbReady' })
await p.evaluate(() => { const F = window.__film; F.hookSnd(); F.on() })
await p.addStyleTag({ content: `#hint,#muteT,#langT{display:none!important}
#cap{position:fixed;left:0;right:0;top:19%;display:flex;justify-content:center;z-index:99998;pointer-events:none}
#cap b{display:inline-block;padding:6px 22px 8px;background:#f2c230;color:#15130f;font:900 36px "Zen Kaku Gothic New","Hiragino Sans",sans-serif;letter-spacing:.06em;transform:rotate(-2deg);box-shadow:0 6px 0 #15130f,0 10px 30px rgba(0,0,0,.35)}
body.endc #title .tape{zoom:1.3}
body.endc #title .foot{display:none!important}
body.endc #title .pick,body.endc #title .how,body.endc #title .tape b:nth-child(2){display:none!important}` })
await p.evaluate(() => {
  const S2 = window.S2 = {}
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a))
  S2.cap = t => { let e = document.getElementById('cap'); if (!e) { e = document.createElement('div'); e.id = 'cap'; document.body.appendChild(e) } e.innerHTML = t ? `<b>${t}</b>` : '' }
  S2.st = () => __bb.S()
  S2.me = () => { const s = __bb.S(); return s.cars.find(c => c.id === s.teams[0].car) }
  S2.en = () => { if (S2.eCar) return S2.eCar; const s = __bb.S(); const ids = [S2.et || 1, 1, 2, 3, 4]; for (const i of ids) { const c = s.cars.find(c => c.id === s.teams[i].car && c.alive); if (c) { S2.eT = i; return c } } return null }
  S2.put = (c, x, z, yaw, sp = 0) => { c.x = x; c.z = z; c.yaw = yaw; c.vx = Math.sin(yaw) * sp; c.vz = Math.cos(yaw) * sp; c.vy = 0; c.air = false; c.px = x; c.pz = z; c.pyaw = yaw; c.gunYaw = yaw; c.pgun = yaw; c.invT = Math.max(c.invT, 0.5) }
  // 1コマごと
  S2.tick = (F, a) => {
    const s = __bb.S(), K = __bb.K, c = S2.me(), e = S2.en()
    K.keys = K.keys || {}
    if (S2.pursue && c && e && e.alive) {
      const d = Math.hypot(e.x - c.x, e.z - c.z), lead = Math.min(1.2, d / 18)
      const bx = e.x + e.vx * lead - c.x, bz = e.z + e.vz * lead - c.z, err = wrap(Math.atan2(bx, bz) - c.yaw)
      K.keys.gas = true; K.keys.right = err < -0.05; K.keys.left = err > 0.05
      K.keys.boost = d > 14 && Math.abs(err) < 0.3
    }
    if (S2.script) for (const [f, fn] of S2.script) if (!fn.done && F.f - S2.f0 >= f) { fn.done = true; fn(s, c, e) }
    if (S2.cam) { const o = S2.cam(F, s, c, e); if (o) window.__bbCam = o } else window.__bbCam = null
    F.gain('eng', c && c.alive && s.phase === 'play' ? 0.05 + Math.min(1, Math.hypot(c.vx, c.vz) / 22) * 0.28 : 0)
    return S2.done ? !!S2.done(F, s, c, e) : false
  }
  window.__film.rec.push({ k: 'l', t: 0, slot: 'eng', url: 'snd/eng_mid.wav', vol: 0.2, fade: 0.2 })
})
const rec = new Recorder(p, TMP)
const T = (done, o = {}) => p.evaluate(d => { S2.f0 = __film.f; S2.done = (0, eval)('(' + d + ')') }, done.toString()).then(() => rec.run((F, a) => window.S2.tick(F, a), o))
const FF = (done, o = {}) => T(done, { ...o, ff: true })
const ev = (f, a) => p.evaluate(f, a)
const click = sel => ev(s => document.querySelector(s).click(), sel)
const marks = {}
const mark = k => { marks[k] = +rec.sec.toFixed(2) }

await FF(F => (F.q = (F.q || 0) + 1) > 60, { max: 70 })

// ---------------------------------------------------------------- 場面1: 準備10秒（車と銃を選ぶ）
if (SC.includes(1)) {
  mark('s1')
  await ev(() => { __bb.startMatch('drive'); S2.cap('車と銃を選ぶ') })
  await T(F => F.f - S2.f0 > 22)
  await ev(() => document.querySelectorAll('#pcards .card')[1].click())
  await T(F => F.f - S2.f0 > 20)
  await ev(() => document.querySelectorAll('#pcards .card')[2].click())
  await T(F => F.f - S2.f0 > 30)
  await ev(() => { __bb.startMatch('shoot'); __bb.S().cd = 6.4; S2.cap('車と銃を選ぶ') })
  await T(F => F.f - S2.f0 > 18)
  await ev(() => document.querySelectorAll('#pcards .card')[4].click())   // コルク砲
  await T(F => F.f - S2.f0 > 16)
  await ev(() => document.querySelectorAll('#pcards .card')[3].click())   // バネの鉄球
  await T(F => F.f - S2.f0 > 36)
  await ev(() => { S2.cap('') })
}

// ---------------------------------------------------------------- 本番の試合（運転で出る）
await ev(() => { __bb.startMatch('drive'); __bb.S().cd = 2.6 })
await FF(F => F.f - S2.f0 > 6, { max: 10 })
await ev(() => document.querySelectorAll('#pcards .card')[2].click())

// 場面2: 走り出す
if (SC.includes(2)) {
  mark('s2')
  await ev(() => { S2.cap('2人で1台') })
  await T(F => __bb.phase() === 'play' && __bb.S().tMatch > 0.2, { max: 200 })
  await ev(() => { __bb.K.keys.gas = true })
  await T(F => F.f - S2.f0 > 44, { max: 100 })
  await ev(() => { S2.cap('') })
}

// 共通: 本番で 3 秒走らせてから場面を作る
const sideCam = (F, s, c, e) => { const w = e.alive ? 0.5 : 0, mx = e.x + (c.x - e.x) * w, mz = e.z + (c.z - e.z) * w, dx = (e.alive ? e.x - c.x : 1), dz = (e.alive ? e.z - c.z : 0), l = Math.hypot(dx, dz) || 1, px = -dz / l, pz = dx / l, k = S2.sideK || 1, y = Math.max(c.y, e.y); return { p: [mx + px * 11 * k - dx / l * 3, y + 4.6, mz + pz * 11 * k - dz / l * 3], l: [mx, y + 1.1, mz], fov: 58 } }
await ev(() => { S2.cap(''); __bb.K.keys.gas = false })
const stage = (o) => ev(o0 => {
  const s = __bb.S(), c = S2.me(), K = __bb.K
  S2.et = o0.et; S2.eCar = null; const e = S2.en(); S2.eCar = e
  for (const k in K.keys) K.keys[k] = false
  c.invT = 1e6; c.hp = 100; c.boost = 1
  const y0 = o0.yaw
  S2.put(c, o0.x, o0.z, y0, 14)
  S2.put(e, o0.x + Math.sin(y0) * o0.ahead + Math.cos(y0) * o0.side, o0.z + Math.cos(y0) * o0.ahead - Math.sin(y0) * o0.side, o0.eyaw ?? y0 + 3.14, o0.esp ?? 0)
  e.hp = o0.ehp; e.invT = 1e6
  S2.pursue = !!o0.pursue; S2.script = null; S2.cam = null
}, o)
await p.evaluate(src => { window.__sideCam = (0, eval)('(' + src + ')') }, sideCam.toString())
const here = () => ev(() => { const c = S2.me(); return { x: c.x, z: c.z, yaw: c.yaw } })
await FF(F => __bb.phase() === 'play' && __bb.S().tMatch > 3, { max: 400 })
const P0 = { x: -11, z: 80, yaw: Math.PI / 2 }; const _p0 = await here(); console.log('P0', P0, _p0, await ev(() => { const s = __bb.S(); return s.teams.map(t => [t.car, t.out, t.stock]) }))

// ---------------------------------------------------------------- 場面3: ドリフト
if (SC.includes(3)) {
  mark('s3')
  await stage({ et: 1, x: P0.x, z: P0.z, yaw: P0.yaw, ahead: 14, side: 30, ehp: 100 })
  await ev(() => {
    S2.cap('ドリフトで回り込む')
    S2.cam = (F, s, c) => { const f = [Math.sin(c.yaw), Math.cos(c.yaw)], r = [Math.cos(c.yaw), -Math.sin(c.yaw)]; return { p: [c.x + r[0] * 11 - f[0] * 5, c.y + 5, c.z + r[1] * 11 - f[1] * 5], l: [c.x + f[0] * 2, c.y + 0.9, c.z + f[1] * 2], fov: 60 } }
    S2.script = [
      [4, () => { const K = __bb.K; K.keys.gas = true; K.keys.boost = true }],
      [12, () => { const K = __bb.K; K.keys.left = true; K.keys.fire = true }],
      [34, () => { const K = __bb.K; K.keys.left = false; K.keys.right = true }],
      [50, () => { const K = __bb.K; K.keys.right = false; K.keys.fire = false }],
    ]
  })
  await T(F => F.f - S2.f0 > 72, { max: 90 })
  await ev(() => { for (const k in __bb.K.keys) __bb.K.keys[k] = false; S2.cap(''); S2.cam = null; S2.script = null })
}

// ---------------------------------------------------------------- 場面4: 体当たり → 煙 → 黒煙 → 爆発
if (SC.includes(4)) {
  mark('s4')
  const q = P0
  await stage({ et: 1, x: q.x, z: q.z, yaw: q.yaw, ahead: 13, side: 7, ehp: 90, eyaw: q.yaw - 1.57, esp: 9, pursue: true })
  await ev(() => {
    S2.cap('ぶつけて壊す'); S2.sideK = 1
    S2.cam = (F, s, c, e) => (window.__sideCam || (() => null))(F, s, c, e)
    const hurtTo = (v) => (s, c, e) => { if (e.alive && e.hp > v) e.hp = v; e.lastHit = { team: 0, t: s.t } }
    S2.script = [[24, hurtTo(62)], [38, hurtTo(36)], [52, hurtTo(17)], [66, (s, c, e) => { e.lastHit = { team: 0, t: s.t }; e.hp = 0 }]]
  })
  await T(F => F.f - S2.f0 > 128, { max: 150 })
  await ev(() => { S2.pursue = false; for (const k in __bb.K.keys) __bb.K.keys[k] = false; S2.cap(''); S2.cam = null; S2.script = null })
}

const hurtTo = `(v) => (s, c, e) => { if (e.alive && e.hp > v) e.hp = v; e.lastHit = { team: 0, t: s.t } }`
await ev(src => { window.__hurtTo = (0, eval)(src) }, hurtTo)

// ---------------------------------------------------------------- 場面5: 槍と手榴弾
if (SC.includes(5)) {
  mark('s5')
  await stage({ et: 2, x: P0.x + 2, z: P0.z, yaw: P0.yaw, ahead: 15, side: 3, ehp: 90, eyaw: P0.yaw, esp: 5, pursue: true })
  await ev(() => {
    const s = __bb.S(), t = s.teams[0]
    t.iD = { type: 'spear', ammo: 1 }; t.iG = { type: 'grenade', ammo: 3 }
    S2.cap('槍と手榴弾'); S2.sideK = 1
    S2.cam = (F, s, c, e) => window.__sideCam(F, s, c, e)
    S2.script = [
      [6, () => { __bb.K.use = true }],
      [40, (s, c, e) => { e.lastHit = { team: 0, t: s.t }; if (e.hp > 40) e.hp = 40 }],
      [52, (s, c, e) => { e.lastHit = { team: 0, t: s.t }; e.hp = 0 }],
    ]
  })
  await T(F => F.f - S2.f0 > 80, { max: 100 })
  await ev(() => { S2.pursue = false; for (const k in __bb.K.keys) __bb.K.keys[k] = false; S2.cap(''); S2.cam = null; S2.script = null })
}

// ---------------------------------------------------------------- 場面6: 最後の1台 → 勝ち
if (SC.includes(6)) {
  mark('s6')
  await ev(() => {
    const s = __bb.S(); S2.eCar = null
    // 残りの3チームはここで脱落させる（敵は1チームだけ残す）
    const keep = 3
    s.teams[keep].stock = 1
    for (const t of s.teams) { if (t.id === 0 || t.id === keep || t.out) continue; t.stock = 1; const car = s.cars.find(c => c.id === t.car); if (car && car.alive) { car.invT = 0; car.lastHit = { team: 0, t: s.t }; car.hp = 0 } else t.footHp = 0 }
  })
  await FF(F => __bb.S().teams.filter(t => !t.out).length <= 2, { max: 120 })
  await stage({ et: 3, x: P0.x, z: P0.z, yaw: P0.yaw, ahead: 15, side: 6, ehp: 90, eyaw: P0.yaw - 1.57, esp: 7, pursue: true })
  await ev(() => {
    S2.cap('最後まで走れ'); S2.sideK = 1
    S2.cam = (F, s, c, e) => window.__sideCam(F, s, c, e)
    S2.script = [
      [26, (s, c, e) => { e.lastHit = { team: 0, t: s.t }; if (e.hp > 40) e.hp = 40 }],
      [44, (s, c, e) => { e.lastHit = { team: 0, t: s.t }; e.hp = 0 }],
    ]
  })
  await T(F => F.f - S2.f0 > 60, { max: 80 })
  await ev(() => { S2.pursue = false; for (const k in __bb.K.keys) __bb.K.keys[k] = false; S2.cap(''); S2.cam = null })
  await FF(F => __bb.phase() === 'result', { max: 400 })
  await T(F => F.f - S2.f0 > 42, { max: 60 })
}

// ---------------------------------------------------------------- 場面7: 題名
if (SC.includes(7)) {
  mark('s7')
  await ev(() => { __bb.toTitle(); document.body.classList.add('endc'); S2.cap(''); window.__bbCam = null })
  await T(F => F.f - S2.f0 > 78, { max: 90 })
}

const log = await p.evaluate(() => ({ rec: window.__film.rec, gains: window.__film.gains, notes: window.__film.notes }))
await b.close(); srv.close()
const dur = rec.sec
const wav = join(TMP, 'mix.wav'), out = process.env.OUT || join(OUT_DIR, `${SLUG}-x-1080x1920.mp4`)
mix({ rec: log.rec, gains: log.gains, dur, root: ROOT, out: wav, skip: e => e.slot === 'bgm' })
encode({ frames: TMP, wav, out })
const info = inspect(out)
const times = []; for (let t = 0.5; t < dur; t += 1.5) times.push(t)
const st = stills(out, times, join(TMP, 'still'))
writeFileSync(join(ROOT, 'promo/film-log.json'), JSON.stringify({ marks, info, errs, frames: TMP, stills: st }, null, 1))
console.log(JSON.stringify({ out, dur, marks, info, errs: errs.slice(0, 8) }, null, 1))

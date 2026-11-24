// 運転の重さを数字で確かめる（ブラウザなし）。node tools/feel.mjs
import { createState, step, DT, CAR_TYPES } from '../js/sim.js'
const run = (type, script, secs, setup) => {
  const S = createState(3, { noCountdown: true, prepSec: 0 }); const t = S.teams[0], c = S.cars.find(q => q.id === t.car)
  c.type = type; c.x = -80; c.z = 20; c.y = 0; c.yaw = Math.PI / 2; c.vx = c.vz = 0; S.T = 1e9; for (const o of S.cars) if (o !== c) { o.x = -90 - o.id; o.z = -90; o.invT = 99 }
  setup && setup(c, S)
  const rec = []
  for (let i = 0; i < secs * 60; i++) { const tt = i / 60; const inp = script(tt, c); step(S, { 0: { aim: 0, ...inp } }, DT); S.events.length = 0; rec.push({ t: tt, sp: Math.hypot(c.vx, c.vz), yaw: c.yaw, c: { ...c } }) }
  return rec
}
const fmt = x => x.toFixed(2)
for (const [i, T] of CAR_TYPES.entries()) {
  const acc = run(i, () => ({ throttle: 1, steer: 0 }), 5.8)
  const t80 = acc.find(r => r.sp >= T.maxF * 0.8)?.t
  const t50 = acc.find(r => r.sp >= T.maxF * 0.5)?.t
  const coast = run(i, (t) => ({ throttle: 0, steer: 0 }), 12, c => { c.vx = T.maxF * 0.95; c.vz = 0 })
  const tc = coast.find(r => r.sp <= 5)?.t
  const brake = run(i, () => ({ throttle: -1, steer: 0 }), 6, c => { c.vx = T.maxF * 0.95 }); const tb = brake.find(r => r.sp <= 1)?.t
  // 旋回の遅れ: 速度15で右いっぱい → 向きの回り始めの遅れと、外へふくらむ量
  const turn = run(i, (t) => ({ throttle: 0.6, steer: t > 0.3 ? 1 : 0 }), 4, c => { c.vz = -Math.min(15, T.maxF * 0.8); c.thr = 0.6 })
  const y0 = turn[0].yaw, tr = turn.find(r => Math.abs(r.yaw - y0) > 0.1)?.t, slipMax = Math.max(...turn.map(r => r.c.slip))
  const cor = run(i, (t) => ({ throttle: 1, steer: t > 0.3 ? 1 : 0 }), 3.5, c => { c.x = -22; c.z = -22; c.yaw = Math.PI / 2; c.vx = T.maxF * 0.95; c.vz = 0; c.thr = 1 }); const spEnd = cor[cor.length - 1].sp
  console.log(`${T.name.padEnd(5)} 全開で右いっぱい3秒後の速さ ${fmt(spEnd)}m/s（出だし ${fmt(T.maxF * 0.95)}）`)
  console.log(`${T.name.padEnd(5)} 最高速${T.maxF} 50%まで${fmt(t50)}s 80%まで${t80 ? fmt(t80) : '届かず'}s ／ 離して5m/sまで${tc ? fmt(tc) : '12s超'}s ／ 全力ブレーキで止まる${tb ? fmt(tb) : '6s超'}s ／ 切り始めから向きが0.1rad変わるまで${tr ? fmt(tr - 0.3) : '-'}s 最大横滑り${fmt(slipMax)}m/s`)
}
// 旋回半径と横滑りの角度（速度15m/s・舵いっぱい／半分）
for (const [i, T] of CAR_TYPES.entries()) {
  const out = []
  for (const st of [1, 0.5]) {
    const r = run(i, () => ({ throttle: 0.55, steer: st }), 3.2, c => { c.x = -22; c.z = -22; c.yaw = Math.PI / 2; c.vx = 15; c.vz = 0; c.thr = 0.55 })
    const tail = r.slice(-30), yr = tail.map(x => Math.abs(x.c.yawRate)).reduce((a, b) => a + b, 0) / tail.length, sp = tail.map(x => x.sp).reduce((a, b) => a + b, 0) / tail.length
    const slipAng = Math.max(...r.map(x => Math.atan2(x.c.slip, Math.max(3, x.sp)) * 57.3))
    out.push(`舵${st}: 半径${fmt(sp / Math.max(0.01, yr))}m 最大横滑り角${slipAng.toFixed(1)}度`)
  }
  console.log(`${T.name.padEnd(5)} 旋回（速度15付近） ${out.join(' ／ ')}`)
}
// 質量差: 軽い車(ビュン)が重い車(ドスン)へ正面10m/sで当たる
{ const S = createState(5, { noCountdown: true, prepSec: 0 }); S.T = 1e9; const a = S.cars[0], b = S.cars[1]; for (const c of S.cars) if (c !== a && c !== b) { c.x = -90 - c.id; c.z = -90 } ; a.invT = b.invT = 0
  a.type = 1; b.type = 2; a.x = 99; a.z = 40; a.yaw = 0; a.vz = 10; b.x = 99; b.z = 46; b.yaw = Math.PI; b.vz = -10; for (const c of S.cars) { c.y = 0 }
  for (let i = 0; i < 80; i++) { a.invT = b.invT = 0; step(S, {}, DT); S.events.length = 0 }
  console.log(`正面衝突 軽い車(速度10→)${fmt(a.vz)} 重い車(速度-10→)${fmt(b.vz)} HP ビュン${a.hp.toFixed(0)} ドスン${b.hp.toFixed(0)}`) }

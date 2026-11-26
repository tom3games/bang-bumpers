// アクセルを離した後の惰性を数字で見る（ブラウザなし）。node tools/coast.mjs
// 2026-11-26 本人「アクセル離してるのに、しばらくスピードも落ちずに、けっこう前に進む」
import { createState, step, DT, CAR_TYPES } from '../js/sim.js'
for (const [i, T] of CAR_TYPES.entries()) {
  const S = createState(3, { noCountdown: true, prepSec: 0 }); const c = S.cars.find(q => q.id === S.teams[0].car)
  c.type = i; c.x = -80; c.z = 0; c.y = 0; c.yaw = Math.PI / 2; c.vx = c.vz = 0; S.T = 1e9; for (const o of S.cars) if (o !== c) { o.x = -90 - o.id; o.z = -90; o.invT = 99 }
  let rel = null, x0 = 0, v0 = 0, peak = 0, t1 = null, tHalf = null, t2 = null, d2 = null
  for (let f = 0; f < 60 * 16; f++) {
    const t = f / 60, gas = t < 4 ? 1 : 0
    step(S, { 0: { aim: 0, throttle: gas, steer: 0 } }, DT); S.events.length = 0
    const sp = Math.hypot(c.vx, c.vz)
    if (!gas && rel === null) { rel = t; x0 = c.x; v0 = sp }
    if (rel !== null) {
      if (sp > peak) peak = sp
      if (t1 === null && sp < v0 - 0.3) t1 = t - rel
      if (tHalf === null && sp <= v0 / 2) tHalf = t - rel
      if (t2 === null && sp <= 2) { t2 = t - rel; d2 = c.x - x0 }
    }
  }
  const f = x => x == null ? '-' : x.toFixed(2)
  console.log(`${T.name.padEnd(6)} 離した時 ${(v0 * 3.6).toFixed(0)}km/h 離した後の最高 ${(peak * 3.6).toFixed(0)}km/h ／ 落ち始め ${f(t1)}s ／ 半分まで ${f(tHalf)}s ／ 時速7kmまで ${f(t2)}s・${f(d2)}m`)
}

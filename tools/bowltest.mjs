// 真ん中のお椀（なだらかな半円のくぼみ）の試験: node tools/bowltest.mjs
import { createState, step, DT, teamCar } from '../js/sim.js?v=9'
import { H, BOWL } from '../js/arena.js?v=9'
let bad = 0
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++ }
// 1. 形: 底 -2.8m・縁で 0・縁でも傾きが 0 になめらかにつながる・最大の傾き
{ let mx = 0, jump = 0
  for (let r = 0; r < BOWL.R + 3; r += 0.02) { const s = Math.abs(H(r + 0.02, 0) - H(r, 0)) / 0.02; mx = Math.max(mx, s) }
  ok(Math.abs(H(0, 0) + BOWL.d) < 1e-9 && Math.abs(H(BOWL.R, 0)) < 1e-9, `底 ${H(0, 0)}m・縁 ${H(BOWL.R, 0)}m`)
  ok(mx < 0.22, `最大の傾き ${mx.toFixed(3)}（${(Math.atan(mx) * 57.3).toFixed(1)}度）`)
  ok(Math.abs(H(BOWL.R - 0.5, 0)) < 0.01 && Math.abs(H(BOWL.R - 0.5, 5) - H(BOWL.R - 0.5, 0)) < 0.2, '縁はなめらか（段差・尖りなし）') }
const fresh = () => { const S = createState(7, { noCountdown: true, humanTeam: -1 }); for (const c of S.cars) { c.x = 900; c.z = 900 } return S }
// 2. 8方向に横切る: 耐久が減らない・地面に沿う・車体の4隅が地面に入らない・止まらない
for (const type of [0, 1, 2]) {
  let worstHp = 100, worstGap = 1e9, worstSink = 0, minV = 1e9, T = 0, airN = 0
  for (let d = 0; d < 8; d++) {
    const S = fresh(), c = teamCar(S, S.teams[0]); c.type = type; const a = d / 8 * Math.PI * 2
    c.x = Math.sin(a) * 30; c.z = Math.cos(a) * 30; c.yaw = a + Math.PI; c.y = H(c.x, c.z); c.vx = Math.sin(c.yaw) * 12; c.vz = Math.cos(c.yaw) * 12; c.hp = 100
    let t = 0
    for (let k = 0; k < 60 * 8; k++) {
      step(S, { 0: { throttle: 1, steer: 0 } }, DT); t += DT
      if (t > 1 && Math.hypot(c.x, c.z) > 45) break   // 反対側の柱・壁に着く前まで
      if (c.air) { airN++; continue }
      worstGap = Math.min(worstGap, 1); const gap = Math.abs(c.y - H(c.x, c.z)); worstSink = Math.max(worstSink, gap)
      if (Math.hypot(c.x, c.z) < 22) minV = Math.min(minV, Math.hypot(c.vx, c.vz))
    }
    worstHp = Math.min(worstHp, c.hp)
  }
  ok(worstHp === 100, `車種${type}: 8方向 × 8秒で耐久 ${worstHp}（減らない）`)
  ok(worstSink < 0.05, `車種${type}: 地面に沿う（最大のずれ ${worstSink.toFixed(3)}m）・空中 ${airN} コマ・くぼみ内の最低速度 ${minV.toFixed(1)}m/s`)
  ok(minV > 5, `車種${type}: くぼみの中で止まらない`)
}
// 3. 底で止まった状態から: アクセルだけで縁まで登って出られる（斜面で動けなくならない）
for (const type of [0, 1, 2]) {
  const S = fresh(), c = teamCar(S, S.teams[0]); c.type = type; c.x = 0; c.z = 0.5; c.y = H(0, 0.5); c.yaw = 1; c.vx = c.vz = 0; c.hp = 100
  let out = -1
  for (let k = 0; k < 60 * 12; k++) { step(S, { 0: { throttle: 1, steer: 0 } }, DT); if (Math.hypot(c.x, c.z) > 23) { out = k / 60; break } }
  ok(out > 0 && c.hp === 100, `車種${type}: 底から発進して縁を越える ${out.toFixed(1)}秒・耐久 ${c.hp}`)
}
// 4. 車体の4隅が地面にめり込まない（見た目）: 底・斜面・縁で
{
  const S = fresh(), c = teamCar(S, S.teams[0]); let worst = 0
  for (const [x, z, yaw] of [[0, 0, 0], [8, 0, 1.2], [14, 3, 0.2], [-19, 4, 2.5], [21, 0, 1.57], [10, 10, 0.8]]) {
    c.x = x; c.z = z; c.y = H(x, z); c.yaw = yaw; c.vx = c.vz = 0
    for (let k = 0; k < 90; k++) step(S, {}, DT)
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = -fz, rz = fx, sp = Math.sin(c.pitch), sr = Math.sin(c.roll)
    for (const f of [-2.1, 2.1]) for (const l of [-0.95, 0.95]) worst = Math.max(worst, H(c.x + fx * f + rx * l, c.z + fz * f + rz * l) - (c.y + (c.lift || 0) + f * sp + l * sr + 0.12))
  }
  ok(worst < 0.1, `車体の4隅の地面へのめり込み 最大 ${worst.toFixed(3)}m`)
}
// 5. 修理箱は底に出て、底に居る車が取れる
{
  const S = fresh(), c = teamCar(S, S.teams[0]); const p = S.pickups.find(q => q.center); p.t = 0; p.type = 'repair'
  c.x = 0; c.z = 1; c.y = H(0, 1); c.hp = 30; c.vx = c.vz = 0
  for (let k = 0; k < 10; k++) step(S, {}, DT)
  ok(c.hp > 60, `底の修理箱を取れる hp 30→${c.hp.toFixed(0)}`)
}
console.log(bad ? 'FAIL ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0)

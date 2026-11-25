// 柱が崩れる試験（ブラウザ無し）: node tools/pillartest.mjs
import { createState, step, DT, teamCar } from '../js/sim.js?v=9'
import { PILLARS, PILLAR_H, solidAtPoint, pushOutCircle } from '../js/arena.js?v=9'
import { makeInputs } from '../js/cpu.js?v=9'
let bad = 0
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++ }
const fresh = () => createState(5, { noCountdown: true, humanTeam: -1 })
const P = PILLARS[0], blank = {}
// 柱から離れた所へ全車を退避（試験の邪魔をしない）
function clear(S) { for (const c of S.cars) { c.x = 900; c.z = 900 } }

// 1. 撃つ: 弾で段階が 0→1→2→3→4 と進み、段階ごとに当たり判定の高さが下がる
{
  const S = fresh(), stages = [0], tops = []
  clear(S); let id = 9000
  for (let n = 0; n < 400 && S.pillars[0].stage < 4; n++) {
    S.bullets.push({ type: 'paint', team: 1, x: P.x + 8, y: P.base + 1.5, z: P.z, px: P.x + 8, py: P.base + 1.5, pz: P.z, vx: -58, vz: 0, vy: 0, life: 1.3, id: id++ })
    for (let k = 0; k < 6; k++) step(S, blank, DT)
    const st = S.pillars[0].stage; if (st !== stages[stages.length - 1]) { stages.push(st); tops.push(+(P.top - P.base).toFixed(2)) }
    S.events.length = 0
  }
  ok(stages.join() === '0,1,2,3,4', `弾で段階が順に進む ${stages.join('>')} 高さ ${tops.join('/')}`)
  ok(!solidAtPoint(P.x, P.base + 1.0, P.z) && !solidAtPoint(P.x, P.base + 0.4, P.z), '瓦礫になったら低い所も当たりなし（弾は通る）')
}
// 2. ぶつける: 車の体当たりで削れる（柱の反対側から突っ込む）
{
  const S = fresh(); clear(S); const c = teamCar(S, S.teams[0]); let evs = 0
  const hp0 = S.pillars[0].hp
  for (let n = 0; n < 40 && S.pillars[0].stage < 3; n++) {
    c.x = P.x + 12; c.z = P.z; c.y = P.base; c.yaw = -Math.PI / 2; c.vx = -19; c.vz = 0; c.hp = 100; c.invT = 0
    for (let k = 0; k < 36; k++) step(S, { 0: { throttle: 1, steer: 0 } }, DT)
    for (const e of S.events) if (e.k === 'pillar') evs++; S.events.length = 0
  }
  ok(S.pillars[0].hp < hp0 - 20, `体当たりで削れる hp ${hp0}→${S.pillars[0].hp.toFixed(0)} 段階 ${S.pillars[0].stage}`)
  ok(evs >= 1, `段階が進むと pillar イベントが出る ${evs}回`)
}
// 3. 瓦礫・折れた株に車が居ても耐久が減り続けない／通り抜けられる
for (const stage of [4, 3]) {
  const S = fresh(); clear(S); const c = teamCar(S, S.teams[0])
  S.pillars[0].hp = stage === 4 ? 0 : 10; S.pillars[0].stage = stage; step(S, blank, DT)
  c.x = P.x + 7; c.z = P.z; c.y = P.base; c.yaw = -Math.PI / 2; c.vx = -8; c.vz = 0; c.hp = 100
  let minD = 1e9
  for (let k = 0; k < 60 * 3; k++) { step(S, { 0: { throttle: 1, steer: 0 } }, DT); minD = Math.min(minD, Math.hypot(c.x - P.x, c.z - P.z)) }
  ok(stage === 4 ? c.hp === 100 && minD < 0.8 : c.hp > 90, `${stage === 4 ? '瓦礫' : '折れた株'}の上を走る: hp ${c.hp.toFixed(1)}・最短 ${minD.toFixed(2)}m（${stage === 4 ? '真上を通る' : '株は固い'}）`)
}
// 3b. 車が柱の円の中に居る時に瓦礫になっても、押し出しで耐久が減らない・動ける
{
  const S = fresh(); clear(S); const c = teamCar(S, S.teams[0])
  c.x = P.x + 0.4; c.z = P.z; c.y = P.base; c.vx = c.vz = 0; c.hp = 100; c.invT = 0
  S.pillars[0].hp = 0; S.pillars[0].stage = 4
  for (let k = 0; k < 60 * 3; k++) step(S, { 0: { throttle: 0.6, steer: 0 } }, DT)
  ok(c.hp === 100, `瓦礫の中に居ても耐久 100 のまま（${c.hp.toFixed(1)}）`)
}
// 4. 崩れた後は当たり判定が低い
{
  const S = fresh(); const R = []
  for (const st of [0, 1, 2, 3, 4]) { S.pillars[0].stage = st; step(S, blank, DT); R.push(+(P.top - P.base).toFixed(2)) }
  ok(R.join() === '11,11,7,2.9,0.05', `段階ごとの当たりの高さ ${R.join('/')}`)
  S.pillars[0].stage = 2; step(S, blank, DT)
  ok(!!solidAtPoint(P.x, P.base + 5, P.z) && !solidAtPoint(P.x, P.base + 8, P.z), '欠けた後は 7m より上は空き')
  const out = []; S.pillars[0].stage = 4; step(S, blank, DT)
  ok(!pushOutCircle(P.x + 1.5, P.base, P.z, 3, 2, out), '瓦礫は車を押し出さない')
}
// 5. 時間でも崩れる: CPU 戦 200 秒で段階がどこまで進むか（弾・体当たり込み）
{
  const hist = []
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const S = createState(seed, { noCountdown: true, mode: 'stock' })
    const at = {}
    while (!S.over && S.t < 400) { step(S, makeInputs(S, DT, null), DT); S.events.length = 0; for (const T of [60, 120, 180]) if (!at[T] && S.tMatch >= T) at[T] = S.pillars.map(p => p.stage).join('') }
    hist.push(`seed${seed} 60s:${at[60]} 120s:${at[120]} 180s:${at[180]} 終了${S.tMatch.toFixed(0)}s:${S.pillars.map(p => p.stage).join('')}`)
  }
  console.log(hist.join('\n'))
}
console.log(bad ? 'FAIL ' + bad : 'ALL OK')
process.exit(bad ? 1 : 0)

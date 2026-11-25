// CPU だけで何試合か回す（ブラウザ無し・高速）。node tools/hsim.mjs [試合数] [stock|points]
// 準備と 3・2・1 も通す。異常（NaN・決着しない・再スタートしない）と最大静止時間を数える
import { createState, step, DT, TEAM_NAMES, COUNTDOWN, GO_COUNT } from '../js/sim.js'
import { makeInputs, STYLE } from '../js/cpu.js'
const BASE = [...STYLE], stw = {}
const N = +process.argv[2] || 20, MODE = process.argv[3] === 'points' ? 'points' : 'stock'
const tot = { dur: [], respawn: 0, footKill: 0, wreck: 0 }
let bad = 0
for (let seed = 1; seed <= N; seed++) {
  for (let i = 0; i < 6; i++) STYLE[i] = BASE[(i + seed) % 6]
  const S = createState(seed, { mode: MODE, prepSec: 0.5 })
  const cnt = {}, t0 = Date.now()
  let maxStill = 0, still = {}, lastPos = {}, sawReady = false, sawGo = false
  while (!S.over && S.t < 700) {
    step(S, makeInputs(S, DT, null), DT)
    for (const e of S.events) { cnt[e.k] = (cnt[e.k] || 0) + 1; if (e.k === 'kill' && e.how === 'foot') tot.footKill++; if (e.k === 'go321') sawReady = true; if (e.k === 'go') sawGo = true }
    S.events.length = 0
    if (S.phase === 'ready' && S.cars.some(c => Math.hypot(c.vx, c.vz) > 0.5 && c.alive && S.t < 3.4)) { console.log('  3・2・1 のうちに動いた'); bad++ }
    if ((S.t * 60 | 0) % 60 === 0) for (const t of S.teams) { const c = S.cars.find(q => q.id === t.car); if (!c || t.out || S.phase !== 'play') continue; const p = lastPos[t.id]; if (p && Math.hypot(p[0] - c.x, p[1] - c.z) < 1) { still[t.id] = (still[t.id] || 0) + 1; maxStill = Math.max(maxStill, still[t.id]) } else still[t.id] = 0; lastPos[t.id] = [c.x, c.z] }
    for (const c of S.cars) if (!isFinite(c.x + c.y + c.z)) { console.log('NaN', c.id); bad++; S.over = true }
    for (const t of S.teams) if (!t.out && !t.car >= 0 && false) bad++
  }
  if (!S.over) { console.log('  決着しない'); bad++ }
  if (!sawReady || !sawGo) { console.log('  3・2・1 または GO が出ない'); bad++ }
  tot.respawn += cnt.respawn || 0; tot.wreck += S.wrecks
  const kills = S.teams.map(t => t.kills).join('/'), stock = S.teams.map(t => t.out ? 'x' : t.stock).join('/')
  console.log(`seed${seed} ${MODE} 決着 ${S.tMatch.toFixed(0)}s 勝ち=${TEAM_NAMES[S.winner]} 撃破 ${kills} 残機 ${stock} 大破 ${S.wrecks} 再スタート ${cnt.respawn || 0} 最大静止 ${maxStill}s ${((Date.now() - t0) / 1000).toFixed(1)}実秒`)
  tot.dur.push(S.tMatch); const ws = STYLE[S.winner]; stw[ws] = (stw[ws] || 0) + 1
}
console.log('勝ち方', JSON.stringify(stw))
console.log('平均', (tot.dur.reduce((a, b) => a + b, 0) / N).toFixed(0), 's 大破/試合', (tot.wreck / N).toFixed(1), '再スタート/試合', (tot.respawn / N).toFixed(1), '歩き中の撃破 合計', tot.footKill, '異常', bad)

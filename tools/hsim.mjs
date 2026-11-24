// CPU だけで何試合か回す（ブラウザ無し・高速）。node tools/hsim.mjs [試合数] [試合秒]
import { createState, step, DT, TEAM_NAMES } from '../js/sim.js'
import { makeInputs, STYLE } from '../js/cpu.js'
const BASE = [...STYLE], wins = {}, stw = {}
const N = +process.argv[2] || 6, SEC = +process.argv[3] || 210
const tot = { dur: [], kills: [], wrecks: [], rams: 0 }
let bad = 0
for (let seed = 1; seed <= N; seed++) {
  for (let i = 0; i < 5; i++) STYLE[i] = BASE[(i + seed) % 5]
  const S = createState(seed, { matchSec: SEC })
  const cnt = {}, t0 = Date.now()
  let maxStill = 0, still = {}
  const lastPos = {}
  while (!S.over && S.t < SEC + 30) {
    const inp = makeInputs(S, DT, null)
    step(S, inp, DT)
    for (const e of S.events) cnt[e.k] = (cnt[e.k] || 0) + 1
    S.events.length = 0
    if ((S.t * 60 | 0) % 60 === 0) for (const t of S.teams) { const c = S.cars.find(q => q.id === t.car); if (!c || t.out || S.phase !== 'play') continue; const p = lastPos[t.id]; if (p && Math.hypot(p[0] - c.x, p[1] - c.z) < 1) { still[t.id] = (still[t.id] || 0) + 1; maxStill = Math.max(maxStill, still[t.id]) } else still[t.id] = 0; lastPos[t.id] = [c.x, c.z] }
    for (const c of S.cars) if (!isFinite(c.x + c.y + c.z)) { console.log('NaN', c); bad++; S.over = true }
  }
  const kills = S.teams.map(t => t.kills).join('/'), stock = S.teams.map(t => t.out ? 'x' : t.stock).join('/')
  console.log(`seed${seed} 決着 ${S.tMatch.toFixed(0)}s 勝ち=${TEAM_NAMES[S.winner]} 撃破 ${kills} 残り ${stock} 壊れ ${S.wrecks} 最大静止 ${maxStill}s ${JSON.stringify({ ram: cnt.ram, bhit: cnt.bhit, boom: cnt.boom, land: cnt.land, pickup: cnt.pickup, board: cnt.board, takeoff: cnt.takeoff })} ${((Date.now() - t0) / 1000).toFixed(1)}実秒`)
  tot.dur.push(S.tMatch); const ws = STYLE[S.winner]; stw[ws] = (stw[ws] || 0) + 1; wins[S.winner] = (wins[S.winner] || 0) + 1
}
console.log('勝ち方', JSON.stringify(stw), '席', JSON.stringify(wins))
console.log('平均', (tot.dur.reduce((a, b) => a + b, 0) / N).toFixed(0), 's 異常', bad)

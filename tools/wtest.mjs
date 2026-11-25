// 銃ごとの強さ: 5チームがそれぞれ同じ銃2丁（車はセダン）で CPU 戦を回し、優勝と撃破を数える。node tools/wtest.mjs [試合数]
import { createState, step, DT, WEAPON_IDS, setLoadout } from '../js/sim.js'
import { makeInputs } from '../js/cpu.js'
const N = +process.argv[2] || 60, win = {}, kil = {}, cnt = {}
for (let g = 0; g < N; g++) {
  const S = createState(500 + g, {}), rot = g % 5
  S.teams.forEach((t, i) => { const id = WEAPON_IDS[(i + rot) % 5]; setLoadout(S, t, { car: 0, weapons: [id, id] }); t.wid = id })
  while (!S.over && S.t < 280) { step(S, makeInputs(S, DT, null), DT); S.events.length = 0 }
  const key = t => t.out ? -1000 + t.outT : 1000 + t.stock * 100 + t.kills * 3
  const w = [...S.teams].sort((a, b) => key(b) - key(a))[0]; win[w.wid] = (win[w.wid] || 0) + 1
  for (const t of S.teams) { kil[t.wid] = (kil[t.wid] || 0) + t.kills; cnt[t.wid] = (cnt[t.wid] || 0) + 1 }
}
for (const id of WEAPON_IDS) console.log(id.padEnd(9), '優勝', win[id] || 0, '撃破/試合', ((kil[id] || 0) / cnt[id]).toFixed(2))

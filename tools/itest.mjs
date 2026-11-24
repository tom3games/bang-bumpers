// 射手のアイテムの強さ: 5チームがそれぞれ別のアイテムを4つ持って（銃はペイント弾×2・車はバランス）CPU 戦。優勝と撃破を数える。node tools/itest.mjs [試合数]
import { createState, step, DT, setLoadout } from '../js/sim.js'
import { makeInputs } from '../js/cpu.js'
const ITEMS = ['grenade', 'smoke', 'ricochet', 'turret', 'flash']
const N = +process.argv[2] || 60, win = {}, kil = {}, cnt = {}
for (let g = 0; g < N; g++) {
  const S = createState(900 + g, {}), rot = g % 5
  S.teams.forEach((t, i) => { setLoadout(S, t, { car: 0, weapons: ['paint', 'paint'] }); t.itm = ITEMS[(i + rot) % 5]; t.iG = { type: t.itm, ammo: 4 } })
  while (!S.over && S.t < 280) { step(S, makeInputs(S, DT, null), DT); S.events.length = 0; for (const t of S.teams) if (t.iG === null && !t.out && S.tMatch % 20 < 0.02) t.iG = { type: t.itm, ammo: 2 } }
  const key = t => t.out ? -1000 + t.outT : 1000 + t.stock * 100 + t.kills * 3
  const w = [...S.teams].sort((a, b) => key(b) - key(a))[0]; win[w.itm] = (win[w.itm] || 0) + 1
  for (const t of S.teams) { kil[t.itm] = (kil[t.itm] || 0) + t.kills; cnt[t.itm] = (cnt[t.itm] || 0) + 1 }
}
for (const id of ITEMS) console.log(id.padEnd(9), '優勝', win[id] || 0, '撃破/試合', ((kil[id] || 0) / cnt[id]).toFixed(2))

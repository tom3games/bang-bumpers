import { createState, step, DT } from '../js/sim.js'
import { makeInputs } from '../js/cpu.js'
const S = createState(999, { humanTeam: 0 }); S.teams[0].driver = 0
let i=0
while (!S.over && S.t < 300) { step(S, makeInputs(S, DT, null), DT); S.events.length=0; if ((++i)%1800===0) console.log(S.t|0, S.tMatch|0, S.phase, S.teams.map(t=>t.out?'x':t.stock+(t.walking?'w':'')).join(' '), S.endAt) }
console.log('over',S.over,S.t)

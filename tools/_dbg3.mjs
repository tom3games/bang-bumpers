import { createState, step, DT } from '../js/sim.js'
import { makeInputs } from '../js/cpu.js'
const S = createState(3, {})
let maxy=0
while (!S.over && S.t < 20) { const before=S.cars.map(c=>[c.id,c.y,c.vy,c.air]); step(S, makeInputs(S, DT, null), DT)
  for (const c of S.cars) { if (c.y>8 && c.y>maxy){maxy=c.y; if(maxy<9||maxy>20) console.log('t',S.t.toFixed(2),'car',c.id,'team',c.team,'y',c.y.toFixed(1),'vy',c.vy.toFixed(1),'pos',c.x.toFixed(1),c.z.toFixed(1), 'evs', S.events.map(e=>e.k).join(','))}}
  S.events.length=0 }

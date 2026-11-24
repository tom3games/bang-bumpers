import { createState, step, DT } from '../js/sim.js'
import { makeInputs } from '../js/cpu.js'
const S = createState(3, {})
const log=[]
while (!S.over && S.t < 100) { step(S, makeInputs(S, DT, null), DT); S.events.length=0
  if ((S.t*60|0)%300===0) log.push(S.t.toFixed(0)+' '+S.teams.map(t=>{const c=S.cars.find(q=>q.id===t.car); return c?`${c.x.toFixed(0)},${c.z.toFixed(0)},${c.y.toFixed(1)} hp${c.hp|0}`:'walk'}).join(' | ')) }
console.log(log.join('\n'))

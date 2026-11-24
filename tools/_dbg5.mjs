import { createState, step, DT, CAR_TYPES } from '../js/sim.js'
import { makeInputs, STYLE } from '../js/cpu.js'
const BASE=[...STYLE]
for (const seed of [7,8,11]) { for (let i = 0; i < 5; i++) STYLE[i] = BASE[(i + seed) % 5]
  const S = createState(seed, {}); const lp=[],still=[0,0,0,0,0]
  while (!S.over && S.t < 260) { step(S, makeInputs(S, DT, null), DT); S.events.length=0
    if ((S.t*60|0)%60===0 && S.phase==='play') for (const t of S.teams){ const c=S.cars.find(q=>q.id===t.car); if(!c||t.out){still[t.id]=0;continue} const p=lp[t.id]; if(p&&Math.hypot(p[0]-c.x,p[1]-c.z)<1){still[t.id]++; if(still[t.id]===20) console.log('seed',seed,'team',t.id,STYLE[t.id],'at',c.x.toFixed(1),c.z.toFixed(1),'y',c.y.toFixed(1),'yaw',c.yaw.toFixed(2),'type',c.type,'air',c.air,'walking',t.walking,'t',S.t|0)} else still[t.id]=0; lp[t.id]=[c.x,c.z] } } }

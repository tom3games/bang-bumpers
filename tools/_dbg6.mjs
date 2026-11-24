import { createState, step, DT, circles, CAR_R } from '../js/sim.js'
import { makeInputs, STYLE } from '../js/cpu.js'
import { pushOutCircle, POLES, BOXES } from '../js/arena.js'
const BASE=[...STYLE]; const seed=5; for (let i = 0; i < 5; i++) STYLE[i] = BASE[(i + seed) % 5]
const S = createState(seed, {}); let n=0
while (S.t < 100) { step(S, makeInputs(S, DT, null), DT); S.events.length=0
  if (S.t>70 && S.t<72 && (++n)%30===0) { const t=S.teams[1], c=S.cars.find(q=>q.id===t.car); if(c){ console.log(S.t.toFixed(1),'car',c.x.toFixed(1),c.z.toFixed(1),'yaw',c.yaw.toFixed(2),'v',c.vx.toFixed(1),c.vz.toFixed(1),'inp',JSON.stringify(t.inp&&{th:t.inp.throttle,st:+t.inp.steer.toFixed(2)})) ; const near=[...POLES,...BOXES].filter(o=>Math.hypot(o.x-c.x,o.z-c.z)<9).map(o=>[o.kind||'p',o.x,o.z,o.w||o.r,o.d||''].join(':')); console.log(near.join(' | '))} } }

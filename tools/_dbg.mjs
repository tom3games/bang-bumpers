import { createState, step, DT } from '../js/sim.js'
import { makeInputs } from '../js/cpu.js'
const first = [0,0,0,0,0], n=[0,0,0,0,0], stuck=[]
for (let seed = 1; seed <= 30; seed++) {
  const S = createState(seed, {}); const fw = [null,null,null,null,null]; const still=[0,0,0,0,0], lp=[]
  while (!S.over && S.t < 240) {
    const inp = makeInputs(S, DT, null); step(S, inp, DT)
    for (const e of S.events) if (e.k==='kill' && fw[e.victim]==null) fw[e.victim]=S.tMatch
    S.events.length=0
    if ((S.t*60|0)%60===0 && S.phase==='play') for (const t of S.teams){ const c=S.cars.find(q=>q.id===t.car); if(!c||t.out){still[t.id]=0;continue} const p=lp[t.id]; if(p&&Math.hypot(p[0]-c.x,p[1]-c.z)<1){still[t.id]++; if(still[t.id]===25) stuck.push(`seed${seed} t${t.id} at ${c.x.toFixed(1)},${c.z.toFixed(1)} y${c.y.toFixed(1)} yaw${c.yaw.toFixed(2)} hp${c.hp|0} air${c.air}`)} else still[t.id]=0; lp[t.id]=[c.x,c.z] }
  }
  fw.forEach((v,i)=>{first[i]+= v??S.tMatch; n[i]++})
}
console.log('席ごとの最初に壊れるまで', first.map((v,i)=>(v/n[i]).toFixed(0)).join(' '))
console.log(stuck.join('\n'))

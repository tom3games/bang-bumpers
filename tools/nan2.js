(async()=>{
const st=window.__bb.stage, S=window.__bb.S(), c=S.cars.find(q=>q.id===S.teams[0].car); c.type=1
const frames=async n=>{const f0=window.__bbFrames;while(window.__bbFrames<f0+n)await new Promise(r=>setTimeout(r,100))}
await frames(3)
const v=st.cars.get(c.id); const bad=[]
v.crew.traverse(o=>{ if(o.isBone){ const e=o.matrix.elements; if(e.some(x=>!isFinite(x))) bad.push(o.name+' local') ; if(o.quaternion.x!==o.quaternion.x) bad.push(o.name+' q')} })
return {bad:bad.slice(0,12), n:bad.length}})()

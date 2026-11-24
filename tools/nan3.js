(async()=>{
const st=window.__bb.stage, S=window.__bb.S(), c=S.cars.find(q=>q.id===S.teams[0].car); c.type=1
const frames=async n=>{const f0=window.__bbFrames;while(window.__bbFrames<f0+n)await new Promise(r=>setTimeout(r,100))}
await frames(3)
const v=st.cars.get(c.id); const out=[]
v.crew.traverse(o=>{ if(o.isSkinnedMesh){ const g=o.geometry; const out1={name:o.material.name}; for(const k of ['position','normal','skinWeight','skinIndex','uv']){const a=g.attributes[k]; if(!a){continue} let mn=1e9,mx=-1e9,bad=0; for(let i=0;i<a.array.length;i++){const x=a.array[i]; if(!isFinite(x))bad++; mn=Math.min(mn,x); mx=Math.max(mx,x)} out1[k]=[a.array.constructor.name,a.normalized,mn,mx,bad]} 
 const bi=o.skeleton.boneInverses; let bb=0; for(const m of bi) if(m.elements.some(x=>!isFinite(x))) bb++; out1.boneInv=bb; out1.bindM=o.bindMatrix.elements.slice(0,4); out.push(out1)} })
return out})()

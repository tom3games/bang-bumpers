(async()=>{
const st=window.__bb.stage, r=st.renderer; r.info.autoReset=false
const frame=async()=>{const f0=window.__bbFrames; while(window.__bbFrames<f0+1) await new Promise(r=>setTimeout(r,100)); r.info.reset(); const f1=window.__bbFrames; while(window.__bbFrames<f1+1) await new Promise(r=>setTimeout(r,100)); return {calls:r.info.render.calls,tris:Math.round(r.info.render.triangles/1000)+'k'}}
const out={all:await frame()}
const vis=[];for(const v of st.cars.values()) vis.push([v.g,v.g.visible]);
for(const v of st.cars.values()) v.g.visible=false
out.noCars=await frame()
for(const [g,v] of vis) g.visible=v
const w=st.walkers.map(x=>x.g.visible); 
const types={}; for(const [id,v] of st.cars) types[v.type]=(types[v.type]||0)+1; out.types=types
for(const v of st.cars.values()) v.crew.visible=false
out.noCrew=await frame()
return out})()

(async()=>{
const THREE=window.__bb.THREE;const st=window.__bb.stage, S=window.__bb.S(), c=S.cars.find(q=>q.id===S.teams[0].car); c.type=1
window.__hold={x:c.x,z:c.z,yaw:c.yaw}; setInterval(()=>{const h=window.__hold;c.x=c.px=h.x;c.z=c.pz=h.z;c.yaw=c.pyaw=h.yaw;c.vx=c.vz=0;c.yawRate=0},16)
const sy=Math.sin(c.yaw),cy=Math.cos(c.yaw),dx=1.9,dy=2.3,dz=2.4
window.__bbCam={p:[c.x+sy*dz+cy*dx,c.y+dy,c.z+cy*dz-sy*dx],l:[c.x-sy*0.3,c.y+1.9,c.z-cy*0.3],fov:42}
const frames=async n=>{const f0=window.__bbFrames;while(window.__bbFrames<f0+n)await new Promise(r=>setTimeout(r,100))}
await frames(4)
const v=st.cars.get(c.id)
const lum=()=>{const cv=st.renderer.domElement;const t=document.createElement('canvas');t.width=64;t.height=40;const x=t.getContext('2d');x.drawImage(cv,0,0,64,40);const d=x.getImageData(0,0,64,40).data;let s=0;for(let i=0;i<d.length;i+=4)s+=d[i]+d[i+1]+d[i+2];return Math.round(s/(64*40*3))}
const res={base:(await frames(2),lum())}
const meshes=[];v.crew.traverse(o=>{if(o.isMesh)meshes.push(o)})
res.names=meshes.map(m=>(m.material.name||m.material.type)+(m.isSkinnedMesh?'(sk)':''))
{const m=meshes[2];const old=m.material;const nm=new old.constructor();nm.copy(old);nm.onBeforeCompile=()=>{};nm.customProgramCacheKey=()=>'plain';nm.needsUpdate=true;m.material=nm;await frames(3);res.plainCopy=lum();
 const n2=new THREE.MeshStandardMaterial({map:old.map,color:0x888888});m.material=n2;await frames(3);res.mapOnly=lum();
 const n3=new THREE.MeshStandardMaterial({map:old.map,normalMap:old.normalMap,color:0x888888});m.material=n3;await frames(3);res.mapNormal=lum();
 const n4=new THREE.MeshStandardMaterial({map:old.map,roughnessMap:old.roughnessMap,color:0x888888});m.material=n4;await frames(3);res.mapRough=lum();m.material=old}
for(let i=0;i<0;i++){const m=meshes[i];const old=m.material;m.visible=false;await frames(2);res['hide'+i+':'+(old.name||old.type)]=lum();m.visible=true}
return res})()

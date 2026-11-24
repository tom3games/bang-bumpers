// 人: Quaternius（CC0）の素体と動き（WRECK ISLE と同じ素材）。服は素体の上に塗る。ヘルメットと銃の構えは自前
import * as THREE from 'three'
import { GLTFLoader } from '../vendor/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from '../vendor/jsm/libs/meshopt_decoder.module.js'
import * as SkeletonUtils from '../vendor/jsm/utils/SkeletonUtils.js'

const D = './assets/chars/'
const gl = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
let BASE = null; const CLIPS = {}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const _pq = new THREE.Quaternion()

export async function loadPeople() {
  if (BASE) return
  const [base, a1, a2] = await Promise.all([gl.loadAsync(D + 'Superhero_Male_FullBody.gltf'), gl.loadAsync(D + 'UAL1_Standard.glb'), gl.loadAsync(D + 'UAL2_Standard.glb')])
  BASE = base.scene
  BASE.traverse(m => { if (m.isSkinnedMesh && m.material.name === 'MI_Superhero_Male') smoothBody(m.geometry) })
  const light = await new THREE.TextureLoader().loadAsync(D + 'T_Superhero_Male_Ligh.png'); light.colorSpace = THREE.SRGBColorSpace; light.flipY = false
  BASE.traverse(m => { if (m.isMesh && m.material.name === 'MI_Superhero_Male') m.material.map = light })
  for (const c of [...a1.animations, ...a2.animations]) { c.tracks = c.tracks.filter(t => !/^root\.position/.test(t.name)); CLIPS[c.name] = c }
}
function smoothBody(g) {
  const pos = g.attributes.position, n = pos.count, idx = g.index.array
  // 同じ位置の頂点（UV の継ぎ目）をまとめる
  const key = new Map(), grp = new Int32Array(n)
  for (let i = 0; i < n; i++) { const k = Math.round(pos.getX(i) * 2000) + ',' + Math.round(pos.getY(i) * 2000) + ',' + Math.round(pos.getZ(i) * 2000); if (!key.has(k)) key.set(k, key.size); grp[i] = key.get(k) }
  const G = key.size, P = new Float32Array(G * 3), nb = Array.from({ length: G }, () => new Set())
  for (let i = 0; i < n; i++) { P[grp[i] * 3] = pos.getX(i); P[grp[i] * 3 + 1] = pos.getY(i); P[grp[i] * 3 + 2] = pos.getZ(i) }
  for (let t = 0; t < idx.length; t += 3) { const a = grp[idx[t]], b = grp[idx[t + 1]], c = grp[idx[t + 2]]; nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b) }
  // ならす強さ: 胴と腕と脚は強く、首・手首・足首に向けて弱く、頭と手は 0
  const w = new Float32Array(G)
  for (let i = 0; i < G; i++) {
    const x = Math.abs(P[i * 3]), y = P[i * 3 + 1]
    let k = 1
    if (y > 1.5) k = Math.max(0, 1 - (y - 1.5) / 0.05)
    if (x > 0.66) k = Math.min(k, Math.max(0, 1 - (x - 0.66) / 0.06))
    if (y < 0.12) k = Math.min(k, Math.max(0, (y - 0.04) / 0.08))
    w[i] = k * 0.55
  }
  const Q = new Float32Array(G * 3)
  for (let it = 0; it < 9; it++) {
    for (let i = 0; i < G; i++) {
      let sx = 0, sy = 0, sz = 0, c = 0
      for (const j of nb[i]) { sx += P[j * 3]; sy += P[j * 3 + 1]; sz += P[j * 3 + 2]; c++ }
      const k = c ? w[i] : 0
      Q[i * 3] = P[i * 3] + (sx / c - P[i * 3]) * k; Q[i * 3 + 1] = P[i * 3 + 1] + (sy / c - P[i * 3 + 1]) * k; Q[i * 3 + 2] = P[i * 3 + 2] + (sz / c - P[i * 3 + 2]) * k
    }
    P.set(Q)
  }
  for (let i = 0; i < n; i++) pos.setXYZ(i, P[grp[i] * 3], P[grp[i] * 3 + 1], P[grp[i] * 3 + 2])
  pos.needsUpdate = true; g.computeVertexNormals()
}

// 服を塗るシェーダ（素体の T ポーズの座標で領域を分ける）
function clothe(material, look) {
  const m = material.clone()
  m.onBeforeCompile = sh => {
    sh.uniforms.cShirt = { value: new THREE.Color(look.shirt) }
    sh.uniforms.cPants = { value: new THREE.Color(look.pants) }
    sh.uniforms.cShoes = { value: new THREE.Color(look.shoes) }
    sh.uniforms.cVest = { value: new THREE.Color(look.vest ?? look.shirt) }
    sh.uniforms.uSleeve = { value: look.sleeve ?? 0.7 }
    sh.uniforms.uVest = { value: look.vest ? 1 : 0 }
    sh.uniforms.uZip = { value: look.zip === false ? 0 : 1 }
    sh.vertexShader = 'varying vec3 vBind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vBind = position;
      { float ax = abs(position.x), y = position.y;
        float sh = step(0.985, y) * step(y, 1.53) * step(ax, uSleeveV);
        float pa = step(0.1, y) * step(y, 0.985);
        // 服の厚み（筋肉の凹凸を隠す）
        transformed += objectNormal * (sh * mix(0.022, 0.012, smoothstep(0.2, 0.5, ax)) + pa * 0.012 + step(y, 0.095) * 0.01); }`).replace('void main() {', 'uniform float uSleeveV;\nvoid main() {')
    sh.uniforms.uSleeveV = { value: look.sleeve ?? 0.7 }
    sh.fragmentShader = `varying vec3 vBind; uniform vec3 cShirt, cPants, cShoes, cVest; uniform float uSleeve, uVest, uZip;
      float rs(float a, float b, float x){ float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
      float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
      float vn(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
      ` + sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        float ax = abs(vBind.x), y = vBind.y;
        float shoes = step(y, 0.095);
        float pants = step(0.095, y) * step(y, 0.985);
        float shirt = step(0.985, y) * step(y, 1.535) * step(ax, uSleeve);
        float vest = uVest * shirt * step(ax, 0.2) * step(y, 1.47);
        float n = vn(vBind * 180.0) * 0.5 + vn(vBind * 31.0) * 0.5;
        float front = step(0.0, vBind.z);
        float pocket = rs(0.004, 0.0, abs(y - 0.9)) * step(0.06, ax) * step(ax, 0.17) * front;
        vec3 cloth = cShirt * (0.82 + 0.22 * n);
        cloth = mix(cloth, cVest * (0.85 + 0.2 * n), vest);
        float seam = rs(0.004, 0.0, abs(y - 0.985)) + rs(0.004, 0.0, abs(ax - uSleeve + 0.01)) * shirt;
        vec3 pc = cPants * (0.8 + 0.25 * n) * (1.0 - 0.3 * rs(0.012, 0.0, abs(y - 0.96))) * (1.0 - 0.25 * pocket) * (1.0 - 0.15 * rs(0.006, 0.0, abs(abs(vBind.x) - 0.11)) * step(y, 0.95));
        pc = mix(pc, vec3(0.08, 0.07, 0.06), rs(0.02, 0.012, abs(y - 0.955)) * pants); // ベルト
        // ファスナー（前の真ん中）・襟・袖口・すそ
        float zip = rs(0.005, 0.002, ax) * front * step(1.0, y) * step(y, 1.5) * uZip;
        float collar = rs(1.47, 1.5, y) * step(ax, 0.16);
        float cuff = rs(uSleeve - 0.06, uSleeve - 0.045, ax) * step(1.2, y);
        float hem = rs(1.06, 1.0, y) * step(0.985, y);
        cloth *= 1.0 - 0.18 * (collar + cuff + hem);
        cloth = mix(cloth, cloth * 0.55 + vec3(0.06), zip * 0.8);
        // 胴の左右の縫い目と、ももの横のポケット
        seam += rs(0.006, 0.0, abs(abs(vBind.x) - 0.15)) * shirt * step(abs(vBind.z), 0.03);
        diffuseColor.rgb = mix(diffuseColor.rgb, cloth * (1.0 - seam * 0.25), shirt);
        diffuseColor.rgb = mix(diffuseColor.rgb, pc, pants);
        diffuseColor.rgb = mix(diffuseColor.rgb, cShoes * (0.85 + 0.2 * n), shoes);
        float clothMask = clamp(shirt + pants + shoes, 0.0, 1.0);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.86 + 0.1 * n, clothMask);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = normalize(mix(normal, nonPerturbedNormal, clothMask * 0.85));`)
  }
  m.customProgramCacheKey = () => 'cloth' + JSON.stringify(look)
  return m
}

// ---------------------------------------------------------------- 人を作る
const HELM_MAT = {}
export function makePerson(look, { anim = false } = {}) {
  const root = SkeletonUtils.clone(BASE)
  root.traverse(m => {
    if (!m.isMesh) return
    m.castShadow = true; m.receiveShadow = true
    if (m.isSkinnedMesh) { m.computeBoundingSphere(); m.boundingSphere = m.boundingSphere.clone(); m.boundingSphere.radius *= 1.6; m.frustumCulled = false }
    if (m.material.name === 'MI_Superhero_Male') m.material = clothe(m.material, look)
  })
  const bones = {}; root.traverse(o => { if (o.isBone) bones[o.name] = o })
  // ヘルメット: 落ち着いた色。つば付きの半球＋あご紐
  const helmMat = new THREE.MeshStandardMaterial({ color: look.helm, roughness: 0.62, metalness: 0.15 })
  const helm = new THREE.Group()
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.128, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), helmMat); shell.scale.set(1, 0.92, 1.12); shell.position.set(0, 0.09, 0.005)
  const brim = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.012, 6, 22), helmMat); brim.rotation.x = Math.PI / 2; brim.scale.set(1, 1.12, 1); brim.position.set(0, 0.098, 0.005)
  const mount = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.04), new THREE.MeshStandardMaterial({ color: 0x1a1b1c, roughness: 0.5, metalness: 0.5 })); mount.position.set(0, 0.17, 0.12)
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.006, 4, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.9 })); strap.rotation.set(0, 0, Math.PI); strap.scale.set(1, 1.1, 1); strap.position.set(0, 0.06, 0.01)
  helm.add(shell, brim, mount, strap); helm.traverse(o => { if (o.isMesh) { o.castShadow = true } })
  bones.Head.add(helm)
  const p = { root, bones, helm: { material: helmMat }, look }
  if (anim) {
    p.mixer = new THREE.AnimationMixer(root); p.act = {}
    for (const n of ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'NinjaJump_Idle_Loop', 'Death01']) { const a = p.mixer.clipAction(CLIPS[n]); p.act[n] = a; if (n !== 'Death01') { a.play(); a.setEffectiveWeight(n === 'Idle_Loop' ? 1 : 0) } }
    p.w = { Idle_Loop: 1, Walk_Loop: 0, Jog_Fwd_Loop: 0, Sprint_Loop: 0, NinjaJump_Idle_Loop: 0 }
    p.tOff = Math.random() * 3
  }
  return p
}
// 走り・歩きの切り替え（sp: 速さ m/s）。fly なら空中の動き
export function animate(p, dt, sp, fly) {
  const want = fly ? 'NinjaJump_Idle_Loop' : sp < 0.3 ? 'Idle_Loop' : sp < 2.6 ? 'Walk_Loop' : sp < 5.2 ? 'Jog_Fwd_Loop' : 'Sprint_Loop'
  const k = Math.min(1, dt * 9)
  for (const n in p.w) { const t = n === want ? 1 : 0; p.w[n] += (t - p.w[n]) * k; p.act[n].setEffectiveWeight(p.w[n]) }
  p.act.Walk_Loop.timeScale = clamp(sp / 1.45, 0.6, 1.6); p.act.Jog_Fwd_Loop.timeScale = clamp(sp / 3.9, 0.6, 1.5); p.act.Sprint_Loop.timeScale = clamp(sp / 6.0, 0.7, 1.4)
  p.mixer.update(dt)
}
export function skinOf(p) { return p.root }

// 骨を世界の軸で回す
function rotW(b, q) { b.parent.getWorldQuaternion(_pq); b.quaternion.premultiply(_pq.clone().invert().multiply(q).multiply(_pq)); b.updateMatrixWorld(true) }
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3(), _q = new THREE.Quaternion()
// 2本の骨（上腕・前腕）で、手首を世界座標 target へ。肘は pole の向きへ曲げる
export function ik2(upper, lower, hand, target, pole) {
  upper.updateWorldMatrix(true, true)
  upper.getWorldPosition(_a); lower.getWorldPosition(_b); hand.getWorldPosition(_c)
  const l1 = _a.distanceTo(_b), l2 = _b.distanceTo(_c)
  const dir = _d.subVectors(target, _a); let d = dir.length(); dir.normalize(); d = clamp(d, Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.003)
  const ax = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - ax * ax))
  const pv = _e.copy(pole).addScaledVector(dir, -pole.dot(dir)).normalize()
  const elbow = new THREE.Vector3().copy(_a).addScaledVector(dir, ax).addScaledVector(pv, h)
  // 上腕: 今の肘の向き → 欲しい肘の向き
  rotW(upper, _q.setFromUnitVectors(_b.clone().sub(_a).normalize(), elbow.clone().sub(_a).normalize()))
  lower.getWorldPosition(_b); hand.getWorldPosition(_c)
  rotW(lower, _q.setFromUnitVectors(_c.clone().sub(_b).normalize(), target.clone().sub(_b).normalize()))
}
// 手を握る（指を曲げる）
export function curl(p, side, amt = 1.1) {
  for (const f of ['index', 'middle', 'ring', 'pinky']) for (const i of [1, 2, 3]) { const b = p.bones[`${f}_0${i}_${side}`]; if (b) b.rotateZ((side === 'l' ? -1 : 1) * amt * (i === 1 ? 0.9 : 1)) }
  for (const i of [1, 2]) { const b = p.bones[`thumb_0${i}_${side}`]; if (b) b.rotateZ((side === 'l' ? -1 : 1) * 0.4) }
}

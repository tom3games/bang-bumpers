// 車の見た目: WRECK ISLE の実車（Car Concept・CC BY 4.0）と、断面をつないだ曲面の車体（BREAK THE ROUTE 由来）。
// 3種: 0 セダン / 1 クーペ（実車モデル）/ 2 ピックアップ。屋根の射手台に人と機関銃
import * as THREE from 'three'
import { ProcCar, loadCarModel, sharedMats } from './btrcar.js?v=13'
import { mergeGeometries } from '../vendor/jsm/utils/BufferGeometryUtils.js'
import { numberTexture } from './textures.js?v=13'
import { makePerson, ik2, curl } from './people.js?v=13'

let TEMPLATE = null
// 実車モデルは 68 個の部品に分かれている。同じ材質ごとに束ねて描く回数を減らす（ボンネット・ミラー・車輪は別に残す）
function prepTemplate(holder) {
  holder.updateMatrixWorld(true)
  const inv = new THREE.Matrix4().copy(holder.matrixWorld).invert()
  const sets = new Map()   // key -> Map(material -> geos)
  const add = (key, m, geo) => { if (!sets.has(key)) sets.set(key, new Map()); const s = sets.get(key); if (!s.has(m)) s.set(m, []); s.get(m).push(geo) }
  const wheelNodes = {}
  holder.traverse(o => { if (/^Wheel(Front|Rear)[LR]$/.test(o.name)) wheelNodes[o.name] = o })
  const inside = (o, test) => { for (let p = o; p; p = p.parent) if (test(p)) return true; return false }
  holder.traverse(o => {
    if (!o.isMesh) return
    let key = 'body'
    const w = Object.keys(wheelNodes).find(n => inside(o, p => p === wheelNodes[n]))
    if (w) key = w
    else if (inside(o, p => p.name === 'BodyHood')) key = 'hood'
    else if (inside(o, p => /^BodyDoorLWindow$|^BodyDoorRWindow$|^BodyWindshield$|^BodyRearwindow$|^BodyWindowsRearSides$/.test(p.name))) key = 'body'
    const g = o.geometry.clone()
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n)
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
    if (!g.attributes.normal) g.computeVertexNormals()
    if (g.index === null) g.setIndex([...Array(g.attributes.position.count).keys()])
    // 車輪は車輪の骨の座標で、それ以外は入れ物の座標で
    const m = w ? new THREE.Matrix4().copy(wheelNodes[w].matrixWorld).invert().multiply(o.matrixWorld) : new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)
    g.applyMatrix4(m)
    add(key, o.material, g)
  })
  const out = new THREE.Group()
  const mkGroup = (key, name) => {
    const gr = new THREE.Group(); gr.name = name
    for (const [mat, geos] of sets.get(key) || []) {
      const g = mergeGeometries(geos, false); const me = new THREE.Mesh(g, mat); me.castShadow = true; me.receiveShadow = true; gr.add(me)
    }
    return gr
  }
  out.add(mkGroup('body', 'Body'))
  for (const k of ['hood']) { const g = mkGroup(k, k); out.add(g) }
  for (const n in wheelNodes) {
    const g = mkGroup(n, n); const wn = wheelNodes[n]
    wn.matrixWorld.decompose(g.position, g.quaternion, g.scale)
    g.position.applyMatrix4(inv)
    out.add(g)
  }
  return out
}

export async function loadCars() {
  if (TEMPLATE) return
  try { const h = await loadCarModel('models/car_lite.glb'); TEMPLATE = prepTemplate(h) } catch (e) { console.warn('car model', e); TEMPLATE = null }
}
export const realCarReady = () => !!TEMPLATE

// 同じ材質の部品を1つにまとめる（keep の中と、動く物は残す）。描く回数を減らす
function bake(group, keep, recv = true) {
  group.updateMatrixWorld(true)
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert()
  const by = new Map(), gone = []
  const kept = o => { for (let p = o; p && p !== group; p = p.parent) if (keep.has(p)) return true; return false }
  group.traverse(o => {
    if (!o.isMesh || kept(o)) return
    const g = o.geometry.clone()
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n)
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
    if (g.index === null) g.setIndex([...Array(g.attributes.position.count).keys()])
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld))
    const key = o.material.uuid + (o.castShadow ? 'c' : 'n'); if (!by.has(key)) by.set(key, { mat: o.material, cast: o.castShadow, geos: [] }); by.get(key).geos.push(g); gone.push(o)
  })
  for (const o of gone) o.parent.remove(o)
  for (const { mat, cast, geos } of by.values()) { const m = new THREE.Mesh(mergeGeometries(geos, false), mat); m.castShadow = cast; m.receiveShadow = recv; group.add(m) }
}
const MATS = {}
function mats() {
  if (MATS.rubber) return MATS
  MATS.rubber = new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.9 })
  MATS.black = new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.6, metalness: 0.3 })
  MATS.steel = new THREE.MeshStandardMaterial({ color: 0x9a9fa3, roughness: 0.38, metalness: 0.9 })
  MATS.gun = new THREE.MeshStandardMaterial({ color: 0x23272a, roughness: 0.42, metalness: 0.8 })
  MATS.gunLight = new THREE.MeshStandardMaterial({ color: 0x4c5256, roughness: 0.35, metalness: 0.85 })
  MATS.olive = new THREE.MeshStandardMaterial({ color: 0x4a5238, roughness: 0.6, metalness: 0.25 })
  MATS.brass = new THREE.MeshStandardMaterial({ color: 0xb08a3c, roughness: 0.3, metalness: 0.9 })
  MATS.hatch = new THREE.MeshStandardMaterial({ color: 0x0c0d0e, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  MATS.glass = new THREE.MeshPhysicalMaterial({ color: 0x06090c, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 0.5 })
  MATS.bed = new THREE.MeshStandardMaterial({ color: 0x1a1b1c, roughness: 0.85, metalness: 0.2 })
  return MATS
}
const mkMesh = (geo, mat, x, y, z, parent, cast = true) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; parent.add(o); return o }

// ---------------------------------------------------------------- 機関銃（銃口は z=1.85 の高さ 0.45）
function buildGun() {
  const M = mats(), g = new THREE.Group()
  const bx = (w, h, d, mat, x, y, z) => mkMesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, g)
  const cy = (r1, r2, len, mat, x, y, z, ax = 'z', seg = 10) => { const geo = new THREE.CylinderGeometry(r1, r2, len, seg); if (ax === 'z') geo.rotateX(Math.PI / 2); else if (ax === 'x') geo.rotateZ(Math.PI / 2); return mkMesh(geo, mat, x, y, z, g) }
  bx(0.1, 0.15, 0.62, M.gun, 0, 0.45, 0.42)                 // 機関部
  bx(0.075, 0.035, 0.46, M.gunLight, 0, 0.545, 0.42)        // 上のふた
  bx(0.06, 0.05, 0.14, M.gun, 0, 0.58, 0.58)                // 照準器の台
  bx(0.012, 0.05, 0.012, M.black, 0, 0.62, 0.62)
  cy(0.017, 0.019, 0.55, M.gunLight, 0, 0.47, 1.57)          // 銃身
  cy(0.039, 0.039, 0.55, M.gun, 0, 0.47, 1.1)                // 放熱筒
  for (let i = 0; i < 5; i++) cy(0.041, 0.041, 0.012, M.black, 0, 0.47, 0.88 + i * 0.1)
  cy(0.026, 0.02, 0.1, M.black, 0, 0.47, 1.8)               // 消炎器
  for (const sd of [-1, 1]) { cy(0.007, 0.007, 0.34, M.black, sd * 0.04, 0.4, 1.2); bx(0.012, 0.012, 0.012, M.black, sd * 0.04, 0.23, 1.28) } // 二脚（畳んだ形）
  // 後ろの取っ手（二本）と引き金
  bx(0.02, 0.1, 0.03, M.black, -0.085, 0.4, 0.14); bx(0.02, 0.1, 0.03, M.black, 0.085, 0.4, 0.14)
  bx(0.2, 0.025, 0.03, M.black, 0, 0.455, 0.11)
  cy(0.016, 0.016, 0.07, M.rubber, -0.085, 0.36, 0.14, 'y'); cy(0.016, 0.016, 0.07, M.rubber, 0.085, 0.36, 0.14, 'y')
  // 弾薬箱と弾帯
  bx(0.2, 0.21, 0.14, M.olive, 0.17, 0.33, 0.45)
  bx(0.205, 0.02, 0.145, M.black, 0.17, 0.44, 0.45)
  for (let i = 0; i < 9; i++) { const t = i / 8, a = t * 1.3; mkMesh(new THREE.BoxGeometry(0.018, 0.02, 0.05), M.brass, 0.17 - Math.sin(a) * 0.1, 0.43 + Math.sin(a * 0.9) * 0.05, 0.43 - t * 0.1 + 0.02, g, false) }
  // 銃座: 支柱と回転台
  cy(0.05, 0.065, 0.62, M.black, 0, 0.1, 0.34, 'y')
  cy(0.16, 0.19, 0.06, M.black, 0, -0.2, 0.34, 'y', 18)
  bx(0.12, 0.08, 0.2, M.black, 0, 0.35, 0.4)
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.95, depthWrite: false })); flash.position.set(0, 0.47, 1.98); flash.visible = false; g.add(flash)
  bake(g, new Set([flash]))
  return { g, flash }
}

// ---------------------------------------------------------------- 実車: クーペ
const COUPE_HAS = { door: 'BodyDoorRColor1' }
function instReal(color) {
  const group = new THREE.Group(); group.rotation.order = 'YXZ'
  const body = TEMPLATE.clone(true); group.add(body)
  const matCache = new Map(), own = m => { if (!matCache.has(m)) matCache.set(m, m.clone()); return matCache.get(m) }
  const paints = []
  body.traverse(o => {
    if (!o.isMesh) return
    const n = o.material.name || ''
    if (/^Paint 1/.test(n)) { o.material = own(o.material); if (!paints.includes(o.material)) { o.material.color.set(color); o.material.shadowSide = THREE.BackSide; paints.push(o.material) } }
    else if (n === 'Brakelight') { o.material = own(o.material); o.material.emissive = new THREE.Color(0xff1a10); o.material.emissiveIntensity = 0.7 }
    else if (n === 'Headlight') { o.material = own(o.material); o.material.emissive = new THREE.Color(0xfff2d8); o.material.emissiveIntensity = 1.2 }
    else if (/^(Tiretread|Tireside)$/.test(n)) { }
  })
  group.updateMatrixWorld(true)
  const wheels = []
  for (const [n, front] of [['WheelFrontL', true], ['WheelFrontR', true], ['WheelRearL', false], ['WheelRearR', false]]) {
    const w = body.getObjectByName(n)
    const b = new THREE.Box3().setFromObject(w)
    const ctr = group.worldToLocal(b.getCenter(new THREE.Vector3()))
    const steer = new THREE.Group(), spin = new THREE.Group()
    steer.position.copy(ctr); group.add(steer); steer.add(spin); spin.attach(w)
    wheels.push({ piv: steer, spin, front, side: ctr.x > 0 ? 1 : -1 })
  }
  const hood = body.getObjectByName('hood')
  return { group, paints, wheels, hood, fl: [hood], ground: -0.55 }
}

// ---------------------------------------------------------------- 曲面の車体: セダンとピックアップ
const SEDAN = { W: 0.92, L: 2.28, H: 0.9, hood: 0.34, cabF: 0.78, cabR: -1.3, track: 0.8, haunch: 1.0, wr: 0.36, wz: 1.4 }
const PICKUP = { W: 1.02, L: 2.5, H: 1.12, hood: 0.5, cabF: 0.62, cabR: -0.32, track: 0.86, haunch: 1.0, wr: 0.42, ww: 0.17, wz: 1.55, gst: [[0, 0.82], [0.08, 1], [0.85, 1], [1, 0.12]], top: 0.82, roof: [0.04, 0.9] }
function instProc(color, type) {
  const S = type === 0 ? SEDAN : PICKUP, M = mats()
  const car = new ProcCar(S, color); car.paintMat.shadowSide = THREE.BackSide
  for (const f of car.flames) f.parent.remove(f)
  car.group.children[2].position.y += 0.012
  const g = car.group, fl = [car.parts.hood, car.parts.mirrorL, car.parts.mirrorR, car.parts.bumper].filter(Boolean)
  const SM = sharedMats()
  // ボンネットは車体の面に重なる板: 別の材質で少し手前に描いて、縞（z ファイト）を避ける
  const hoodMat = car.paintMat.clone(); hoodMat.polygonOffset = true; hoodMat.polygonOffsetFactor = -2; hoodMat.polygonOffsetUnits = -2; hoodMat.shadowSide = THREE.BackSide; car.parts.hood.material = hoodMat
  for (const k of ['mirrorL', 'mirrorR']) { const m = car.parts[k]; if (m) { m.material = M.black; m.scale.set(0.8, 0.8, 0.9) } }
  g.traverse(o => { if (!o.isMesh) return; if (o.material === SM.head) o.scale.set(0.85, 0.8, 0.9); if (o.geometry.type === 'BoxGeometry' && o.geometry.parameters.width > 0.9 * S.W && o.geometry.parameters.height === 0.12) o.scale.set(0.6, 0.75, 1) })
  if (type === 2) {
    const topY = S.hood + 0.04
    // 荷台: 壁・床・後ろの扉・運転台の後ろの壁
    const wall = (w, h, d, x, y, z) => { const o = mkMesh(new THREE.BoxGeometry(w, h, d), car.paintMat, x, y, z, g); return o }
    const bedZ0 = S.cabR - 0.04, bedZ1 = -S.L + 0.03, len = bedZ0 - bedZ1, zc = (bedZ0 + bedZ1) / 2
    const wl = wall(0.07, 0.34, len, S.W * 0.93, topY + 0.1, zc), wr = wall(0.07, 0.34, len, -S.W * 0.93, topY + 0.1, zc)
    const gate = wall(S.W * 1.9, 0.34, 0.07, 0, topY + 0.1, bedZ1); const front = wall(S.W * 1.9, 0.46, 0.07, 0, topY + 0.16, bedZ0)
    mkMesh(new THREE.BoxGeometry(S.W * 1.82, 0.05, len), M.bed, 0, topY + 0.045, zc, g, false)
    for (const sd of [-1, 1]) { mkMesh(new THREE.BoxGeometry(0.1, 0.03, len), M.black, sd * S.W * 0.93, topY + 0.285, zc, g, false) }   // 縁のゴム
    // 荷台の縦の補強（ひだ）
    for (let i = 0; i < 5; i++) mkMesh(new THREE.BoxGeometry(S.W * 1.8, 0.012, 0.045), M.black, 0, topY + 0.074, bedZ1 + 0.3 + i * (len - 0.6) / 4, g, false)
    fl.push(gate, wl, wr)
    // 運転台の後ろ: 板金の壁と小さな後ろ窓（黒い箱に見えないように）
    const cabH = S.H - S.hood + 0.04
    mkMesh(new THREE.BoxGeometry(S.W * 1.84, cabH, 0.07), car.paintMat, 0, S.hood + 0.02 + cabH / 2, S.cabR - 0.03, g)
    mkMesh(new THREE.BoxGeometry(S.W * 1.1, 0.2, 0.02), M.glass, 0, S.hood + cabH * 0.62, S.cabR - 0.07, g, false)
    car.extraBedTop = topY + 0.07
  }
  { const keep = new Set([...fl, ...car.wheels.map(w => w.pivot)]); bake(g, keep, false); for (const o of fl) if (o.material) o.receiveShadow = false }
  return { group: g, paints: [car.paintMat, hoodMat], wheels: car.wheels.map(w => ({ piv: w.pivot, spin: w.w, front: w.front, side: w.pivot.position.x > 0 ? 1 : -1 })), hood: car.parts.hood, fl, ground: car.wheels[0].rest - car.WR, car }
}

// 各型の屋根の射手台の位置 [z, y(地面から)] と、床に当たる高さ
export const SEAT = [{ z: -0.3, y: 1.52 }, { z: -0.62, y: 1.18 }, { z: -1.62, y: 1.78 }]

export function buildCar(color, num = 1, type = 0) {
  const M = mats()
  let inst
  if (type === 1 && TEMPLATE) inst = instReal(color)
  else inst = instProc(color, type === 1 ? 0 : type)
  const holder = new THREE.Group(); holder.position.y = -inst.ground; holder.add(inst.group)
  const body = new THREE.Group(); body.add(holder)
  const root = new THREE.Group(); root.add(body)
  root.updateMatrixWorld(true)
  const bb = new THREE.Box3().setFromObject(inst.group)
  const front = bb.max.z, rear = bb.min.z, halfW = (bb.max.x - bb.min.x) / 2, roofY = bb.max.y
  // ボンネットの蝶番
  const hood = inst.hood
  const hoodPivot = new THREE.Group()
  { const hb = new THREE.Box3().setFromObject(hood); const c = hb.getCenter(new THREE.Vector3()); const p = body.worldToLocal(new THREE.Vector3(c.x, hb.max.y - 0.05, hb.min.z)); hoodPivot.position.copy(p); body.add(hoodPivot); hoodPivot.attach(hood) }
  // 番号の丸（両側のドア）
  const nt = numberTexture(num, '#' + color.toString(16).padStart(6, '0')), nm = new THREE.MeshBasicMaterial({ map: nt, transparent: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })
  { const dz = [-0.1, -0.35, -1.2][type], dy = [0.92, 0.82, 1.1][type]
    for (const sd of [-1, 1]) { const o = new THREE.Mesh(new THREE.CircleGeometry(0.24, 20), nm); o.position.set(sd * (halfW - 0.005), dy, dz); o.rotation.y = sd * Math.PI / 2; body.add(o) } }
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), new THREE.MeshBasicMaterial({ color, visible: false })); flag.visible = false; body.add(flag)
  // 射手台
  const st = SEAT[type]
  const turret = new THREE.Group(); turret.position.set(0, st.y, st.z); body.add(turret)
  if (type !== 2) { // 屋根の穴: 黒い円とゴムの縁
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.34, 22), M.hatch); disc.rotation.x = -Math.PI / 2; disc.position.set(0, 0.006, 0); turret.add(disc)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.345, 0.018, 8, 26), M.rubber); ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; turret.add(ring)
  } else { // 荷台: ロールバー（運転台の後ろの門型）
    const hoopG = new THREE.TorusGeometry(0.62, 0.024, 8, 20, Math.PI), hoop = new THREE.Mesh(hoopG, M.black); hoop.position.set(0, -0.45, 0.5); hoop.scale.set(1, 0.95, 1); hoop.castShadow = true; turret.add(hoop)
  }
  const gun = buildGun(); turret.add(gun.g)
  // 射手（人）: 腰から上が出る。両手は銃の取っ手へ
  const crew = new THREE.Group(); crew.name = 'crew'; turret.add(crew)
  const gunner = makePerson({ shirt: 0x3a3d38, pants: 0x34382f, shoes: 0x1c1c1c, vest: color, sleeve: 0.62, helm: 0x575c48 })
  const gr = gunner.root; gr.scale.setScalar(0.96); gr.position.set(0, -1.0 * 0.96 + 0.02, -0.1); crew.add(gr)
  gr.updateMatrixWorld(true)
  gunner.bones.spine_01.rotateX(0.14); gunner.bones.spine_02.rotateX(0.06); gunner.bones.Head.rotateX(-0.1)
  const hw = (x, y, z) => turret.localToWorld(new THREE.Vector3(x, y, z))
  turret.updateMatrixWorld(true)
  for (const [sd, key] of [[-1, 'l'], [1, 'r']]) {
    const tgt = hw(sd * 0.085, 0.4, 0.13)
    ik2(gunner.bones[`upperarm_${key}`], gunner.bones[`lowerarm_${key}`], gunner.bones[`hand_${key}`], tgt, new THREE.Vector3(sd * 0.7, -0.5, -0.4))
    curl(gunner, key, 0.9)
  }
  // 運転手（実車だけ。窓から見える）
  const drvHelm = { material: new THREE.MeshStandardMaterial({ color: 0x575c48 }) }
  // 銃口の光と、ほかの部品
  const spear = new THREE.Group()
  { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.0, 10).rotateX(Math.PI / 2), M.steel); sh.position.z = 1.2; spear.add(sh); sh.castShadow = true
    const tp = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.0, 10).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xcfd3d6, roughness: 0.22, metalness: 0.95 })); tp.position.z = 3.2; spear.add(tp); tp.castShadow = true }
  spear.position.set(0, 0.62, front - 0.4); spear.visible = false; spear.scale.z = 0.01; body.add(spear)
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0xffb000, emissive: 0xffa000, emissiveIntensity: 1.2 }))
  beacon.position.set(0, st.y + 0.55, st.z); beacon.visible = false; body.add(beacon)
  const own = [gunner.helm.material, drvHelm.material, flag.material, nm, nt, beacon.material, gun.flash.material, ...(inst.paints.length && type === 1 && TEMPLATE ? [] : [])]
  const paint = inst.paints[0]
  return { own, g: root, body, spear, paint, paints: inst.paints, parts: {}, wheels: inst.wheels, turret, crew, gun: { flash: gun.flash, helm: gunner.helm }, drv: { helm: drvHelm }, hood, hoodPivot, flag, beacon, fl: inst.fl.filter(Boolean), base: new THREE.Color(color), num, dims: { front, rear, halfW, roofY } }
}

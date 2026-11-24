// 車と人の見た目。おもちゃのバンパーカー。曲面の車体・太いタイヤ・屋根の射手台・旗
import * as THREE from 'three'
import { numberTexture, grimeTexture } from './textures.js?v=3'
import { mergeGeometries } from '../vendor/jsm/utils/BufferGeometryUtils.js'

const cache = {}
function rbox(w, h, d, r = 0.2) {
  const key = `rb${w}_${h}_${d}_${r}`; if (cache[key]) return cache[key]
  const b = Math.min(r * 0.45, w / 4, h / 4, d / 4), rr = Math.max(0.001, Math.min(r - b, (w - 2 * b) / 2 - 0.001, (d - 2 * b) / 2 - 0.001))
  const W = w - 2 * b, D = d - 2 * b, s = new THREE.Shape(), x = -W / 2, y = -D / 2
  s.moveTo(x + rr, y); s.lineTo(x + W - rr, y); s.quadraticCurveTo(x + W, y, x + W, y + rr); s.lineTo(x + W, y + D - rr); s.quadraticCurveTo(x + W, y + D, x + W - rr, y + D)
  s.lineTo(x + rr, y + D); s.quadraticCurveTo(x, y + D, x, y + D - rr); s.lineTo(x, y + rr); s.quadraticCurveTo(x, y, x + rr, y)
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, h - 2 * b), bevelEnabled: b > 0.001, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 5 })
  g.rotateX(-Math.PI / 2); g.translate(0, b, 0)   // 底が y=0 になるように
  g.translate(0, 0, 0); g.computeVertexNormals()
  return cache[key] = g
}
const G = (k, f) => cache[k] || (cache[k] = f())
const M = {}
function mats() {
  if (M.dark) return M
  M.dark = new THREE.MeshStandardMaterial({ color: 0x1c1d1f, roughness: 0.6, metalness: 0.3 })
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 })
  M.steel = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.28, metalness: 0.95 })
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0x1b2833, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.62, envMapIntensity: 1.4 })
  M.white = new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.5 })
  M.lamp = new THREE.MeshStandardMaterial({ color: 0xfff4d0, emissive: 0xffe8a0, emissiveIntensity: 1.1, roughness: 0.2 })
  M.tail = new THREE.MeshStandardMaterial({ color: 0xaa1a12, emissive: 0xff2a10, emissiveIntensity: 0.9, roughness: 0.3 })
  M.skin = new THREE.MeshStandardMaterial({ color: 0xe8b890, roughness: 0.7 })
  M.goggle = new THREE.MeshStandardMaterial({ color: 0x1e3340, roughness: 0.15, metalness: 0.5 })
  return M
}

// 描く回数を減らすため、動かない部品は材質ごとに1つの形に焼き込む
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color()
export class Baker {
  constructor() { this.geos = [] }
  add(geo, x = 0, y = 0, z = 0, color = null, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone()
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)); g.applyMatrix4(_m)
    if (g.attributes.uv2) g.deleteAttribute('uv2')
    if (color !== null) { const n = g.attributes.position.count, a = new Float32Array(n * 3); _c.setHex(color); for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)) }
    this.geos.push(g); return this
  }
  mesh(mat, shadow = true) { if (!this.geos.length) return null; const o = new THREE.Mesh(mergeGeometries(this.geos), mat); o.geometry.userData.own = true; o.castShadow = shadow; o.receiveShadow = true; return o }
}
let TRIM, LIGHTM, GRIME
export function buildCar(color, num = 1, type = 0) {
  const m = mats()
  TRIM = TRIM || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.45 })
  LIGHTM = LIGHTM || new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
  GRIME = GRIME || (() => { const g = grimeTexture(); g.repeat.set(0.5, 0.5); return g })()
  const paint = new THREE.MeshPhysicalMaterial({ color, map: GRIME, roughness: 0.38, metalness: 0.2, clearcoat: 0.85, clearcoatRoughness: 0.18 })
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body)
  const bkP = new Baker(), bkT = new Baker(), bkG = new Baker(), bkL = new Baker()
  // 車体と運転台
  bkP.add(rbox(2.0, 0.78, 4.1, 0.34), 0, 0.42, 0).add(rbox(1.72, 0.72, 2.05, 0.3), 0, 1.15, -0.32)
  // 窓
  const wsG = G('ws', () => new THREE.BoxGeometry(1.5, 0.5, 0.06))
  bkG.add(wsG, 0, 1.45, 0.71, null, -0.45).add(wsG, 0, 1.45, -1.36, null, 0.4)
  for (const sd of [-1, 1]) bkG.add(G('sw', () => new THREE.BoxGeometry(0.05, 0.46, 1.5)), sd * 0.87, 1.5, -0.32)
  // 飾り（白線・屋根の縞・ボンネットの縞・バンパーの縞）
  const W = 0xf0ece0
  for (const sd of [-1, 1]) bkT.add(G('stripeS', () => new THREE.BoxGeometry(0.04, 0.14, 3.0)), sd * 1.01, 0.6, 0, W)
  bkT.add(G('roofS', () => new THREE.BoxGeometry(0.3, 0.02, 1.9)), 0, 1.885, -0.32, W)
  // 灯り
  for (const sd of [-0.62, 0.62]) { bkL.add(G('hl', () => new THREE.BoxGeometry(0.4, 0.22, 0.08)), sd, 0.7, 2.05, 0xffe9b0); bkL.add(G('tl', () => new THREE.BoxGeometry(0.36, 0.16, 0.08)), sd, 0.7, -2.05, 0xff3a22) }
  // 旗の柱
  bkT.add(G('mast', () => new THREE.CylinderGeometry(0.018, 0.018, 1.7, 6)), 0.78, 1.8, -1.85, 0xb8bcc0)
  // 運転手（胴と頭と目の覆い）
  const dp = [-0.4, 0.95, 0.1]
  bkT.add(rbox(0.56, 0.5, 0.36, 0.14), dp[0], dp[1], dp[2], 0x31363b, 0, 0, 0, 0.85, 0.85, 0.85)
  bkT.add(G('head', () => new THREE.SphereGeometry(0.2, 12, 10)), dp[0], dp[1] + 0.72 * 0.85, dp[2], 0xe8b890, 0, 0, 0, 0.85, 0.85, 0.85)
  bkT.add(G('gog', () => new THREE.BoxGeometry(0.34, 0.1, 0.1)), dp[0], dp[1] + 0.74 * 0.85, dp[2] + 0.17 * 0.85, 0x1e3340, 0, 0, 0, 0.85, 0.85, 0.85)
  // 車の種類ごとの見た目の違い
  if (type === 1) { bkT.add(G('spoilerP', () => new THREE.BoxGeometry(1.9, 0.08, 0.5)), 0, 1.5, -2.0, 0x1c1d1f); for (const sd of [-0.7, 0.7]) bkT.add(G('spoilerL', () => new THREE.BoxGeometry(0.08, 0.5, 0.4)), sd, 1.25, -2.0, 0x1c1d1f); bkT.add(G('fastS', () => new THREE.BoxGeometry(0.2, 0.03, 4.0)), 0.4, 1.22, 0, 0xf4f0e6).add(G('fastS', () => new THREE.BoxGeometry(0.2, 0.03, 4.0)), -0.4, 1.22, 0, 0xf4f0e6) }
  if (type === 2) { bkT.add(G('bullB', () => new THREE.BoxGeometry(2.4, 0.18, 0.2)), 0, 0.95, 2.45, 0xb8bcc0).add(G('bullB', () => new THREE.BoxGeometry(2.4, 0.18, 0.2)), 0, 0.55, 2.45, 0xb8bcc0); for (const sd of [-1.1, 0, 1.1]) bkT.add(G('bullP', () => new THREE.BoxGeometry(0.16, 0.6, 0.2)), sd, 0.75, 2.45, 0xb8bcc0); for (const sd of [-0.5, 0.5]) bkT.add(G('stack', () => new THREE.CylinderGeometry(0.1, 0.1, 1.0, 8)), sd, 2.2, -1.45, 0x6f7377) ; bkT.add(G('roofL', () => new THREE.BoxGeometry(1.5, 0.12, 0.2)), 0, 1.9, 0.5, 0xe8b81c) }
  if (type === 3) { for (const sd of [-1, 1]) bkT.add(G('fin', () => new THREE.BoxGeometry(0.06, 0.45, 0.9)), sd * 1.0, 1.55, -1.5, 0xf4f0e6, 0, 0, sd * 0.25); bkT.add(G('agB', () => new THREE.BoxGeometry(1.95, 0.1, 0.1)), 0, 0.62, 2.18, 0xf4f0e6) }
  const parts = { F: [], B: [], L: [], R: [] }
  const one = (bk, mat, shadow = true) => { const o = bk.mesh(mat, shadow); if (o) body.add(o); return o }
  one(bkP, paint); one(bkT, TRIM); const gm = one(bkG, m.glass, false); one(bkL, LIGHTM, false)
  const fl = []
  const mk = (geo, mat, x, y, z, parent = body) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o }
  // ボンネット（壊れるとはね上がる）
  const hoodPivot = new THREE.Group(); hoodPivot.position.set(0, 1.2, 0.7); body.add(hoodPivot)
  const hood = mk(rbox(1.84, 0.1, 1.2, 0.14), paint, 0, 0, 0.6, hoodPivot); fl.push(hood)
  // バンパー
  const bumpF = mk(rbox(2.3, 0.38, 0.42, 0.18), m.dark, 0, 0.22, 2.1), bumpB = mk(rbox(2.3, 0.38, 0.42, 0.18), m.dark, 0, 0.22, -2.1); fl.push(bumpF, bumpB)
  // ドア（外れる）
  for (const sd of [-1, 1]) { const d = mk(rbox(0.06, 0.62, 1.3, 0.04), paint, sd * 1.02, 0.5, -0.3); fl.push(d) }
  // 番号の丸（両側1枚にまとめる）
  const nt = numberTexture(num, '#' + color.toString(16).padStart(6, '0')), nm = new THREE.MeshBasicMaterial({ map: nt, transparent: true })
  const bkN = new Baker(); for (const sd of [-1, 1]) bkN.add(G('numP', () => new THREE.CircleGeometry(0.36, 18)), sd * 1.06, 0.95, -0.3, null, 0, sd * Math.PI / 2, 0)
  const nmesh = bkN.mesh(nm, false); body.add(nmesh)
  // 旗
  const flag = new THREE.Mesh(G('flag', () => { const g = new THREE.PlaneGeometry(0.62, 0.34, 6, 1); g.translate(0.31, 0, 0); return g }), new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.7, emissive: color, emissiveIntensity: 0.18 }))
  flag.position.set(0.78, 2.4, -1.85); flag.rotation.y = Math.PI / 2; body.add(flag)
  // 車輪（タイヤとホイールを1つに）
  const wheels = []
  const tg = G('tire', () => { const g = new THREE.CylinderGeometry(0.52, 0.52, 0.46, 18); g.rotateZ(Math.PI / 2); return g })
  const hg = G('hub', () => { const g = new THREE.CylinderGeometry(0.27, 0.27, 0.48, 12); g.rotateZ(Math.PI / 2); return g })
  for (const [wx, wz] of [[1.02, 1.36], [-1.02, 1.36], [1.02, -1.36], [-1.02, -1.36]]) {
    const piv = new THREE.Group(); piv.position.set(wx, 0.52, wz); root.add(piv)
    const spin = new THREE.Group(); piv.add(spin)
    const bk = new Baker().add(tg, 0, 0, 0, 0x141414).add(hg, 0, 0, 0, 0xb8bcc0).add(G('spoke', () => new THREE.BoxGeometry(0.5, 0.36, 0.05)), wx > 0 ? 0.25 : -0.25, 0, 0, 0x1c1d1f)
    spin.add(bk.mesh(TRIM, true))
    wheels.push({ piv, spin, front: wz > 0, side: Math.sign(wx) })
  }
  // 屋根の射手台
  const turret = new THREE.Group(); turret.position.set(0, 1.9, -0.32); body.add(turret)
  const bt = new Baker(), bp = new Baker()
  bt.add(G('ring', () => new THREE.CylinderGeometry(0.62, 0.7, 0.16, 18)), 0, 0, 0, 0x1c1d1f)
  bt.add(rbox(0.56, 0.5, 0.36, 0.14), 0, 0.06, 0, 0x31363b).add(G('head', () => new THREE.SphereGeometry(0.2, 12, 10)), 0, 0.78, 0, 0xe8b890).add(G('gog', () => new THREE.BoxGeometry(0.34, 0.1, 0.1)), 0, 0.8, 0.17, 0x1e3340)
  bt.add(rbox(0.22, 0.3, 0.7, 0.08), 0, 0.4, 0.5, 0x23262a)
  bt.add(G('barrel', () => { const g = new THREE.CylinderGeometry(0.055, 0.065, 1.0, 8); g.rotateX(Math.PI / 2); return g }), 0, 0.56, 1.28, 0xb8bcc0)
  bp.add(G('tip', () => { const g = new THREE.CylinderGeometry(0.1, 0.075, 0.14, 8); g.rotateX(Math.PI / 2); return g }), 0, 0.56, 1.8).add(G('hop', () => new THREE.SphereGeometry(0.16, 10, 8)), 0, 0.72, 0.68)
  turret.add(bt.mesh(TRIM, true)); turret.add(bp.mesh(paint, false))
  const helmGeo = G('helm', () => new THREE.SphereGeometry(0.235, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62))
  const helmG = new THREE.Mesh(helmGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.4 })); helmG.position.set(0, 0.8, 0); helmG.castShadow = true; turret.add(helmG)
  const helmD = new THREE.Mesh(helmGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.4 })); helmD.position.set(dp[0], dp[1] + 0.74 * 0.85, dp[2]); helmD.scale.setScalar(0.85); body.add(helmD)
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false })); flash.position.set(0, 0.56, 1.9); flash.visible = false; turret.add(flash)
  // 槍（槍のアイテムを使った間だけ出る）
  const spear = new THREE.Group()
  { const sh = new THREE.Mesh(G('spearS', () => { const g = new THREE.CylinderGeometry(0.13, 0.16, 3.2, 10); g.rotateX(Math.PI / 2); return g }), new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.25, metalness: 0.95 })); sh.position.z = 1.6; spear.add(sh)
    const tp = new THREE.Mesh(G('spearT', () => { const g = new THREE.ConeGeometry(0.3, 1.1, 10); g.rotateX(Math.PI / 2); return g }), new THREE.MeshStandardMaterial({ color: 0xe8b81c, roughness: 0.3, metalness: 0.8 })); tp.position.z = 3.6; spear.add(tp) }
  spear.position.set(0, 0.8, 2.2); spear.visible = false; spear.scale.z = 0.01; body.add(spear)
  // 空き車の目印（黄色い灯り）
  const beacon = new THREE.Mesh(G('beacon', () => new THREE.CylinderGeometry(0.12, 0.16, 0.22, 10)), new THREE.MeshStandardMaterial({ color: 0xffb000, emissive: 0xffa000, emissiveIntensity: 1.2 }))
  beacon.position.set(0, 2.2, -0.3); beacon.visible = false; body.add(beacon)
  const own = [paint, helmG.material, helmD.material, flag.material, nm, nt, beacon.material, flash.material]
  return { own, g: root, body, spear, paint, parts, wheels, turret, gun: { flash, helm: helmG }, drv: { helm: helmD }, hood, hoodPivot, flag, bumpF, bumpB, beacon, fl, glass: gm, base: new THREE.Color(color), num }
}

// 歩く人（全身。足と腕が動く）
export function buildWalker(color) {
  const m = mats(), root = new THREE.Group()
  const suit = new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
  const torso = new THREE.Mesh(rbox(0.5, 0.62, 0.32, 0.13), suit); torso.position.y = 0.72; root.add(torso)
  const head = new THREE.Mesh(G('head', () => new THREE.SphereGeometry(0.2, 14, 12)), m.skin); head.position.y = 1.55; root.add(head)
  const helm = new THREE.Mesh(G('helm', () => new THREE.SphereGeometry(0.235, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62)), new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.4 })); helm.position.y = 1.57; root.add(helm)
  const gog = new THREE.Mesh(G('gog', () => new THREE.BoxGeometry(0.34, 0.1, 0.1)), m.goggle); gog.position.set(0, 1.57, 0.17); root.add(gog)
  const limb = (x, y, gx, len, mat) => { const p = new THREE.Group(); p.position.set(x, y, 0); const l = new THREE.Mesh(gx, mat); l.position.y = -len / 2; p.add(l); root.add(p); return p }
  const legG = G('leg', () => new THREE.CapsuleGeometry(0.1, 0.5, 4, 8)), armG = G('arm', () => new THREE.CapsuleGeometry(0.08, 0.4, 4, 8))
  const legL = limb(-0.15, 0.64, legG, 0.6, new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.8 })), legR = limb(0.15, 0.64, legG, 0.6, new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.8 }))
  const armL = limb(-0.34, 1.0, armG, 0.5, suit), armR = limb(0.34, 1.0, armG, 0.5, suit)
  root.traverse(o => { if (o.isMesh) o.castShadow = true })
  return { g: root, legL, legR, armL, armR, head, torso }
}

export { rbox }

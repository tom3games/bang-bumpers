// 車と人の見た目。おもちゃのバンパーカー。曲面の車体・太いタイヤ・屋根の射手台・旗
import * as THREE from 'three'
import { numberTexture, grimeTexture } from './textures.js?v=4'
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
let TRIM, LIGHTM, GRIME, GLASSM
// 側面の輪郭（前が +u）を押し出して、幅の分だけ厚みをつけた車体にする
function sideSolid(pts, width, bevel = 0.05) {
  const s = new THREE.Shape(); pts.forEach(([u, v], i) => i ? s.lineTo(u, v) : s.moveTo(u, v)); s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 })
  g.translate(0, 0, -(width - bevel * 2) / 2); g.rotateY(-Math.PI / 2); g.computeVertexNormals(); return g
}
// 車の種類ごとの形。lower=下半身、glass=窓まわり、他は寸法
const PROFILES = [
  { // 0 バランス: セダン
    W: 1.92, lower: [[-2.3, 0.3], [2.3, 0.3], [2.38, 0.55], [2.3, 0.84], [1.55, 0.98], [0.62, 1.02], [-1.5, 1.02], [-2.25, 0.97], [-2.37, 0.7]],
    glass: [[0.62, 1.0], [0.05, 1.4], [-0.55, 1.43], [-1.35, 1.12], [-1.5, 1.0]], roof: [-0.25, 1.435, 0.62], hood: [1.55, 0.96, 1.5], wz: 1.45, wr: 0.36, bump: [2.42, -2.4, 0.42], seat: [-0.4, 0.95, 0.15], turret: [-0.3, 1.46], lamp: 0.78, trunk: 0 },
  { // 1 ビュン: 低いクーペ
    W: 1.98, lower: [[-2.32, 0.28], [2.32, 0.28], [2.42, 0.48], [2.34, 0.7], [1.5, 0.8], [0.75, 0.86], [-1.2, 0.92], [-2.0, 0.9], [-2.38, 0.78], [-2.4, 0.5]],
    glass: [[0.75, 0.86], [0.15, 1.19], [-0.65, 1.21], [-1.7, 0.9]], roof: [-0.25, 1.2, 0.7], hood: [1.55, 0.8, 1.55], wz: 1.45, wr: 0.35, bump: [2.44, -2.42, 0.38], seat: [-0.4, 0.8, 0.1], turret: [-0.7, 1.16], lamp: 0.66, trunk: 1 },
  { // 2 ドスン: ピックアップ
    W: 2.16, lower: [[-2.45, 0.42], [2.35, 0.42], [2.42, 0.75], [2.38, 1.12], [1.2, 1.25], [0.7, 1.28], [0.7, 1.31], [-2.45, 1.31]],
    glass: [[0.78, 1.25], [0.48, 1.95], [-0.5, 1.98], [-0.66, 1.25]], roof: [-0.02, 1.97, 1.0], hood: [1.55, 1.22, 1.6], wz: 1.5, wr: 0.42, bump: [2.46, -2.5, 0.55], seat: [-0.45, 1.15, 0.1], turret: [-0.02, 2.02], lamp: 1.0, trunk: 2 },
]
export function buildCar(color, num = 1, type = 0) {
  const m = mats(), P = PROFILES[type] || PROFILES[0], W = P.W
  TRIM = TRIM || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.5 })
  LIGHTM = LIGHTM || new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
  GLASSM = GLASSM || new THREE.MeshPhysicalMaterial({ color: 0x0b1117, roughness: 0.06, metalness: 0.3, transparent: true, opacity: 0.8, envMapIntensity: 1.8 })
  GRIME = GRIME || (() => { const g = grimeTexture(); g.repeat.set(0.5, 0.5); return g })()
  const paint = new THREE.MeshPhysicalMaterial({ color, map: GRIME, roughness: 0.36, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.35 })
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body)
  const bkP = new Baker(), bkT = new Baker(), bkG = new Baker(), bkL = new Baker()
  // 車体の下半分（塗装）と窓まわり（ガラス）。屋根は薄い板で塗装
  bkP.add(sideSolid(P.lower, W, 0.06))
  bkG.add(sideSolid(P.glass, W - 0.16, 0.02))
  bkP.add(new THREE.BoxGeometry(W - 0.12, 0.05, P.roof[2]), 0, P.roof[1] + 0.02, P.roof[0])
  // 柱（窓のあいだ）
  for (const sd of [-1, 1]) { const g = P.glass; const f = g[0], r = g[g.length - 1]; bkT.add(new THREE.BoxGeometry(0.06, 0.07, 0.07), sd * (W / 2 - 0.1), (f[1] + g[1][1]) / 2, (f[0] + g[1][0]) / 2, 0x1a1b1d); bkT.add(new THREE.BoxGeometry(0.06, 0.4, 0.07), sd * (W / 2 - 0.09), (P.roof[1] + r[1]) / 2, P.roof[0] - P.roof[2] / 2 - 0.1, 0x1a1b1d) }
  // 灯りと格子と排気
  for (const sd of [-1, 1]) {
    bkL.add(new THREE.BoxGeometry(0.46, 0.12, 0.06), sd * (W / 2 - 0.36), P.lamp, P.bump[0] - 0.02, 0xfff0cc)
    bkL.add(new THREE.BoxGeometry(0.4, 0.05, 0.05), sd * (W / 2 - 0.36), P.lamp - 0.11, P.bump[0] - 0.02, 0xcfe0ff)
    bkL.add(new THREE.BoxGeometry(0.5, 0.11, 0.06), sd * (W / 2 - 0.34), P.lamp + 0.02, P.bump[1] + 0.03, 0xc0211a)
    bkT.add(new THREE.CylinderGeometry(0.045, 0.05, 0.26, 8), sd * (W / 2 - 0.5), 0.36, P.bump[1] - 0.1, 0x9a9da0, Math.PI / 2)
    bkT.add(new THREE.BoxGeometry(0.1, 0.07, 0.14), sd * (W / 2 + 0.06), P.glass[0][1] + 0.1, P.glass[0][0] - 0.08, 0x151618)            // ミラー
  }
  bkT.add(new THREE.BoxGeometry(W * 0.5, 0.2, 0.05), 0, P.lamp - 0.2, P.bump[0] + 0.005, 0x101112)                                       // 格子
  bkT.add(new THREE.BoxGeometry(W - 0.2, 0.04, 0.04), 0, P.lamp - 0.04, P.bump[0] - 0.01, 0x2a2b2d)
  // 運転手（窓ごしに見える）
  const dp = P.seat
  bkT.add(rbox(0.5, 0.45, 0.3, 0.1), dp[0], dp[1], dp[2], 0x2b2f2a, 0, 0, 0, 0.9, 0.9, 0.9)
  bkT.add(G('head', () => new THREE.SphereGeometry(0.19, 12, 10)), dp[0], dp[1] + 0.62, dp[2], 0xd9b08c, 0, 0, 0, 0.9, 0.9, 0.9)
  const one = (bk, mat, shadow = true) => { const o = bk.mesh(mat, shadow); if (o) body.add(o); return o }
  one(bkP, paint); one(bkT, TRIM); const gm = one(bkG, GLASSM, false); one(bkL, LIGHTM, false)
  const parts = { F: [], B: [], L: [], R: [] }, fl = []
  const mk = (geo, mat, x, y, z, parent = body) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o }
  // ボンネット（壊れるとはね上がる）
  const hoodPivot = new THREE.Group(); hoodPivot.position.set(0, P.hood[1] + 0.02, P.hood[0] - P.hood[2] / 2 - 0.02); body.add(hoodPivot)
  const hood = mk(new THREE.BoxGeometry(W - 0.22, 0.05, P.hood[2]), paint, 0, 0.01, P.hood[2] / 2, hoodPivot); fl.push(hood)
  // バンパー
  const bumpF = mk(new THREE.BoxGeometry(W + 0.02, 0.3, 0.24), m.dark, 0, P.bump[2], P.bump[0] - 0.04), bumpB = mk(new THREE.BoxGeometry(W + 0.02, 0.3, 0.24), m.dark, 0, P.bump[2], P.bump[1] + 0.04); fl.push(bumpF, bumpB)
  // ドア（外れる）
  for (const sd of [-1, 1]) { const d = mk(new THREE.BoxGeometry(0.05, 0.5, 1.15), paint, sd * (W / 2 + 0.012), P.lower[4] ? Math.min(0.72, P.lower[3][1] - 0.25) : 0.7, P.roof[0] - 0.05); fl.push(d) }
  // 番号の丸（両側）
  const nt = numberTexture(num, '#' + color.toString(16).padStart(6, '0')), nm = new THREE.MeshBasicMaterial({ map: nt, transparent: true })
  const bkN = new Baker(); for (const sd of [-1, 1]) bkN.add(G('numP', () => new THREE.CircleGeometry(0.26, 18)), sd * (W / 2 + 0.045), 0.82, P.roof[0] - 0.05, null, 0, sd * Math.PI / 2, 0)
  const nmesh = bkN.mesh(nm, false); body.add(nmesh)
  // 荷台（ピックアップだけ）
  if (type === 2) { bkT.geos.length = 0; const bk = new Baker(); bk.add(new THREE.BoxGeometry(W - 0.34, 0.04, 1.6), 0, 1.33, -1.65, 0x0e0f10); bk.add(new THREE.BoxGeometry(W - 0.2, 0.3, 0.05), 0, 1.45, -2.44, 0x2a2c2e); body.add(bk.mesh(TRIM, true)) }
  if (type === 1) { const bk = new Baker(); bk.add(new THREE.BoxGeometry(W - 0.1, 0.05, 0.4), 0, 1.0, -2.28, 0x151617); for (const sd of [-0.8, 0.8]) bk.add(new THREE.BoxGeometry(0.05, 0.3, 0.34), sd, 0.88, -2.28, 0x151617); body.add(bk.mesh(TRIM, true)) }
  // 旗の代わりのダミー（見た目は無し）
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), new THREE.MeshBasicMaterial({ color, visible: false })); flag.visible = false; body.add(flag)
  // 車輪: タイヤとホイール。後ろに黒い円（ホイールハウス）
  const wheels = []
  const tg = G('tire' + P.wr, () => { const g = new THREE.CylinderGeometry(P.wr, P.wr, 0.27, 24); g.rotateZ(Math.PI / 2); return g })
  const hg = G('hub' + P.wr, () => { const g = new THREE.CylinderGeometry(P.wr * 0.66, P.wr * 0.66, 0.29, 18); g.rotateZ(Math.PI / 2); return g })
  const arch = G('arch' + P.wr, () => new THREE.CircleGeometry(P.wr + 0.1, 20))
  const bka = new Baker()
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const wx = sx * (W / 2 - 0.1), wz = sz * P.wz
    bka.add(arch, sx * (W / 2 + 0.006), P.wr, wz, 0x050505, 0, sx * Math.PI / 2, 0)
    const piv = new THREE.Group(); piv.position.set(wx, P.wr, wz); root.add(piv)
    const spin = new THREE.Group(); piv.add(spin)
    const bk = new Baker().add(tg, 0, 0, 0, 0x121212).add(hg, 0, 0, 0, 0x9ea2a6)
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; bk.add(new THREE.BoxGeometry(0.3, 0.05, 0.05), sx * 0.15, Math.sin(a) * P.wr * 0.36, Math.cos(a) * P.wr * 0.36, 0x2b2d30, a, 0, 0) }
    bk.add(G('cap' + P.wr, () => { const g = new THREE.CylinderGeometry(P.wr * 0.18, P.wr * 0.18, 0.31, 8); g.rotateZ(Math.PI / 2); return g }), 0, 0, 0, 0x26282b)
    spin.add(bk.mesh(TRIM, true))
    wheels.push({ piv, spin, front: sz > 0, side: sx })
  }
  body.add(bka.mesh(new THREE.MeshBasicMaterial({ vertexColors: true }), false))
  // 屋根の射手台: 低い台・防盾・機関銃・弾薬箱・射手
  const turret = new THREE.Group(); turret.position.set(0, P.turret[1], P.turret[0]); body.add(turret)
  const bt = new Baker()
  bt.add(G('ring', () => new THREE.CylinderGeometry(0.6, 0.66, 0.12, 20)), 0, 0.02, 0, 0x202225)
  bt.add(rbox(0.52, 0.5, 0.3, 0.1), 0, 0.06, -0.05, 0x3a4034)                                   // 戦闘服（ベスト）
  bt.add(rbox(0.3, 0.18, 0.12, 0.05), 0, 0.34, 0.12, 0x2a2e28)
  bt.add(G('head', () => new THREE.SphereGeometry(0.19, 12, 10)), 0, 0.72, -0.05, 0xd2a888)
  bt.add(G('gog', () => new THREE.BoxGeometry(0.34, 0.08, 0.1)), 0, 0.74, 0.1, 0x14181c)
  bt.add(new THREE.BoxGeometry(0.95, 0.5, 0.05), 0, 0.45, 0.62, 0x2d3034)                       // 防盾
  bt.add(new THREE.BoxGeometry(0.8, 0.05, 0.05), 0, 0.72, 0.62, 0x1b1d20)
  bt.add(new THREE.BoxGeometry(0.13, 0.17, 0.7), 0, 0.42, 0.28, 0x1d1f22)                       // 機関部
  bt.add(G('barrel2', () => { const g = new THREE.CylinderGeometry(0.032, 0.036, 1.1, 8); g.rotateX(Math.PI / 2); return g }), 0, 0.45, 1.3, 0x7d8286)
  bt.add(G('shroud', () => { const g = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8); g.rotateX(Math.PI / 2); return g }), 0, 0.45, 0.9, 0x26292c)
  bt.add(new THREE.BoxGeometry(0.22, 0.2, 0.3), 0.26, 0.3, 0.2, 0x4a5240)                       // 弾薬箱
  bt.add(new THREE.BoxGeometry(0.08, 0.2, 0.08), 0, 0.28, 0.5, 0x151618, 0.3)                   // 握り
  turret.add(bt.mesh(TRIM, true))
  const helmGeo = G('helm', () => new THREE.SphereGeometry(0.235, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6))
  const helmG = new THREE.Mesh(helmGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1 })); helmG.position.set(0, 0.76, -0.05); helmG.castShadow = true; turret.add(helmG)
  const helmD = new THREE.Mesh(helmGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1 })); helmD.position.set(dp[0], dp[1] + 0.66, dp[2]); helmD.scale.setScalar(0.9); body.add(helmD)
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.95, depthWrite: false })); flash.position.set(0, 0.45, 1.95); flash.visible = false; turret.add(flash)
  // 槍（槍のアイテムを使った間だけ出る）
  const spear = new THREE.Group()
  { const sh = new THREE.Mesh(G('spearS', () => { const g = new THREE.CylinderGeometry(0.1, 0.13, 3.0, 10); g.rotateX(Math.PI / 2); return g }), new THREE.MeshStandardMaterial({ color: 0x8e9398, roughness: 0.3, metalness: 0.95 })); sh.position.z = 1.5; spear.add(sh)
    const tp = new THREE.Mesh(G('spearT', () => { const g = new THREE.ConeGeometry(0.22, 1.0, 10); g.rotateX(Math.PI / 2); return g }), new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.25, metalness: 0.95 })); tp.position.z = 3.4; spear.add(tp) }
  spear.position.set(0, 0.7, P.bump[0] - 0.1); spear.visible = false; spear.scale.z = 0.01; body.add(spear)
  // 空き車の目印（黄色い回転灯）
  const beacon = new THREE.Mesh(G('beacon', () => new THREE.CylinderGeometry(0.1, 0.14, 0.2, 10)), new THREE.MeshStandardMaterial({ color: 0xffb000, emissive: 0xffa000, emissiveIntensity: 1.2 }))
  beacon.position.set(0, P.turret[1] + 0.9, P.turret[0]); beacon.visible = false; body.add(beacon)
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

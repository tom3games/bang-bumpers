// 拾い物は地面に置かれた実物の箱: 運転側=工具箱（橙の帯）・射手側=弾薬箱（青の帯）・修理=救急箱（緑の帯）。役は帯の色と、箱に刷った小さな記号で分かる
import * as THREE from 'three'
import { Baker, rbox } from './models.js?v=6'

export const ROLE_COLOR = { driver: 0xd98a3a, gunner: 0x3a9fbe, repair: 0x3c9a63 }
// 箱ごとの大きさ（幅・高さ・奥行）と、記号を貼る位置
const DIM = { driver: [1.08, 0.62, 0.66], gunner: [0.98, 0.56, 0.54], repair: [0.92, 0.54, 0.56] }

function build(kind) {
  const [W, H, D] = DIM[kind], b = new Baker(), band = ROLE_COLOR[kind]
  const bx = (w, h, d, x, y, z, c, rx = 0, ry = 0, rz = 0) => b.add(new THREE.BoxGeometry(w, h, d), x, y, z, c, rx, ry, rz)
  const lidH = kind === 'gunner' ? 0.14 : 0.2, baseH = H - lidH
  const col = { driver: [0x2f343a, 0x3b4148], gunner: [0x434d34, 0x4f5a3e], repair: [0xcfcdc4, 0xdad8d0] }[kind]
  b.add(rbox(W, baseH, D, 0.05), 0, 0, 0, col[0])
  b.add(rbox(W + 0.02, lidH, D + 0.02, 0.06), 0, baseH, 0, col[1])
  bx(W - 0.06, 0.012, D + 0.026, 0, baseH, 0, 0x14161a)                                   // ふたの合わせ目
  bx(0.2, H + 0.006, D + 0.04, W * 0.26, H / 2, 0, band)                                  // 役の色の帯
  bx(0.2, 0.012, D + 0.05, W * 0.26, baseH, 0, 0x14161a)
  // 取っ手（ふたの上のアーチ）
  const hg = new THREE.TorusGeometry(0.13, 0.02, 6, 12, Math.PI); b.add(hg, W * 0.26, H + 0.005, 0, kind === 'repair' ? 0x1a1b1d : 0x9aa0a6, 0, 0, 0)
  bx(0.05, 0.03, 0.05, W * 0.26 - 0.13, H + 0.012, 0, 0x6b7076); bx(0.05, 0.03, 0.05, W * 0.26 + 0.13, H + 0.012, 0, 0x6b7076)
  // 留め金（前後）
  for (const sz of [-1, 1]) for (const sx of [-0.3, 0.14]) { bx(0.1, 0.13, 0.03, sx * W / 1.05, baseH + 0.01, sz * (D / 2 + 0.03), 0x9aa0a6); bx(0.045, 0.03, 0.04, sx * W / 1.05, baseH + 0.02, sz * (D / 2 + 0.042), 0x2a2d31) }
  if (kind === 'driver') { // 工具箱: 角あて・補強のうね
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(0.09, 0.09, 0.09, sx * (W / 2 - 0.02), 0.045, sz * (D / 2 - 0.02), 0x1a1c1f)
    for (const y of [0.12, 0.2]) { bx(W - 0.2, 0.022, 0.016, -0.05, y, D / 2 + 0.008, 0x484e56); bx(W - 0.2, 0.022, 0.016, -0.05, y, -D / 2 - 0.008, 0x484e56) }
  } else if (kind === 'gunner') { // 弾薬箱: ふちの出っぱり・白い縁取りの角
    bx(W - 0.1, 0.03, 0.03, 0, baseH + lidH - 0.02, D / 2 + 0.01, 0x333b27); bx(W - 0.1, 0.03, 0.03, 0, baseH + lidH - 0.02, -D / 2 - 0.01, 0x333b27)
    for (const sx of [-1, 1]) bx(0.05, H - 0.05, D + 0.01, sx * (W / 2 - 0.1), H / 2, 0, 0x39422c)
  } else { // 救急箱: 側面の黒い留め具と細い赤線
    bx(W + 0.01, 0.025, D + 0.01, 0, 0.1, 0, 0xb43a31)
  }
  return b
}

const GEO = {}
export function crateMeshes() {
  if (GEO.driver) return GEO
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.35, envMapIntensity: 0.9 })
  for (const k of ['driver', 'gunner', 'repair']) { GEO[k] = build(k).mesh(mat, true); GEO[k].userData.dim = DIM[k] }
  GEO.mat = mat
  return GEO
}
// 記号を箱に刷る位置（上面と前後の面）
export function decalPlace(kind) {
  const [W, H, D] = DIM[kind], x = -W * 0.2, s = Math.min(0.4, D * 0.7)
  return { x, s, topY: H + 0.012, faceY: (kind === 'gunner' ? 0.26 : 0.27), faceZ: D / 2 + 0.034 }
}

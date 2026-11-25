// 絵はすべてその場で描く（画像ファイルなし）。廃工場のコンクリート・壁・木箱・鉄板
import * as THREE from 'three'
import { WORLD, RAMPS, TEAM_SPAWNS } from './arena.js?v=14'
const HALF = WORLD

function rnd(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')] }
function tex(c, rep = 1, srgb = true, aniso = 8) {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = aniso; return t
}

// 床: 120m x 120m を1枚の絵に。コンクリート・継ぎ目・黄黒のふち・すり鉢の輪・塗装の跡・油のしみ
export function wallTexture(aniso = 8) {
  const [c, g] = canvas(1024, 512), R = rnd(21)
  g.fillStyle = '#6f6b64'; g.fillRect(0, 0, 1024, 512)
  // 波板
  for (let x = 0; x < 1024; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, 'rgba(0,0,0,0.30)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.07)'); gr.addColorStop(1, 'rgba(0,0,0,0.12)'); g.fillStyle = gr; g.fillRect(x, 0, 16, 512) }
  // 錆の筋
  for (let i = 0; i < 70; i++) { const x = R() * 1024, w = 2 + R() * 10, h = 40 + R() * 280, y = R() * 300, gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(110,60,28,0.32)'); gr.addColorStop(1, 'rgba(110,60,28,0)'); g.fillStyle = gr; g.fillRect(x, y, w, h) }
  // 下は煤けた帯
  const gr = g.createLinearGradient(0, 330, 0, 512); gr.addColorStop(0, 'rgba(20,18,16,0)'); gr.addColorStop(1, 'rgba(20,18,16,0.5)'); g.fillStyle = gr; g.fillRect(0, 330, 1024, 182)
  // 継ぎ目の横線とボルト
  g.fillStyle = 'rgba(25,24,22,0.5)'; g.fillRect(0, 160, 1024, 4); g.fillRect(0, 330, 1024, 4)
  for (let x = 12; x < 1024; x += 32) { g.fillStyle = 'rgba(20,20,20,0.55)'; g.beginPath(); g.arc(x, 150, 3, 0, 7); g.fill(); g.beginPath(); g.arc(x, 345, 3, 0, 7); g.fill() }
  // 高い窓の帯（光る）
  for (let x = 40; x < 1024; x += 170) { const gr2 = g.createLinearGradient(0, 20, 0, 110); gr2.addColorStop(0, '#fff4d8'); gr2.addColorStop(1, '#f4d79a'); g.fillStyle = gr2; g.fillRect(x, 22, 128, 92); g.strokeStyle = 'rgba(30,28,26,0.9)'; g.lineWidth = 5; g.strokeRect(x, 22, 128, 92); g.beginPath(); g.moveTo(x + 64, 22); g.lineTo(x + 64, 114); g.moveTo(x, 68); g.lineTo(x + 128, 68); g.stroke() }
  const t = tex(c, 1, true, aniso); t.repeat.set(3, 1); return t
}
export function wallEmissive() {
  const [c, g] = canvas(1024, 512)
  g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 512)
  for (let x = 40; x < 1024; x += 170) { const gr = g.createLinearGradient(0, 20, 0, 110); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#ffd890'); g.fillStyle = gr; g.fillRect(x + 3, 25, 122, 86); g.fillStyle = '#000'; g.fillRect(x + 62, 22, 4, 92); g.fillRect(x, 66, 128, 4) }
  const t = tex(c, 1); t.repeat.set(3, 1); return t
}

export function crateTexture(aniso = 8) {
  const [c, g] = canvas(256, 256), R = rnd(5)
  g.fillStyle = '#b68a52'; g.fillRect(0, 0, 256, 256)
  for (let y = 0; y < 256; y += 64) { g.fillStyle = `rgb(${160 + R() * 30 | 0},${118 + R() * 24 | 0},${68 + R() * 20 | 0})`; g.fillRect(0, y + 3, 256, 58); for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(70,45,20,0.18)'; g.fillRect(R() * 256, y + 4 + R() * 56, 20 + R() * 80, 1) } }
  g.strokeStyle = '#5b3d1c'; g.lineWidth = 12; g.strokeRect(6, 6, 244, 244); g.beginPath(); g.moveTo(8, 8); g.lineTo(248, 248); g.moveTo(248, 8); g.lineTo(8, 248); g.stroke()
  g.fillStyle = '#2b2b2b'; for (const [x, y] of [[12, 12], [244, 12], [12, 244], [244, 244]]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill() }
  return tex(c, 1, true, aniso)
}
export function hazardTexture(col = '#e8b81c', aniso = 4) {
  const [c, g] = canvas(128, 128)
  g.fillStyle = col; g.fillRect(0, 0, 128, 128); g.fillStyle = '#1d1c1a'
  for (let i = -128; i < 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 32, 0); g.lineTo(i + 32 - 128, 128); g.lineTo(i - 128, 128); g.fill() }
  return tex(c, 1, true, aniso)
}
export function steelTexture(aniso = 8) {
  const [c, g] = canvas(256, 256), R = rnd(33)
  g.fillStyle = '#5c6063'; g.fillRect(0, 0, 256, 256)
  // 滑り止めの菱形
  g.fillStyle = 'rgba(210,214,216,0.35)'; g.strokeStyle = 'rgba(20,22,24,0.35)'; g.lineWidth = 1
  for (let y = 0; y < 256; y += 16) for (let x = 0; x < 256; x += 16) { const o = ((y / 16) % 2) * 8; g.save(); g.translate(x + o + 4, y + 4); g.rotate(((x / 16 + y / 16) % 2 ? 1 : -1) * 0.7); g.fillRect(-5, -1.2, 10, 2.4); g.restore() }
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '20,20,20' : '160,90,40'},${0.04 + R() * 0.08})`; g.fillRect(R() * 256, R() * 256, 2 + R() * 6, 2 + R() * 6) }
  return tex(c, 1, true, aniso)
}
export function machineTexture(aniso = 8) {
  const [c, g] = canvas(512, 256), R = rnd(9)
  g.fillStyle = '#d4a21e'; g.fillRect(0, 0, 512, 256)
  g.fillStyle = 'rgba(40,36,28,0.16)'; for (let i = 0; i < 1500; i++) g.fillRect(R() * 512, R() * 256, 1 + R() * 3, 1 + R() * 2)
  g.fillStyle = '#26282a'; g.fillRect(0, 196, 512, 60)
  g.strokeStyle = 'rgba(30,28,22,0.55)'; g.lineWidth = 3; for (let x = 0; x <= 512; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 196); g.stroke() }
  // 排気口・ランプ・メーター
  for (let x = 20; x < 512; x += 128) { g.fillStyle = '#2d2f31'; g.fillRect(x, 24, 88, 52); g.strokeStyle = '#9a9a96'; g.lineWidth = 2; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(x + 6, 32 + i * 9); g.lineTo(x + 82, 32 + i * 9); g.stroke() } g.fillStyle = (x / 128 | 0) % 2 ? '#d83a2a' : '#4cb04a'; g.beginPath(); g.arc(x + 44, 112, 8, 0, 7); g.fill(); g.fillStyle = '#e8e5da'; g.beginPath(); g.arc(x + 44, 154, 16, 0, 7); g.fill(); g.strokeStyle = '#222'; g.beginPath(); g.moveTo(x + 44, 154); g.lineTo(x + 54, 144); g.stroke() }
  g.fillStyle = '#e8e5da'; g.font = '700 26px sans-serif'; g.fillText('PRESS 07', 18, 238)
  return tex(c, 1, true, aniso)
}
export function concreteTexture(aniso = 4) {
  const [c, g] = canvas(256, 256), R = rnd(3)
  g.fillStyle = '#9c9a94'; g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 2500; i++) { const v = 130 + R() * 60 | 0; g.fillStyle = `rgba(${v},${v},${v - 4},0.25)`; g.fillRect(R() * 256, R() * 256, 1 + R() * 3, 1 + R() * 3) }
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 256, 4)
  return tex(c, 1, true, aniso)
}
export function numberTexture(n, color) {
  const [c, g] = canvas(128, 128)
  g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, 128, 128)
  g.fillStyle = '#f4f0e6'; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.fill()
  g.fillStyle = color; g.font = '800 82px "Big Shoulders Display", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 64, 70)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
export function splatTexture() {
  const [c, g] = canvas(128, 128), R = rnd(77)
  g.fillStyle = '#fff'
  g.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * 6.2832, r = 28 + R() * 14; const x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r; if (i) g.lineTo(x, y); else g.moveTo(x, y) } g.fill()
  for (let i = 0; i < 12; i++) { const a = R() * 6.28, r = 36 + R() * 24; g.beginPath(); g.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2 + R() * 6, 0, 7); g.fill() }
  const t = new THREE.CanvasTexture(c); return t
}
export function glowTexture() {
  const [c, g] = canvas(128, 128)
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t
}
export function beamTexture() {
  const [c, g] = canvas(64, 256)
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,236,190,0.55)'); gr.addColorStop(1, 'rgba(255,236,190,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256)
  const m = g.createLinearGradient(0, 0, 64, 0); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.5, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = m; g.fillRect(0, 0, 64, 256)
  return new THREE.CanvasTexture(c)
}

// ---------------------------------------------------------------- 広い敷地の床（3枚重ね）
// 1) 細かい粒の繰り返し  2) 場所ごとの地の色（低解像度）  3) 線・しみ・塗装（高解像度）
export function floorBase(aniso = 8) {
  const [c, g] = canvas(512, 512), R = rnd(4)
  g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 9000; i++) { const v = 90 + R() * 80 | 0; g.fillStyle = `rgba(${v},${v},${v},${0.10 + R() * 0.2})`; g.fillRect(R() * 512, R() * 512, 1 + R() * 3, 1 + R() * 3) }
  for (let i = 0; i < 60; i++) { const x = R() * 512, y = R() * 512, r = 20 + R() * 60, gr = g.createRadialGradient(x, y, 0, x, y, r); const d = R() < 0.5; gr.addColorStop(0, d ? 'rgba(40,40,40,0.18)' : 'rgba(200,200,200,0.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r) }
  for (let i = 0; i < 18; i++) { let x = R() * 512, y = R() * 512; g.strokeStyle = 'rgba(30,30,30,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 9; j++) { x += (R() - 0.5) * 30; y += (R() - 0.3) * 24; g.lineTo(x, y) } g.stroke() }
  const t = tex(c, 1, true, aniso); t.repeat.set(WORLD * 2 / 7, WORLD * 2 / 7); return t
}
function rrect(g, x0, z0, x1, z1, r) { g.beginPath(); g.moveTo(x0 + r, z0); g.lineTo(x1 - r, z0); g.arcTo(x1, z0, x1, z0 + r, r); g.lineTo(x1, z1 - r); g.arcTo(x1, z1, x1 - r, z1, r); g.lineTo(x0 + r, z1); g.arcTo(x0, z1, x0, z1 - r, r); g.lineTo(x0, z0 + r); g.arcTo(x0, z0, x0 + r, z0, r); g.closePath() }
export function floorTint() {
  const S = 512, [c, g] = canvas(S, S), k = S / (WORLD * 2), R = rnd(12)
  const X = x => (x + WORLD) * k, Z = z => (z + WORLD) * k
  g.fillStyle = '#1c1d1f'; g.fillRect(0, 0, S, S)
  g.fillStyle = '#5c5f63'; g.beginPath(); g.arc(X(0), Z(0), WORLD * k, 0, 7); g.fill()                // アスファルト
  for (let i = 0; i < 90; i++) { const a = R() * 6.283, d = Math.sqrt(R()) * (WORLD - 4), x = X(Math.sin(a) * d), y = Z(Math.cos(a) * d), r = (4 + R() * 16) * k, gr = g.createRadialGradient(x, y, 0, x, y, r); const m = R(); gr.addColorStop(0, m < 0.5 ? 'rgba(30,30,32,0.55)' : m < 0.8 ? 'rgba(96,92,86,0.40)' : 'rgba(70,64,54,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r) }
  // 走る道筋はゴムがのって黒い
  for (const rr of [38, 74, 100]) { g.strokeStyle = 'rgba(28,28,30,0.35)'; g.lineWidth = 9 * k; g.beginPath(); g.arc(X(0), Z(0), rr * k, 0, 7); g.stroke() }
  // 投光器の明るい所（外周の12本が内向きに照らす）
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, x = X(Math.sin(a) * 94), y = Z(Math.cos(a) * 94), r = 52 * k, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,238,205,0.44)'); gr.addColorStop(0.5, 'rgba(255,236,200,0.2)'); gr.addColorStop(1, 'rgba(255,238,205,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t
}
export function floorPaint(size = 2048) {
  const [c, g] = canvas(size, size), R = rnd(31), k = size / (WORLD * 2)
  const X = x => (x + WORLD) * k, Z = z => (z + WORLD) * k
  const ring = (r, w, col, dash) => { g.save(); g.strokeStyle = col; g.lineWidth = w * k; if (dash) g.setLineDash(dash.map(d => d * k)); g.beginPath(); g.arc(X(0), Z(0), r * k, 0, 7); g.stroke(); g.restore() }
  // 真ん中: お椀形のくぼみ（半径22m）。暗くせず、縁に黄黒の輪・斜面に淡い白の輪・底に耐久回復の箱の印
  { const gr = g.createRadialGradient(X(0), Z(0), 0, X(0), Z(0), 22 * k); gr.addColorStop(0, 'rgba(205,202,192,0.20)'); gr.addColorStop(1, 'rgba(205,202,192,0.07)'); g.fillStyle = gr; g.beginPath(); g.arc(X(0), Z(0), 22 * k, 0, 7); g.fill() }
  ring(21.4, 0.9, 'rgba(214,176,48,0.8)', [2.4, 2.4]); ring(14, 0.25, 'rgba(235,232,222,0.5)'); ring(10, 0.2, 'rgba(235,232,222,0.4)', [1.6, 1.6])
  ring(5.2, 0.35, 'rgba(235,232,222,0.85)'); ring(7.4, 0.2, 'rgba(235,232,222,0.55)', [1.6, 1.6])
  { g.save(); g.translate(X(0), Z(0)); g.fillStyle = 'rgba(67,209,122,0.35)'; g.fillRect(-1.0 * k, -3.4 * k, 2.0 * k, 6.8 * k); g.fillRect(-3.4 * k, -1.0 * k, 6.8 * k, 2.0 * k); g.restore() }
  ring(36, 0.25, 'rgba(225,222,212,0.75)', [3, 3]); ring(72, 0.25, 'rgba(225,222,212,0.7)', [4, 4]); ring(106, 0.3, 'rgba(225,222,212,0.75)')
  // 放射状のレーン線（点線）
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.save(); g.strokeStyle = 'rgba(210,206,196,0.55)'; g.lineWidth = 0.22 * k; g.setLineDash([2.5 * k, 3.5 * k]); g.beginPath(); g.moveTo(X(Math.sin(a) * 10), Z(Math.cos(a) * 10)); g.lineTo(X(Math.sin(a) * 104), Z(Math.cos(a) * 104)); g.stroke(); g.restore() }
  // 壁ぎわの赤白の縁石帯と白線
  ring(WORLD - 2.7, 1.6, 'rgba(200,196,186,0.9)'); { for (let i = 0; i < 96; i++) { g.strokeStyle = i % 2 ? '#b5352c' : '#d8d4c8'; g.lineWidth = 1.5 * k; g.beginPath(); g.arc(X(0), Z(0), (WORLD - 2.6) * k, i / 96 * 6.283, (i + 1) / 96 * 6.283); g.stroke() } }
  ring(WORLD - 7, 0.35, 'rgba(230,226,216,0.85)')
  // 出発位置の塗り（番号つき）
  TEAM_SPAWNS.forEach((p, i) => { g.save(); g.translate(X(p.x), Z(p.z)); g.rotate(-p.yaw + Math.PI); g.strokeStyle = 'rgba(232,228,216,0.85)'; g.lineWidth = 0.3 * k; g.strokeRect(-3.4 * k, -4.8 * k, 6.8 * k, 9.6 * k); g.fillStyle = 'rgba(232,228,216,0.85)'; g.font = `800 ${3.2 * k}px "Big Shoulders Display", Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), 0, 6.8 * k); g.restore() })
  // ジャンプ台の裾の注意の輪（黄の破線）
  for (const p of RAMPS) { g.save(); g.strokeStyle = 'rgba(206,168,50,0.85)'; g.lineWidth = 0.5 * k; g.setLineDash([1.6 * k, 1.2 * k]); g.beginPath(); g.arc(X(p.x), Z(p.z), (p.r0 + 1.0) * k, 0, 7); g.stroke(); g.restore() }
  // 油のしみ・タイヤ跡・ひび
  for (let i = 0; i < 50; i++) { const a = R() * 6.283, d = Math.sqrt(R()) * 110, x = X(Math.sin(a) * d), z = Z(Math.cos(a) * d), r = (1.2 + R() * 3.4) * k, gr = g.createRadialGradient(x, z, 0, x, z, r); gr.addColorStop(0, 'rgba(10,10,10,0.55)'); gr.addColorStop(0.7, 'rgba(10,10,10,0.22)'); gr.addColorStop(1, 'rgba(10,10,10,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, z, r * (1 + R()), r, R() * 3, 0, 7); g.fill() }
  g.lineCap = 'round'
  for (let i = 0; i < 140; i++) { const a0 = R() * 6.283, d0 = Math.sqrt(R()) * 110; let x = Math.sin(a0) * d0, z = Math.cos(a0) * d0, a = R() * 6.28; g.strokeStyle = 'rgba(10,10,10,0.3)'; g.lineWidth = k * 0.45; g.beginPath(); g.moveTo(X(x), Z(z)); for (let j = 0; j < 12; j++) { a += (R() - 0.5) * 0.4; x += Math.sin(a) * 3; z += Math.cos(a) * 3; g.lineTo(X(x), Z(z)) } g.stroke() }
  g.strokeStyle = 'rgba(14,13,12,0.5)'; g.lineWidth = Math.max(1, k * 0.06)
  for (let i = 0; i < 80; i++) { let x = R() * size, y = R() * size; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 12; j++) { x += (R() - 0.5) * 24 * k; y += (R() - 0.3) * 18 * k; g.lineTo(x, y) } g.stroke() }
  // ---- 路面の作り込み（v5）: スラブの目地・補修・マンホール・排水溝・ブレーキ跡・ドーナツ跡・タールのひび・油のにじみ
  g.save(); g.beginPath(); g.arc(X(0), Z(0), (WORLD - 1.8) * k, 0, 7); g.clip()
  for (let v = -WORLD; v <= WORLD; v += 12) {      // 目地: 暗い線＋すぐ横の明るい縁
    for (const [ax, bx, ay, by] of [[X(v), 0, X(v), size], [0, Z(v), size, Z(v)]]) {
      g.strokeStyle = 'rgba(16,15,13,0.62)'; g.lineWidth = Math.max(1.2, k * 0.1); g.beginPath(); g.moveTo(ax, bx); g.lineTo(ay, by); g.stroke()
      g.strokeStyle = 'rgba(200,196,186,0.16)'; g.lineWidth = Math.max(1, k * 0.05); g.beginPath(); g.moveTo(ax + (ax === ay ? 1.4 : 0), bx + (bx === by ? 1.4 : 0)); g.lineTo(ay + (ax === ay ? 1.4 : 0), by + (bx === by ? 1.4 : 0)); g.stroke()
    }
  }
  const R2 = rnd(91)
  for (let i = 0; i < 26; i++) { const a = R2() * 6.283, d = Math.sqrt(R2()) * 106, x = X(Math.sin(a) * d), z = Z(Math.cos(a) * d), w = (2 + R2() * 5) * k, h = (1.5 + R2() * 4) * k; g.fillStyle = `rgba(${22 + R2() * 14 | 0},${22 + R2() * 14 | 0},${24 + R2() * 14 | 0},${0.32 + R2() * 0.25})`; g.fillRect(x, z, w, h); g.strokeStyle = 'rgba(8,8,8,0.5)'; g.lineWidth = Math.max(1, k * 0.07); g.strokeRect(x, z, w, h) }   // アスファルトの補修
  for (let i = 0; i < 9; i++) { const a = R2() * 6.283, d = 12 + Math.sqrt(R2()) * 96, x = X(Math.sin(a) * d), z = Z(Math.cos(a) * d), r = 0.62 * k; g.fillStyle = 'rgba(40,40,42,0.85)'; g.beginPath(); g.arc(x, z, r, 0, 7); g.fill(); g.strokeStyle = 'rgba(120,118,112,0.7)'; g.lineWidth = Math.max(1, k * 0.07); g.stroke(); g.strokeStyle = 'rgba(20,20,20,0.7)'; g.lineWidth = Math.max(1, k * 0.05); for (let q = -2; q <= 2; q++) { g.beginPath(); g.moveTo(x - r * 0.8, z + q * r * 0.3); g.lineTo(x + r * 0.8, z + q * r * 0.3); g.stroke() } }   // マンホール
  for (let i = 0; i < 12; i++) { const a = R2() * 6.283, d = 14 + Math.sqrt(R2()) * 76, x = X(Math.sin(a) * d), z = Z(Math.cos(a) * d); g.fillStyle = 'rgba(30,30,32,0.9)'; g.fillRect(x, z, 2.2 * k, 0.5 * k); g.strokeStyle = 'rgba(110,108,102,0.8)'; g.lineWidth = Math.max(1, k * 0.05); for (let q = 0; q <= 8; q++) { g.beginPath(); g.moveTo(x + q * 0.27 * k, z); g.lineTo(x + q * 0.27 * k, z + 0.5 * k); g.stroke() } g.strokeRect(x, z, 2.2 * k, 0.5 * k) }   // 排水溝のふた
  g.lineCap = 'round'
  for (let i = 0; i < 80; i++) {                  // ブレーキ跡・横滑りのタイヤ跡: 2本線が弧を描いて薄れる
    const a0 = R2() * 6.283, d0 = Math.sqrt(R2()) * 86; let x = Math.sin(a0) * d0, z = Math.cos(a0) * d0, a = R2() * 6.283; const turn = (R2() - 0.5) * 0.06, len = 40 + R2() * 90, sd = 0.82, n = 26
    for (let j = 0; j < n; j++) {
      const nx = x + Math.sin(a) * len / n, nz = z + Math.cos(a) * len / n; a += turn
      g.strokeStyle = `rgba(8,8,8,${0.36 * (1 - j / n) * (0.6 + 0.4 * R2())})`; g.lineWidth = k * 0.26
      for (const o of [-sd / 2, sd / 2]) { g.beginPath(); g.moveTo(X(x + Math.cos(a) * o), Z(z - Math.sin(a) * o)); g.lineTo(X(nx + Math.cos(a) * o), Z(nz - Math.sin(a) * o)); g.stroke() }
      x = nx; z = nz
    }
  }
  for (const p of TEAM_SPAWNS) {                   // スタート位置のそばのドーナツ跡（焼いた黒い弧）
    for (let q = 0; q < 3; q++) { const cx = p.x + Math.sin(p.yaw) * (7 + q * 2), cz = p.z + Math.cos(p.yaw) * (7 + q * 2), rr = 2.2 + R2() * 2; g.strokeStyle = `rgba(7,7,7,${0.22 + R2() * 0.2})`; g.lineWidth = k * (0.5 + R2() * 0.4); g.beginPath(); g.arc(X(cx), Z(cz), rr * k, R2() * 6, R2() * 6 + 3.4 + R2() * 2); g.stroke() }
  }
  for (let i = 0; i < 70; i++) {                   // タールで埋めたひび割れ: 太く黒く少しつやがある
    let x = R2() * size, y = R2() * size; g.strokeStyle = 'rgba(10,10,12,0.62)'; g.lineWidth = Math.max(1.4, k * 0.13); g.beginPath(); g.moveTo(x, y)
    for (let j = 0; j < 9; j++) { x += (R2() - 0.5) * 22 * k; y += (R2() - 0.3) * 16 * k; g.lineTo(x, y) } g.stroke()
  }
  for (let i = 0; i < 70; i++) {                   // 油のにじみ: 濃い芯のまわりに薄い輪
    const a = R2() * 6.283, d = Math.sqrt(R2()) * 110, x = X(Math.sin(a) * d), z = Z(Math.cos(a) * d), r = (0.8 + R2() * 2.4) * k
    const gr = g.createRadialGradient(x, z, 0, x, z, r * 1.9); gr.addColorStop(0, 'rgba(6,6,8,0.72)'); gr.addColorStop(0.45, 'rgba(10,10,12,0.4)'); gr.addColorStop(0.8, 'rgba(18,18,22,0.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r * 2, z - r * 2, r * 4, r * 4)
  }
  g.restore()
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 8; return t
}
// 夜空と遠くの街明かり
export function skyTexture() {
  const W = 2048, Hh = 1024, [c, g] = canvas(W, Hh), R = rnd(55)
  const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, '#04060c'); gr.addColorStop(0.3, '#0a1020'); gr.addColorStop(0.46, '#1d2638'); gr.addColorStop(0.5, '#2b3345'); gr.addColorStop(0.52, '#161b25'); gr.addColorStop(1, '#0d1118')
  g.fillStyle = gr; g.fillRect(0, 0, W, Hh)
  for (let i = 0; i < 520; i++) { const x = R() * W, y = R() * Hh * 0.46, a = 0.15 + R() * 0.6; g.fillStyle = `rgba(220,228,255,${a})`; g.fillRect(x, y, 1 + (R() < 0.1 ? 1 : 0), 1) }
  { const mx = 1500, my = 230, rg = g.createRadialGradient(mx, my, 0, mx, my, 120); rg.addColorStop(0, 'rgba(235,240,255,0.55)'); rg.addColorStop(1, 'rgba(235,240,255,0)'); g.fillStyle = rg; g.fillRect(mx - 120, my - 120, 240, 240); g.fillStyle = 'rgba(240,244,255,0.9)'; g.beginPath(); g.arc(mx, my, 14, 0, 7); g.fill() }
  const hy = Hh * 0.5
  g.fillStyle = '#0b0e15'; g.beginPath(); g.moveTo(0, hy); for (let x = 0; x <= W; x += 14) g.lineTo(x, hy - 14 - Math.sin(x * 0.009) * 12 - Math.sin(x * 0.031) * 6 - R() * 3); g.lineTo(W, hy); g.fill()
  for (let x = 10; x < W; x += 18 + R() * 40) { const w = 14 + R() * 38, h = 14 + R() * 70; g.fillStyle = '#080a10'; g.fillRect(x, hy - h, w, h); for (let k = 0; k < w * h / 140; k++) if (R() < 0.5) { g.fillStyle = R() < 0.7 ? 'rgba(255,214,140,0.8)' : 'rgba(190,225,255,0.7)'; g.fillRect(x + 2 + R() * (w - 4), hy - h + 3 + R() * (h - 6), 1.5, 1.5) } }
  const rg2 = g.createLinearGradient(0, hy - 90, 0, hy + 10); rg2.addColorStop(0, 'rgba(255,190,110,0)'); rg2.addColorStop(1, 'rgba(255,190,110,0.16)'); g.fillStyle = rg2; g.fillRect(0, hy - 90, W, 100)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
// 外周の壁: コンクリートのパネル・広告板・足もとの縁
export function wallRingTexture(aniso = 8) {
  const [c, g] = canvas(2048, 256), R = rnd(77)
  g.fillStyle = '#6d6c68'; g.fillRect(0, 0, 2048, 256)
  for (let i = 0; i < 9000; i++) { const v = 90 + R() * 60 | 0; g.fillStyle = `rgba(${v},${v},${v - 4},0.10)`; g.fillRect(R() * 2048, R() * 256, 1 + R() * 3, 1 + R() * 2) }
  for (let x = 0; x < 2048; x += 128) { g.fillStyle = 'rgba(20,20,20,0.5)'; g.fillRect(x, 0, 3, 256); g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x + 3, 0, 2, 256) }
  g.fillStyle = 'rgba(20,20,20,0.4)'; g.fillRect(0, 128, 2048, 3)
  for (let i = 0; i < 60; i++) { const x = R() * 2048, w = 3 + R() * 12, gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(60,50,40,0)'); gr.addColorStop(1, 'rgba(60,50,40,0.28)'); g.fillStyle = gr; g.fillRect(x, 0, w, 256) }
  // 広告板（暗い地に光る文字）
  const ads = ['NITRO', 'AUTOPARTS', 'STEEL TYRE', 'MOTOR OIL', 'BUMPER', 'RACING']
  for (let i = 0; i < 8; i++) { const x = 40 + i * 256; g.fillStyle = '#101216'; g.fillRect(x, 56, 190, 64); g.strokeStyle = '#2a2d33'; g.lineWidth = 3; g.strokeRect(x, 56, 190, 64); g.fillStyle = ['#d9d2c0', '#c9a233', '#9ec6d8', '#c8584a'][i % 4]; g.font = '800 38px "Big Shoulders Display", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ads[i % ads.length], x + 95, 90) }
  // 足もと: 汚れた帯と赤白の縁
  const gr2 = g.createLinearGradient(0, 168, 0, 256); gr2.addColorStop(0, 'rgba(0,0,0,0)'); gr2.addColorStop(1, 'rgba(0,0,0,0.5)'); g.fillStyle = gr2; g.fillRect(0, 168, 2048, 88)
  for (let x = 0; x < 2048; x += 64) { g.fillStyle = (x / 64) % 2 ? '#a83b32' : '#cfcbbd'; g.fillRect(x, 208, 64, 18) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = aniso; return t
}
export function wallRingEmissive() {
  const [c, g] = canvas(2048, 256), R = rnd(78)
  g.fillStyle = '#000'; g.fillRect(0, 0, 2048, 256)
  const cols = ['#d9d2c0', '#c9a233', '#9ec6d8', '#c8584a']
  for (let i = 0; i < 8; i++) { const x = 40 + i * 256; g.fillStyle = cols[i % 4]; g.globalAlpha = 0.5; g.fillRect(x + 2, 58, 186, 60); g.globalAlpha = 1; g.fillStyle = '#000'; g.font = '800 38px "Big Shoulders Display", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle' }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t
}
// 観客席（暗い段と、ぽつぽつ光る点）
export function standsTexture() {
  const [c, g] = canvas(2048, 512), R = rnd(91)
  g.fillStyle = '#0b0d12'; g.fillRect(0, 0, 2048, 512)
  for (let r = 0; r < 14; r++) { const y = r * 36; g.fillStyle = r % 2 ? '#10131a' : '#0d1016'; g.fillRect(0, y, 2048, 34); for (let i = 0; i < 160; i++) { if (R() < 0.35) { g.fillStyle = R() < 0.6 ? 'rgba(255,220,150,0.55)' : R() < 0.5 ? 'rgba(170,200,255,0.5)' : 'rgba(255,255,255,0.35)'; g.fillRect(R() * 2048, y + 4 + R() * 26, 2, 2) } } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t
}
export function grimeTexture() {
  const [c, g] = canvas(256, 256), R = rnd(88)
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 260; i++) { const x = R() * 256, y = R() * 256, r = 3 + R() * 22, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(60,50,40,${0.015 + R() * 0.035})`); gr.addColorStop(1, 'rgba(60,50,40,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r) }
  for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(40,34,28,${0.03 + R() * 0.06})`; g.lineWidth = 0.5 + R() * 0.6; const x = R() * 256, y = R() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 40, y + (R() - 0.5) * 40); g.stroke() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t
}

// ---------------------------------------------------------------- 柱: 型枠コンクリート。継ぎ目・タイの穴・雨だれ・錆の筋・欠け
export function pillarTexture(aniso = 8) {
  const W = 512, H = 512, [c, g] = canvas(W, H), R = rnd(77)
  g.fillStyle = '#9a988f'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 9000; i++) { const v = 120 + R() * 70 | 0; g.fillStyle = `rgba(${v},${v - 1},${v - 6},${0.06 + R() * 0.12})`; g.fillRect(R() * W, R() * H, 1 + R() * 3, 1 + R() * 3) }
  for (let i = 0; i < 40; i++) { const x = R() * W, y = R() * H, r = 25 + R() * 90, gr = g.createRadialGradient(x, y, 0, x, y, r), d = R() < 0.55; gr.addColorStop(0, d ? 'rgba(60,58,52,0.16)' : 'rgba(205,202,192,0.14)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2) }
  for (let i = 0; i < 420; i++) { g.fillStyle = `rgba(35,33,30,${0.25 + R() * 0.4})`; g.beginPath(); g.arc(R() * W, R() * H, 0.6 + R() * 1.6, 0, 7); g.fill() }       // 気泡の穴
  // 雨だれ: 上から縦に伸びる暗い筋
  for (let i = 0; i < 26; i++) { const x = R() * W, w = 3 + R() * 14, len = 90 + R() * 360, y0 = R() * 60, gr = g.createLinearGradient(0, y0, 0, y0 + len); gr.addColorStop(0, 'rgba(48,45,40,0.34)'); gr.addColorStop(1, 'rgba(48,45,40,0)'); g.fillStyle = gr; g.fillRect(x, y0, w, len) }
  // タイの穴（型枠を留めた跡）と錆の筋
  for (const [x, y] of [[64, 150], [192, 150], [320, 150], [448, 150], [64, 340], [192, 340], [320, 340], [448, 340]]) {
    const gr = g.createLinearGradient(0, y, 0, y + 150 + R() * 100); gr.addColorStop(0, 'rgba(140,82,40,0.4)'); gr.addColorStop(1, 'rgba(140,82,40,0)'); g.fillStyle = gr; g.fillRect(x - 4 + (R() - 0.5) * 6, y, 8, 220)
    g.fillStyle = 'rgba(190,188,178,0.5)'; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); g.fillStyle = '#26241f'; g.beginPath(); g.arc(x, y, 7.5, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(x + 1, y + 1, 4.5, 0, 7); g.fill()
  }
  // 打ち継ぎ目（横）と型枠の継ぎ目（縦）
  g.fillStyle = 'rgba(30,28,25,0.75)'; g.fillRect(0, H - 5, W, 4); g.fillStyle = 'rgba(210,207,198,0.35)'; g.fillRect(0, H - 1, W, 1); g.fillRect(0, H - 6, W, 1)
  g.fillStyle = 'rgba(36,34,30,0.5)'; g.fillRect(0, 0, 3, H); g.fillStyle = 'rgba(210,207,198,0.25)'; g.fillRect(3, 0, 1, H)
  // 欠けと補修
  for (let i = 0; i < 5; i++) { const x = R() * W, y = 40 + R() * 420, w = 18 + R() * 40, h = 14 + R() * 30; g.fillStyle = `rgba(${R() < 0.5 ? '120,118,110' : '168,166,156'},0.5)`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + R() * 8); g.lineTo(x + w * 0.8, y + h); g.lineTo(x + 6, y + h * 0.8); g.closePath(); g.fill() }
  const t = tex(c, 1, true, aniso); return t
}
// 柱の足もとの擦り傷（車が当たった黒いこすれ）。透明の地に黒い筋
export function scuffTexture() {
  const [c, g] = canvas(512, 128), R = rnd(81)
  for (let i = 0; i < 120; i++) { const x = R() * 512, y = 6 + R() * 116, len = 12 + R() * 70, h = 1 + R() * 5; g.fillStyle = `rgba(14,13,12,${0.1 + R() * 0.35})`; g.fillRect(x, y, len, h) }
  for (let i = 0; i < 14; i++) { const x = R() * 512, y = R() * 128, r = 8 + R() * 22, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(10,9,8,0.38)'); gr.addColorStop(1, 'rgba(10,9,8,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2) }
  // 黄色いタイヤ跡
  for (let i = 0; i < 6; i++) { const x = R() * 512, y = 10 + R() * 100; g.fillStyle = `rgba(200,170,60,${0.15 + R() * 0.2})`; g.fillRect(x, y, 20 + R() * 60, 2 + R() * 3) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t
}

// 柱のひび・欠け: 透明の地に、枝分かれする暗いひびと、はがれた跡（骨材が見える暗い面）と錆水
export function crackTexture() {
  const [c, g] = canvas(512, 512), R = rnd(131)
  const crack = (x, y, ang, len, w, depth) => {
    g.beginPath(); g.moveTo(x, y)
    for (let s = 0, px = x, py = y; s < len; s += 7 + R() * 9) {
      ang += (R() - 0.5) * 0.75; px += Math.cos(ang) * (7 + R() * 9); py += Math.sin(ang) * (7 + R() * 9); g.lineTo(px, py)
      if (depth < 3 && R() < 0.1) { const sx = px, sy = py; g.stroke(); crack(sx, sy, ang + (R() < 0.5 ? 0.7 : -0.7), len * 0.45, w * 0.6, depth + 1); g.beginPath(); g.moveTo(sx, sy) }
    }
    g.stroke()
  }
  for (let i = 0; i < 7; i++) {
    const x = R() * 512, y = R() * 512, a = (R() < 0.7 ? Math.PI / 2 : 0) + (R() - 0.5) * 1.2
    g.strokeStyle = 'rgba(210,206,196,0.28)'; g.lineWidth = 3; g.lineJoin = 'round'; crack(x + 1.5, y + 1.5, a, 150 + R() * 200, 2, 0)
    g.strokeStyle = 'rgba(18,16,14,0.88)'; g.lineWidth = 1.7; crack(x, y, a, 150 + R() * 200, 1.6, 0)
  }
  for (let i = 0; i < 5; i++) {   // はがれ: 骨材が見える暗い不ぞろいの面
    const x = R() * 512, y = R() * 512, n = 6 + (R() * 4 | 0), rr = 10 + R() * 22; g.beginPath()
    for (let k = 0; k < n; k++) { const a = k / n * 6.283, d = rr * (0.55 + R() * 0.7); g[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * d, y + Math.sin(a) * d * 1.3) }
    g.closePath(); g.fillStyle = 'rgba(66,62,56,0.9)'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(205,202,192,0.5)'; g.stroke()
    for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(${130 + R() * 60 | 0},${126 + R() * 50 | 0},${116 + R() * 50 | 0},0.7)`; g.fillRect(x + (R() - 0.5) * rr, y + (R() - 0.5) * rr * 1.2, 1.5 + R() * 2.5, 1.5 + R() * 2.5) }
  }
  for (let i = 0; i < 4; i++) { const x = R() * 512, y = R() * 300, gr = g.createLinearGradient(0, y, 0, y + 160 + R() * 120); gr.addColorStop(0, 'rgba(150,84,40,0.4)'); gr.addColorStop(1, 'rgba(150,84,40,0)'); g.fillStyle = gr; g.fillRect(x, y, 5 + R() * 6, 280) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t
}
// 崩れた柱のまわりに積もるコンクリートの粉（丸いぼかし）
export function dustPatchTexture() {
  const [c, g] = canvas(128, 128), R = rnd(133)
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(176,172,162,0.8)'); gr.addColorStop(0.55, 'rgba(160,156,146,0.5)'); gr.addColorStop(1, 'rgba(150,146,136,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
  for (let i = 0; i < 160; i++) { const a = R() * 6.283, d = R() * 50; g.fillStyle = `rgba(${90 + R() * 80 | 0},${88 + R() * 76 | 0},${82 + R() * 70 | 0},${0.1 + R() * 0.2})`; g.fillRect(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 1 + R() * 3, 1 + R() * 3) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

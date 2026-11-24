// 絵はすべてその場で描く（画像ファイルなし）。廃工場のコンクリート・壁・木箱・鉄板
import * as THREE from 'three'
import { HALF, WORLD, BOWL, RAMPS, DECK, DOORS } from './arena.js?v=3'

function rnd(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')] }
function tex(c, rep = 1, srgb = true, aniso = 8) {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = aniso; return t
}

// 床: 120m x 120m を1枚の絵に。コンクリート・継ぎ目・黄黒のふち・すり鉢の輪・塗装の跡・油のしみ
export function floorTexture(size = 2048, aniso = 8) {
  const [c, g] = canvas(size, size), R = rnd(7), k = size / (HALF * 2)
  const X = x => (x + HALF) * k, Z = z => (z + HALF) * k
  g.fillStyle = '#8b8984'; g.fillRect(0, 0, size, size)
  // 粒
  for (let i = 0; i < size * 14; i++) { const v = 118 + R() * 50 | 0; g.fillStyle = `rgba(${v},${v - 2},${v - 6},${0.03 + R() * 0.05})`; g.fillRect(R() * size, R() * size, 1 + R() * 2, 1 + R() * 2) }
  // 大きなむら
  for (let i = 0; i < 90; i++) { const x = R() * size, y = R() * size, r = (30 + R() * 160) * k / 2, gr = g.createRadialGradient(x, y, 0, x, y, r); const d = R() < 0.5; gr.addColorStop(0, d ? 'rgba(40,38,34,0.12)' : 'rgba(200,196,188,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2) }
  // 継ぎ目
  g.strokeStyle = 'rgba(40,38,34,0.55)'; g.lineWidth = Math.max(1, k * 0.09)
  for (let v = -HALF; v <= HALF; v += 10) { g.beginPath(); g.moveTo(X(v), 0); g.lineTo(X(v), size); g.stroke(); g.beginPath(); g.moveTo(0, Z(v)); g.lineTo(size, Z(v)); g.stroke() }
  // ひび割れ
  g.strokeStyle = 'rgba(30,28,25,0.5)'; g.lineWidth = Math.max(1, k * 0.05)
  for (let i = 0; i < 26; i++) { let x = R() * size, y = R() * size; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 14; j++) { x += (R() - 0.5) * 26 * k; y += (R() - 0.3) * 20 * k; g.lineTo(x, y) } g.stroke() }
  // 油のしみ
  for (let i = 0; i < 14; i++) { const x = R() * size, y = R() * size, r = (1.5 + R() * 4) * k, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(18,16,14,0.45)'); gr.addColorStop(0.7, 'rgba(18,16,14,0.18)'); gr.addColorStop(1, 'rgba(18,16,14,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * (1 + R()), r, R() * 3, 0, 7); g.fill() }
  // 黄黒のふち（壁ぎわの通路を表す線）
  const stripeBox = (x0, z0, x1, z1, w) => {
    g.save(); g.beginPath(); g.rect(X(x0), Z(z0), X(x1) - X(x0), Z(z1) - Z(z0)); g.rect(X(x0 + w), Z(z0 + w), X(x1 - w) - X(x0 + w), Z(z1 - w) - Z(z0 + w)); g.clip('evenodd')
    g.fillStyle = '#e8b81c'; g.fillRect(0, 0, size, size); g.fillStyle = '#1d1c1a'
    const s = 1.6 * k; for (let i = -size; i < size * 2; i += s * 2) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + s, 0); g.lineTo(i + s - size, size); g.lineTo(i - size, size); g.fill() }
    g.restore()
  }
  stripeBox(-HALF + 3, -HALF + 3, HALF - 3, HALF - 3, 0.5)
  // すり鉢のふち: 黄黒の輪
  g.save(); g.beginPath(); g.arc(X(0), Z(0), BOWL.r * k + 0.4 * k, 0, 7); g.arc(X(0), Z(0), BOWL.r * k - 0.4 * k, 0, 7, true); g.clip('evenodd')
  g.fillStyle = '#e8b81c'; g.fillRect(0, 0, size, size); g.fillStyle = '#1d1c1a'; { const s = 1.4 * k; for (let i = -size; i < size * 2; i += s * 2) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + s, 0); g.lineTo(i + s - size, size); g.lineTo(i - size, size); g.fill() } } g.restore()
  // すり鉢の中: 同心円の白線と数字の目盛り
  g.strokeStyle = 'rgba(235,232,222,0.7)'; g.lineWidth = k * 0.18
  for (const r of [6, 12]) { g.beginPath(); g.arc(X(0), Z(0), r * k, 0, 7); g.stroke() }
  g.fillStyle = 'rgba(30,28,25,0.55)'; g.beginPath(); g.arc(X(0), Z(0), 3.2 * k, 0, 7); g.fill()
  // 中央の「バンパー」の図（黄色い大きな丸）
  g.fillStyle = 'rgba(232,184,28,0.9)'; g.font = `900 ${k * 3.6}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'
  // 走路の矢印（床の塗装）
  const arrow = (x, z, a, len = 5) => { g.save(); g.translate(X(x), Z(z)); g.rotate(a); g.fillStyle = 'rgba(232,184,28,0.75)'; const L = len * k, W = len * 0.38 * k; g.beginPath(); g.moveTo(0, -L / 2); g.lineTo(W, 0); g.lineTo(W * 0.4, 0); g.lineTo(W * 0.4, L / 2); g.lineTo(-W * 0.4, L / 2); g.lineTo(-W * 0.4, 0); g.lineTo(-W, 0); g.closePath(); g.fill(); g.restore() }
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.39; arrow(Math.sin(a) * 33, Math.cos(a) * 33, -a + Math.PI, 5) }
  // ランプの前に注意の斜線
  for (const p of RAMPS) { const s = Math.sin(p.ang), co = Math.cos(p.ang); g.save(); g.translate(X(p.x - s * 2.5), Z(p.z - co * 2.5)); g.rotate(-p.ang); g.fillStyle = 'rgba(232,184,28,0.85)'; g.fillRect(-p.w / 2 * k, -0.5 * k, p.w * k, k); g.restore() }
  // タイヤ跡
  g.strokeStyle = 'rgba(20,19,18,0.28)'; g.lineWidth = k * 0.5; g.lineCap = 'round'
  for (let i = 0; i < 36; i++) { let x = (R() - 0.5) * 100, z = (R() - 0.5) * 100, a = R() * 6.28; g.beginPath(); g.moveTo(X(x), Z(z)); for (let j = 0; j < 10; j++) { a += (R() - 0.5) * 0.5; x += Math.sin(a) * 3; z += Math.cos(a) * 3; g.lineTo(X(x), Z(z)) } g.stroke() }
  // 上の通路の下の色
  g.fillStyle = 'rgba(0,0,0,0.0)'
  const t = tex(c, 1, true, aniso); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t
}

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
  g.fillStyle = '#5a5b5d'; g.fillRect(0, 0, S, S)                                    // ヤードのアスファルト
  for (let i = 0; i < 60; i++) { const x = R() * S, y = R() * S, r = (6 + R() * 22) * k, gr = g.createRadialGradient(x, y, 0, x, y, r); const m = R(); gr.addColorStop(0, m < 0.4 ? 'rgba(122,104,78,0.75)' : m < 0.6 ? 'rgba(86,104,60,0.55)' : 'rgba(40,40,42,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r) } // 砂利・草・黒いしみ
  g.fillStyle = '#44464a'; rrect(g, X(-108), Z(-108), X(108), Z(108), 24 * k); g.fill()  // 外周路
  g.fillStyle = '#58595c'; rrect(g, X(-90), Z(-90), X(90), Z(90), 8 * k); g.fill()
  for (let i = 0; i < 40; i++) { const x = R() * S, y = R() * S, r = (4 + R() * 10) * k, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(100,90,72,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r) }
  g.fillStyle = '#8f8d87'; g.fillRect(X(-HALF), Z(-HALF), HALF * 2 * k, HALF * 2 * k)  // 建屋の床（明るいコンクリート）
  g.fillStyle = '#7e7c77'; g.fillRect(X(70), Z(-104), 40 * k, 34 * k)                  // クレーン下の舗装
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t
}
export function floorPaint(size = 2048) {
  const [c, g] = canvas(size, size), R = rnd(31), k = size / (WORLD * 2)
  const X = x => (x + WORLD) * k, Z = z => (z + WORLD) * k
  const stripes = (clipFn, col2, s) => { g.save(); clipFn(); g.fillStyle = '#e8b81c'; g.fillRect(0, 0, size, size); g.fillStyle = col2; for (let i = -size; i < size * 2; i += s * 2 * k) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + s * k, 0); g.lineTo(i + s * k - size, size); g.lineTo(i - size, size); g.fill() } g.restore() }
  // 建屋の継ぎ目と黄黒のふち、すり鉢の輪
  g.strokeStyle = 'rgba(40,38,34,0.55)'; g.lineWidth = Math.max(1, k * 0.09)
  for (let v = -HALF; v <= HALF; v += 10) { g.beginPath(); g.moveTo(X(v), Z(-HALF)); g.lineTo(X(v), Z(HALF)); g.stroke(); g.beginPath(); g.moveTo(X(-HALF), Z(v)); g.lineTo(X(HALF), Z(v)); g.stroke() }
  stripes(() => { g.beginPath(); g.rect(X(-HALF + 3), Z(-HALF + 3), (HALF - 3) * 2 * k, (HALF - 3) * 2 * k); g.rect(X(-HALF + 3.5), Z(-HALF + 3.5), (HALF - 3.5) * 2 * k, (HALF - 3.5) * 2 * k); g.clip('evenodd') }, '#1d1c1a', 1.6)
  stripes(() => { g.beginPath(); g.arc(X(0), Z(0), BOWL.r * k + 0.4 * k, 0, 7); g.arc(X(0), Z(0), BOWL.r * k - 0.4 * k, 0, 7, true); g.clip('evenodd') }, '#1d1c1a', 1.4)
  g.strokeStyle = 'rgba(235,232,222,0.75)'; g.lineWidth = k * 0.18
  for (const r of [6, 12]) { g.beginPath(); g.arc(X(0), Z(0), r * k, 0, 7); g.stroke() }
  g.fillStyle = 'rgba(30,28,25,0.6)'; g.beginPath(); g.arc(X(0), Z(0), 3.2 * k, 0, 7); g.fill()
  // 出入口の注意線
  g.fillStyle = 'rgba(232,184,28,0.9)'
  for (const x of DOORS.S) g.fillRect(X(x - 7), Z(HALF - 1.2), 14 * k, 0.6 * k)
  for (const z of DOORS.E) { g.fillRect(X(HALF - 1.2), Z(z - 7), 0.6 * k, 14 * k); g.fillRect(X(-HALF + 0.6), Z(z - 7), 0.6 * k, 14 * k) }
  // 坂の前の注意の線
  for (const p of RAMPS) { const s = Math.sin(p.ang), co = Math.cos(p.ang); g.save(); g.translate(X(p.x - s * 2.5), Z(p.z - co * 2.5)); g.rotate(-p.ang); g.fillStyle = 'rgba(232,184,28,0.85)'; g.fillRect(-p.w / 2 * k, -0.4 * k, p.w * k, 0.8 * k); g.restore() }
  // 外周路: 白い縁の線・点線の中心線・四隅の赤白の縁石・路面の矢印
  g.strokeStyle = 'rgba(236,232,220,0.9)'; g.lineWidth = k * 0.35
  rrect(g, X(-107), Z(-107), X(107), Z(107), 22 * k); g.stroke(); rrect(g, X(-91), Z(-91), X(91), Z(91), 8 * k); g.stroke()
  g.setLineDash([3 * k, 3 * k]); g.lineWidth = k * 0.3; g.strokeStyle = 'rgba(240,200,60,0.85)'; rrect(g, X(-99), Z(-99), X(99), Z(99), 15 * k); g.stroke(); g.setLineDash([])
  for (const [cx, cz, a0] of [[-85, -85, Math.PI], [85, -85, Math.PI * 1.5], [85, 85, 0], [-85, 85, Math.PI * 0.5]]) { // 角の縁石
    for (let i = 0; i < 12; i++) { g.strokeStyle = i % 2 ? '#e8e5dc' : '#d8372a'; g.lineWidth = k * 0.9; g.beginPath(); g.arc(X(cx), Z(cz), 22.4 * k, a0 + i * Math.PI / 24, a0 + (i + 1) * Math.PI / 24); g.stroke() } }
  const arrow = (x, z, a, len = 6, col = 'rgba(236,232,220,0.8)') => { g.save(); g.translate(X(x), Z(z)); g.rotate(a); g.fillStyle = col; const L = len * k, W = len * 0.34 * k; g.beginPath(); g.moveTo(0, -L / 2); g.lineTo(W, 0); g.lineTo(W * 0.4, 0); g.lineTo(W * 0.4, L / 2); g.lineTo(-W * 0.4, L / 2); g.lineTo(-W * 0.4, 0); g.lineTo(-W, 0); g.closePath(); g.fill(); g.restore() }
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.39; arrow(Math.sin(a) * 33, Math.cos(a) * 33, -a + Math.PI, 5, 'rgba(232,184,28,0.75)') }
  for (const [x, z, a] of [[0, 99, Math.PI / 2], [-50, 99, Math.PI / 2], [50, 99, Math.PI / 2], [99, 0, Math.PI], [99, -50, Math.PI], [99, 50, Math.PI], [0, -99, -Math.PI / 2], [-50, -99, -Math.PI / 2], [50, -99, -Math.PI / 2], [-99, 0, 0], [-99, 50, 0], [-99, -50, 0]]) arrow(x, z, a, 7)
  // クレーン下の黄黒ハッチ
  stripes(() => { g.beginPath(); g.rect(X(72), Z(-100), 34 * k, 26 * k); g.rect(X(72.7), Z(-99.3), 32.6 * k, 24.6 * k); g.clip('evenodd') }, '#1d1c1a', 1.5)
  // 駐車の枠線（南のヤードの出入口の前）
  g.strokeStyle = 'rgba(236,232,220,0.7)'; g.lineWidth = k * 0.2
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(X(i * 8), Z(64)); g.lineTo(X(i * 8), Z(72)); g.stroke() }
  // 油のしみ・タイヤ跡・ひび
  for (let i = 0; i < 40; i++) { const x = (R() - 0.5) * 210, z = (R() - 0.5) * 210, r = (1.5 + R() * 4) * k, gr = g.createRadialGradient(X(x), Z(z), 0, X(x), Z(z), r); gr.addColorStop(0, 'rgba(14,13,12,0.5)'); gr.addColorStop(0.7, 'rgba(14,13,12,0.2)'); gr.addColorStop(1, 'rgba(14,13,12,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(X(x), Z(z), r * (1 + R()), r, R() * 3, 0, 7); g.fill() }
  g.lineCap = 'round'
  for (let i = 0; i < 90; i++) { let x = (R() - 0.5) * 200, z = (R() - 0.5) * 200, a = R() * 6.28; g.strokeStyle = 'rgba(14,13,12,0.28)'; g.lineWidth = k * 0.5; g.beginPath(); g.moveTo(X(x), Z(z)); for (let j = 0; j < 10; j++) { a += (R() - 0.5) * 0.5; x += Math.sin(a) * 3; z += Math.cos(a) * 3; g.lineTo(X(x), Z(z)) } g.stroke() }
  g.strokeStyle = 'rgba(20,18,16,0.5)'; g.lineWidth = Math.max(1, k * 0.06)
  for (let i = 0; i < 60; i++) { let x = R() * size, y = R() * size; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 12; j++) { x += (R() - 0.5) * 24 * k; y += (R() - 0.3) * 18 * k; g.lineTo(x, y) } g.stroke() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 8; return t
}
// 空と遠景
export function skyTexture() {
  const W = 2048, Hh = 1024, [c, g] = canvas(W, Hh), R = rnd(55)
  const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, '#2f67ad'); gr.addColorStop(0.3, '#5f98d2'); gr.addColorStop(0.46, '#b4cfe0'); gr.addColorStop(0.5, '#c9d0cf'); gr.addColorStop(0.52, '#c4c8c6'); gr.addColorStop(1, '#a9a99a')
  g.fillStyle = gr; g.fillRect(0, 0, W, Hh)
  // 雲
  for (let i = 0; i < 46; i++) { const x = R() * W, y = Hh * (0.14 + R() * 0.3), w = 80 + R() * 220; for (let j = 0; j < 8; j++) { const cx = x + (R() - 0.5) * w, cy = y + (R() - 0.5) * 24, r = 26 + R() * 50, rg = g.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, 'rgba(255,255,255,0.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(cx - r, cy - r, 2 * r, 2 * r) } }
  // 遠景のシルエット（工場・煙突・タンク・丘・クレーン）。霞んだ青灰色
  const sil = (col, base, fn) => { g.fillStyle = col; fn() }
  const hy = Hh * 0.5
  sil('rgba(150,165,180,0.8)', hy, () => { g.beginPath(); g.moveTo(0, hy); for (let x = 0; x <= W; x += 16) g.lineTo(x, hy - 22 - Math.sin(x * 0.011) * 14 - Math.sin(x * 0.037) * 7 - R() * 3); g.lineTo(W, hy); g.fill() })
  sil('rgba(118,132,148,0.9)', hy, () => {
    for (let x = 20; x < W; x += 40 + R() * 90) { const w = 40 + R() * 110, h = 20 + R() * 60; g.fillRect(x, hy - h, w, h); if (R() < 0.5) g.fillRect(x + w * 0.2, hy - h - 20, 6, 24) ; if (R() < 0.35) { g.fillRect(x + w * 0.6, hy - h - 70 - R() * 40, 12, 90 + h) } if (R() < 0.3) { g.beginPath(); g.arc(x + w / 2, hy - h, w * 0.3, Math.PI, 0); g.fill() } }
    for (let x = 100; x < W; x += 300 + R() * 200) { g.fillRect(x, hy - 120, 4, 120); g.fillRect(x - 40, hy - 120, 90, 4); g.fillRect(x + 50, hy - 120, 3, 36) } // クレーン
  })
  g.fillStyle = 'rgba(105,118,132,1)'; g.fillRect(0, hy - 4, W, 8)
  for (let i = 0; i < 6; i++) { const x = R() * W, rg = g.createRadialGradient(x, hy - 150, 0, x, hy - 150, 70); rg.addColorStop(0, 'rgba(230,226,218,0.45)'); rg.addColorStop(1, 'rgba(230,226,218,0)'); g.fillStyle = rg; g.fillRect(x - 70, hy - 220, 140, 140) } // 煙
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
export function grimeTexture() {
  const [c, g] = canvas(256, 256), R = rnd(88)
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 260; i++) { const x = R() * 256, y = R() * 256, r = 3 + R() * 22, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(60,50,40,${0.015 + R() * 0.035})`); gr.addColorStop(1, 'rgba(60,50,40,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r) }
  for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(40,34,28,${0.03 + R() * 0.06})`; g.lineWidth = 0.5 + R() * 0.6; const x = R() * 256, y = R() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 40, y + (R() - 0.5) * 40); g.stroke() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t
}

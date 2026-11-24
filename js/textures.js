// 絵はすべてその場で描く（画像ファイルなし）。廃工場のコンクリート・壁・木箱・鉄板
import * as THREE from 'three'
import { HALF, BOWL, RAMPS, DECK } from './arena.js'

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

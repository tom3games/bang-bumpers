// 入口: 画面の切り替え・入力・HUD・音・ループ。試合の中身は sim.js、CPU は cpu.js、絵は stage.js
import * as THREE from 'three'
import { createState, step, DT, TEAM_NAMES, TEAM_COLORS, WEAPONS, WEAPON_IDS, CAR_TYPES, ITEMS, MATCH_SEC, ITEM_NAMES, assistAim, angDiff, setLoadout, STOCK, MAXF } from './sim.js?v=3'
import { cleanName, cpuNames, NAME_MAX } from './names.js?v=3'
import { EngineMix } from './engine.js?v=3'
import { makeInputs } from './cpu.js?v=3'
import { Stage } from './stage.js?v=3'
import { H, HALF, WORLD, BOXES, POLES, BOWL, DECK, RAMPS, SPARE_SPOTS } from './arena.js?v=3'

const Q = new URLSearchParams(location.search)
const EN = Q.get('lang') === 'en'
const L = (ja, en) => EN ? en : ja
const $ = id => document.getElementById(id)
const hex = h => '#' + h.toString(16).padStart(6, '0')
const TEAM_EN = ['Red', 'Blue', 'Yellow', 'Green', 'Pink']
let TN = ['あなた', ...TEAM_NAMES.slice(1)]
const tname = i => EN && i > 0 ? TEAM_EN[i] : TN[i] || TEAM_NAMES[i]
const touchy = (('ontouchstart' in window) && matchMedia('(pointer:coarse)').matches) || Q.get('touch') === '1'
if (touchy && Q.get('touch') !== '0') document.body.classList.add('touch')
if (EN) { document.documentElement.lang = 'en'; document.title = 'BANG BUMPERS | 2-per-car, 10-player car combat - free browser game'; for (const el of document.querySelectorAll('[data-en]')) { el.innerHTML = el.dataset.en } for (const b of document.querySelectorAll('[data-en-label]')) b.setAttribute('aria-label', b.dataset.enLabel); $('btnAgain').textContent = 'Play again'; $('btnPost').textContent = 'Post on X'; $('langT').textContent = 'JA' }
const low = touchy || Math.min(innerWidth, innerHeight) < 600 || Q.get('low') === '1'

// ------------------------------------------------------------ 音
const SND = {
  pop: ['snd/pop1.mp3', 'snd/pop2.mp3', 'snd/pop3.mp3'], clink: ['snd/clink1.mp3', 'snd/clink2.mp3', 'snd/clink3.mp3'], crash: ['snd/crash1.mp3', 'snd/crash2.mp3', 'snd/crash3.mp3', 'snd/crash4.mp3'],
  hitl: ['snd/hitl1.mp3', 'snd/hitl2.mp3', 'snd/hitl3.mp3'], boom: ['snd/boom1.mp3', 'snd/boom2.mp3', 'snd/boom3.mp3'], boom2: ['snd/boom2.mp3'], boom5: ['snd/boom5.mp3'], debris: ['snd/debris1.mp3', 'snd/debris2.mp3'],
  thud: ['snd/thud.mp3'], whoosh: ['snd/jet.mp3'], spring: ['snd/spring1.mp3', 'snd/spring2.mp3', 'snd/spring3.mp3'], shot: ['snd/shot1.mp3', 'snd/shot2.mp3'], paper: ['snd/paper1.mp3', 'snd/paper2.mp3'], plop: ['snd/plop1.mp3', 'snd/plop2.mp3'],
  splash: ['snd/splash1.mp3'], bell: ['snd/bell.mp3'], repair: ['snd/repair1.mp3'], horn: ['snd/horn.mp3'], latch: ['snd/latch.mp3'], pin: ['snd/pin.mp3'], switch: ['snd/switch1.mp3'],
  eng: ['snd/eng_idle.wav', 'snd/eng_mid.wav', 'snd/eng_high.wav'], spear: ['snd/spear.mp3'], roll: ['snd/roll1.mp3', 'snd/roll2.mp3'], punch: ['snd/punch1.mp3', 'snd/punch2.mp3'], tick: ['snd/tick.mp3'], win: ['snd/win.mp3'], lose: ['snd/lose.mp3'], step: ['snd/step1.mp3', 'snd/step2.mp3'],
}
Snd.def(SND)
const engine = new EngineMix()
let bgmOn = false
function bgm(v, fade = 1.4) {
  if (!Snd.ctx) return
  if (!bgmOn) { bgmOn = true; Snd.loop('bgm', 'snd/music.mp3', v, 1.5); return }
  const l = Snd.loops.bgm; if (l && l.g) { const t = Snd.ctx.currentTime; l.g.gain.cancelScheduledValues(t); l.g.gain.setValueAtTime(l.g.gain.value, t); l.g.gain.linearRampToValueAtTime(v, t + fade); l.vol = v }
}
const sfxLast = {}
const playSnd = (name, o = {}) => { if ((o.vol ?? 1) < 0.035) return; const now = performance.now(); if (now - (sfxLast[name] || 0) < 28) return; sfxLast[name] = now; Snd.play(name, o) }

// ------------------------------------------------------------ 画面
const stage = new Stage($('view'), { low, preserve: Q.get('shot') === '1' })
stage.snd = playSnd
addEventListener('resize', () => stage.resize())
const seedBase = +(Q.get('seed') || (Date.now() % 100000))
let S = createState(seedBase, { humanTeam: -1, noCountdown: true })
let phase = 'title', human = false, matchNo = 0
let acc = 0, last = performance.now(), simSpeed = Math.max(1, Math.min(12, +(Q.get('speed') || 1)))
let aimYaw = 0, snapCam = true, resultAt = 0, shownResult = false, matchStart = 0, msgT = 0
const K = { keys: {}, gas: false, back: false, L: false, R: false, boost: false, hb: false, fire: false, reload: false, use: false, swap: false, wswap: false, mx: 0, mouseDown: false, stick: null, touches: new Map(), autoCPU: Q.get('auto') === '1' }
const wasPressed = {}

// ------------------------------------------------------------ 入力
const KEYMAP = { KeyW: 'gas', ArrowUp: 'gas', KeyS: 'brake', ArrowDown: 'brake', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'boost', ShiftRight: 'boost', Space: 'fire' }
const WSEL_KEYS = { Digit1: 0, Digit2: 1 }
addEventListener('keydown', e => {
  if (e.repeat) return
  if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return
  const m = KEYMAP[e.code]; if (m) { K.keys[m] = true; if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault() }
  if (e.code === 'KeyE') K.use = true
  if (e.code === 'KeyX' || e.code === 'Tab') { K.wswap = true; e.preventDefault() }
  if (e.code in WSEL_KEYS) K.wsel = WSEL_KEYS[e.code]
  if (e.code === 'KeyQ') K.swap = true
  if (e.code === 'KeyM') toggleMute()
  Snd.init(); if (phase === 'title') bgm(0.26)
})
addEventListener('keyup', e => { const m = KEYMAP[e.code]; if (m) K.keys[m] = false })
addEventListener('blur', () => { K.keys = {}; K.fire = false; K.mouseDown = false })
const view = $('view')
view.addEventListener('mousedown', e => { if (e.button === 0) { K.mouseDown = true; Snd.init(); if (phase === 'title') bgm(0.26); if (phase === 'play' && !document.pointerLockElement && !touchy && view.requestPointerLock) { try { const pr = view.requestPointerLock(); if (pr && pr.catch) pr.catch(() => {}) } catch (er) {} } } })
addEventListener('mouseup', e => { if (e.button === 0) K.mouseDown = false })
addEventListener('mousemove', e => {
  K.mx = e.clientX / innerWidth * 2 - 1
  if (document.pointerLockElement) aimYaw -= e.movementX * 0.0026
})
const holdBtn = (id, key, toggle) => {
  const b = $(id)
  const down = e => { e.preventDefault(); Snd.init(); b.setPointerCapture?.(e.pointerId); if (toggle) { K[key] = !K[key]; b.classList.toggle('rev', K[key]) } else { K[key] = true; b.classList.add('on') } }
  const up = e => { if (!toggle) { K[key] = false; b.classList.remove('on') } }
  b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up)
}
const pressBtn = (id, key) => { $(id).addEventListener('pointerdown', e => { e.preventDefault(); Snd.init(); K[key] = true; $(id).classList.add('on'); setTimeout(() => $(id).classList.remove('on'), 150) }) }
holdBtn('bL', 'L'); holdBtn('bR', 'R'); holdBtn('bGas', 'gas'); holdBtn('bBack', 'back'); holdBtn('bHb', 'hb'); holdBtn('bBoost', 'boost'); holdBtn('bFire', 'fire')
pressBtn('bItem', 'use'); pressBtn('bSwap', 'swap'); pressBtn('bWswap', 'wswap')
$('bMute').addEventListener('pointerdown', e => { e.preventDefault(); toggleMute() }); $('muteT').addEventListener('click', toggleMute)
$('langT').addEventListener('click', () => { const u = new URL(location.href); if (EN) u.searchParams.delete('lang'); else u.searchParams.set('lang', 'en'); location.href = u.toString() })
let muted = false
function toggleMute() { muted = !muted; Snd.setMute(muted); document.body.classList.toggle('muted', muted); $('muteT').classList.toggle('muted', muted); $('bMute').classList.toggle('muted', muted) }
// 画面ドラッグ（射手・歩きの向き）と歩きの左スティック
addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch' || phase !== 'play') return
  if (e.target.closest && e.target.closest('.rb,button,a')) return
  const mode = curRole()
  if (mode === 'drive') return
  const left = e.clientX < innerWidth * 0.5
  if (mode === 'walk' && left) { K.touches.set(e.pointerId, { kind: 'stick', x0: e.clientX, y0: e.clientY }); const sb = $('stickBase'); sb.hidden = false; sb.style.left = e.clientX + 'px'; sb.style.top = e.clientY + 'px'; sb.firstElementChild.style.transform = '' }
  else K.touches.set(e.pointerId, { kind: 'aim', x: e.clientX })
  Snd.init()
})
addEventListener('pointermove', e => {
  const t = K.touches.get(e.pointerId); if (!t) return
  if (t.kind === 'aim') { aimYaw -= (e.clientX - t.x) * 0.0062; t.x = e.clientX }
  else { let dx = e.clientX - t.x0, dy = e.clientY - t.y0; const l = Math.hypot(dx, dy), m = 46; if (l > m) { dx *= m / l; dy *= m / l } K.stick = { x: dx / m, y: dy / m }; $('stickBase').firstElementChild.style.transform = `translate(${dx}px,${dy}px)` }
})
const endTouch = e => { const t = K.touches.get(e.pointerId); if (!t) return; K.touches.delete(e.pointerId); if (t.kind === 'stick') { K.stick = null; $('stickBase').hidden = true } }
addEventListener('pointerup', endTouch); addEventListener('pointercancel', endTouch)

function myTeam() { return S.humanTeam >= 0 ? S.teams[S.humanTeam] : null }
function curRole() {
  const t = myTeam(); if (!t || t.out) return 'none'
  if (t.walking) return 'walk'
  return t.driver === 0 ? 'drive' : 'shoot'
}
let lastRole = ''
function readHuman(dt) {
  const t = myTeam(), c = t && t.car >= 0 ? S.cars.find(q => q.id === t.car) : null
  const role = curRole()
  const k = K.keys
  const out = { drive: { throttle: 0, steer: 0, boost: false }, gun: { aim: c ? c.gunYaw : 0, fire: false, reload: false, use: false }, use: false, swap: false, walkX: 0, walkZ: 0 }
  if (role === 'drive') {
    const gas = k.gas || K.gas || K.boost || k.boost, brake = k.brake
    out.drive.throttle = gas ? 1 : (brake || K.back) ? -1 : 0
    out.drive.steer = (k.right || K.R ? 1 : 0) - (k.left || K.L ? 1 : 0)
    out.drive.boost = !!(k.boost || K.boost); out.drive.hb = !!(k.fire || K.hb)
  } else if (role === 'shoot' || role === 'walk') {
    // 向き: キーで回す・マウスの位置で回す（固定していない時）
    if (role === 'shoot') aimYaw += ((k.left ? 1 : 0) - (k.right ? 1 : 0)) * 2.4 * dt
    if (!document.pointerLockElement && !touchy && K.mx !== 0 && role === 'shoot' && K.mouseDown === false && Math.abs(K.mx) > 0.35 && Q.get('edge') === '1') aimYaw -= Math.sign(K.mx) * (Math.abs(K.mx) - 0.35) * 2.4 * dt
  }
  if (role === 'shoot' && c) {
    const as = assistAim(S, c, aimYaw)
    const aim = as ? aimYaw + angDiff(as.yaw, aimYaw) * 0.72 : aimYaw
    out.gun = { aim, fire: !!(K.fire || K.mouseDown || k.fire), reload: false, use: false, assist: as ? { pitch: as.pitch * 0.9 } : null }
    lockedOn = !!as
  } else lockedOn = false
  if (role === 'walk') {
    let fwd = (k.gas ? 1 : 0) - (k.brake ? 1 : 0), str = (k.right ? 1 : 0) - (k.left ? 1 : 0)
    // 歩きでは左右キーは横移動
    if (K.stick) { fwd = -K.stick.y; str = K.stick.x }
    const sy = Math.sin(aimYaw), cy = Math.cos(aimYaw)
    out.walkX = sy * fwd + (-cy) * str; out.walkZ = cy * fwd + sy * str
      }
  out.use = K.use; out.swap = K.swap; out.wswap = K.wswap; out.gun.wswap = K.wswap; if (K.wsel != null) out.gun.wsel = K.wsel; K.use = false; K.swap = false; K.wswap = false; K.wsel = null
  return out
}
let lockedOn = false
let reloadPress = false
addEventListener('keydown', e => { if (e.code === 'KeyR') reloadPress = true })
$('bReload').addEventListener('pointerdown', () => { reloadPress = true })

// ------------------------------------------------------------ 試合の始まりと終わり
// ------------------------------------------------------------ 準備画面（10秒のあいだに車か銃を選ぶ）
const CAR_SVG = [
  '<svg viewBox="0 0 96 44" fill="currentColor"><path d="M6 30c0-6 3-9 9-10l14-9h30l12 9c8 1 14 3 14 10v3H6z"/><circle cx="26" cy="35" r="8" fill="#111" stroke="currentColor" stroke-width="3"/><circle cx="72" cy="35" r="8" fill="#111" stroke="currentColor" stroke-width="3"/><path d="M33 14h24l7 6H27z" fill="#111" opacity=".55"/></svg>',
  '<svg viewBox="0 0 96 44" fill="currentColor"><path d="M4 31c0-4 3-6 9-7l20-9h26l16 9c9 1 17 3 17 7v2H4z"/><path d="M70 14h18v5H66z"/><circle cx="25" cy="35" r="8" fill="#111" stroke="currentColor" stroke-width="3"/><circle cx="74" cy="35" r="8" fill="#111" stroke="currentColor" stroke-width="3"/><path d="M36 16h22l8 6H30z" fill="#111" opacity=".55"/></svg>',
  '<svg viewBox="0 0 96 44" fill="currentColor"><path d="M5 12h62l10 10h14v13H5z"/><rect x="2" y="26" width="9" height="4" fill="#cfd2d6"/><rect x="2" y="32" width="9" height="3" fill="#cfd2d6"/><circle cx="26" cy="36" r="8" fill="#111" stroke="currentColor" stroke-width="3"/><circle cx="72" cy="36" r="8" fill="#111" stroke="currentColor" stroke-width="3"/><rect x="14" y="16" width="30" height="9" fill="#111" opacity=".55"/></svg>',
  '<svg viewBox="0 0 96 44" fill="currentColor"><path d="M10 31c0-6 3-9 9-10l10-8h26l12 8c10 1 16 3 16 10v3H10z"/><path d="M80 8l8 14h-6zM20 12l-6 8h8z" fill="#f4f0e6"/><circle cx="29" cy="35" r="8" fill="#111" stroke="currentColor" stroke-width="3"/><circle cx="70" cy="35" r="8" fill="#111" stroke="currentColor" stroke-width="3"/><path d="M31 15h22l7 6H25z" fill="#111" opacity=".55"/></svg>',
]
const WEAPON_SVG = {
  paint: '<svg viewBox="0 0 96 44" fill="currentColor"><rect x="8" y="16" width="44" height="14" rx="3"/><rect x="50" y="20" width="40" height="5"/><circle cx="26" cy="12" r="8"/><rect x="18" y="28" width="10" height="12"/></svg>',
  rocket: '<svg viewBox="0 0 96 44" fill="currentColor"><path d="M12 22c14-14 40-12 60-4l16 4-16 4c-20 8-46 10-60-4z"/><path d="M10 14l14 8-14 8z" fill="#f4f0e6"/><circle cx="52" cy="22" r="5" fill="#111"/></svg>',
  confetti: '<svg viewBox="0 0 96 44" fill="currentColor"><path d="M10 38L30 14l22 22z"/><circle cx="62" cy="10" r="4"/><circle cx="76" cy="22" r="3.5"/><circle cx="54" cy="6" r="3"/><rect x="80" y="8" width="8" height="5" transform="rotate(30 84 10)"/><rect x="66" y="26" width="7" height="4"/></svg>',
  spring: '<svg viewBox="0 0 96 44" fill="currentColor"><path d="M8 34h10l6-12 8 12 8-12 8 12 8-12 6 12h8" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><circle cx="78" cy="22" r="10"/></svg>',
  cork: '<svg viewBox="0 0 96 44" fill="currentColor"><rect x="6" y="17" width="60" height="12" rx="2"/><rect x="62" y="12" width="26" height="22" rx="4" opacity=".85"/><rect x="66" y="16" width="8" height="14" fill="#111" opacity=".4"/></svg>',
}
const WEAPON_NOTE = { paint: ['ペイント弾', '連射できる。撃ち続けると熱くなる', 'Rapid fire. Heats up'], rocket: ['花火ロケット', '追いかける花火。爆発が大きい', 'Homing firework. Big blast'], confetti: ['紙吹雪', '近くで一気に広がる散弾', 'Close-range spread'], spring: ['バネの鉄球', '跳ね返って転がる重い玉', 'Bouncing steel ball'], cork: ['コルク砲', '速くて遠くまで届く一発', 'Fast, long-range single shot'] }
const CAR_NOTE_EN = ['Balanced all-rounder', 'Fast and light, fragile', 'Slow but tough, hits hard', 'Nimble, long boost']
const CAR_NAME_EN = ['Balance', 'Zoom', 'Thud', 'Nimble']
const bars = (labels, vals) => labels.map((lb, i) => `<span>${lb}</span><i>${[0, 1, 2, 3, 4].map(k => `<u class="${k < vals[i] ? 'on' : ''}"></u>`).join('')}</i>`).join('')
let selWeapons = ['paint', 'rocket'], selCar = 0, lastKills = 0
function lo0() { return S.teams[0].loadout }
function applyLoadout() { setLoadout(S, S.teams[0], { car: selCar, weapons: [...selWeapons] }); refreshPartner() }
function buildPrep() {
  const t = S.teams[0], drive = t.driver === 0, lo = t.loadout
  selCar = lo.car; selWeapons = [...lo.weapons]
  const root = $('pcards'); root.className = drive ? 'cars' : 'guns'
  document.getElementById('prep').style.setProperty('--pc', drive ? 'var(--drv)' : 'var(--gun)'); document.getElementById('prep').style.setProperty('--pc2', drive ? 'var(--gun)' : 'var(--drv)')
  $('pRole').textContent = drive ? L('運転席', 'DRIVER SEAT') : L('射手席', 'SHOOTER SEAT')
  $('pHead').textContent = drive ? L('車をえらぶ', 'Pick your car') : L('銃を2つえらぶ', 'Pick 2 guns')
  if (drive) {
    root.innerHTML = CAR_TYPES.map((c, i) => `<button class="card" data-i="${i}" style="--pc:var(--drv)"><span class="tick"></span><div class="ic">${CAR_SVG[i]}</div><h3>${L(c.name, CAR_NAME_EN[i])}</h3><p class="nt">${L(c.note, CAR_NOTE_EN[i])}</p><div class="bars">${bars([L('速さ', 'SPD'), L('硬さ', 'ARM'), L('小回り', 'TURN'), L('重さ', 'MASS')], c.stat)}</div></button>`).join('')
    root.querySelectorAll('.card').forEach(el => el.addEventListener('click', () => { selCar = +el.dataset.i; applyLoadout(); markPrep(); playSnd('switch', { vol: 0.6 }) }))
  } else {
    root.innerHTML = WEAPON_IDS.map(id => { const W = WEAPONS[id], n = WEAPON_NOTE[id]; return `<button class="card" data-id="${id}" style="--pc:var(--gun)"><span class="slot"><b></b></span><div class="ic">${WEAPON_SVG[id]}</div><h3>${L(n[0], W.name)}</h3><p class="nt">${L(n[1], n[2])}</p><div class="bars">${bars([L('威力', 'PWR'), L('連射', 'RATE'), L('射程', 'RANGE')], W.stat)}</div></button>` }).join('')
    root.querySelectorAll('.card').forEach(el => el.addEventListener('click', () => {
      const id = el.dataset.id
      if (selWeapons.includes(id)) { if (selWeapons[0] !== id) selWeapons = [id, selWeapons[0]] }   // 選んである札を押すと1つ目にする
      else selWeapons = [selWeapons[1], id]                                                              // 新しく押した札が入り、古い方が外れる
      applyLoadout(); markPrep(); playSnd('switch', { vol: 0.6 })
    }))
  }
  markPrep(); refreshPartner(); comboHint()
}
function comboHint() {
  const el = $('pcombo'); if (!el) return
  if (S.teams[0].driver === 0) { const c = CAR_TYPES[selCar]; el.textContent = L(['', '足は速いが、当たり負けしやすい', '遅いが、体当たりで押し勝てる', '小回りで、すり抜けて戦える'][selCar] || L('どこにでも合う標準の車', ''), ''); if (!selCar) el.textContent = L('クセのない標準の車', 'A standard car'); void c; return }
  const ws = selWeapons.map(id => WEAPONS[id].stat), ra = ws[0][2], rb = ws[1][2], pw = ws[0][0] + ws[1][0], rt = ws[0][1] + ws[1][1]
  const txt = Math.abs(ra - rb) >= 2 ? '近くと遠くをカバーできる' : ra + rb >= 8 ? '遠くから削る組み合わせ' : ra + rb <= 4 ? '近づいた敵に強い組み合わせ' : rt >= 7 ? '連射でじわじわ削る' : pw >= 8 ? '一発の重さで勝負する' : '中くらいの距離で戦う'
  el.textContent = L(txt, 'Loadout')
}
function markPrep() {
  const drive = S.teams[0].driver === 0
  comboHint()
  document.querySelectorAll('#pcards .card').forEach(el => {
    if (drive) el.classList.toggle('sel', +el.dataset.i === selCar)
    else { const k = selWeapons.indexOf(el.dataset.id); el.classList.toggle('sel', k >= 0); const b = el.querySelector('.slot b'); if (b) b.textContent = k + 1 }
  })
}
function refreshPartner() {
  const t = S.teams[0], drive = t.driver === 0, lo = t.loadout
  $('pmName').textContent = drive ? L('射手', 'Shooter') : L('運転', 'Driver')
  $('pmPick').textContent = drive ? lo.weapons.map(id => L(WEAPON_NOTE[id][0], WEAPONS[id].name)).join(' + ') : L(CAR_TYPES[lo.car].name, CAR_NAME_EN[lo.car])
}
$('pName').addEventListener('change', () => { const v = cleanName($('pName').value, 0); $('pName').value = v === 'ななしのドライバー' && !$('pName').value.trim() ? '' : v; TN[0] = $('pName').value.trim() ? v : 'あなた'; try { localStorage.setItem('bb_name', $('pName').value) } catch (e) {} })
try { const v = localStorage.getItem('bb_name'); if (v) $('pName').value = cleanName(v) } catch (e) {}

function startMatch(role) {
  matchNo++
  S = createState(seedBase + matchNo * 977, { humanTeam: 0, prepSec: +(Q.get('prep') || 10) })
  S.teams[0].driver = role === 'drive' ? 0 : 1
  TN = [cleanName($('pName').value, 0) && $('pName').value.trim() ? cleanName($('pName').value, 0) : L('あなた', 'You'), ...cpuNames(S.rng, 4)]
  stage.clearDynamic(); human = true
  const c = S.cars.find(q => q.team === 0); aimYaw = c.yaw; snapCam = true
  phase = 'prep'; shownResult = false; resultAt = 0
  $('title').hidden = true; $('result').hidden = true; $('hud').hidden = true; $('prep').hidden = false
  boardCache = ''; $('feed').innerHTML = ''; $('msg').textContent = ''
  hintT = 0; hintShown = {}
  buildPrep()
  Snd.init(); bgm(0.26); Snd.loop('amb', 'snd/amb1.mp3', 0.08, 1)
  playSnd('switch', { vol: 0.7 })
  if (window.__bbOnStart) window.__bbOnStart()
}
function toPlay() {
  phase = 'play'; $('prep').hidden = true; $('hud').hidden = false; snapCam = true; bgm(0.17, 2.5); K.use = false; K.swap = false; K.wswap = false; K.wsel = null
  const c = S.cars.find(q => q.team === 0); if (c) aimYaw = S.teams[0].driver === 1 ? c.yaw : aimYaw
}
function toTitle() {
  phase = 'title'; human = false
  S = createState(seedBase + (++matchNo) * 31, { humanTeam: -1, noCountdown: true }); stage.clearDynamic()
  $('title').hidden = false; $('result').hidden = true; $('hud').hidden = true
  engine.clear(); bgm(0.26)
}
$('goDrive').addEventListener('click', () => startMatch('drive'))
$('goShoot').addEventListener('click', () => startMatch('shoot'))
$('btnAgain').addEventListener('click', () => { startMatch(lastPickRole) })
$('btnSeat').addEventListener('click', () => { lastPickRole = lastPickRole === 'drive' ? 'shoot' : 'drive'; startMatch(lastPickRole) })
$('btnTitle').addEventListener('click', () => toTitle())
let lastPickRole = 'drive'
for (const [id, r] of [['goDrive', 'drive'], ['goShoot', 'shoot']]) $(id).addEventListener('click', () => { lastPickRole = r })
$('btnPost').addEventListener('click', () => {
  const rk = $('rkN').textContent, t = { kills: lastKills }
  const txt = L(`BANG BUMPERS で${rk}位。撃破${t.kills}。2人1組で車をぶつけて撃つ10人バトル`, `Finished #${rk} in BANG BUMPERS with ${t.kills} KOs. Drive and shoot, 2 per car, 10 players.`)
  window.open('https://x.com/intent/post?text=' + encodeURIComponent(txt + '\n#BANGBUMPERS') + '&url=' + encodeURIComponent('https://tom3games.github.io/bang-bumpers/'), '_blank')
})
function showResult(rank) {
  if (shownResult) return; shownResult = true
  const t = S.teams[0], st = t.stats
  lastKills = t.kills; $('rkN').textContent = rank; $('rkU').textContent = L('位', rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th')
  const V = [['最後まで走りきった', 'Last one rolling'], ['あと一歩で頂点だった', 'One hit from the top'], ['ボロボロだけど生きていた', 'Dented but alive'], ['早めに放り出された', 'Thrown out early'], ['最初の被害者になった', 'First one to go']][rank - 1]
  { const sc = id => S.teams[id].stock * 2 + S.teams[id].kills, lead = S.ranking.length ? S.ranking[0] : -1
    if (rank === 2 && lead >= 0 && (sc(0) < sc(lead) - 1 || S.teams[0].kills === 0)) V[0] = 'しぶとく最後まで残った', V[1] = 'Hung on to the end' }
  $('rkV').textContent = L(...V)
  const order = S.ranking.length ? S.ranking : [...S.teams].sort((a, b) => (b.out ? -1000 + b.outT : 1000 + b.stock * 100 + b.kills * 3) - (a.out ? -1000 + a.outT : 1000 + a.stock * 100 + a.kills * 3)).map(x => x.id)
  $('rkList').innerHTML = order.map((id, i) => { const tm = S.teams[id]; return `<li class="${id === 0 ? 'me' : ''}" style="--tc:${hex(TEAM_COLORS[id])}"><b>${i + 1}</b><i></i><span>${tname(id)}${id === 0 && tname(0) !== L('あなた', 'You') ? L('（あなた）', ' (you)') : ''}</span><em>${tm.kills} ${L('撃破', 'KO')}</em></li>` }).join('')
  const acc = st.shots ? Math.round(st.hits / st.shots * 100) : 0
  $('rkSt').textContent = L(`撃った ${st.shots} 発・当たった ${st.hits} 発（${acc}%）・体当たり ${st.rams} 回・拾った物 ${st.pick} 個`, `Shots ${st.shots} · hits ${st.hits} (${acc}%) · rams ${st.rams} · pickups ${st.pick}`)
  $('result').classList.toggle('win', rank === 1)
  $('result').hidden = false; $('hud').hidden = true; $('prep').hidden = true; $('flashfx').style.opacity = 0; phase = 'result'
  playSnd(rank <= 2 ? 'win' : 'lose', { vol: 0.9 }); Snd.duck(0.3, 3); engine.clear(); bgm(0.26)
  document.exitPointerLock?.()
  window.__bbDone = { tMatch: S.tMatch, winner: S.winner, wrecks: S.wrecks, teams: S.teams.map(t => ({ kills: t.kills })), rank }
  if (window.__bbOnResult) window.__bbOnResult(rank)
}

// ------------------------------------------------------------ 出来事 → 画面の言葉と音
function feed(html, color) {
  const li = document.createElement('li'); li.innerHTML = html; if (color) li.style.setProperty('--tc', hex(color))
  const ul = $('feed'); ul.appendChild(li); while (ul.children.length > 4) ul.removeChild(ul.firstChild)
  setTimeout(() => li.remove(), 5500)
}
function say(text, small, ms = 1100, sub) {
  const m = $('msg'); m.className = small ? 'sm' : ''; m.innerHTML = text + (sub ? `<small>${sub}</small>` : ''); void m.offsetWidth; m.classList.add('pop'); msgT = performance.now() + ms
}
function onEvents() {
  for (const e of S.events) {
    stage.onEvent(e, S)
    if (!human) continue
    switch (e.k) {
      case 'count': if (phase === 'prep') { const pc = $('pcount'); pc.firstElementChild.textContent = e.n; pc.classList.toggle('low', e.n <= 3); playSnd('tick', { vol: e.n <= 3 ? 0.9 : 0.35, rate: e.n <= 3 ? 1.4 : 1 }) } break
      case 'go': if (phase === 'prep') toPlay(); say('GO!', false, 900); playSnd('horn', { vol: 0.5, rate: 1.4 }); break
      case 'kill': {
        const v = tname(e.victim), me = e.victim === 0, byMe = e.by === 0
        const how = e.how === 'foot' ? L('（歩き）', ' (on foot)') : ''
        const txt = e.by == null ? L(`<b style="color:${hex(TEAM_COLORS[e.victim])}">${v}</b> が自爆${how}`, `<b style="color:${hex(TEAM_COLORS[e.victim])}">${v}</b> blew up${how}`)
          : L(`<b style="color:${hex(TEAM_COLORS[e.by])}">${tname(e.by)}</b> が <b style="color:${hex(TEAM_COLORS[e.victim])}">${v}</b> を撃破${how}`, `<b style="color:${hex(TEAM_COLORS[e.by])}">${tname(e.by)}</b> wrecked <b style="color:${hex(TEAM_COLORS[e.victim])}">${v}</b>${how}`)
        feed(txt, byMe ? TEAM_COLORS[0] : TEAM_COLORS[e.victim])
        if (byMe) say(L('撃破！', 'WRECKED!'), true, 1100)
        else if (me) { const t = S.teams[0]; if (!t.out) say(L('壊された', 'WRECKED'), true, 1400, L('灰色の空き車まで走れ', 'Run to a grey spare car')) }
        break
      }
      case 'out': { feed(L(`<b style="color:${hex(TEAM_COLORS[e.team])}">${tname(e.team)}</b> 脱落`, `<b style="color:${hex(TEAM_COLORS[e.team])}">${tname(e.team)}</b> is out`), TEAM_COLORS[e.team]); if (e.team === 0) { resultAt = S.t + 2.4; say(L('脱落', 'OUT'), false, 2200) } break }
      case 'swap': say(L(S.teams[0].driver === 0 ? '運転になった' : '射手になった', S.teams[0].driver === 0 ? 'You drive now' : 'You shoot now'), true, 1200); if (S.teams[0].driver === 1) { const c = S.cars.find(q => q.id === S.teams[0].car); if (c) aimYaw = c.gunYaw } break
      case 'pickup': if (e.team === 0) say(L(ITEM_NAMES[e.type], e.type.toUpperCase()), true, 900, ITEMS[e.type] && ITEMS[e.type].role === 'D' ? L('運転のアイテム', 'Driver item') : ITEMS[e.type] && ITEMS[e.type].role === 'G' ? L('射手のアイテム', 'Shooter item') : ''); break
      case 'repair': if (e.team === 0) say(L('修理', 'REPAIR'), true, 900); break
      case 'flash': { const mc = myTeam() && myTeam().car >= 0 ? S.cars.find(q => q.id === myTeam().car) : null; if (mc && mc.flashT > 0.3) { Snd.muffle(Math.min(2.2, mc.flashT * 0.8)); playSnd('bell', { vol: 0.16, rate: 3.2 }) } break }
      case 'overheat': if (e.team === 0) say(L('熱い！', 'OVERHEAT'), true, 900); break
      case 'board': if (e.team === 0) { say(L('復活', 'BACK IN'), true, 1000); const c = S.cars.find(q => q.id === e.id); if (c) { aimYaw = c.yaw; snapCam = true } } break
    }
  }
  S.events.length = 0
}

// ------------------------------------------------------------ HUD
let boardCache = '', hintT = 0, hintShown = {}
function updateBoard() {
  const order = [...S.teams].sort((a, b) => (b.out ? -1000 + b.outT : 1000 + b.stock * 100 + b.kills * 3) - (a.out ? -1000 + a.outT : 1000 + a.stock * 100 + a.kills * 3))
  const key = order.map(t => `${t.id}${t.stock}${t.kills}${t.out ? 1 : 0}${tname(t.id)}`).join(',')
  if (key === boardCache) return; boardCache = key
  $('board').innerHTML = order.map(t => { let pips = ''; for (let i = 0; i < STOCK; i++) pips += `<u class="${i < t.stock ? '' : 'x'}"></u>`; return `<li class="${t.id === 0 ? 'me' : ''} ${t.out ? 'out' : ''}" style="--tc:${hex(TEAM_COLORS[t.id])}"><i></i><em>${[...tname(t.id)].slice(0, 6).join('')}</em><span class="st">${pips}</span><span class="k">${t.kills}</span></li>` }).join('')
}
const radar = $('radar').getContext('2d')
function drawRadar(cx, cz, yaw) {
  const g = radar, W = 184, R = 92, sc = R / 80
  g.clearRect(0, 0, W, W); g.save(); g.beginPath(); g.arc(R, R, R - 3, 0, 7); g.clip()
  g.translate(R, R); g.rotate(yaw + Math.PI) // 進行方向が上
  g.scale(sc, sc); g.translate(-cx, -cz)
  g.fillStyle = 'rgba(44,45,47,.92)'; g.fillRect(-WORLD, -WORLD, WORLD * 2, WORLD * 2)
  g.fillStyle = 'rgba(88,86,80,.95)'; g.fillRect(-HALF, -HALF, HALF * 2, HALF * 2)
  g.strokeStyle = 'rgba(232,184,28,.8)'; g.lineWidth = 1.4; g.strokeRect(-HALF, -HALF, HALF * 2, HALF * 2); g.strokeRect(-WORLD + 1, -WORLD + 1, WORLD * 2 - 2, WORLD * 2 - 2)
  g.fillStyle = 'rgba(30,28,24,.6)'; g.beginPath(); g.arc(BOWL.x, BOWL.z, BOWL.r, 0, 7); g.fill()
  g.fillStyle = 'rgba(120,115,105,.9)'; g.fillRect(DECK.x0, DECK.z0, DECK.x1 - DECK.x0, DECK.z1 - DECK.z0)
  g.fillStyle = 'rgba(190,185,172,.8)'
  for (const o of POLES) { g.beginPath(); g.arc(o.x, o.z, Math.max(1.4, o.r), 0, 7); g.fill() }
  for (const o of BOXES) { g.fillStyle = o.kind === 'hwall' ? 'rgba(232,184,28,.95)' : o.kind === 'cont' ? 'rgba(150,140,125,.9)' : 'rgba(190,185,172,.8)'; g.fillRect(o.x - o.w / 2, o.z - o.d / 2, o.w, o.d) }
  g.fillStyle = 'rgba(242,194,48,.9)'
  for (const p of RAMPS) { g.save(); g.translate(p.x, p.z); g.rotate(-p.ang); g.fillRect(-p.w / 2, 0, p.w, p.len); g.restore() }
  g.restore()
  g.save(); g.beginPath(); g.arc(R, R, R - 3, 0, 7); g.clip(); g.translate(R, R); g.rotate(yaw + Math.PI); g.scale(sc, sc); g.translate(-cx, -cz)
  for (const p of S.pickups) if (p.t <= 0) { g.fillStyle = p.type === 'repair' ? '#43d17a' : ITEMS[p.type] && ITEMS[p.type].role === 'G' ? '#37c3ea' : '#f5a23a'; g.save(); g.translate(p.x, p.z); g.rotate(.785); g.fillRect(-1.3, -1.3, 2.6, 2.6); g.restore() }
  for (const c of S.cars) {
    if (c.team < 0 && c.alive) { g.fillStyle = '#f2c230'; g.fillRect(c.x - 2, c.z - 2, 4, 4); continue }
    if (!c.alive) { g.fillStyle = 'rgba(20,20,20,.9)'; g.fillRect(c.x - 1.5, c.z - 1.5, 3, 3); continue }
    g.save(); g.translate(c.x, c.z); g.rotate(-c.yaw); g.fillStyle = hex(TEAM_COLORS[c.team]); g.strokeStyle = c.team === 0 ? '#fff' : 'rgba(0,0,0,.7)'; g.lineWidth = c.team === 0 ? 1.2 : 0.8
    g.beginPath(); g.moveTo(0, 3.6); g.lineTo(2.4, -2.4); g.lineTo(-2.4, -2.4); g.closePath(); g.fill(); g.stroke(); g.restore()
  }
  for (const t of S.teams) if (t.walking) { const p = t.p[0]; g.fillStyle = hex(TEAM_COLORS[t.id]); g.beginPath(); g.arc(p.x, p.z, 2.2, 0, 7); g.fill() }
  g.restore()
}
const marks = []
function mark(i) { if (marks[i]) return marks[i]; const d = document.createElement('div'); d.className = 'mk'; d.innerHTML = '<span class="nm"></span><span class="hp"><u></u></span>'; $('marks').appendChild(d); return marks[i] = d }
const _v = new THREE.Vector3()
function updateMarks() {
  let n = 0; const W = innerWidth, Hh = innerHeight, placed = []
  const place = (x, y, z, col, name, hp, spare) => {
    const d = mark(n++); d.style.display = ''; d.classList.toggle('spare', !!spare)
    _v.set(x, y, z).project(stage.cam)
    let sx = (_v.x * 0.5 + 0.5) * W, sy = (-_v.y * 0.5 + 0.5) * Hh, edge = false
    if (_v.z > 1) { sx = W - sx; sy = Hh - sy; edge = true }
    const mx = 40, top = 84, bot = touchy ? 190 : 60, cx = W / 2, cy = Hh / 2, rdx = sx - cx, rdy = sy - cy
    if (sx < mx || sx > W - mx || sy < top || sy > Hh - bot || _v.z > 1) { edge = true; const k = Math.min((W / 2 - mx) / Math.max(1, Math.abs(rdx)), (Hh / 2 - Math.max(top, 60)) / Math.max(1, Math.abs(rdy))); sx = cx + rdx * k; sy = cy + rdy * k; sy = Math.min(sy, Hh - bot) }
    // 重なる札は縦にずらす
    for (const p of placed) if (Math.abs(p[0] - sx) < 70 && Math.abs(p[1] - sy) < 20) sy = p[1] + 20
    placed.push([sx, sy])
    d.classList.toggle('edge', edge); d.style.setProperty('--tc', col); d.style.setProperty('--ang', Math.atan2(rdy, rdx) + 'rad'); d.firstChild.textContent = name; d.lastChild.firstChild.style.width = hp + '%'
    d.style.transform = `translate(${sx - 30}px,${sy - 18}px)`
  }
  const myc = myTeam() && myTeam().car >= 0 ? S.cars.find(q => q.id === myTeam().car) : null
  const ref = myc || (myTeam() && myTeam().p[0])
  for (const c of S.cars) {
    if (c.team < 0 && c.alive && curRole() === 'walk' && ref) { const dd = Math.hypot(c.x - ref.x, c.z - ref.z); if (dd < 90) place(c.x, c.y + 3.6, c.z, '#f2c230', L('空き車', 'SPARE'), 100, true); continue }
    if (!c.alive || c.team < 0 || c.team === S.humanTeam) continue
    if (ref && S.smokes.some(m => Math.hypot(m.x - c.x, m.z - c.z) < m.r * 0.8)) continue   // 煙幕の中の車は名札が出ない
    place(c.x, c.y + 3.5, c.z, hex(TEAM_COLORS[c.team]), tname(c.team), Math.max(0, c.hp))
  }
  for (let i = n; i < marks.length; i++) marks[i].style.display = 'none'
}
function updateHUD(dt) {
  const t = myTeam(); if (!t) return
  const role = curRole(), c = t.car >= 0 ? S.cars.find(q => q.id === t.car) : null
  document.body.classList.toggle('r-drive', role === 'drive'); document.body.classList.toggle('r-shoot', role === 'shoot'); document.body.classList.toggle('r-walk', role === 'walk')
  const left = Math.max(0, S.T - S.tMatch), mm = Math.floor(left / 60), ss = Math.floor(left % 60)
  $('tm').textContent = `${mm}:${String(ss).padStart(2, '0')}`; $('timer').classList.toggle('low', left < 30 && S.phase === 'play')
  $('roleName').textContent = role === 'drive' ? L('運転', 'DRIVER') : role === 'shoot' ? L('射手', 'SHOOTER') : role === 'walk' ? L('歩き', 'ON FOOT') : L('観戦', 'OUT')
  $('role').classList.toggle('swap', t.swapReq && !!c); $('swapBar').firstElementChild.style.width = Math.min(100, t.swapT / 3 * 100) + '%'
  updateBoard()
  const hp = c ? Math.max(0, c.hp) : 0
  $('hpBar').style.width = hp + '%'; document.querySelector('.g.hp').classList.toggle('warn', hp < 35)
  $('bstBar').style.width = (c ? c.boost * 100 : 0) + '%'
  // 銃の枠（射手）: 2つ・今使っている方を明るく・弾と熱とリロード
  if (role === 'shoot') {
    const ws = $('wslots'); if (ws.children.length !== 2) ws.innerHTML = '<div class="ws"><b></b><em></em><i><u></u></i></div><div class="ws"><b></b><em></em><i><u></u></i></div>'
    t.ws.forEach((w, i) => { const W = WEAPONS[w.id], el = ws.children[i], rl = w.reloadT > 0
      el.classList.toggle('on', i === t.wSel); el.classList.toggle('hot', w.overT > 0 || w.heat > 0.7); el.classList.toggle('rl', rl)
      el.children[0].textContent = (i + 1) + ' ' + L(WEAPON_NOTE[w.id][0], W.name); el.children[1].textContent = rl ? L('装填中', 'RELOAD') : w.mag + ' / ' + W.mag
      el.children[2].firstElementChild.style.width = (rl ? (1 - w.reloadT / W.reload) * 100 : w.id === 'paint' ? Math.max(w.mag / W.mag * 100, w.overT > 0 ? 100 : 0) : w.mag / W.mag * 100) + '%' })
  }
  // アイテムの札: 今の役のアイテムだけ。色は役の色
  const slot = role === 'drive' ? t.iD : role === 'shoot' ? t.iG : null
  $('itemChip').hidden = !slot; $('itemChip').className = 'g itm ' + (role === 'drive' ? 'd' : 'g')
  if (slot) $('itemT').textContent = L(ITEM_NAMES[slot.type], slot.type.toUpperCase()) + (slot.ammo > 1 ? ' ×' + slot.ammo : '') + (touchy ? '' : ' [E]')
  $('bItem').hidden = !slot
  $('cross').hidden = role !== 'shoot'; $('cross').classList.toggle('lock', lockedOn)
  // 相棒の札
  { const pt = $('partner'), drive = t.driver === 0 && !t.walking
    if (c && !t.out) { pt.hidden = false; const pslot = drive ? t.iG : t.iD
      $('ptName').textContent = drive ? L('相棒 射手', 'Partner: shooter') : L('相棒 運転', 'Partner: driver')
      $('ptInfo').textContent = drive ? L(WEAPON_NOTE[t.ws[t.wSel].id][0], WEAPONS[t.ws[t.wSel].id].name) : L(CAR_TYPES[c.type].name, CAR_NAME_EN[c.type])
      pt.classList.toggle('has', !!pslot); pt.style.setProperty('--ic', drive ? 'var(--gun)' : 'var(--drv)'); pt.style.setProperty('--pc2', drive ? 'var(--gun)' : 'var(--drv)') } else pt.hidden = true }
  // ヒント
  let hint = ''
  if (S.phase === 'play') {
    if (role === 'walk') hint = touchy ? L('黄色い印の空き車まで走れ', 'Run to the spare car') : L('黄色い印の空き車まで走れ（近づくと乗れる）', 'Run to the marked spare car')
    else if (role === 'drive') hint = S.tMatch < 14 ? (touchy ? L('ペダルで進み、横腹にぶつけろ', 'Pedal to go, hit their sides') : L('W 進む・A D ハンドル・Space ドリフト', 'W go · A D steer · Space drift')) : (c && c.hp < 40 ? L('壊れそう。緑の箱で直せる', 'Almost dead. Find a repair box') : '')
    else if (role === 'shoot') hint = S.tMatch < 14 ? (touchy ? L('なぞって向き、大ボタンで撃つ', 'Drag to aim, big button fires') : L(document.pointerLockElement ? 'マウスで向き・クリックで撃つ' : '画面をクリックしてマウス固定・クリックで撃つ', document.pointerLockElement ? 'Mouse to aim · click to fire' : 'Click to lock the mouse, click to fire')) : (t.ws && t.ws[t.wSel] && t.ws[t.wSel].overT > 0 ? L('熱い！冷めるまで待て', 'Overheated') : '')
  }
  $('hint').textContent = hint
  if (msgT && performance.now() > msgT) { $('msg').textContent = ''; $('msg').className = ''; msgT = 0 }
}

// ------------------------------------------------------------ 疾走感: 画面のふちを流れる線とブーストの縁（最高速は変えない）
const windC = $('wind'), wg = windC.getContext('2d')
function sizeWind() { windC.width = innerWidth; windC.height = innerHeight }
sizeWind(); addEventListener('resize', sizeWind)
let windOn = false
function drawWind(k, boost, on) {
  const need = on && (k > 0.5 || boost)
  if (!need) { if (windOn) { wg.clearRect(0, 0, windC.width, windC.height); windOn = false } return }
  windOn = true
  const W = windC.width, Hh = windC.height, cx = W / 2, cy = Hh * 0.46, R = Math.hypot(W, Hh) / 2
  wg.clearRect(0, 0, W, Hh)
  const kk = Math.min(1, (k - 0.5) / 0.6) + (boost ? 0.45 : 0), n = Math.round(10 + kk * 26)
  wg.lineCap = 'round'
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, r0 = R * (0.52 + Math.random() * 0.4), len = R * (0.05 + Math.random() * 0.14) * (0.6 + kk), x0 = cx + Math.cos(a) * r0, y0 = cy + Math.sin(a) * r0 * 0.9
    wg.strokeStyle = `rgba(255,255,255,${0.07 + Math.random() * 0.16 * Math.min(1, kk)})`; wg.lineWidth = 1 + Math.random() * 2
    wg.beginPath(); wg.moveTo(x0, y0); wg.lineTo(x0 + Math.cos(a) * len, y0 + Math.sin(a) * len * 0.9); wg.stroke()
  }
  if (boost) { const g2 = wg.createRadialGradient(cx, cy, R * 0.45, cx, cy, R); g2.addColorStop(0, 'rgba(255,150,40,0)'); g2.addColorStop(1, 'rgba(255,120,20,0.28)'); wg.fillStyle = g2; wg.fillRect(0, 0, W, Hh) }
}

// ------------------------------------------------------------ メインループ
function frame(now) {
  requestAnimationFrame(frame)
  let dt = Math.min(0.05, (now - last) / 1000); last = now
  if (stage.hitStop > 0) { stage.hitStop -= dt; dt *= 0.15 }
  acc += dt * simSpeed
  let n = 0
  while (acc >= DT && n < 24) {
    let hin = null
    if (human && phase === 'play' && !K.autoCPU) { hin = readHuman(DT); if (reloadPress) { hin.gun.reload = true; reloadPress = false } }
    else reloadPress = false
    const inp = makeInputs(S, DT, hin)
    step(S, inp, DT); onEvents(); acc -= DT; n++
  }
  if (n === 24) acc = 0
  const alpha = Math.min(1, acc / DT)
  const t = myTeam(), role = curRole()
  let cv
  if (phase === 'title' || !t) cv = { mode: 'orbit' }
  else if (phase === 'prep') cv = { mode: 'prep', car: S.cars.find(q => q.team === 0) }
  else if (role === 'walk') cv = { mode: 'walk', yaw: aimYaw, person: t.p[0].state === 'ride' ? t.p[1] : t.p[0], snap: snapCam }
  else if (role === 'shoot') cv = { mode: 'gun', yaw: aimYaw, car: S.cars.find(q => q.id === t.car), snap: snapCam }
  else if (role === 'drive') cv = { mode: 'drive', car: S.cars.find(q => q.id === t.car), snap: snapCam }
  else cv = { mode: 'orbit' }
  if (cv.mode !== 'orbit' && !(cv.car || cv.person)) cv = { mode: 'orbit' }
  if (cv.mode === 'prep' && !cv.car) cv = { mode: 'orbit' }
  stage.updateCamera(S, cv, dt, alpha); snapCam = false
  if (window.__bbCam) { stage.cam.position.set(...window.__bbCam.p); stage.cam.lookAt(...window.__bbCam.l); stage.cam.fov = window.__bbCam.fov || 55; stage.cam.updateProjectionMatrix() }
  stage.sync(S, alpha, dt, { human: !!(t && t.driver === 0) })
  if (phase === 'play') {
    updateHUD(dt)
    const c = t && t.car >= 0 ? S.cars.find(q => q.id === t.car) : null
    const ref = c || (t && t.p[0])
    if (ref) drawRadar(ref.x, ref.z, c ? stage.camYaw : stage.camYaw)
    updateMarks()
    { const fx = $('flashfx'), a = c && c.flashT > 0 ? Math.min(0.82, Math.min(1, c.flashT / 0.9) * 0.82 * Math.min(1, c.flashT / Math.max(0.5, c.flashDur * 0.6))) : 0; fx.style.opacity = a.toFixed(3) }
    engine.update(S, dt, c, stage.camYaw, muted, S.phase === 'play' && !S.over)
    { const sp = c ? Math.hypot(c.vx, c.vz) : 0
      if (c && c.slip > 4.2 && !c.air && sp > 6 && performance.now() - (window.__scrub || 0) > 380) { window.__scrub = performance.now(); playSnd('roll', { vol: Math.min(0.5, c.slip * 0.06), rate: 1.7 + Math.random() * 0.3 }) } }
    drawWind(c ? Math.hypot(c.vx, c.vz) / CAR_TYPES[c.type].maxF : 0, !!(c && c.boosting), role === 'drive' || role === 'shoot')
    if (phase === 'play' && S.over && !shownResult) { if (!resultAt) resultAt = S.t + 1.2; if (S.t >= resultAt) { const rk = S.ranking.indexOf(0) + 1; showResult(rk) } }
    if (t && t.out && !shownResult && resultAt && S.t >= resultAt) { showResult(S.teams.filter(q => !q.out).length + 1) }
  }
  if ((phase === 'title' || phase === 'result') && S.over && S.overT > 4) { S = createState(seedBase + (++matchNo) * 31, { humanTeam: -1, noCountdown: true }); stage.clearDynamic() }
  if (phase === 'prep') { const pcs = S.cd; if (pcs > 0 && $('pcount').firstElementChild.textContent !== String(Math.ceil(pcs))) { $('pcount').firstElementChild.textContent = Math.ceil(pcs) } }
  if (Q.get('norender') !== '1') stage.render()
  window.__bbFrames = (window.__bbFrames || 0) + 1
}

// ------------------------------------------------------------ 読み込み
async function boot() {
  $('loadbar').style.width = '35%'
  await Promise.race([Snd.prefetch(['snd/bgm_suno.mp3', 'snd/amb1.mp3']), new Promise(r => setTimeout(r, 5000))])
  $('loadbar').style.width = '100%'
  await new Promise(r => setTimeout(r, 160))
  $('loading').classList.add('off'); setTimeout(() => $('loading').remove(), 600)
  $('title').hidden = false
  window.__bb = { showResult: r => showResult(r), advance: n => { for (let i = 0; i < n; i++) { step(S, makeInputs(S, DT, null), DT); onEvents() } }, setSpeed: v => { simSpeed = v }, S: () => S, stage, K, startMatch, toTitle, phase: () => phase, setAim: v => { aimYaw = v }, aim: () => aimYaw, role: curRole, lockedOn: () => lockedOn, hud: () => ({ marks: marks.length }) }
  window.__bbReady = true
  if (Q.get('start')) startMatch(Q.get('start'))
  requestAnimationFrame(t => { last = t; frame(t) })
}
window.__jsUp = true
boot().catch(e => { const el = $('err'); if (el) el.textContent = String(e && e.stack || e); throw e })

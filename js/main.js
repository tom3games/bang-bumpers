// 入口: 画面の切り替え・入力・HUD・音・ループ。試合の中身は sim.js、CPU は cpu.js、絵は stage.js
import * as THREE from 'three'
import { createState, step, DT, TEAM_NAMES, TEAM_COLORS, WEAPONS, MATCH_SEC, ITEM_NAMES, assistAim, angDiff, specialWeapon, STOCK, MAXF } from './sim.js'
import { makeInputs } from './cpu.js'
import { Stage } from './stage.js'
import { H, HALF, BOXES, POLES, BOWL, DECK, RAMPS, SPARE_SPOTS } from './arena.js'

const Q = new URLSearchParams(location.search)
const EN = Q.get('lang') === 'en'
const L = (ja, en) => EN ? en : ja
const $ = id => document.getElementById(id)
const hex = h => '#' + h.toString(16).padStart(6, '0')
const TEAM_EN = ['Red', 'Blue', 'Yellow', 'Green', 'Pink']
const tname = i => EN ? TEAM_EN[i] : TEAM_NAMES[i]
const touchy = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || Q.get('touch') === '1'
if (touchy && Q.get('touch') !== '0') document.body.classList.add('touch')
if (EN) { document.documentElement.lang = 'en'; document.title = 'BANG BUMPERS | 2-per-car, 10-player car combat - free browser game'; for (const el of document.querySelectorAll('[data-en]')) { el.innerHTML = el.dataset.en } for (const b of document.querySelectorAll('[data-en-label]')) b.setAttribute('aria-label', b.dataset.enLabel); $('btnAgain').textContent = 'Play again'; $('btnPost').textContent = 'Post on X'; $('langT').textContent = 'JA' }
const low = touchy || Math.min(innerWidth, innerHeight) < 600 || Q.get('low') === '1'

// ------------------------------------------------------------ 音
const SND = {
  pop: ['snd/pop1.mp3', 'snd/pop2.mp3', 'snd/pop3.mp3'], clink: ['snd/clink1.mp3', 'snd/clink2.mp3', 'snd/clink3.mp3'], crash: ['snd/crash1.mp3', 'snd/crash2.mp3', 'snd/crash3.mp3', 'snd/crash4.mp3'],
  hitl: ['snd/hitl1.mp3', 'snd/hitl2.mp3', 'snd/hitl3.mp3'], boom: ['snd/boom1.mp3', 'snd/boom2.mp3', 'snd/boom3.mp3'], boom2: ['snd/boom2.mp3'], boom5: ['snd/boom5.mp3'], debris: ['snd/debris1.mp3', 'snd/debris2.mp3'],
  thud: ['snd/thud.mp3'], whoosh: ['snd/jet.mp3'], spring: ['snd/spring1.mp3', 'snd/spring2.mp3', 'snd/spring3.mp3'], shot: ['snd/shot1.mp3', 'snd/shot2.mp3'], paper: ['snd/paper1.mp3', 'snd/paper2.mp3'], plop: ['snd/plop1.mp3', 'snd/plop2.mp3'],
  splash: ['snd/splash1.mp3'], bell: ['snd/bell.mp3'], repair: ['snd/repair1.mp3'], horn: ['snd/horn.mp3'], latch: ['snd/latch.mp3'], pin: ['snd/pin.mp3'], switch: ['snd/switch1.mp3'],
  roll: ['snd/roll1.mp3', 'snd/roll2.mp3'], punch: ['snd/punch1.mp3', 'snd/punch2.mp3'], tick: ['snd/tick.mp3'], win: ['snd/win.mp3'], lose: ['snd/lose.mp3'], step: ['snd/step1.mp3', 'snd/step2.mp3'],
}
Snd.def(SND)
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
const K = { keys: {}, gas: false, rev: false, L: false, R: false, boost: false, fire: false, reload: false, use: false, swap: false, mx: 0, mouseDown: false, stick: null, touches: new Map(), autoCPU: Q.get('auto') === '1' }
const wasPressed = {}

// ------------------------------------------------------------ 入力
const KEYMAP = { KeyW: 'gas', ArrowUp: 'gas', KeyS: 'brake', ArrowDown: 'brake', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'boost', ShiftRight: 'boost', Space: 'fire' }
addEventListener('keydown', e => {
  if (e.repeat) return
  const m = KEYMAP[e.code]; if (m) { K.keys[m] = true; if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault() }
  if (e.code === 'KeyE') K.use = true
  if (e.code === 'KeyQ') K.swap = true
  if (e.code === 'KeyM') toggleMute()
  Snd.init()
})
addEventListener('keyup', e => { const m = KEYMAP[e.code]; if (m) K.keys[m] = false })
addEventListener('blur', () => { K.keys = {}; K.fire = false; K.mouseDown = false })
const view = $('view')
view.addEventListener('mousedown', e => { if (e.button === 0) { K.mouseDown = true; Snd.init(); if (phase === 'play' && !document.pointerLockElement && !touchy && view.requestPointerLock) { try { const pr = view.requestPointerLock(); if (pr && pr.catch) pr.catch(() => {}) } catch (er) {} } } })
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
holdBtn('bL', 'L'); holdBtn('bR', 'R'); holdBtn('bGas', 'gas'); holdBtn('bGear', 'rev', true); holdBtn('bBoost', 'boost'); holdBtn('bFire', 'fire')
pressBtn('bItem', 'use'); pressBtn('bSwap', 'swap')
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
    const gas = k.gas || K.gas, brake = k.brake
    out.drive.throttle = gas ? (K.rev && touchy && !k.gas ? -1 : 1) : brake ? -1 : 0
    out.drive.steer = (k.right || K.R ? 1 : 0) - (k.left || K.L ? 1 : 0)
    out.drive.boost = !!(k.boost || K.boost)
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
  out.use = K.use; out.swap = K.swap; K.use = false; K.swap = false
  return out
}
let lockedOn = false
let reloadPress = false
addEventListener('keydown', e => { if (e.code === 'KeyR') reloadPress = true })
$('bReload').addEventListener('pointerdown', () => { reloadPress = true })

// ------------------------------------------------------------ 試合の始まりと終わり
function startMatch(role) {
  matchNo++
  S = createState(seedBase + matchNo * 977, { humanTeam: 0 })
  S.teams[0].driver = role === 'drive' ? 0 : 1
  stage.clearDynamic(); human = true
  const c = S.cars.find(q => q.team === 0); aimYaw = c.yaw; snapCam = true
  phase = 'play'; shownResult = false; resultAt = 0
  $('title').hidden = true; $('result').hidden = true; $('hud').hidden = false
  boardCache = ''; $('feed').innerHTML = ''; $('msg').textContent = ''
  hintT = 0; hintShown = {}
  Snd.init(); Snd.loop('bgm', 'snd/bgm.mp3', 0.26, 1.2); Snd.loop('amb', 'snd/amb1.mp3', 0.1, 1); Snd.loop('eng', 'snd/engine.mp3', 0.0001, 0.3)
  playSnd('switch', { vol: 0.7 })
  if (window.__bbOnStart) window.__bbOnStart()
}
function toTitle() {
  phase = 'title'; human = false
  S = createState(seedBase + (++matchNo) * 31, { humanTeam: -1, noCountdown: true }); stage.clearDynamic()
  $('title').hidden = false; $('result').hidden = true; $('hud').hidden = true
  Snd.loop('eng', null)
}
$('goDrive').addEventListener('click', () => startMatch('drive'))
$('goShoot').addEventListener('click', () => startMatch('shoot'))
$('btnAgain').addEventListener('click', () => { startMatch(lastPickRole) })
let lastPickRole = 'drive'
for (const [id, r] of [['goDrive', 'drive'], ['goShoot', 'shoot']]) $(id).addEventListener('click', () => { lastPickRole = r })
$('btnPost').addEventListener('click', () => {
  const rk = $('rkN').textContent, t = S.teams[0]
  const txt = L(`BANG BUMPERS で${rk}位。撃破${t.kills}。2人1組で車をぶつけて撃つ10人バトル`, `Finished #${rk} in BANG BUMPERS with ${t.kills} KOs. Drive and shoot, 2 per car, 10 players.`)
  window.open('https://x.com/intent/post?text=' + encodeURIComponent(txt + '\n#BANGBUMPERS') + '&url=' + encodeURIComponent('https://tom3games.github.io/bang-bumpers/'), '_blank')
})
function showResult(rank) {
  if (shownResult) return; shownResult = true
  const t = S.teams[0], st = t.stats
  $('rkN').textContent = rank; $('rkU').textContent = L('位', rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th')
  const V = [['最後まで走りきった', 'Last one rolling'], ['あと一歩で頂点だった', 'One hit from the top'], ['ボロボロだけど生きていた', 'Dented but alive'], ['早めに放り出された', 'Thrown out early'], ['最初の被害者になった', 'First one to go']][rank - 1]
  $('rkV').textContent = L(...V)
  const order = S.ranking.length ? S.ranking : [...S.teams].sort((a, b) => (b.out ? -1000 + b.outT : 1000 + b.stock * 100 + b.kills * 3) - (a.out ? -1000 + a.outT : 1000 + a.stock * 100 + a.kills * 3)).map(x => x.id)
  $('rkList').innerHTML = order.map((id, i) => { const tm = S.teams[id]; return `<li class="${id === 0 ? 'me' : ''}" style="--tc:${hex(TEAM_COLORS[id])}"><b>${i + 1}</b><i></i><span>${tname(id)}${id === 0 ? L('（あなた）', ' (you)') : ''}</span><em>${tm.kills} ${L('撃破', 'KO')}</em></li>` }).join('')
  const acc = st.shots ? Math.round(st.hits / st.shots * 100) : 0
  $('rkSt').textContent = L(`撃った ${st.shots} 発・当たった ${st.hits} 発（${acc}%）・体当たり ${st.rams} 回・拾った物 ${st.pick} 個`, `Shots ${st.shots} · hits ${st.hits} (${acc}%) · rams ${st.rams} · pickups ${st.pick}`)
  $('result').classList.toggle('win', rank === 1)
  $('result').hidden = false; $('hud').hidden = true; phase = 'result'
  playSnd(rank <= 2 ? 'win' : 'lose', { vol: 0.9 }); Snd.duck(0.3, 3)
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
      case 'count': say(String(e.n), false, 900); playSnd('tick', { vol: 0.8 }); break
      case 'go': say('GO!', false, 900); playSnd('horn', { vol: 0.5, rate: 1.4 }); break
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
      case 'swap': say(L(S.teams[0].driver === 0 ? '運転になった' : '射手になった', S.teams[0].driver === 0 ? 'You drive now' : 'You shoot now'), true, 1200); if (S.teams[0].driver === 1) { const c = S.cars.find(q => q.id === S.teams[0].car); if (c) aimYaw = c.gunYaw } else { /* 運転になる */ } break
      case 'pickup': if (e.team === 0) say(L(ITEM_NAMES[e.type], ({ rocket: 'ROCKET', confetti: 'CONFETTI', mine: 'MINE', oil: 'OIL' })[e.type]), true, 900); break
      case 'repair': if (e.team === 0) say(L('修理', 'REPAIR'), true, 900); break
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
  const key = order.map(t => `${t.id}${t.stock}${t.kills}${t.out ? 1 : 0}`).join(',')
  if (key === boardCache) return; boardCache = key
  $('board').innerHTML = order.map(t => { let pips = ''; for (let i = 0; i < STOCK; i++) pips += `<u class="${i < t.stock ? '' : 'x'}"></u>`; return `<li class="${t.id === 0 ? 'me' : ''} ${t.out ? 'out' : ''}" style="--tc:${hex(TEAM_COLORS[t.id])}"><i></i><span class="st">${pips}</span><span class="k">${t.kills}</span></li>` }).join('')
}
const radar = $('radar').getContext('2d')
function drawRadar(cx, cz, yaw) {
  const g = radar, W = 184, R = 92, sc = R / 62
  g.clearRect(0, 0, W, W); g.save(); g.beginPath(); g.arc(R, R, R - 3, 0, 7); g.clip()
  g.translate(R, R); g.rotate(yaw + Math.PI) // 進行方向が上
  g.scale(sc, sc); g.translate(-cx, -cz)
  g.fillStyle = 'rgba(60,58,52,.9)'; g.fillRect(-HALF, -HALF, HALF * 2, HALF * 2)
  g.strokeStyle = 'rgba(232,184,28,.8)'; g.lineWidth = 1.2; g.strokeRect(-HALF + 1, -HALF + 1, HALF * 2 - 2, HALF * 2 - 2)
  g.fillStyle = 'rgba(30,28,24,.6)'; g.beginPath(); g.arc(BOWL.x, BOWL.z, BOWL.r, 0, 7); g.fill()
  g.fillStyle = 'rgba(120,115,105,.9)'; g.fillRect(DECK.x0, DECK.z0, DECK.x1 - DECK.x0, DECK.z1 - DECK.z0)
  g.fillStyle = 'rgba(190,185,172,.8)'
  for (const o of POLES) { g.beginPath(); g.arc(o.x, o.z, Math.max(1.4, o.r), 0, 7); g.fill() }
  for (const o of BOXES) g.fillRect(o.x - o.w / 2, o.z - o.d / 2, o.w, o.d)
  g.fillStyle = 'rgba(242,194,48,.9)'
  for (const p of RAMPS) { g.save(); g.translate(p.x, p.z); g.rotate(-p.ang); g.fillRect(-p.w / 2, 0, p.w, p.len); g.restore() }
  g.restore()
  g.save(); g.beginPath(); g.arc(R, R, R - 3, 0, 7); g.clip(); g.translate(R, R); g.rotate(yaw + Math.PI); g.scale(sc, sc); g.translate(-cx, -cz)
  for (const p of S.pickups) if (p.t <= 0) { g.fillStyle = '#fff'; g.save(); g.translate(p.x, p.z); g.rotate(.785); g.fillRect(-1.3, -1.3, 2.6, 2.6); g.restore() }
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
  let n = 0; const W = innerWidth, Hh = innerHeight
  const place = (x, y, z, col, name, hp, spare) => {
    const d = mark(n++); d.style.display = ''; d.classList.toggle('spare', !!spare)
    _v.set(x, y, z).project(stage.cam)
    let sx = (_v.x * 0.5 + 0.5) * W, sy = (-_v.y * 0.5 + 0.5) * Hh, edge = false
    if (_v.z > 1) { sx = W - sx; sy = Hh - sy; edge = true }
    const mx = 40, top = 84, bot = touchy ? 190 : 60
    if (sx < mx || sx > W - mx || sy < top || sy > Hh - bot || _v.z > 1) { edge = true; const cx = W / 2, cy = Hh / 2, dx = sx - cx, dy = sy - cy, k = Math.min((W / 2 - mx) / Math.max(1, Math.abs(dx)), (Hh / 2 - Math.max(top, 60)) / Math.max(1, Math.abs(dy))); sx = cx + dx * k; sy = cy + dy * k; sy = Math.min(sy, Hh - bot) }
    d.classList.toggle('edge', edge); d.style.setProperty('--tc', col); d.firstChild.textContent = name; d.lastChild.firstChild.style.width = hp + '%'
    d.style.transform = `translate(${sx - 30}px,${sy - 18}px)`
  }
  const myc = myTeam() && myTeam().car >= 0 ? S.cars.find(q => q.id === myTeam().car) : null
  const ref = myc || (myTeam() && myTeam().p[0])
  for (const c of S.cars) {
    if (c.team < 0 && c.alive && curRole() === 'walk' && ref) { const dd = Math.hypot(c.x - ref.x, c.z - ref.z); if (dd < 90) place(c.x, c.y + 3.6, c.z, '#f2c230', L('空き車', 'SPARE'), 100, true); continue }
    if (!c.alive || c.team < 0 || c.team === S.humanTeam) continue
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
  const sw = specialWeapon(t)
  if (c) {
    if (sw) { $('ammoT').textContent = '×' + sw.ammo; $('heatBar').style.width = '100%' }
    else { $('ammoT').textContent = c.reloadT > 0 ? '…' : c.mag; $('heatBar').style.width = (c.overT > 0 ? 100 : c.heat * 100) + '%' }
    document.querySelector('.g.gun').classList.toggle('hot', c.overT > 0 || c.heat > 0.7)
  }
  const it = t.item
  $('itemChip').hidden = !it; if (it) $('itemT').textContent = L(ITEM_NAMES[it.type], it.type.toUpperCase()) + ' ×' + it.ammo
  $('bItem').hidden = !(it && (it.type === 'mine' || it.type === 'oil'))
  $('cross').hidden = role !== 'shoot'; $('cross').classList.toggle('lock', lockedOn)
  $('bGear').classList.toggle('rev', K.rev)
  // ヒント
  let hint = ''
  if (S.phase === 'play') {
    if (role === 'walk') hint = touchy ? L('黄色い印の空き車まで走れ', 'Run to the spare car') : L('黄色い印の空き車まで走れ（近づくと乗れる）', 'Run to the marked spare car')
    else if (role === 'drive') hint = S.tMatch < 14 ? (touchy ? L('ペダルで進み、横腹にぶつけろ', 'Pedal to go, hit their sides') : L('W で進む・A D でハンドル・敵の横腹にぶつけろ', 'W to go · A D to steer · hit their sides')) : (c && c.hp < 40 ? L('壊れそう。白い箱の修理を探せ', 'Almost dead. Find a repair box') : '')
    else if (role === 'shoot') hint = S.tMatch < 14 ? (touchy ? L('なぞって向き、大ボタンで撃つ', 'Drag to aim, big button fires') : L(document.pointerLockElement ? 'マウスで向き・クリックで撃つ' : '画面をクリックしてマウス固定・クリックで撃つ', document.pointerLockElement ? 'Mouse to aim · click to fire' : 'Click to lock the mouse, click to fire')) : (c && c.overT > 0 ? L('熱い！冷めるまで待て', 'Overheated') : '')
  }
  $('hint').textContent = hint
  if (msgT && performance.now() > msgT) { $('msg').textContent = ''; $('msg').className = ''; msgT = 0 }
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
  else if (role === 'walk') cv = { mode: 'walk', yaw: aimYaw, person: t.p[0].state === 'ride' ? t.p[1] : t.p[0], snap: snapCam }
  else if (role === 'shoot') cv = { mode: 'gun', yaw: aimYaw, car: S.cars.find(q => q.id === t.car), snap: snapCam }
  else if (role === 'drive') cv = { mode: 'drive', car: S.cars.find(q => q.id === t.car), snap: snapCam }
  else cv = { mode: 'orbit' }
  if (cv.mode !== 'orbit' && !(cv.car || cv.person)) cv = { mode: 'orbit' }
  stage.updateCamera(S, cv, dt, alpha); snapCam = false
  if (window.__bbCam) { stage.cam.position.set(...window.__bbCam.p); stage.cam.lookAt(...window.__bbCam.l); stage.cam.fov = window.__bbCam.fov || 55; stage.cam.updateProjectionMatrix() }
  stage.sync(S, alpha, dt, { human: !!(t && t.driver === 0) })
  if (phase === 'play') {
    updateHUD(dt)
    const c = t && t.car >= 0 ? S.cars.find(q => q.id === t.car) : null
    const ref = c || (t && t.p[0])
    if (ref) drawRadar(ref.x, ref.z, c ? stage.camYaw : stage.camYaw)
    updateMarks()
    // エンジン音
    const eng = Snd.loops && Snd.loops.eng
    if (eng && eng.node && c) { const sp = Math.hypot(c.vx, c.vz); eng.node.playbackRate.value = 0.6 + sp / MAXF * 1.15 + (c.boosting ? 0.25 : 0); eng.g.gain.value = muted ? 0 : (S.phase === 'play' ? 0.14 + Math.min(0.22, sp / MAXF * 0.22) : 0.1) }
    else if (eng && eng.g) eng.g.gain.value = 0.0001
    if (phase === 'play' && S.over && !shownResult) { if (!resultAt) resultAt = S.t + 1.2; if (S.t >= resultAt) { const rk = S.ranking.indexOf(0) + 1; showResult(rk) } }
    if (t && t.out && !shownResult && resultAt && S.t >= resultAt) { showResult(S.teams.filter(q => !q.out).length + 1) }
  }
  if (phase !== 'play' && S.over && S.overT > 4) { S = createState(seedBase + (++matchNo) * 31, { humanTeam: -1, noCountdown: true }); stage.clearDynamic() }
  if (Q.get('norender') !== '1') stage.render()
  window.__bbFrames = (window.__bbFrames || 0) + 1
}

// ------------------------------------------------------------ 読み込み
async function boot() {
  $('loadbar').style.width = '35%'
  await Promise.race([Snd.prefetch(['snd/bgm.mp3', 'snd/amb1.mp3', 'snd/engine.mp3']), new Promise(r => setTimeout(r, 5000))])
  $('loadbar').style.width = '100%'
  await new Promise(r => setTimeout(r, 160))
  $('loading').classList.add('off'); setTimeout(() => $('loading').remove(), 600)
  $('title').hidden = false
  window.__bb = { advance: n => { for (let i = 0; i < n; i++) { step(S, makeInputs(S, DT, null), DT); onEvents() } }, setSpeed: v => { simSpeed = v }, S: () => S, stage, K, startMatch, toTitle, phase: () => phase, setAim: v => { aimYaw = v }, aim: () => aimYaw, role: curRole, lockedOn: () => lockedOn, hud: () => ({ marks: marks.length }) }
  window.__bbReady = true
  if (Q.get('start')) startMatch(Q.get('start'))
  requestAnimationFrame(t => { last = t; frame(t) })
}
window.__jsUp = true
boot().catch(e => { const el = $('err'); if (el) el.textContent = String(e && e.stack || e); throw e })

import re
m=open('js/main.js').read()
def sub(old,new,cnt=1):
    global m
    assert old in m, old[:70]
    m=m.replace(old,new,cnt)
a=m.index("function startMatch(role) {"); b=m.index("function toTitle() {")
m=m[:a]+r'''// ------------------------------------------------------------ 準備画面（10秒のあいだに車か銃を選ぶ）
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
let selWeapons = ['paint', 'rocket'], selCar = 0
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
  markPrep(); refreshPartner()
}
function markPrep() {
  const drive = S.teams[0].driver === 0
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
  Snd.init(); Snd.loop('bgm', 'snd/bgm.mp3', 0.26, 1.2); Snd.loop('amb', 'snd/amb1.mp3', 0.1, 1); Snd.loop('eng', 'snd/engine.mp3', 0.0001, 0.3)
  playSnd('switch', { vol: 0.7 })
  if (window.__bbOnStart) window.__bbOnStart()
}
function toPlay() {
  phase = 'play'; $('prep').hidden = true; $('hud').hidden = false; snapCam = true
  const c = S.cars.find(q => q.team === 0); if (c) aimYaw = S.teams[0].driver === 1 ? c.yaw : aimYaw
}
'''+m[b:]
# prep -> 'go' event
sub("      case 'count': say(String(e.n), false, 900); playSnd('tick', { vol: 0.8 }); break\n      case 'go': say('GO!', false, 900); playSnd('horn', { vol: 0.5, rate: 1.4 }); break","      case 'count': if (phase === 'prep') { const pc = $('pcount'); pc.firstElementChild.textContent = e.n; pc.classList.toggle('low', e.n <= 3); playSnd('tick', { vol: e.n <= 3 ? 0.9 : 0.35, rate: e.n <= 3 ? 1.4 : 1 }) } break\n      case 'go': if (phase === 'prep') toPlay(); say('GO!', false, 900); playSnd('horn', { vol: 0.5, rate: 1.4 }); break")
sub("      case 'pickup': if (e.team === 0) say(L(ITEM_NAMES[e.type], ({ rocket: 'ROCKET', confetti: 'CONFETTI', mine: 'MINE', oil: 'OIL' })[e.type]), true, 900); break","      case 'pickup': if (e.team === 0) say(L(ITEM_NAMES[e.type], e.type.toUpperCase()), true, 900, ITEMS[e.type] && ITEMS[e.type].role === 'D' ? L('運転のアイテム', 'Driver item') : L('射手のアイテム', 'Shooter item')); break")
sub("      case 'swap': say(L(S.teams[0].driver === 0 ? '運転になった' : '射手になった', S.teams[0].driver === 0 ? 'You drive now' : 'You shoot now'), true, 1200); if (S.teams[0].driver === 1) { const c = S.cars.find(q => q.id === S.teams[0].car); if (c) aimYaw = c.gunYaw } else { /* 運転になる */ } break","      case 'swap': say(L(S.teams[0].driver === 0 ? '運転になった' : '射手になった', S.teams[0].driver === 0 ? 'You drive now' : 'You shoot now'), true, 1200); if (S.teams[0].driver === 1) { const c = S.cars.find(q => q.id === S.teams[0].car); if (c) aimYaw = c.gunYaw } break")
open('js/main.js','w').write(m)

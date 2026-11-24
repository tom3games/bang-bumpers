import re
def edit(path, pairs):
    s=open(path).read()
    for a,b in pairs:
        assert a in s, (path, a[:70]); s=s.replace(a,b,1)
    open(path,'w').write(s)
# ---------------- main.js
edit('js/main.js',[
("const touchy = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || Q.get('touch') === '1'","const touchy = (('ontouchstart' in window) && matchMedia('(pointer:coarse)').matches) || Q.get('touch') === '1'"),
("    const gas = k.gas || K.gas, brake = k.brake","    const gas = k.gas || K.gas || K.boost || k.boost, brake = k.brake"),
("roll: ['snd/roll1.mp3'","spear: ['snd/spear.mp3'], roll: ['snd/roll1.mp3'"),
("'snd/bgm_suno.mp3'","'snd/music.mp3'"),
("addEventListener('keydown', e => {\n  if (e.repeat) return","addEventListener('keydown', e => {\n  if (e.repeat) return\n  if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return"),
("  phase = 'play'; $('prep').hidden = true; $('hud').hidden = false; snapCam = true; bgm(0.17, 2.5)","  phase = 'play'; $('prep').hidden = true; $('hud').hidden = false; snapCam = true; bgm(0.17, 2.5); K.use = false; K.swap = false; K.wswap = false; K.wsel = null"),
("壊れそう。白い箱の修理を探せ","壊れそう。緑の箱で直せる"),
("(c && c.overT > 0 ? L('熱い！冷めるまで待て', 'Overheated') : '')","(t.ws && t.ws[t.wSel] && t.ws[t.wSel].overT > 0 ? L('熱い！冷めるまで待て', 'Overheated') : '')"),
("L('W で進む・A D でハンドル・敵の横腹にぶつけろ', 'W to go · A D to steer · hit their sides')","L('W 進む・A D ハンドル・Space ドリフト', 'W go · A D steer · Space drift')"),
# board name length
("[...tname(t.id)].slice(0, 4).join('')","[...tname(t.id)].slice(0, 6).join('')"),
])
m=open('js/main.js').read()
# radar pickup colors
m=m.replace("for (const p of S.pickups) if (p.t <= 0) { g.fillStyle = '#fff'; g.save();","for (const p of S.pickups) if (p.t <= 0) { g.fillStyle = p.type === 'repair' ? '#43d17a' : ITEMS[p.type] && ITEMS[p.type].role === 'G' ? '#37c3ea' : '#f5a23a'; g.save();")
# result: name, snapshot, buttons
m=m.replace("<span>${tname(id)}${id === 0 ? L('（あなた）', ' (you)') : ''}</span>","<span>${tname(id)}${id === 0 && tname(0) !== L('あなた', 'You') ? L('（あなた）', ' (you)') : ''}</span>")
m=m.replace("  const rk = $('rkN').textContent, t = S.teams[0]\n","  const rk = $('rkN').textContent, t = { kills: lastKills }\n")
m=m.replace("  $('rkN').textContent = rank;","  lastKills = t.kills; $('rkN').textContent = rank;")
m=m.replace("let selWeapons = ['paint', 'rocket'], selCar = 0","let selWeapons = ['paint', 'rocket'], selCar = 0, lastKills = 0")
m=m.replace("$('btnAgain').addEventListener('click', () => { startMatch(lastPickRole) })","$('btnAgain').addEventListener('click', () => { startMatch(lastPickRole) })\n$('btnSeat').addEventListener('click', () => { lastPickRole = lastPickRole === 'drive' ? 'shoot' : 'drive'; startMatch(lastPickRole) })\n$('btnTitle').addEventListener('click', () => toTitle())")
# name input handler uses title input (same id)
# markers: arrow angle + stagger + smoke
a=m.index("function updateMarks() {"); b=m.index("function updateHUD(dt) {")
new='''function updateMarks() {
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
'''
m=m[:a]+new+m[b:]
open('js/main.js','w').write(m)
# ---------------- index.html
h=open('index.html').read()
h=h.replace('<link rel="icon" href="data:,">','<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 fill=%27%23171614%27/%3E%3Cpath d=%27M3 22l6-10h14l6 10z%27 fill=%27%23f2c230%27/%3E%3Ccircle cx=%2710%27 cy=%2724%27 r=%273.5%27 fill=%27%23e6e1d4%27/%3E%3Ccircle cx=%2722%27 cy=%2724%27 r=%273.5%27 fill=%27%23e6e1d4%27/%3E%3C/svg%3E">')
h=h.replace('data-en="Sounds: CC0 recordings (see CREDITS)">音: CC0の録音素材（CREDITSに記載）','data-en="Sounds: CC0 recordings · music by the author (see CREDITS)">音: CC0の録音素材・音楽は作者の制作（CREDITSに記載）')
h=h.replace('<dt>X · Tab · 1 2</dt>','<dt>Space</dt><dd data-en="Handbrake drift (driver)">サイドブレーキでドリフト（運転）</dd>\n      <dt>X · Tab · 1 2</dt>')
h=h.replace('<button id="btnAgain">もう一回</button>','<button id="btnAgain">もう一回</button><button id="btnSeat" class="ghost">席を替えて</button><button id="btnTitle" class="ghost">タイトルへ</button>')
# labels
h=h.replace('<path d="M8 18h28l-7-7M40 30H12l7 7"/></svg></button>','<path d="M8 18h28l-7-7M40 30H12l7 7"/></svg><span>席替え</span></button>')
h=h.replace('<svg viewBox="0 0 48 48"><path d="M10 18h22l-5-5M38 30H16l5 5"/></svg><span>持ち替え</span>','<svg viewBox="0 0 48 48"><rect x="8" y="20" width="26" height="9" rx="2"/><path d="M34 24h8M18 12l6-6 6 6M18 38l6 6 6-6"/></svg><span>持ち替え</span>')
h=h.replace('<path d="M27 4L10 27h11l-3 17 20-25H26z"/></svg></button>','<path d="M27 4L10 27h11l-3 17 20-25H26z"/></svg><span>ブースト</span></button>')
h=h.replace('<rect x="9" y="17" width="30" height="24" rx="3"/><path d="M9 25h30M24 17v24M24 17c-4-9-12-6-9 0M24 17c4-9 12-6 9 0"/></svg></button>','<rect x="9" y="17" width="30" height="24" rx="3"/><path d="M9 25h30M24 17v24M24 17c-4-9-12-6-9 0M24 17c4-9 12-6 9 0"/></svg><span>アイテム</span></button>')
# move name input to title: add to .pick, remove from prep
h=h.replace('    <label class="pname"><span data-en="NAME">なまえ</span><input id="pName" maxlength="8" autocomplete="off" spellcheck="false" placeholder="あなた"></label>\n','')
h=h.replace('  <div class="pick">','  <div class="pick">\n    <label class="pname"><span data-en="NAME">なまえ</span><input id="pName" maxlength="8" autocomplete="off" spellcheck="false" placeholder="あなた" data-en-ph="You"></label>')
open('index.html','w').write(h)
# ---------------- css
c=open('style.css').read()
c+='''
.mk.edge .nm::after{transform:rotate(var(--ang,0rad));transform-origin:50% 50%}
.rb span{font-size:9.5px}
.pick .pname{flex-direction:row;align-items:center;gap:8px;margin-bottom:8px}.pick .pname input{width:150px}
.pfoot{grid-template-columns:1fr}
.acts .ghost{font-size:13px;padding:8px 12px}
#board li em{max-width:58px;font-size:9.5px}
#hint{}
body.touch #hint{left:126px;right:100px;font-size:11.5px}
'''
open('style.css','w').write(c)

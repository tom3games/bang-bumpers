st=open('js/stage.js').read()
st=st.replace("repair: ['#f08a1e', 'plus']","repair: ['#2f9e57', 'plus']")
st=st.replace("mine: 0xf08a1e, repair: 0xf08a1e, grenade","mine: 0xf08a1e, repair: 0x2f9e57, grenade")
open('js/stage.js','w').write(st)
m=open('js/main.js').read()
def sub(a,b):
    global m
    assert a in m, a[:60]
    m=m.replace(a,b,1)
sub("ITEMS[e.type] && ITEMS[e.type].role === 'D' ? L('運転のアイテム', 'Driver item') : L('射手のアイテム', 'Shooter item'))","ITEMS[e.type] && ITEMS[e.type].role === 'D' ? L('運転のアイテム', 'Driver item') : ITEMS[e.type] && ITEMS[e.type].role === 'G' ? L('射手のアイテム', 'Shooter item') : '')")
# board with names
sub("return `<li class=\"${t.id === 0 ? 'me' : ''} ${t.out ? 'out' : ''}\" style=\"--tc:${hex(TEAM_COLORS[t.id])}\"><i></i><span class=\"st\">${pips}</span><span class=\"k\">${t.kills}</span></li>`","return `<li class=\"${t.id === 0 ? 'me' : ''} ${t.out ? 'out' : ''}\" style=\"--tc:${hex(TEAM_COLORS[t.id])}\"><i></i><em>${[...tname(t.id)].slice(0, 4).join('')}</em><span class=\"st\">${pips}</span><span class=\"k\">${t.kills}</span></li>`")
sub("const key = order.map(t => `${t.id}${t.stock}${t.kills}${t.out ? 1 : 0}`).join(',')","const key = order.map(t => `${t.id}${t.stock}${t.kills}${t.out ? 1 : 0}${tname(t.id)}`).join(',')")
# prep: combination hint + honest note
sub("  markPrep(); refreshPartner()\n}","  markPrep(); refreshPartner(); comboHint()\n}")
sub("function markPrep() {","""function comboHint() {
  const el = $('pcombo'); if (!el) return
  if (S.teams[0].driver === 0) { const c = CAR_TYPES[selCar]; el.textContent = L(['', '足は速いが、当たり負けしやすい', '遅いが、体当たりで押し勝てる', '小回りで、すり抜けて戦える'][selCar] || L('どこにでも合う標準の車', ''), ''); if (!selCar) el.textContent = L('クセのない標準の車', 'A standard car'); void c; return }
  const [a, b] = selWeapons.map(id => WEAPONS[id].stat[2]), w = selWeapons
  el.textContent = L(Math.abs(a - b) >= 2 ? `${a > b ? '' : ''}近くと遠くをカバーできる組み合わせ` : (a + b >= 8 ? '遠くの敵を狙う組み合わせ' : a + b <= 4 ? '近づいてきた敵に強い組み合わせ' : '中くらいの距離で戦う組み合わせ'), 'Combo')
  void w
}
function markPrep() {""")
sub("  document.querySelectorAll('#pcards .card').forEach(el => {","  comboHint()\n  document.querySelectorAll('#pcards .card').forEach(el => {")
sub("EN ? 'Pick nothing and it is random.'","EN ? 'Pick nothing and it is random.'") if False else None
open('js/main.js','w').write(m)
h=open('index.html').read()
h=h.replace('<p class="pnote" data-en="Pick nothing and it is random.">えらばないと、ランダムで決まる</p>','<p class="pnote" data-en="It starts random. Tap to change.">はじめはランダム。タップで変えられる</p>')
h=h.replace('<h2 id="pHead">車をえらぶ</h2></div>','<h2 id="pHead">車をえらぶ</h2><p id="pcombo"></p></div>')
open('index.html','w').write(h)
c=open('style.css').read()
c+='''#pcombo{margin-top:4px;font-size:12px;font-weight:700;color:#e9e4d4;letter-spacing:.02em}
#board li{grid-template-columns:6px auto 1fr auto}
#board li em{font-style:normal;font:700 10px var(--jp);color:#d8d3c4;white-space:nowrap;max-width:44px;overflow:hidden}
#board li .st{justify-self:end}
'''
open('style.css','w').write(c)
v=open('tools/feel.mjs').read()
v=v.replace("() => ({ throttle: 1, steer: 0 }), 5)","() => ({ throttle: 1, steer: 0 }), 5.8)")
open('tools/feel.mjs','w').write(v)

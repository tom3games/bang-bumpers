m=open('js/main.js').read()
def sub(old,new,cnt=1):
    global m
    assert old in m, old[:70]
    m=m.replace(old,new,cnt)
a=m.index("  const sw = specialWeapon(t)"); b=m.index("  // ヒント\n  let hint = ''")
m=m[:a]+r'''  // 銃の枠（射手）: 2つ・今使っている方を明るく・弾と熱とリロード
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
'''+m[b:]
open('js/main.js','w').write(m)

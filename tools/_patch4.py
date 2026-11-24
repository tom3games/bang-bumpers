import re
m=open('js/main.js').read()
def sub(old,new,cnt=1):
    global m
    assert old in m, old[:60]
    m=m.replace(old,new,cnt)
# imports
sub("import { createState, step, DT, TEAM_NAMES, TEAM_COLORS, WEAPONS, MATCH_SEC, ITEM_NAMES, assistAim, angDiff, specialWeapon, STOCK, MAXF } from './sim.js'","import { createState, step, DT, TEAM_NAMES, TEAM_COLORS, WEAPONS, WEAPON_IDS, CAR_TYPES, ITEMS, MATCH_SEC, ITEM_NAMES, assistAim, angDiff, setLoadout, STOCK, MAXF } from './sim.js'\nimport { cleanName, cpuNames, NAME_MAX } from './names.js'")
sub("const tname = i => EN ? TEAM_EN[i] : TEAM_NAMES[i]","let TN = ['あなた', ...TEAM_NAMES.slice(1)]\nconst tname = i => EN && i > 0 ? TEAM_EN[i] : TN[i] || TEAM_NAMES[i]")
# K
sub("const K = { keys: {}, gas: false, rev: false, L: false,","const K = { keys: {}, gas: false, back: false, L: false,")
sub("boost: false, fire: false, reload: false, use: false, swap: false,","boost: false, fire: false, reload: false, use: false, swap: false, wswap: false,")
sub("ShiftRight: 'boost', Space: 'fire' }","ShiftRight: 'boost', Space: 'fire' }\nconst WSEL_KEYS = { Digit1: 0, Digit2: 1 }")
sub("  if (e.code === 'KeyE') K.use = true","  if (e.code === 'KeyE') K.use = true\n  if (e.code === 'KeyX' || e.code === 'Tab') { K.wswap = true; e.preventDefault() }\n  if (e.code in WSEL_KEYS) K.wsel = WSEL_KEYS[e.code]")
sub("holdBtn('bGas', 'gas'); holdBtn('bGear', 'rev', true);","holdBtn('bGas', 'gas'); holdBtn('bBack', 'back');")
sub("pressBtn('bItem', 'use'); pressBtn('bSwap', 'swap')","pressBtn('bItem', 'use'); pressBtn('bSwap', 'swap'); pressBtn('bWswap', 'wswap')")
# readHuman driving
sub("    out.drive.throttle = gas ? (K.rev && touchy && !k.gas ? -1 : 1) : brake ? -1 : 0","    out.drive.throttle = gas ? 1 : (brake || K.back) ? -1 : 0")
sub("  out.use = K.use; out.swap = K.swap; K.use = false; K.swap = false\n  return out","  out.use = K.use; out.swap = K.swap; out.wswap = K.wswap; out.gun.wswap = K.wswap; if (K.wsel != null) out.gun.wsel = K.wsel; K.use = false; K.swap = false; K.wswap = false; K.wsel = null\n  return out")
open('js/main.js','w').write(m)

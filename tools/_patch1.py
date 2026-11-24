import re
s=open('js/sim.js').read()
def rep_fn(name, new, kind='function'):
    global s
    m=re.search(r'(export )?function '+name+r'\(', s)
    assert m, name
    a=m.start()
    # next top-level function/const/export after a
    n=re.search(r'\n(?=(export )?(function |const |let |// -{10}))', s[a+10:])
    b=a+10+n.start()+1
    s=s[:a]+new.rstrip('\n')+'\n'+s[b:]
# ---- header constants
a=s.index("export const MAXF = 21")
b=s.index("function mulberry")
s=s[:a]+'''export const MAXF = 21, MAXR = 8, BOOST_MAXF = 31
// 銃（射手が2つ選んで持ち替える）
export const WEAPONS = {
  paint: { name: 'ペイント弾', kind: 'gun', speed: 58, dmg: 2.6, life: 1.3, cd: 0.105, mag: 36, reload: 1.7, stat: [3, 5, 3] },
  rocket: { name: '花火ロケット', kind: 'rocket', speed: 30, dmg: 34, r: 7.5, life: 2.6, cd: 0.7, mag: 3, reload: 3.6, stat: [5, 1, 4] },
  confetti: { name: '紙吹雪', kind: 'confetti', speed: 44, dmg: 3.1, life: 0.5, n: 9, spread: 0.17, cd: 0.6, mag: 5, reload: 2.4, stat: [4, 2, 1] },
  spring: { name: 'バネの鉄球', kind: 'spring', speed: 34, dmg: 9, life: 2.8, cd: 0.5, mag: 6, reload: 2.4, bounces: 3, stat: [3, 2, 3] },
  cork: { name: 'コルク砲', kind: 'cork', speed: 95, dmg: 12, life: 1.1, cd: 0.75, mag: 5, reload: 2.6, stat: [4, 2, 5] },
}
export const WEAPON_IDS = ['paint', 'rocket', 'confetti', 'spring', 'cork']
// 車（運転が1つ選ぶ）。dur は壊れにくさ（ダメージを割る）。mass は体当たりの重さ
export const CAR_TYPES = [
  { id: 'std', name: 'バランス', note: 'どれも平均点。迷ったらこれ', maxF: 21, acc: 15, dur: 1.0, mass: 1.0, steer: 1.0, grip: 7.5, boostK: 1.0, scale: 1.0, stat: [3, 3, 3, 3] },
  { id: 'fast', name: 'ビュン', note: '速くて軽い。壊れやすい', maxF: 25.5, acc: 19, dur: 0.7, mass: 0.8, steer: 0.9, grip: 6.5, boostK: 1.0, scale: 0.95, stat: [5, 1, 3, 1] },
  { id: 'heavy', name: 'ドスン', note: '遅いけど硬くて体当たりが強い', maxF: 17.5, acc: 11, dur: 1.55, mass: 1.8, steer: 0.8, grip: 8.5, boostK: 0.8, scale: 1.18, stat: [1, 5, 2, 5] },
  { id: 'agile', name: 'ヒラリ', note: '小回りが利く。ブースト長め', maxF: 21, acc: 15, dur: 0.9, mass: 0.9, steer: 1.5, grip: 10, boostK: 1.5, scale: 0.97, stat: [3, 2, 5, 2] },
]
// アイテム。role D=運転だけが使う・G=射手だけが使う
export const ITEMS = {
  turbo: { role: 'D', name: 'ターボ', ammo: 1 }, spear: { role: 'D', name: '槍', ammo: 1 }, oil: { role: 'D', name: 'オイル', ammo: 2 }, mine: { role: 'D', name: '地雷', ammo: 2 }, repair: { role: 'D', name: '修理', instant: true },
  grenade: { role: 'G', name: '手榴弾', ammo: 3 }, smoke: { role: 'G', name: '煙幕', ammo: 2 }, ricochet: { role: 'G', name: '跳弾', ammo: 1 }, turret: { role: 'G', name: 'タレット', ammo: 1 },
}
export const ITEM_NAMES = Object.fromEntries(Object.entries(ITEMS).map(([k, v]) => [k, v.name]))
export const ITEM_AMMO = Object.fromEntries(Object.entries(ITEMS).map(([k, v]) => [k, v.ammo || 1]))

'''+s[b:]
s=s.replace("export const COUNTDOWN = 3.2","export const COUNTDOWN = 10")
# ---- newCar
rep_fn('newCar','''function newCar(S, x, z, yaw, team, type = 0) {
  const c = {
    id: UID++, team, type, x, z, y: H(x, z), yaw, vx: 0, vz: 0, vy: 0, steer: 0, pitch: 0, roll: 0, air: false,
    hp: 100, alive: true, wreckT: 0, boost: 1, boostLock: false, gunYaw: yaw, turboT: 0, spearT: 0,
    lastHit: null, oilT: 0, invT: 0, spin: 0, speedKmh: 0, dmgFlash: 0, spot: -1, wreckV: [0, 0],
  }
  c.px = c.x; c.py = c.y; c.pz = c.z; c.pyaw = c.yaw; c.pgun = c.gunYaw; c.ppitch = 0; c.proll = 0
  S.cars.push(c); return c
}''')
open('js/sim.js','w').write(s)

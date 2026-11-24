s=open('js/sim.js').read()
def sub(a,b):
    global s
    assert a in s, a[:60]; s=s.replace(a,b,1)
sub("import { H, WORLD, TEAM_SPAWNS, SPARE_SPOTS, PICKUP_SPOTS, pushOutCircle, solidAtPoint, lineClear, clamp } from './arena.js'","import { H, WORLD, TEAM_SPAWNS, SPARE_SPOTS, PICKUP_SPOTS, pushOutCircle, solidAtPoint, lineClear, clamp, freeSpot } from './arena.js'")
sub("  if (!live) return\n  c.gunYaw = inp.aim ?? c.gunYaw","  if (!live) return\n  if (inp.unstick) { const p = freeSpot(c.x + Math.sin(c.yaw) * 6, c.z + Math.cos(c.yaw) * 6, 3.4); if (Math.hypot(p.x - c.x, p.z - c.z) < 30) { c.x = p.x; c.z = p.z; c.y = H(p.x, p.z); c.vx = c.vz = 0; c.invT = Math.max(c.invT, 0.6); ev(S, { k: 'unstick', x: c.x, y: c.y, z: c.z }) } }\n  c.gunYaw = inp.aim ?? c.gunYaw")
sub("  dmg *= (HOW_K[how] ?? 0.6) / (CAR_TYPES[c.type] || CAR_TYPES[0]).dur\n","  dmg *= (HOW_K[how] ?? 0.6) / (CAR_TYPES[c.type] || CAR_TYPES[0]).dur * (1 + clamp((S.tMatch - 120) / 240, 0, 0.6))\n")
open('js/sim.js','w').write(s)
c=open('js/cpu.js').read()
def csub(a,b):
    global c
    assert a in c, a[:60]; c=c.replace(a,b,1)
csub("if (m.stuckN >= 2) {","if (m.stuckN >= 3) m.unstick = true\n      if (m.stuckN >= 2) {")
csub("  return { throttle: thr, steer, boost: boost && Math.abs(diff) < 0.35 && c.boost > 0.5 && cur > 12, useD }","  const unstick = !!m.unstick; m.unstick = false\n  return { throttle: thr, steer, boost: boost && Math.abs(diff) < 0.35 && c.boost > 0.5 && cur > 12, useD, unstick }")
csub("  if (m.revT > 0) { m.revT -= dt; return { throttle: -1, steer: m.side * 0.9, boost: false } }","  if (m.revT > 0) { m.revT -= dt; const un = !!m.unstick; m.unstick = false; return { throttle: -1, steer: m.side * 0.9, boost: false, unstick: un } }")
csub("hb: !!dr.hb, aim: gn.aim,","hb: !!dr.hb, unstick: !!dr.unstick, aim: gn.aim,")
open('js/cpu.js','w').write(c)
e=open('js/engine.js').read()
e=e.replace("    const near = S.cars.filter(c => c !== me && c.alive && c.team >= 0).map(c => [c, me ? Math.hypot(c.x - me.x, c.z - me.z) : 999]).filter(a => a[1] < 70).sort((a, b) => a[1] - b[1]).slice(0, this.max - 1)\n    for (const a of near) want.push(a)","    const all = S.cars.filter(c => c !== me && c.alive && c.team >= 0).map(c => [c, me ? Math.hypot(c.x - me.x, c.z - me.z) : 999]).filter(a => a[1] < 75).sort((a, b) => a[1] - b[1])\n    // 入れ替わりで音が作り直されないよう、鳴らしている車は少し順位が落ちても残す\n    const near = all.slice(0, this.max - 1); const keep = all.slice(0, this.max + 1).filter(a => this.voices.has(a[0].id) && !near.includes(a))\n    for (const a of near) want.push(a)\n    for (const a of keep) if (want.length < this.max) want.push(a)")
open('js/engine.js','w').write(e)
f=open('js/sfx.js').read()
f=f.replace("this.master.connect(this.lp); this.lp.connect(this.an)","const cmp = c.createDynamicsCompressor(); cmp.threshold.value = -14; cmp.knee.value = 8; cmp.ratio.value = 6; cmp.attack.value = 0.004; cmp.release.value = 0.22; this.master.connect(cmp); cmp.connect(this.lp); this.lp.connect(this.an)") if "this.master.connect(this.lp); this.lp.connect(this.an)" in f else f
open('js/sfx.js','w').write(f)
m=open('js/main.js').read()
m=m.replace("  const [a, b] = selWeapons.map(id => WEAPONS[id].stat[2]), w = selWeapons\n  el.textContent = L(Math.abs(a - b) >= 2 ? `${a > b ? '' : ''}近くと遠くをカバーできる組み合わせ` : (a + b >= 8 ? '遠くの敵を狙う組み合わせ' : a + b <= 4 ? '近づいてきた敵に強い組み合わせ' : '中くらいの距離で戦う組み合わせ'), 'Combo')\n  void w","  const ws = selWeapons.map(id => WEAPONS[id].stat), ra = ws[0][2], rb = ws[1][2], pw = ws[0][0] + ws[1][0], rt = ws[0][1] + ws[1][1]\n  const txt = Math.abs(ra - rb) >= 2 ? '近くと遠くをカバーできる' : ra + rb >= 8 ? '遠くから削る組み合わせ' : ra + rb <= 4 ? '近づいた敵に強い組み合わせ' : rt >= 7 ? '連射でじわじわ削る' : pw >= 8 ? '一発の重さで勝負する' : '中くらいの距離で戦う'\n  el.textContent = L(txt, 'Loadout')")
m=m.replace("if (rank === 2 && lead >= 0 && sc(0) < sc(lead) - 1)","if (rank === 2 && lead >= 0 && (sc(0) < sc(lead) - 1 || S.teams[0].kills === 0))")
open('js/main.js','w').write(m)
c=open('style.css').read()
c+="body.touch #wslots{bottom:calc(var(--sb) + var(--inapp) + 160px)}\n@media (max-width:600px){#pcards.guns .card:last-child:nth-child(odd){grid-column:1/-1}}\n"
open('style.css','w').write(c)

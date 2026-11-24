s=open('js/sim.js').read()
def sub(a,b):
    global s
    assert a in s, a[:70]; s=s.replace(a,b,1)
# weapons balance
sub("paint: { name: 'ペイント弾', kind: 'gun', speed: 58, dmg: 2.6,","paint: { name: 'ペイント弾', kind: 'gun', speed: 58, dmg: 3.6,")
sub("spring: { name: 'バネの鉄球', kind: 'spring', speed: 34, dmg: 13,","spring: { name: 'バネの鉄球', kind: 'spring', speed: 34, dmg: 21,")
sub("const HOW_K = { bullet: 0.46, ram: 0.56, rocket: 0.9, mine: 0.9 }","const HOW_K = { bullet: 0.46, ram: 0.56, rocket: 0.52, mine: 0.9 }")
sub("if (c.alive && !c.air) { c.vy = 5 + 7 * k; c.air = true; c.airT = 0 }","if (c.alive && !c.air) { c.vy = 3 + 4 * k; c.air = true; c.airT = 0 }")
# cornering: redirect lateral speed into forward, smooth hard factor, boost-end decel, handbrake loss
sub("    const hard = Math.abs(c.steer) > 0.62 && Math.abs(sp) > 0.55 * vmax && thrIn > 0.3  // 速い時の大きな舵は後ろが流れる","    const hard = clamp((Math.abs(c.steer) - 0.5) / 0.25, 0, 1) * clamp((Math.abs(sp) / vmax - 0.45) / 0.2, 0, 1) * (thrIn > 0.3 ? 1 : 0)  // 速い時の大きな舵は後ろが流れる（なめらかに効く）")
sub("* under * (hard ? 1.16 : 1) * (1 + 0.55 * c.hb)","* under * (1 + 0.16 * hard) * (1 + 0.55 * c.hb)")
sub("grip *= (1 - 0.42 * clamp(Math.abs(c.steer) * Math.abs(sp) / 20, 0, 1) * (hard ? 1.35 : 1)) * (1 - 0.86 * c.hb)\n    if (c.hb > 0.3) sp -= Math.sign(sp) * 2.2 * c.hb * dt","grip *= (1 - 0.42 * clamp(Math.abs(c.steer) * Math.abs(sp) / 20, 0, 1) * (1 + 0.35 * hard)) * (1 - 0.86 * c.hb)\n    if (c.hb > 0.3) sp -= Math.sign(sp) * 0.9 * c.hb * dt")
sub("    lat *= Math.exp(-grip * dt)\n","    { const lat0 = lat; lat *= Math.exp(-grip * dt); if (sp > 2) sp += (Math.abs(lat0) - Math.abs(lat)) * 0.55 }   // 消した横の速さの一部は前へ戻る（曲がっても失速しすぎない）\n")
sub("      sp = Math.min(sp + ax * dt, Math.max(sp, vmax))","      if (sp > vmax && ax < -5) ax = -5   // ブーストが切れた後は、ゆるやかに通常の最高速へ\n      sp = Math.min(sp + ax * dt, Math.max(sp, vmax))")
sub("(inp ? T.roll : 6) + 0.0028 * sp * sp","(inp ? T.roll * 1.45 : 6) + 0.0036 * sp * sp")
open('js/sim.js','w').write(s)

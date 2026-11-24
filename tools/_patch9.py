s=open('js/sim.js').read()
def sub(a,b,c=1):
    global s
    assert a in s, a[:60]
    s=s.replace(a,b,c)
# weapons
sub("rocket: { name: '花火ロケット', kind: 'rocket', speed: 30, dmg: 34, r: 7.5, life: 2.6, cd: 0.7, mag: 3, reload: 3.6, stat: [5, 1, 4] }","rocket: { name: '花火ロケット', kind: 'rocket', speed: 30, dmg: 27, r: 7.5, life: 2.6, cd: 0.95, mag: 3, reload: 4.2, stat: [4, 1, 4] }")
sub("confetti: { name: '紙吹雪', kind: 'confetti', speed: 44, dmg: 3.1,","confetti: { name: '紙吹雪', kind: 'confetti', speed: 44, dmg: 2.3,")
sub("spring: { name: 'バネの鉄球', kind: 'spring', speed: 34, dmg: 9, life: 2.8, cd: 0.5, mag: 6, reload: 2.4, bounces: 3, stat: [3, 2, 3] }","spring: { name: 'バネの鉄球', kind: 'spring', speed: 34, dmg: 13, life: 2.8, cd: 0.5, mag: 6, reload: 2.4, bounces: 3, stat: [4, 2, 3] }")
sub("cork: { name: 'コルク砲', kind: 'cork', speed: 95, dmg: 12, life: 1.1, cd: 0.75, mag: 5, reload: 2.6, stat: [4, 2, 5] }","cork: { name: 'コルク砲', kind: 'cork', speed: 95, dmg: 20, life: 1.1, cd: 0.8, mag: 5, reload: 2.6, stat: [5, 2, 5] }")
sub("c.vx += b.vx / m * (b.type === 'cork' || b.type === 'spring' ? 0.9 : 0.12); c.vz += b.vz / m * (b.type === 'cork' || b.type === 'spring' ? 0.9 : 0.12)","c.vx += b.vx / m * (b.type === 'cork' ? 1.6 : b.type === 'spring' ? 3.4 : 0.12); c.vz += b.vz / m * (b.type === 'cork' ? 1.6 : b.type === 'spring' ? 3.4 : 0.12)")
# ricochet for all
sub("S.bullets.push({ ...base, type: 'rocket', vx: dirx * 12 * cp, vz: dirz * 12 * cp, vy: 12 * sp_, speed: 12, yaw, life: W.life })","S.bullets.push({ ...base, type: 'rocket', vx: dirx * 12 * cp, vz: dirz * 12 * cp, vy: 12 * sp_, speed: 12, yaw, life: W.life, bounces: ric ? 1 : 0 })")
sub("vy: Math.sin(pp) * v, life: W.life, hue: i })","vy: Math.sin(pp) * v, life: W.life, hue: i, bounces: ric ? 1 : 0 })")
sub("life: W.life, bounces: W.bounces })","life: W.life, bounces: W.bounces + ric })")
sub("(b.bounces || 0) > 0 && b.type !== 'rocket' && b.type !== 'confetti') {","(b.bounces || 0) > 0) {")
sub("      if (hitK === 'ground') { b.vy = Math.abs(b.vy) * (b.type === 'spring' ? 0.9 : 0.8) + (b.type === 'spring' ? 3 : 0) }","      if (hitK === 'ground') { b.vy = Math.abs(b.vy) * (b.type === 'spring' ? 0.9 : 0.8) + (b.type === 'spring' ? 3 : 0); if (b.type === 'rocket') b.yaw += 0 }")
# rocket bounce: velocity is rebuilt from yaw each tick -> flip yaw on wall bounce
sub("        if (Math.abs(b.px + b.vx * dt) > WORLD || solidAtPoint(b.px + b.vx * dt, b.py, b.pz)) b.vx = -b.vx; else b.vz = -b.vz","        if (Math.abs(b.px + b.vx * dt) > WORLD || solidAtPoint(b.px + b.vx * dt, b.py, b.pz)) b.vx = -b.vx; else b.vz = -b.vz\n        if (b.type === 'rocket') b.yaw = Math.atan2(b.vx, b.vz)")
# turret placement only if placed
sub("  else if (it.type === 'turret') { const px = c.x + dx * 4, pz = c.z + dz * 4; if (!solidAtPoint(px, c.y + 1, pz)) S.turrets.push({ team: t.id, x: px, z: pz, y: H(px, pz), yaw: c.gunYaw, hp: 40, life: 18, cd: 0.5, id: UID++ }); ev(S, { k: 'turret', team: t.id, x: px, y: H(px, pz), z: pz }) }","  else if (it.type === 'turret') { const px = c.x + dx * 4, pz = c.z + dz * 4; if (solidAtPoint(px, c.y + 1, pz) || solidAtPoint(px, c.y + 0.3, pz) || Math.abs(px) > WORLD - 3 || Math.abs(pz) > WORLD - 3) { ev(S, { k: 'noTurret', team: t.id, x: c.x, y: c.y, z: c.z }); return }\n    S.turrets.push({ team: t.id, x: px, z: pz, y: H(px, pz), yaw: c.gunYaw, hp: 40, life: 18, cd: 0.5, id: UID++ }); ev(S, { k: 'turret', team: t.id, x: px, y: H(px, pz), z: pz }) }")
# repair shared
sub("repair: { role: 'D', name: '修理', instant: true }","repair: { role: 'S', name: '修理', instant: true }")
# assist smoke
sub("    if (!lineClear(car.x, my, car.z, c.x, c.y + 1.2, c.z)) continue","    if (!lineClear(car.x, my, car.z, c.x, c.y + 1.2, c.z) || smokeBlocks(S, car.x, car.z, c.x, c.z)) continue")
# car radius by scale
sub("export function circles(c) { const s = Math.sin(c.yaw), co = Math.cos(c.yaw); return [[c.x + s * CAR_OFF, c.z + co * CAR_OFF], [c.x - s * CAR_OFF, c.z - co * CAR_OFF]] }","export const carR = c => CAR_R * (1 + ((CAR_TYPES[c.type] || CAR_TYPES[0]).scale - 1) * 0.9)\nexport function circles(c) { const s = Math.sin(c.yaw), co = Math.cos(c.yaw), k = carR(c) / CAR_R, o = CAR_OFF * k; return [[c.x + s * o, c.z + co * o], [c.x - s * o, c.z - co * o]] }")
sub("const dx = px - qx, dz = pz - qz, d = Math.hypot(dx, dz), p = 2 * CAR_R - d","const dx = px - qx, dz = pz - qz, d = Math.hypot(dx, dz), p = carR(A) + carR(B) - d")
sub("if (!pushOutCircle(cx, c.y, cz, CAR_R, CAR_H, out)) continue","if (!pushOutCircle(cx, c.y, cz, carR(c), CAR_H, out)) continue")
sub("segCircle(b.px, b.pz, b.x, b.z, cx, cz, HITR.car) >= 0","segCircle(b.px, b.pz, b.x, b.z, cx, cz, carR(c) + 0.35) >= 0")
sub("scale: 1.18,","scale: 1.1,"); sub("scale: 0.95,","scale: 0.96,")
open('js/sim.js','w').write(s)

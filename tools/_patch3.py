import re
s=open('js/sim.js').read()
def rep_fn(name, new):
    global s
    m=re.search(r'(export )?function '+name+r'\(', s); assert m, name
    a=m.start()
    n=re.search(r'\n(?=(export )?(function |const |let |// -{10}))', s[a+10:])
    b=a+10+n.start()+1
    s=s[:a]+new.rstrip('\n')+'\n'+s[b:]
# collide: masses + spear
s=s.replace("const iA = A.alive ? 1 : 0, iB = B.alive ? 1 : 0, sum = iA + iB\n      A.x += nx * pen * iA / sum; A.z += nz * pen * iA / sum; B.x -= nx * pen * iB / sum; B.z -= nz * pen * iB / sum",
"const mA = (CAR_TYPES[A.type] || CAR_TYPES[0]).mass, mB = (CAR_TYPES[B.type] || CAR_TYPES[0]).mass\n      const iA = A.alive ? 1 / mA : 0, iB = B.alive ? 1 / mB : 0, sum = iA + iB\n      A.x += nx * pen * iA / sum; A.z += nz * pen * iA / sum; B.x -= nx * pen * iB / sum; B.z -= nz * pen * iB / sum")
s=s.replace("if (A.alive) { hurt(S, A, base * mult(frontA), tB >= 0 ? tB : null, ax, az, 'ram') }\n          if (B.alive) { hurt(S, B, base * mult(frontB), tA >= 0 ? tA : null, ax, az, 'ram') }",
"const spA = A.spearT > 0 && frontA > 0.55 ? 2.4 : 1, spB = B.spearT > 0 && frontB > 0.55 ? 2.4 : 1\n          if (A.alive) { hurt(S, A, base * mult(frontA) * Math.sqrt(mB / mA) * spB, tB >= 0 ? tB : null, ax, az, 'ram') }\n          if (B.alive) { hurt(S, B, base * mult(frontB) * Math.sqrt(mA / mB) * spA, tA >= 0 ? tA : null, ax, az, 'ram') }")
# bullets
rep_fn('updateBullets','''function updateBullets(S, dt) {
  const B = S.bullets
  for (let i = B.length - 1; i >= 0; i--) {
    const b = B[i]
    b.px = b.x; b.py = b.y; b.pz = b.z
    b.life -= dt
    if (b.type === 'grenade') {   // 弧を描いて転がり、時間で爆発
      b.vy -= G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt
      const h = H(b.x, b.z)
      if (b.y < h + 0.15) { b.y = h + 0.15; if (b.vy < -2) { b.vy = -b.vy * 0.45; ev(S, { k: 'bounce', x: b.x, y: b.y, z: b.z }) } else b.vy = 0; b.vx *= 0.82; b.vz *= 0.82 }
      if (solidAtPoint(b.x, b.y, b.z) || Math.abs(b.x) > WORLD || Math.abs(b.z) > WORLD) { b.x = b.px; b.z = b.pz; b.vx *= -0.5; b.vz *= -0.5 }
      if (b.life <= 0) { explode(S, b.x, b.y, b.z, b.team, 6.5, 40, 'rocket'); B.splice(i, 1) }
      continue
    }
    if (b.type === 'rocket') {
      b.speed = Math.min(WEAPONS.rocket.speed, b.speed + 40 * dt)
      let best = null, bd = 1e9
      for (const c of S.cars) {
        if (!c.alive || c.team === b.team || c.team < 0) continue
        const dx = c.x - b.x, dz = c.z - b.z, d = Math.hypot(dx, dz); if (d > 60) continue
        const ang = Math.abs(angDiff(Math.atan2(dx, dz), b.yaw)); if (ang > 0.6) continue
        if (d + ang * 15 < bd) { bd = d + ang * 15; best = c }
      }
      if (best) { const want = Math.atan2(best.x - b.x, best.z - b.z), dv = angDiff(want, b.yaw); b.yaw += clamp(dv, -1.7 * dt, 1.7 * dt); const dy = (best.y + 1 - b.y) / Math.max(5, Math.hypot(best.x - b.x, best.z - b.z)); b.vy += (dy * b.speed - b.vy) * Math.min(1, 3 * dt) } else b.vy *= 1 - 0.8 * dt
      b.vx = Math.sin(b.yaw) * b.speed; b.vz = Math.cos(b.yaw) * b.speed
    } else if (b.type === 'confetti') { b.vy -= 6 * dt; b.vx *= 1 - 1.2 * dt; b.vz *= 1 - 1.2 * dt }
    else if (b.type === 'spring') b.vy -= 14 * dt
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt
    let hitK = null, hitObj = null
    if (Math.abs(b.x) > WORLD || Math.abs(b.z) > WORLD) { hitK = 'wall'; b.x = clamp(b.x, -WORLD, WORLD); b.z = clamp(b.z, -WORLD, WORLD) }
    else if (b.y < H(b.x, b.z)) { hitK = 'ground'; b.y = H(b.x, b.z) + 0.05 }
    else if (solidAtPoint(b.x, b.y, b.z)) hitK = 'obst'
    else if (b.y > 30) hitK = 'sky'
    // 反射（バネの鉄球・跳弾）
    if (hitK && hitK !== 'sky' && (b.bounces || 0) > 0 && b.type !== 'rocket' && b.type !== 'confetti') {
      b.bounces--
      if (hitK === 'ground') { b.vy = Math.abs(b.vy) * (b.type === 'spring' ? 0.9 : 0.8) + (b.type === 'spring' ? 3 : 0) }
      else {
        b.x = b.px; b.y = b.py; b.z = b.pz
        if (Math.abs(b.px + b.vx * dt) > WORLD || solidAtPoint(b.px + b.vx * dt, b.py, b.pz)) b.vx = -b.vx; else b.vz = -b.vz
        if (Math.abs(b.pz + b.vz * dt) > WORLD) b.vz = -b.vz
      }
      ev(S, { k: 'bounce', x: b.x, y: b.y, z: b.z })
      continue
    }
    if (!hitK) for (const c of S.cars) {
      if (c.team === b.team && c.team >= 0) continue
      if (b.y < c.y - 0.3 || b.y > c.y + 2.5) continue
      const cs = circles(c)
      for (const [cx, cz] of cs) if (segCircle(b.px, b.pz, b.x, b.z, cx, cz, HITR.car) >= 0) { hitK = 'car'; hitObj = c; break }
      if (hitK) break
    }
    if (!hitK) for (const p of S.people) {
      if (p.state !== 'walk' || p.team === b.team || p.invT > 0) continue
      if (b.y < p.y - 0.2 || b.y > p.y + 2.1) continue
      if (segCircle(b.px, b.pz, b.x, b.z, p.x, p.z, 0.7) >= 0) { hitK = 'person'; hitObj = p; break }
    }
    if (!hitK) for (const tu of S.turrets) {
      if (tu.team === b.team || b.y < tu.y || b.y > tu.y + 1.8) continue
      if (segCircle(b.px, b.pz, b.x, b.z, tu.x, tu.z, 0.9) >= 0) { hitK = 'turret'; hitObj = tu; break }
    }
    if (hitK) {
      if (b.type === 'rocket') explode(S, b.x, b.y, b.z, b.team, WEAPONS.rocket.r, WEAPONS.rocket.dmg, 'rocket')
      else {
        const dmg = b.type === 'paint' ? WEAPONS.paint.dmg : b.type === 'confetti' ? WEAPONS.confetti.dmg : b.type === 'spring' ? WEAPONS.spring.dmg : b.type === 'cork' ? WEAPONS.cork.dmg : b.dmg || 2.6
        if (hitK === 'car') {
          const c = hitObj; if (c.alive) { const d = hurt(S, c, dmg, b.team, b.x, b.z, 'bullet'); if (d && b.team >= 0) S.teams[b.team].stats.hits++ }
          const m = Math.hypot(b.vx, b.vz) || 1; c.vx += b.vx / m * (b.type === 'cork' || b.type === 'spring' ? 0.9 : 0.12); c.vz += b.vz / m * (b.type === 'cork' || b.type === 'spring' ? 0.9 : 0.12)
        } else if (hitK === 'person') {
          const t = S.teams[hitObj.team]; t.footHp -= dmg * 1.4; t.footLast = { team: b.team, t: S.t }; if (b.team >= 0) S.teams[b.team].stats.hits++
        } else if (hitK === 'turret') { hitObj.hp -= dmg * 1.5; if (b.team >= 0) S.teams[b.team].stats.hits++ }
        ev(S, { k: 'bhit', w: b.type, what: hitK, team: b.team, x: b.x, y: b.y, z: b.z, vx: b.vx, vz: b.vz })
      }
      B.splice(i, 1); continue
    }
    if (b.life <= 0) { if (b.type === 'rocket') explode(S, b.x, b.y, b.z, b.team, WEAPONS.rocket.r, WEAPONS.rocket.dmg, 'rocket'); B.splice(i, 1) }
  }
}''')
# gadgets
s=s.replace("function updateMines(S, dt) {","function updateMines(S, dt) {\n  updateGadgets(S, dt)")
s=s.replace("// ---------------------------------------------------------------- 地雷・オイル\n","""// ---------------------------------------------------------------- 地雷・オイル・煙幕・タレット
function updateGadgets(S, dt) {
  for (let i = S.smokes.length - 1; i >= 0; i--) { S.smokes[i].life -= dt; if (S.smokes[i].life <= 0) S.smokes.splice(i, 1) }
  for (let i = S.turrets.length - 1; i >= 0; i--) {
    const tu = S.turrets[i]; tu.life -= dt
    if (tu.life <= 0 || tu.hp <= 0) { ev(S, { k: 'turretEnd', x: tu.x, y: tu.y, z: tu.z, dead: tu.hp <= 0 }); S.turrets.splice(i, 1); continue }
    tu.cd -= dt
    let best = null, bd = 42
    for (const c of S.cars) { if (!c.alive || c.team === tu.team || c.team < 0) continue; const d = Math.hypot(c.x - tu.x, c.z - tu.z); if (d < bd && lineClear(tu.x, tu.y + 1.2, tu.z, c.x, c.y + 1.2, c.z) && !smokeBlocks(S, tu.x, tu.z, c.x, c.z)) { bd = d; best = c } }
    if (best) {
      const want = Math.atan2(best.x + best.vx * 0.3 - tu.x, best.z + best.vz * 0.3 - tu.z); tu.yaw += clamp(angDiff(want, tu.yaw), -3.2 * dt, 3.2 * dt)
      if (tu.cd <= 0 && Math.abs(angDiff(want, tu.yaw)) < 0.12) { tu.cd = 0.16; const a = tu.yaw + (S.rng() - 0.5) * 0.05; S.bullets.push({ type: 'paint', team: tu.team, x: tu.x, y: tu.y + 1.3, z: tu.z, px: tu.x, py: tu.y + 1.3, pz: tu.z, vx: Math.sin(a) * 56, vz: Math.cos(a) * 56, vy: 0, life: 1, id: UID++ }); ev(S, { k: 'shot', w: 'paint', team: tu.team, x: tu.x, y: tu.y + 1.3, z: tu.z }) }
    }
  }
""",1)
s=s.replace("export function enemiesOf(S, team)","// 煙幕が、a から b への線をさえぎるか\nexport function smokeBlocks(S, ax, az, bx, bz) {\n  for (const m of S.smokes) {\n    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1; let t = ((m.x - ax) * dx + (m.z - az) * dz) / l2; t = clamp(t, 0, 1)\n    if (Math.hypot(ax + dx * t - m.x, az + dz * t - m.z) < m.r * 0.85) return true\n  }\n  return false\n}\nexport function enemiesOf(S, team)")
# pickups
rep_fn('updatePickups','''function updatePickups(S, dt) {
  for (const p of S.pickups) {
    if (p.t > 0) { p.t -= dt; if (p.t <= 0) p.type = pickType(S); continue }
    for (const c of S.cars) {
      if (!c.alive || c.team < 0 || Math.hypot(c.x - p.x, c.z - p.z) > 2.6 || Math.abs(c.y - H(p.x, p.z)) > 2) continue
      const t = S.teams[c.team], IT = ITEMS[p.type]
      if (p.type === 'repair') { const before = c.hp; c.hp = Math.min(100, c.hp + 45); ev(S, { k: 'repair', team: t.id, x: c.x, y: c.y, z: c.z, gain: c.hp - before }) }
      else {
        const slot = IT.role === 'D' ? 'iD' : 'iG'
        if (t[slot] && t[slot].type === p.type) t[slot].ammo += IT.ammo; else t[slot] = { type: p.type, ammo: IT.ammo }
        ev(S, { k: 'pickup', team: t.id, type: p.type, role: IT.role, x: p.x, y: H(p.x, p.z), z: p.z })
      }
      t.stats.pick++
      p.t = 16; break
    }
  }
}''')
s=s.replace("c.hp = Math.max(c.hp, 70); c.invT = 1.4; c.mag = WEAPONS.paint.mag; c.heat = 0; c.reloadT = 0; c.gunYaw = c.yaw; c.boost = 1","c.hp = Math.max(c.hp, 70); c.invT = 1.4; c.gunYaw = c.yaw; c.boost = 1; for (const w of t.ws) { w.mag = WEAPONS[w.id].mag; w.reloadT = 0; w.heat = 0; w.overT = 0 }")
# specialWeapon export removal usage
s=re.sub(r"export function specialWeapon\(t\)[^\n]*\n","",s)
open('js/sim.js','w').write(s)

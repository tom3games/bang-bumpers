def edit(path, pairs):
    s=open(path).read()
    for a,b in pairs:
        assert a in s, (path, a[:70]); s=s.replace(a,b,1)
    open(path,'w').write(s)
edit('js/sim.js',[
("thrUp: 2.4, thrDown: 1.9, brake: 13,","muzY: 1.9, tz: -0.3, thrUp: 2.4, thrDown: 1.9, brake: 13,"),
("thrUp: 3.4, thrDown: 2.5, brake: 12,","muzY: 1.65, tz: -0.7, thrUp: 3.4, thrDown: 2.5, brake: 12,"),
("thrUp: 1.5, thrDown: 1.2, brake: 9,","muzY: 2.47, tz: -0.02, thrUp: 1.5, thrDown: 1.2, brake: 9,"),
("  const yaw = c.gunYaw, dirx = Math.sin(yaw), dirz = Math.cos(yaw)\n  const mx = c.x + dirx * 0.9, mz = c.z + dirz * 0.9, my = c.y + 2.15\n  const pitch = inp.assist && inp.assist.pitch ? inp.assist.pitch : 0","  const yaw = c.gunYaw, dirx = Math.sin(yaw), dirz = Math.cos(yaw), T = CAR_TYPES[c.type] || CAR_TYPES[0], sc = T.scale\n  const mx = c.x + Math.sin(c.yaw) * T.tz * sc + dirx * 1.85, mz = c.z + Math.cos(c.yaw) * T.tz * sc + dirz * 1.85, my = c.y + T.muzY * sc\n  const pitch = inp.aimPitch != null ? inp.aimPitch : (inp.assist && inp.assist.pitch ? inp.assist.pitch : 0)"),
("  const my = car.y + 2.15\n","  const my = car.y + ((CAR_TYPES[car.type] || CAR_TYPES[0]).muzY || 1.9)\n"),
])
edit('js/stage.js',[
("import { TEAM_COLORS, MAXF, CAR_TYPES, FLASH_R } from './sim.js?v=3'","import { TEAM_COLORS, MAXF, CAR_TYPES, FLASH_R, circles, carR } from './sim.js?v=3'"),
("  project(x, y, z, out) {","""  // 画面の真ん中の印が指す所（光線を伸ばして、地面・障害物・車・壁に当たった点）
  aimPoint(S, me, maxD = 150) {
    const o = this.cam.position, d = this.cam.getWorldDirection(_aimDir)
    for (let t = 2.5; t < maxD; t += 0.7) {
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t
      if (x * x + z * z > WORLD * WORLD) return { x, y, z, t, hit: 'wall' }
      if (y < H(x, z)) return { x, y, z, t, hit: 'ground' }
      if (solidAtPoint(x, y, z)) return { x, y, z, t, hit: 'obst' }
      for (const c of S.cars) { if (c === me || !c.alive || Math.abs(y - (c.y + 1.0)) > 1.5) continue; for (const [cx, cz] of circles(c)) if (Math.hypot(x - cx, z - cz) < carR(c) + 0.15) return { x, y, z, t, hit: 'car', car: c } }
    }
    return { x: o.x + d.x * maxD, y: o.y + d.y * maxD, z: o.z + d.z * maxD, t: maxD, hit: 'none' }
  }
  project(x, y, z, out) {"""),
("const _scorch = new THREE.Color(0x1c1a18),","const _aimDir = new THREE.Vector3()\nconst _scorch = new THREE.Color(0x1c1a18),"),
])
edit('js/main.js',[
("    const as = assistAim(S, c, aimYaw)\n    const aim = as ? aimYaw + angDiff(as.yaw, aimYaw) * 0.72 : aimYaw\n    out.gun = { aim, fire: !!(K.fire || K.mouseDown || k.fire), reload: false, use: false, assist: as ? { pitch: as.pitch * 0.9 } : null }","""    // 画面の真ん中の印が指す所へ弾が飛ぶ: 光線の当たり点を、銃口から狙い直す（カメラと銃口のずれを直す）
    const T = CAR_TYPES[c.type] || CAR_TYPES[0], sc = T.scale
    const mx = c.x + Math.sin(c.yaw) * T.tz * sc, mz = c.z + Math.cos(c.yaw) * T.tz * sc, my = c.y + T.muzY * sc
    const P = aimRay && aimRay.t > 4 ? aimRay : null
    let yawP = aimYaw, pitchP = 0
    if (P) { yawP = Math.atan2(P.x - mx, P.z - mz); const dh = Math.hypot(P.x - mx, P.z - mz); pitchP = Math.atan2(P.y - my, Math.max(1, dh)) }
    const as = assistAim(S, c, yawP)
    const aim = as ? yawP + angDiff(as.yaw, yawP) * 0.72 : yawP
    out.gun = { aim, fire: !!(K.fire || K.mouseDown || k.fire), reload: false, use: false, assist: as ? { pitch: as.pitch * 0.9 } : null, aimPitch: as ? as.pitch * 0.9 : pitchP }"""),
("let lockedOn = false\nlet reloadPress = false","let lockedOn = false, aimRay = null\nlet reloadPress = false"),
("  stage.sync(S, alpha, dt, { human: !!(t && t.driver === 0) })","  stage.sync(S, alpha, dt, { human: !!(t && t.driver === 0) })\n  { const mc = t && t.car >= 0 ? S.cars.find(q => q.id === t.car) : null; aimRay = phase === 'play' && role === 'shoot' && mc ? stage.aimPoint(S, mc) : null }"),
("window.__bb = { showResult:","window.__bb = { aimTest: () => {\n    const t = S.teams[0], c = S.cars.find(q => q.id === t.car); if (!c || curRole() !== 'shoot') return { err: 'not shooter' }\n    const P = stage.aimPoint(S, c); aimRay = P; K.mouseDown = true\n    const before = S.bullets.length; const hin = readHuman(DT); step(S, makeInputs(S, DT, hin), DT); onEvents(); K.mouseDown = false\n    const b = S.bullets.slice(before).find(q => q.team === 0 && q.type === 'paint'); if (!b) return { err: 'no bullet', fired: S.bullets.length - before, w: t.ws[t.wSel].id }\n    const v = Math.hypot(b.vx, b.vy, b.vz), ux = b.vx / v, uy = b.vy / v, uz = b.vz / v\n    const rx = P.x - b.x, ry = P.y - b.y, rz = P.z - b.z, along = rx * ux + ry * uy + rz * uz\n    const d = Math.hypot(rx - ux * along, ry - uy * along, rz - uz * along)\n    return { miss: d, dist: Math.hypot(rx, ry, rz), hit: P.hit, w: 'paint' }\n  }, showResult:"),
])

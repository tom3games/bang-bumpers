s=open('js/sim.js').read()
a=s.index("  if (!c.air) {\n    let [fx, fz] = fwd(c)\n    // ハンドル")
b=s.index("  } else {\n    c.yaw -= (inp ? (inp.steer || 0) : 0) * 0.5 * dt")
new='''  if (!c.air) {
    let [fx, fz] = fwd(c)
    let sp = c.vx * fx + c.vz * fz
    const vmax = boosting ? T.maxF * 1.48 : T.maxF
    const thrIn = inp ? clamp(inp.throttle || 0, -1, 1) : 0
    // ハンドル: ゆっくり切れて、ゆっくり戻る。重い車ほど鈍い
    const want = inp ? clamp(inp.steer || 0, -1, 1) : 0
    const rate = (Math.abs(want) > Math.abs(c.steer) || Math.sign(want) !== Math.sign(c.steer) && want !== 0 ? 2.4 : 1.8) * (1.15 - 0.2 * T.mass)
    const d = want - c.steer
    c.steer += Math.sign(d) * Math.min(Math.abs(d), rate * dt)
    // 曲がり: 切った角から目標の向きの回り方が決まり、車体の向きはそれに遅れてついてくる
    const spN = clamp(Math.abs(sp) / Math.max(10, vmax), 0, 1.3)
    const maxSteer = (0.62 - 0.4 * clamp(Math.abs(sp) / 30, 0, 1)) * T.steer
    const under = 1 - 0.42 * clamp(spN * spN * Math.abs(c.steer) * 1.4, 0, 1)         // 速い時に強く切ると前輪が負けて外へふくらむ
    const hard = Math.abs(c.steer) > 0.62 && Math.abs(sp) > 0.55 * vmax && thrIn > 0.3  // 速い時の大きな舵は後ろが流れる
    let yawT = sp * Math.tan(c.steer * maxSteer) / 2.7 * under * (hard ? 1.16 : 1)
    c.yawRate += (yawT - c.yawRate) * (1 - Math.exp(-dt / T.yawTau))
    c.yaw -= c.yawRate * dt
    ;[fx, fz] = fwd(c)
    const rx = -Math.cos(c.yaw), rz = Math.sin(c.yaw)
    sp = c.vx * fx + c.vz * fz
    let lat = c.vx * rx + c.vz * rz
    // 踏み込みと離しにも慣性
    const k = thrIn > c.thr ? T.thrUp : T.thrDown
    c.thr += clamp(thrIn - c.thr, -k * dt, k * dt)
    const brkIn = thrIn < -0.02 ? 1 : 0
    c.brk += clamp(brkIn - c.brk, -8 * dt, 6 * dt)
    let ax = 0
    if (!hulk) {
      if (c.thr > 0.02 && thrIn > -0.02) {
        if (sp < -0.5) ax = 26
        else ax = T.acc * c.thr * (1 - Math.pow(Math.max(0, sp) / vmax, 2) * 0.85) + (boosting ? 14 : 0)
      } else if (c.brk > 0.05) {
        if (sp > 0.6) ax = -T.brake * c.brk; else ax = -10 * c.brk * (sp > -MAXR ? 1 : 0)
      } else {
        const drag = (inp ? T.roll : 6) + 0.0042 * sp * sp   // 離すと転がる。重い車ほど長く転がる
        ax = -Math.sign(sp) * Math.min(Math.abs(sp) / Math.max(dt, 1e-3), drag)
      }
      sp = Math.min(sp + ax * dt, Math.max(sp, vmax))
    } else sp -= Math.sign(sp) * Math.min(Math.abs(sp), 14 * dt)
    c.ax = ax
    // 横の滑り: 一気には止まらず、グリップが戻るまで流れる
    let grip = c.oilT > 0 ? 0.5 : T.grip
    grip *= 1 - 0.42 * clamp(Math.abs(c.steer) * Math.abs(sp) / 20, 0, 1) * (hard ? 1.35 : 1)
    lat *= Math.exp(-grip * dt)
    if (c.oilT > 0 && inp) c.yaw += (Math.sin(S.t * 7 + c.id) * 0.9) * dt * (Math.abs(sp) / 12)
    c.slip = Math.abs(lat)
    c.vx = fx * sp + rx * lat; c.vz = fz * sp + rz * lat
    // 坂道の重さ
    const e = 0.5, gx = (H(c.x + e, c.z) - H(c.x - e, c.z)) / (2 * e), gz = (H(c.x, c.z + e) - H(c.x, c.z - e)) / (2 * e)
    c.vx -= 8 * gx * dt; c.vz -= 8 * gz * dt
'''
s=s[:a]+new+s[b:]
# car init fields
s=s.replace("hp: 100, alive: true, wreckT: 0, boost: 1, boostLock: false, gunYaw: yaw, turboT: 0, spearT: 0,","hp: 100, alive: true, wreckT: 0, boost: 1, boostLock: false, gunYaw: yaw, turboT: 0, spearT: 0, thr: 0, brk: 0, yawRate: 0, ax: 0, slip: 0,")
# type params
s=s.replace("{ id: 'std', name: 'バランス', note: 'どれも平均点。迷ったらこれ', maxF: 21, acc: 15,","{ id: 'std', name: 'バランス', note: 'どれも平均点。迷ったらこれ', thrUp: 3.0, thrDown: 2.2, brake: 20, roll: 1.3, yawTau: 0.17, maxF: 21, acc: 10.5,")
s=s.replace("{ id: 'fast', name: 'ビュン', note: '速くて軽い。壊れやすい', maxF: 25.5, acc: 19,","{ id: 'fast', name: 'ビュン', note: '速くて軽い。壊れやすい', thrUp: 4.2, thrDown: 3.0, brake: 19, roll: 1.0, yawTau: 0.13, maxF: 25.5, acc: 14.5,")
s=s.replace("{ id: 'heavy', name: 'ドスン', note: '遅いけど硬くて体当たりが強い', maxF: 17.5, acc: 11,","{ id: 'heavy', name: 'ドスン', note: '遅いけど硬くて体当たりが強い', thrUp: 1.9, thrDown: 1.4, brake: 14, roll: 0.75, yawTau: 0.3, maxF: 17.5, acc: 7.2,")
s=s.replace("{ id: 'agile', name: 'ヒラリ', note: '小回りが利く。ブースト長め', maxF: 21, acc: 15,","{ id: 'agile', name: 'ヒラリ', note: '小回りが利く。ブースト長め', thrUp: 3.3, thrDown: 2.5, brake: 21, roll: 1.4, yawTau: 0.1, maxF: 21, acc: 10.8,")
s=s.replace("steer: 1.0, grip: 7.5,","steer: 1.0, grip: 4.2,").replace("steer: 0.9, grip: 6.5,","steer: 0.9, grip: 3.6,").replace("steer: 0.8, grip: 8.5,","steer: 0.8, grip: 3.3,").replace("steer: 1.5, grip: 10,","steer: 1.5, grip: 5.2,")
# wall bounce: more rebound
s=s.replace("if (c.x > lim) { c.x = lim; if (c.vx > 0) { hit = c.vx; c.vx *= -0.3 } } else if (c.x < -lim) { c.x = -lim; if (c.vx < 0) { hit = -c.vx; c.vx *= -0.3 } }","if (c.x > lim) { c.x = lim; if (c.vx > 0) { hit = c.vx; c.vx *= -0.5 } } else if (c.x < -lim) { c.x = -lim; if (c.vx < 0) { hit = -c.vx; c.vx *= -0.5 } }")
s=s.replace("if (c.z > lim) { c.z = lim; if (c.vz > 0) { hit = Math.max(hit, c.vz); c.vz *= -0.3 } } else if (c.z < -lim) { c.z = -lim; if (c.vz < 0) { hit = Math.max(hit, -c.vz); c.vz *= -0.3 } }","if (c.z > lim) { c.z = lim; if (c.vz > 0) { hit = Math.max(hit, c.vz); c.vz *= -0.5 } } else if (c.z < -lim) { c.z = -lim; if (c.vz < 0) { hit = Math.max(hit, -c.vz); c.vz *= -0.5 } }")
s=s.replace("c.vx -= 1.3 * vn * best[0]; c.vz -= 1.3 * vn * best[1]","c.vx -= 1.5 * vn * best[0]; c.vz -= 1.5 * vn * best[1]; c.yawRate += (Math.random() - 0.5) * Math.min(2, -vn * 0.08)")
s=s.replace("const mx = o.w","const mx = o.w") 
open('js/sim.js','w').write(s)

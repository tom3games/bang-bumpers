// v6 の専用試験（ブラウザ無し）: 真ん中の高さ・ジャンプ台の全方向からの進入・3・2・1・再スタート5秒・歩き中の撃破
import { createState, step, DT, RESPAWN_SEC, GO_COUNT, COUNTDOWN } from '../js/sim.js'
import { makeInputs } from '../js/cpu.js'
import { H, RAMPS, WORLD, CENTER, TEAM_SPAWNS, NTEAM, pushOutCircle } from '../js/arena.js'
let fails = 0
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++ }

// 1. 真ん中: 半径20mが完全に平ら
{ let mx = 0; for (let x = -20; x <= 20; x += 0.5) for (let z = -20; z <= 20; z += 0.5) if (x * x + z * z <= 400) mx = Math.max(mx, Math.abs(H(x, z)))
  ok(true, `（v9 で真ん中はお椀形のくぼみにしたので平らの試験は外す。くぼみの試験は tools/bowltest.mjs）真ん中の高さの最大 = ${mx}`) }
{ // 真ん中を走り抜ける: 車の高さと耐久
  const S = createState(5, { noCountdown: true }); const c = S.cars.find(q => q.team === 0); c.x = -30; c.z = 0; c.yaw = Math.PI / 2; c.vx = 0
  let minY = 9, maxY = -9, hp0 = c.hp
  for (let i = 0; i < 60 * 6; i++) { step(S, { 0: { throttle: 1, steer: 0 } }, DT); minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y) }
  ok(c.hp === hp0 && c.x > 20, `真ん中を通過: y ${minY}..${maxY} hp ${c.hp} 位置x ${c.x.toFixed(0)}`)
}

// 2. ジャンプ台: 全方向から進入。耐久が減らない・めり込まない・止まらない
const R = (a, b) => Math.hypot(a, b)
let worst = { pen: 0, loss: 0, stillMax: 0 }, runs = 0, skipped = 0
// 進入路（まっすぐ台の中心へ・台をはさんで反対側の出口まで）が壁・柱・箱でふさがれていない角度だけ使う
const pathClear = (x0, z0, yaw, len) => { for (let t = 0; t <= len; t += 0.8) { const x = x0 + Math.sin(yaw) * t, z = z0 + Math.cos(yaw) * t; if (x * x + z * z > (WORLD - 6) ** 2) return false; for (const l of [-1.6, 0, 1.6]) { const o = []; if (pushOutCircle(x + Math.cos(yaw) * l, H(x, z), z - Math.sin(yaw) * l, 1.4, 1.7, o)) return false } } return true }
for (const [ri, p] of RAMPS.entries()) for (let k = 0; k < 24; k++) for (const type of [0, 1, 2]) for (const off of [0, 0.5]) {
  const S = createState(7, { noCountdown: true }); const c = S.cars.find(q => q.team === 0); c.type = type
  for (const q of S.cars) if (q !== c) { q.x = 500; q.z = 500; q.invT = 99 }
  const a = k / 24 * 2 * Math.PI, d = p.r0 + 26
  const sx = p.x + Math.sin(a) * d, sz = p.z + Math.cos(a) * d
  const tx = p.x - Math.cos(a) * off * p.r0, tz = p.z + Math.sin(a) * off * p.r0     // 台の中心から横にずらした所をねらう
  const yaw0 = Math.atan2(tx - sx, tz - sz)
  if (!pathClear(sx, sz, yaw0, d + p.r0 + 16)) { skipped++; continue }
  runs++
  c.x = sx; c.z = sz; c.yaw = yaw0; c.y = H(c.x, c.z); c.vx = c.vz = 0
  let hpOn = 0, pen = 0, still = 0, maxStill = 0, lx = c.x, lz = c.z, onRamp = 0, hpPrev = c.hp, passed = false
  for (let i = 0; i < 60 * 12; i++) {
    step(S, { 0: { throttle: 1, steer: 0, boost: false } }, DT)
    if (!isFinite(c.x + c.y)) { ok(false, 'NaN'); break }
    const dd = R(c.x - p.x, c.z - p.z); if (dd < p.r0) onRamp++
    if (dd < p.r0 + 4) hpOn += hpPrev - c.hp
    hpPrev = c.hp
    if (onRamp > 5 && dd > p.r0 + 8) { passed = true; break }
    if (!c.air) { // 車の底の4隅（前後±2.0・左右±0.9）が地面より下にどれだけ入っているか
      const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = -fz, rz = fx
      for (const f of [-2, 2]) for (const l of [-0.9, 0.9]) { const x = c.x + fx * f + rx * l, z = c.z + fz * f + rz * l; const bottom = c.y + (c.lift || 0) + f * Math.sin(c.pitch) + l * Math.sin(c.roll) + 0.12; { const q = H(x, z) - bottom; if (q > pen) { pen = q; if (q > 0.4 && !globalThis.__logged) { globalThis.__logged = 1; console.log('  [debug] pen', q.toFixed(2), 'ramp', ri, 'dd', dd.toFixed(1), 'f', f, 'l', l, 'pitch', c.pitch.toFixed(2), 'roll', c.roll.toFixed(2), 'vy', c.vy.toFixed(1), 'spd', Math.hypot(c.vx, c.vz).toFixed(1), 'i', i, 'yaw', c.yaw.toFixed(2)) } } } }
    }
    if (i % 30 === 0 && !passed) { if (Math.hypot(c.x - lx, c.z - lz) < 0.8) still++; else still = 0; maxStill = Math.max(maxStill, still); lx = c.x; lz = c.z }
  }
  const loss = hpOn
  worst.pen = Math.max(worst.pen, pen); worst.loss = Math.max(worst.loss, loss); worst.stillMax = Math.max(worst.stillMax, maxStill)
  if (loss > 0 || onRamp < 5) ok(false, `台${ri} 角${(a * 57.3) | 0}° 車${type}: 耐久-${loss.toFixed(1)} 台の上のコマ数${onRamp}`)
}
ok(worst.loss === 0, `ジャンプ台 6台×24方向×3車種×2(中心/横ずれ)のうち進入路が空いている ${runs}回(障害物で除外 ${skipped}回): 最大の耐久減少 ${worst.loss.toFixed(2)}`)
ok(worst.pen < 0.45, `底の4隅のめり込みの最大 ${worst.pen.toFixed(2)}m`)
ok(worst.stillMax < 3, `台のまわりで止まった最長 ${worst.stillMax * 0.5}秒`)
// 台の上に長く居座っても減らない（止まっている/低速で斜面に押し付ける）
{ const p = RAMPS[0], S = createState(8, { noCountdown: true }); const c = S.cars.find(q => q.team === 0); for (const q of S.cars) if (q !== c) { q.x = 500; q.z = 500 }
  c.x = p.x + p.r0 * 0.7; c.z = p.z; c.y = H(c.x, c.z); c.yaw = 1.2; const hp0 = c.hp
  for (let i = 0; i < 60 * 20; i++) step(S, { 0: { throttle: i % 120 < 60 ? 1 : -1, steer: Math.sin(i / 50) } }, DT)
  ok(c.hp === hp0, `台の斜面で20秒うろうろ: 耐久 ${hp0}->${c.hp}`) }

// 3. 3・2・1
{ const S = createState(3, { prepSec: 1 }); const log = []; let moved = false
  for (let i = 0; i < 60 * 8; i++) { step(S, makeInputs(S, DT, null), DT); for (const e of S.events) log.push([S.t.toFixed(1), e.k, e.n].filter(x => x !== undefined).join(':')); S.events.length = 0; if (S.phase === 'ready' && S.cars.some(c => Math.hypot(c.vx, c.vz) > 0.3)) moved = true }
  const seq = log.filter(x => /ready|go/.test(x)).join(' ')
  ok(/go321:3.*go321:2.*go321:1.*:go$/.test(seq.replace(/ /g, '')) || /go321:3.*go321:2.*go321:1.* \d\.\d:go/.test(seq), `3・2・1・GO の順 ${seq} / 3・2・1 の間は動かない=${!moved}`) }

// 4. 再スタート RESPAWN_SEC（v6 は5秒・2026-11-25 から10秒）と 歩き中の撃破
for (const mode of ['stock', 'points']) {
  const S = createState(11, { noCountdown: true, mode }); const t = S.teams[0], c = S.cars.find(q => q.id === t.car)
  c.hp = 1; c.invT = 0; c.lastHit = { team: 1, t: S.t }
  const k0 = S.teams[1].kills, st0 = t.stock; let tw = -1, tr = -1, newId = -1
  for (let i = 0; i < 60 * (RESPAWN_SEC + 4); i++) {
    step(S, {}, DT)
    if (tw < 0 && t.walking) { tw = S.t; ok(t.p[0].state === 'fly' || t.p[0].state === 'walk', `${mode}: 大破 → 人が出る (${t.p[0].state})`) }
    if (tr < 0 && !t.walking && t.car >= 0 && tw >= 0) { tr = S.t; newId = t.car }
    if (i === 0) c.hp = 0
    S.events.length = 0
  }
  const dt5 = tr - tw
  ok(Math.abs(dt5 - RESPAWN_SEC) < 0.1, `${mode}: 大破から再スタートまで ${dt5.toFixed(2)}秒`)
  ok(newId !== c.id && S.cars.find(q => q.id === newId).alive && S.cars.find(q => q.id === newId).hp === 100, `${mode}: 新しい車(hp100)で再スタート`)
  ok(S.teams[1].kills === k0 + 1, `${mode}: 大破で相手に1点 (${k0}->${S.teams[1].kills})`)
  ok(mode === 'stock' ? t.stock === st0 - 1 : t.stock === st0, `${mode}: 残機 ${st0}->${t.stock}`)
}
{ // 歩き中に撃たれて死ぬ → 相手に1点・再スタートは5秒のまま
  const S = createState(12, { noCountdown: true, mode: 'points' }); const t = S.teams[0], c = S.cars.find(q => q.id === t.car)
  for (const q of S.cars) if (q.team > 1) { q.x = 600; q.z = 600; q.invT = 99 }
  c.hp = 0; step(S, {}, DT); for (let i = 0; i < 70; i++) step(S, {}, DT)      // 着地まで
  const p = t.p[0]; ok(p.state === 'walk', '歩き中: 人が着地して歩ける状態')
  // 敵の弾を人に直撃させる
  const k0 = S.teams[1].kills, foe = S.cars.find(q => q.team === 1); p.invT = 0; t.p[1].invT = 0
  foe.x = p.x + 12; foe.z = p.z; foe.y = H(foe.x, foe.z); foe.vx = foe.vz = 0
  let tdead = -1
  for (let i = 0; i < 60 * 3 && tdead < 0; i++) { t.footLast = null; S.bullets.push({ type: 'paint', team: 1, x: p.x + 2, y: p.y + 1, z: p.z, px: p.x + 4, py: p.y + 1, pz: p.z, vx: -58, vz: 0, vy: 0, life: 1, id: 9000 + i }); step(S, {}, DT); if (t.footDead) tdead = S.t }
  ok(t.footDead && S.teams[1].kills === k0 + 1, `歩き中に撃破されて相手に1点 (${k0}->${S.teams[1].kills})`)
  const tw0 = S.t; let tr = -1; for (let i = 0; i < 60 * (RESPAWN_SEC + 3) && tr < 0; i++) { step(S, {}, DT); if (!t.walking) tr = S.t }
  ok(tr > 0 && tr - tw0 < RESPAWN_SEC + 0.1 && t.car >= 0 && S.cars.find(q => q.id === t.car).alive, `倒された後もそのまま RESPAWN_SEC ぶん待って再スタート（死亡後 ${(tr - tw0).toFixed(1)}秒）`)
}
// 5. 予備の車が無い
{ const S = createState(1, { noCountdown: true }); ok(S.cars.every(c => c.team >= 0) && S.cars.length === NTEAM && NTEAM === 6, `ステージの車は6台だけ（予備なし）: ${S.cars.length}台`) }
// 6. 真ん中に修理箱がたまに出る
{ const S = createState(2, { noCountdown: true }); const c = S.cars.find(q => q.team === 0); c.hp = 40; const cp = S.pickups.find(p => p.center); const evs = []
  ok(cp && cp.x === 0 && cp.z === 0 && cp.type === 'repair', '真ん中の修理箱がある')
  for (const q of S.cars) if (q !== c) { q.x = 600; q.z = 600 }
  c.x = 0; c.z = 30; c.y = 0; c.vx = c.vz = 0; c.invT = 99
  let appear = -1; for (let i = 0; i < 60 * 60 && appear < 0; i++) { step(S, {}, DT); if (cp.t <= 0) appear = S.t; S.events.length = 0 }
  ok(appear > 20 && appear < 25, `最初に出る時刻 ${appear.toFixed(1)}秒`)
  c.x = 0; c.z = 0; step(S, {}, DT); ok(c.hp === 100 && cp.t >= 30, `取ると耐久が回復 40->${c.hp}、次は${cp.t.toFixed(0)}秒後`) }
console.log(fails ? `失敗 ${fails}` : '全部 ok')

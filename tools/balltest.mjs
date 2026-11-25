// 鉄球とアイテムの整理（v16）。node tools/balltest.mjs

const sim = await import('../js/sim.js?v=16'), { makeInputs } = await import('../js/cpu.js?v=16'), { WORLD, solidAtPoint } = await import('../js/arena.js?v=16')
const { createState, step, DT, setLoadout, ITEMS, BALL_R } = sim
const mk = seed => { const S = createState({ seed, mode: 'stock', humanTeam: -1 }); S.teams.forEach(t => setLoadout(S, t, { car: 0, weapons: ['paint', 'rocket'] })); return S }
let g = 0; const go = S => { while (S.phase !== 'play' && g++ < 5000) step(S, S.teams.map(() => ({})), DT); g = 0 }
const ok = (n, c, x) => console.log(c ? 'ok  ' : 'FAIL', n, JSON.stringify(x ?? ''))
// 出る種類
{ const c = {}; for (let i = 0; i < 300; i++) for (const p of mk(i + 1).pickups) if (!p.center) c[p.type] = (c[p.type] || 0) + 1
  ok('出るのは槍・地雷・鉄球・閃光弾だけ', Object.keys(c).sort().join() === 'ball,flash,mine,spear', c) }
// 1回で無くなる
for (const k of ['spear', 'mine', 'ball', 'flash']) { const S = mk(5); go(S); const t = S.teams[0], s = ITEMS[k].role === 'D' ? 'iD' : 'iG'; const p = S.pickups.find(q => !q.center), c = S.cars.find(q => q.id === t.car); p.type = k; p.t = 0; c.x = p.x; c.z = p.z; c.vx = c.vz = 0; step(S, S.teams.map(() => ({})), DT); const a = t[s] && t[s].ammo; step(S, S.teams.map((_, i) => i ? {} : { [s === 'iD' ? 'useD' : 'useG']: true }), DT); ok(k + ' は拾って1回', a === 1 && t[s] === null, { a, after: t[s] }) }
// 正面の敵に当たる
for (const gap of [8, 18, 30]) { const S = mk(9); go(S); const A = S.cars[0], B = S.cars[1]; for (const c of S.cars) c.invT = 0
  A.x = 30; A.z = -50; A.yaw = 0; A.vx = A.vz = 0; B.x = 30; B.z = -50 + gap; B.yaw = 1.57; B.vx = B.vz = 0; const cand = S.cars.slice(2); cand.forEach((c, i) => { c.x = -60 - i * 6; c.z = -10 })
  S.teams[A.team].iD = { type: 'ball', ammo: 1 }; let hit = 0; const hp = B.hp, ha = A.hp
  for (let i = 0; i < 150; i++) { step(S, S.teams.map((_, j) => j === A.team && !i ? { useD: true } : {}), DT); for (const e of S.events) if (e.k === 'ballHit' && e.id === B.id) hit++; S.events.length = 0 }
  ok(`${gap}m 先に当たる`, hit >= 1 && B.hp < hp && A.hp === ha, { hit, dmg: +(hp - B.hp).toFixed(1), self: ha - A.hp }) }
// 壁・柱を抜けない・NaN が出ない・必ず消える
{ let bad = 0, left = 0, n = 0, maxv = 0, hi = 0
  for (let k = 0; k < 240; k++) { const S = mk(50 + k); go(S); const A = S.cars[0]; S.cars.slice(1).forEach((c, i) => { c.x = 118 * 0; c.z = 0; c.alive = false }); const a = k * 0.618 * 6.28, r = (k % 24) * 5; A.x = Math.sin(a) * r; A.z = Math.cos(a) * r; A.yaw = k * 1.1; A.vx = Math.sin(A.yaw) * 30; A.vz = Math.cos(A.yaw) * 30; S.teams[A.team].iD = { type: 'ball', ammo: 1 }; n++
    for (let i = 0; i < 480; i++) { step(S, S.teams.map((_, j) => j === A.team && !i ? { useD: true } : {}), DT); S.events.length = 0; for (const b of S.balls) { const s = Math.hypot(b.vx, b.vz); maxv = Math.max(maxv, s); hi = Math.max(hi, b.y); if (!isFinite(b.x + b.y + b.z) || Math.hypot(b.x, b.z) > WORLD || solidAtPoint(b.x, b.y, b.z)) bad++ } }
    left += S.balls.length }
  ok('240発: 壁・柱を抜けない、残らない', bad === 0 && left === 0, { n, bad, left, maxv: maxv.toFixed(0), hi: hi.toFixed(1) }) }
// CPU 戦
{ let used = 0, hits = 0, over = 0, tt = 0; const N = 6
  for (let k = 0; k < N; k++) { const S = mk(700 + k); while (!S.over && S.t < 330) { step(S, makeInputs(S, DT, null), DT); for (const e of S.events) { if (e.k === 'ball') used++; if (e.k === 'ballHit' && e.what === 'car') hits++ } S.events.length = 0 } over += S.over ? 1 : 0; tt += S.tMatch }
  ok('CPU が鉄球を使い、試合が終わる', used > N && hits > 0 && over === N, { used, hits, over, avg: (tt / N).toFixed(0) }) }

import '../mute-auto.mjs'
// 柱の段階ごとの絵と崩れる瞬間を撮る: node tools/pillarshot.mjs <名前> [w h]
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { MUTE_LAUNCH, muteContext } from '../mute.mjs'
const PORT = 5696
const server = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname + '/..', env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 500))
const [, , name = 'pil', w = '1280', h = '800'] = process.argv
const b = await chromium.launch({ ...MUTE_LAUNCH, args: [...MUTE_LAUNCH.args, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: +w, height: +h } }); await muteContext(ctx)
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/GL Driver/.test(m.text())) errs.push(m.text()) })
await p.goto(`http://localhost:${PORT}/?start=drive&auto=1&speed=0&prep=0.05&shot=1&low=${process.env.LOW || 0}`); await p.waitForFunction(() => window.__bbReady, null, { timeout: 60000 })
const frames = n => p.evaluate(async n => { const f0 = window.__bbFrames; while (window.__bbFrames < f0 + n) await new Promise(r => setTimeout(r, 80)) }, n)
const HP = [100, 60, 30, 10, 0], ST = [0, 1, 2, 3, 4]
const cam = (dist, hgt, ly, side = 0) => p.evaluate(([dist, hgt, ly, side]) => {
  const S = window.__bb.S(), o = S.pillars[0], P = { x: 17.3, z: 53.3 }, ux = -0.31, uz = -0.95
  window.__bbCam = { p: [P.x + ux * dist + -uz * side, hgt, P.z + uz * dist + ux * side], l: [P.x, ly, P.z], fov: 55 }
  const c = S.cars.find(q => q.id === S.teams[0].car); if (!window.__hold) { window.__hold = { x: c.x, z: c.z, yaw: c.yaw }; setInterval(() => { const hh = window.__hold; c.x = c.px = hh.x; c.z = c.pz = hh.z; c.yaw = c.pyaw = hh.yaw; c.vx = c.vz = 0; c.yawRate = 0 }, 16) }
}, [dist, hgt, ly, side])
const setSt = st => p.evaluate(([st, hp]) => { const S = window.__bb.S(); S.pillars[0].stage = st; S.pillars[0].hp = hp }, [st, HP[st]])
const shot = async (f) => { await frames(3); await p.evaluate(() => { window.__bbPause = true }); await p.waitForTimeout(900); await p.screenshot({ path: `shots/${name}_${f}.png` }); await p.evaluate(() => { window.__bbPause = false }) }
const mode = process.env.MODE || 'all'
if (mode === 'all' || mode === 'stages') for (const st of ST) { await setSt(st); await cam(16, 4.5, 4.5); await shot(`s${st}_far`); await cam(7.5, 2.2, 1.4, 2); await shot(`s${st}_near`) }
if (mode === 'all' || mode === 'collapse') {
  await setSt(1); await cam(17, 4.2, 4.5); await frames(3)
  for (const [from, to] of [[1, 2], [2, 3], [3, 4]]) {
    await setSt(from); await frames(3)
    await p.evaluate(([from, to, hp]) => { const S = window.__bb.S(), o = S.pillars[0]; o.stage = to; o.hp = hp; window.__bb.stage.onEvent({ k: 'pillar', i: 0, stage: to, from, x: 17.3, y: 0, z: 53.3, r: 1.6 }, S) }, [from, to, HP[to]])
    for (const t of [250, 700, 1600]) { await p.waitForTimeout(t === 250 ? 250 : t - (t === 700 ? 250 : 700)); await shot(`c${from}${to}_${t}`) }
  }
}
console.log('errors', errs.slice(0, 6), 'calls', await p.evaluate(() => window.__bb.stage.renderer.info.render.calls))
await b.close(); server.kill()

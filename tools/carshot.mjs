import '../mute-auto.mjs'
// 車と人を近くから撮る: node tools/carshot.mjs <名前> <型 0,1,2> <視点 f,s,r,t,g,h>
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { MUTE_LAUNCH, muteContext } from '../mute.mjs'
const PORT = 5692
const server = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname + '/..', env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 500))
const types = (process.argv[3] || '0,1,2').split(',').map(Number)
const vks = (process.argv[4] || 'f,s,r').split(',')
const b = await chromium.launch({ ...MUTE_LAUNCH, args: [...MUTE_LAUNCH.args, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); await muteContext(ctx)
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver/.test(m.text())) errs.push(m.text()) }); p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()) })
await p.goto(`http://localhost:${PORT}/?start=drive&auto=1&speed=0&prep=0.05&shot=1&nobgm=1`); await p.waitForFunction(() => window.__bbReady, null, { timeout: 60000 })
const views = { f: [6.5, 1.9, 5.0], s: [0, 1.5, 7.2], r: [-4.6, 2.6, -5.4], t: [2.2, 3.9, -3.0], g: [1.9, 2.3, 2.4, 1.9], h: [-1.9, 2.3, 2.6, 1.9] }
const set = (t, v) => p.evaluate(([t, v]) => {
  const S = window.__bb.S(), c = S.cars.find(q => q.id === S.teams[0].car)
  c.type = t; c.vx = c.vz = 0
  if (!window.__hold) { window.__hold = { x: c.x, z: c.z, yaw: c.yaw }; setInterval(() => { const h = window.__hold; c.x = c.px = h.x; c.z = c.pz = h.z; c.yaw = c.pyaw = h.yaw; c.vx = c.vz = 0; c.yawRate = 0 }, 16) }
  const [dx, dy, dz] = v, sy = Math.sin(c.yaw), cy = Math.cos(c.yaw)
  window.__bbCam = { p: [c.x + sy * dz + cy * dx, c.y + dy, c.z + cy * dz - sy * dx], l: [c.x - sy * 0.3, c.y + (v[3] || 1.15), c.z - cy * 0.3], fov: 42 }
}, [t, v])
if (process.env.NOBLOOM) await p.evaluate(() => { window.__bb.stage.bloom.enabled = false })
await set(types[0], views.f); await p.waitForTimeout(7000)   // 最初の1枚は黒くなるので捨てる
for (const t of types) for (const vk of vks) {
  await set(t, views[vk])
  await p.evaluate(async () => { const f0 = window.__bbFrames; while (window.__bbFrames < f0 + 3) await new Promise(r => setTimeout(r, 100)) })
  await p.evaluate(() => { window.__bbPause = true }); await p.waitForTimeout(2500); await p.screenshot({ path: `shots/${process.argv[2] || 'car'}_${t}${vk}.png` }); await p.evaluate(() => { window.__bbPause = false })
}
console.log('errors', errs.slice(0, 6))
await b.close(); server.kill()

import '../mute-auto.mjs'
// 決め打ちのカメラで何枚か撮る: node tools/multi.mjs <名前> 'x,y,z,lx,ly,lz,fov;...' [w h]   （pick を x に書くと最初の拾い物の近く）
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { MUTE_LAUNCH, muteContext } from '../mute.mjs'
const PORT = 5695
const server = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname + '/..', env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 500))
const [, , name = 'm', spec = '', w = '1280', h = '800'] = process.argv
const b = await chromium.launch({ ...MUTE_LAUNCH, args: [...MUTE_LAUNCH.args, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: +w, height: +h } }); await muteContext(ctx)
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/GL Driver/.test(m.text())) errs.push(m.text()) })
await p.goto(`http://localhost:${PORT}/?start=drive&auto=1&speed=0&prep=0.05&shot=1`); await p.waitForFunction(() => window.__bbReady, null, { timeout: 60000 })
const views = spec.split(';').filter(Boolean)
let first = true
for (const [i, v] of [...views, ...(views.length ? [views[0]] : [])].entries()) {
  const isDummy = i === views.length
  const a = v.split(',')
  await p.evaluate(a => {
    const S = window.__bb.S()
    let [x, y, z, lx, ly, lz, fov] = a.map(Number)
    if (a[0] === 'pick') { const pk = S.pickups.find(q => q.t <= 0) || S.pickups[0]; const px = pk.x, pz = pk.z, sy = +a[1] || 0, d = +a[2] || 4.5; const Hh = 0; x = px + Math.sin(sy) * d; z = pz + Math.cos(sy) * d; y = Hh + 2.1; lx = px; ly = 0.35; lz = pz; fov = 50 }
    window.__bbCam = { p: [x, y, z], l: [lx, ly, lz], fov: fov || 55 }
    const c = S.cars.find(q => q.id === S.teams[0].car); if (!window.__hold) { window.__hold = { x: c.x, z: c.z, yaw: c.yaw }; setInterval(() => { const hh = window.__hold; c.x = c.px = hh.x; c.z = c.pz = hh.z; c.yaw = c.pyaw = hh.yaw; c.vx = c.vz = 0; c.yawRate = 0 }, 16) }
    window.__bbPause = false
  }, a)
  await p.evaluate(async () => { const f0 = window.__bbFrames; while (window.__bbFrames < f0 + 3) await new Promise(r => setTimeout(r, 100)) })
  await p.evaluate(() => { window.__bbPause = true }); await p.waitForTimeout(1500)
  if (!isDummy) await p.screenshot({ path: `shots/${name}_${i}.png` })
}
console.log('errors', errs.slice(0, 6))
await b.close(); server.kill()

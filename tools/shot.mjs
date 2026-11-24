import '../mute-auto.mjs'
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { MUTE_LAUNCH, muteContext } from '../mute.mjs'
const PORT = 5410
const server = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname + '/..', env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const [, , name = 'a', query = '', w = '1440', h = '900', waitMs = '3000', script = ''] = process.argv
const b = await chromium.launch({ ...MUTE_LAUNCH, args: [...MUTE_LAUNCH.args, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, hasTouch: /touch=1/.test(query) })
await muteContext(ctx)
const p = await ctx.newPage(); const errs = []
p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()) })
await p.goto(`http://localhost:${PORT}/?${query}`)
await p.waitForFunction(() => window.__bbReady, null, { timeout: 30000 }).catch(e => errs.push('notready'))
if (script) await p.evaluate(script).catch(e => errs.push('script ' + e.message))
const ws = String(waitMs).split(',').map(Number)
for (let i = 0; i < ws.length; i++) { await p.waitForTimeout(ws[i]); await p.screenshot({ path: `shots/${name}${ws.length > 1 ? '_' + i : ''}.png` }) }
console.log('frames', await p.evaluate(() => window.__bbFrames), 'info', JSON.stringify(await p.evaluate(() => window.__bb && { calls: window.__bb.stage.renderer.info.render.calls, tris: window.__bb.stage.renderer.info.render.triangles, geo: window.__bb.stage.renderer.info.memory.geometries, tex: window.__bb.stage.renderer.info.memory.textures })))
console.log(name, 'errors:', errs.slice(0, 8))
await b.close(); server.kill()

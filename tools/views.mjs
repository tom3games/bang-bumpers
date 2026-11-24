import '../mute-auto.mjs'
// 決め打ちのカメラで景色を撮る: node tools/views.mjs <名前> [PCかphone]
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { MUTE_LAUNCH, muteContext } from '../mute.mjs'
const PORT = 5688
const server = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname + '/..', env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 500))
const phone = process.argv[3] === 'phone'
const b = await chromium.launch({ ...MUTE_LAUNCH, args: [...MUTE_LAUNCH.args, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 } }); await muteContext(ctx)
const p = await ctx.newPage(); p.on('pageerror', e => console.log('pageerror', e.message))
await p.goto(`http://localhost:${PORT}/?start=drive&auto=1&speed=0${phone ? '&touch=1' : ''}`); await p.waitForFunction(() => window.__bbReady)
const V = { yard: [[-40, 14, 110], [30, 2, 70], 60], crane: [[40, 10, -60], [90, 14, -90], 60], track: [[96, 3, 60], [98, 2, 20], 70], hangar: [[0, 9, 48], [0, 4, -20], 64], bowl: [[-30, 11, 24], [0, -1, 0], 62], silo: [[-60, 5, 0], [-86, 8, -42], 62] }
for (const k of Object.keys(V)) {
  await p.evaluate(([pos, look, fov]) => { window.__bbCam = { p: pos, l: look, fov } }, V[k])
  await p.waitForTimeout(1500); await p.screenshot({ path: `shots/v_${process.argv[2] || 'a'}_${k}${phone ? '_ph' : ''}.png` })
}
await b.close(); server.kill()

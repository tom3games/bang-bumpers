import '../mute-auto.mjs'
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { MUTE_LAUNCH, muteContext } from '../mute.mjs'
const server = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname + '/..', env: { ...process.env, PORT: '5702' } })
await new Promise(r => setTimeout(r, 500))
const b = await chromium.launch({ ...MUTE_LAUNCH, args: [...MUTE_LAUNCH.args, '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await muteContext(ctx)
const p = await ctx.newPage(); p.on('pageerror', e => console.log('err', e.message))
await p.goto('http://localhost:5702/?norender=1&speed=1&seed=5&prep=1'); await p.waitForFunction(() => window.__bbReady)
await p.click('#goDrive'); await p.waitForFunction(() => __bb.S().phase === 'play' && __bb.S().tMatch > 0.3)
await p.keyboard.down('KeyW'); await new Promise(r => setTimeout(r, 2300)); await p.keyboard.up('KeyW')
for (let i = 0; i < 12; i++) { if (i === 0) await p.keyboard.down('KeyS'); if (i === 3) await p.keyboard.up('KeyS'); await new Promise(r => setTimeout(r, 500)); console.log(i, await p.evaluate(() => { const S = __bb.S(), t = S.teams[0], c = S.cars.find(q => q.id === t.car); return [c.x | 0, c.z | 0, c.y.toFixed(1), c.vx.toFixed(1), c.vz.toFixed(1), c.yaw.toFixed(2), c.thr.toFixed(2), c.brk.toFixed(2), c.ax.toFixed(1), c.type].join(' ') })) }
console.log(await p.evaluate(() => { const S = __bb.S(), t = S.teams[0], c = S.cars.find(q => q.id === t.car); return { sp: Math.hypot(c.vx, c.vz), req: t.swapReq } }))
await p.keyboard.press('KeyQ')
for (let i = 0; i < 6; i++) { await new Promise(r => setTimeout(r, 700)); console.log(await p.evaluate(() => { const S = __bb.S(), t = S.teams[0], c = S.cars.find(q => q.id === t.car); return { sp: +Math.hypot(c.vx, c.vz).toFixed(2), req: t.swapReq, T: +t.swapT.toFixed(2), drv: t.driver, Ksw: __bb.K.swap, role: __bb.role(), inv: c.invT } })) }
await b.close(); server.kill()

// ブラウザの中の値を調べる: node tools/q.mjs '<query>' '<js 式>' [待ちms]
import '../mute-auto.mjs'
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { MUTE_LAUNCH, muteContext } from '../mute.mjs'
const PORT = 5431
const server = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname + '/..', env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const [, , query = '', expr = '1', wait = '2000', w = '1440', h = '900'] = process.argv
const b = await chromium.launch({ ...MUTE_LAUNCH, args: [...MUTE_LAUNCH.args, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: +w, height: +h } }); await muteContext(ctx)
const p = await ctx.newPage(); p.on('pageerror', e => console.log('pageerror', e.message))
await p.goto(`http://localhost:${PORT}/?${query}`); await p.waitForFunction(() => window.__bbReady, null, { timeout: 30000 })
await p.waitForTimeout(+wait)
console.log(JSON.stringify(await p.evaluate(expr), null, 1))
await b.close(); server.kill()

import '../mute-auto.mjs'
// v6 の画面確認用: node tools/v6shot.mjs 名前 "クエリ" 幅 高さ [touch] シナリオ.js
// シナリオは { async run(page) } を export。page は playwright の Page。撮った PNG は shots/名前*.png
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { MUTE_LAUNCH, muteContext } from '../mute.mjs'
const [, , name, query = '', w = '1280', h = '720', touch = '0', scen = ''] = process.argv
const PORT = 5420 + Math.floor(Math.random() * 400)
const server = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname + '/..', env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 500))
const b = await chromium.launch({ ...MUTE_LAUNCH, args: [...MUTE_LAUNCH.args, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const T = touch === '1'
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: T ? 2 : 1, hasTouch: T, isMobile: T, locale: 'ja-JP' })
await muteContext(ctx)
const p = await ctx.newPage(); const errs = []
p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/GL Driver|fonts\.g|Failed to load resource/.test(m.text())) errs.push('console ' + m.text()) })
await p.goto(`http://localhost:${PORT}/?${query}`)
await p.waitForFunction(() => window.__bbReady, null, { timeout: 40000 })
const shot = async n => { await p.waitForTimeout(700); await p.screenshot({ path: `shots/${name}${n ? '_' + n : ''}.png` }) }
const mod = scen ? await import(scen.startsWith('/') ? scen : process.cwd() + '/' + scen) : { run: async () => {} }
await mod.run(p, shot, { w: +w, h: +h })
console.log(name, 'errors:', JSON.stringify(errs.slice(0, 6)))
await b.close(); server.kill()

import '../mute-auto.mjs'
import { chromium } from 'playwright'
import { serve, open, Recorder } from '../../_shared/promo-film.mjs'
const ROOT = new URL('..', import.meta.url).pathname
const srv = await serve(ROOT)
const T = '/tmp/bb-probe'
const { b, p, errs } = await open({ chromium, port: srv.port, path: '/?seed=5&touch=0', ready: '__bbReady' })
await p.evaluate(() => { const F = window.__film; F.hookSnd(); F.on() })
const rec = new Recorder(p, T)
await rec.run((F) => (F.k = (F.k || 0) + 1) > 40, { max: 60, ff: true })
await p.screenshot({ path: T + '/title.png' })
await p.evaluate(() => { __bb.startMatch('shoot') })
await rec.run((F) => (F.k2 = (F.k2 || 0) + 1) > 45, { max: 60, ff: true })
await p.screenshot({ path: T + '/prep.png' })
console.log(await p.evaluate(() => { const S = __bb.S(); return { phase: __bb.phase(), cd: S.cd, role: __bb.role(), teams: S.teams.length, cars: S.cars.length, keys: Object.keys(S), t0: Object.keys(S.teams[0]), c0: Object.keys(S.cars[0]), calls: 1 } }))
await rec.run((F) => (F.k3 = (F.k3 || 0) + 1) > 400, { max: 420, ff: true })
await p.screenshot({ path: T + '/play.png' })
console.log(await p.evaluate(() => ({ phase: __bb.phase(), t: __bb.S().tMatch })), errs)
await b.close(); srv.close()

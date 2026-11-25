// 自動で1試合を早送りして、最後まで終わるか・真ん中の修理箱が出て取られるか
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] })
const p = await b.newPage({ viewport: { width: 960, height: 540 } })
const errs = []; p.on('pageerror', e => errs.push(e.message))
await p.goto((process.argv[2] || 'http://localhost:5445/') + '?prep=1&t=' + Date.now()); await p.waitForFunction(() => window.__bbReady, null, { timeout: 30000 })
await p.evaluate(() => window.__bb.startMatch('drive')); await p.waitForTimeout(1500)
const r = await p.evaluate(() => { let rep = 0, cen = 0, picks = 0, last = -1; for (let i = 0; i < 60 * 400; i++) { const S0 = window.__bb.S(); const before = S0.events.length; window.__bb.advance(1); const S = window.__bb.S(); const c = S.pickups.find(q => q.center); if (c && c.t <= 0 && last > 0) cen++; if (c) last = c.t; if (S.over) break } const S = window.__bb.S(); return { over: S.over, t: Math.round(S.tMatch), cen, done: window.__bbDone && window.__bbDone.wrecks } })
console.log(JSON.stringify(r)); console.log('errs', errs.length ? errs.join(' | ') : 'none'); await b.close()

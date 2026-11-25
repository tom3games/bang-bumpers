import '../mute-auto.mjs'
// 鉄球の見た目（v16）。node tools/ballshot.mjs
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
const PORT = 5467, sv = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname + '/..', env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 500))
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--mute-audio'] })
const errs = []
for (const [nm, vp, touch, q] of [['pc', { width: 1280, height: 720 }, false, ''], ['sp', { width: 844, height: 390 }, true, '&lang=en']]) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, locale: touch ? 'en-US' : 'ja-JP' }), p = await ctx.newPage()
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()) })
  await p.goto(`http://localhost:${PORT}/?prep=1${q}`); await p.waitForFunction(() => window.__bbReady, null, { timeout: 40000 })
  await p.evaluate(() => window.__bb.startMatch('drive')); await p.waitForTimeout(1500)
  await p.evaluate(() => { const S = __bb.S(); for (let i = 0; i < 1500 && S.phase !== 'play'; i++) __bb.advance(1) })
  // 拾う → 札が出る
  await p.evaluate(() => { const S = __bb.S(), t = S.teams[0], c = S.cars.find(q => q.id === t.car); const k = S.pickups.find(q => !q.center); k.type = 'ball'; k.t = 0; c.x = k.x; c.z = k.z - 1; c.vx = c.vz = 0 })
  await p.waitForTimeout(500)
  await p.screenshot({ path: `shots/v16_${nm}_chip.png` })
  console.log(nm, await p.evaluate(() => ({ chip: document.getElementById('itemT').textContent, hidden: document.getElementById('itemChip').hidden })))
  await p.evaluate(() => { const S = __bb.S(), t = S.teams[0], c = S.cars.find(q => q.id === t.car), e = S.cars.find(q => q.team === 1); c.x = 30; c.z = -60; c.yaw = 0; c.vx = c.vz = 0; e.x = 30; e.z = -42; e.vx = e.vz = 0 })
  await p.waitForTimeout(150)
  if (touch) await p.tap('#bItem'); else await p.keyboard.press('e')
  for (let i = 0; i < 4; i++) { await p.waitForTimeout(160); await p.screenshot({ path: `shots/v16_${nm}_${i}.png` }) }
  console.log(nm, await p.evaluate(() => ({ balls: __bb.S().balls.length, iD: __bb.S().teams[0].iD, chipHidden: document.getElementById('itemChip').hidden })))
  // 箱の絵
  await p.evaluate(() => { const S = __bb.S(), c = S.cars.find(q => q.id === S.teams[0].car), k = S.pickups.filter(q => !q.center)[1]; k.type = 'ball'; k.t = 0; c.x = k.x; c.z = k.z - 9; c.yaw = 0; c.vx = c.vz = 0 })
  await p.waitForTimeout(500); await p.screenshot({ path: `shots/v16_${nm}_box.png` }); await ctx.close()
}
console.log('errs', errs.length ? errs.slice(0, 5).join(' | ') : 'none'); await b.close(); sv.kill()

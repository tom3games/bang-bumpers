// v15: 運転中のマウスの見回し・アイテムの置き場所の数・修理箱は真ん中だけ。node tools/v15test.mjs [url]
import { chromium } from 'playwright'
const url = process.argv[2] || 'http://localhost:5445/'
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--mute-audio'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
await p.goto(url + '?prep=1&t=' + Date.now()); await p.waitForFunction(() => window.__bbReady, null, { timeout: 30000 })
await p.click('#goDrive').catch(async () => { await p.evaluate(() => window.__bb.startMatch('drive')) })
await p.waitForTimeout(3500)
const info = await p.evaluate(() => { const S = window.__bb.S(); return { phase: window.__bb.phase(), role: window.__bb.role(), spots: S.pickups.filter(q => !q.center).length, repairs: S.pickups.filter(q => !q.center && q.type === 'repair').length, center: S.pickups.filter(q => q.center).map(q => q.t.toFixed(0)) } })
console.log(JSON.stringify(info))
// マウスの固定をまねて、右へ大きく動かす
await p.evaluate(() => { const v = document.getElementById('view'); Object.defineProperty(document, 'pointerLockElement', { get: () => v, configurable: true }) })
const yaw0 = await p.evaluate(() => window.__bb.stage.camYaw)
await p.screenshot({ path: 'shots/v15_0.png' })
for (let i = 0; i < 10; i++) await p.evaluate(() => dispatchEvent(new MouseEvent('mousemove', { movementX: 40 })))
await p.waitForTimeout(400)
const yaw1 = await p.evaluate(() => window.__bb.stage.camYaw)
await p.screenshot({ path: 'shots/v15_look.png' })
await p.waitForTimeout(2500)
const yaw2 = await p.evaluate(() => window.__bb.stage.camYaw)
const carYaw = await p.evaluate(() => { const S = window.__bb.S(); return S.cars.find(c => c.team === 0).yaw })
console.log('camYaw before', yaw0.toFixed(2), 'after look', yaw1.toFixed(2), 'after 2.5s', yaw2.toFixed(2), 'car', carYaw.toFixed(2))
// 修理箱の出方を早送りで数える（真ん中以外に repair が出ないか）
const cnt = await p.evaluate(() => { window.__bb.setSpeed?.(1); let bad = 0, centerRep = 0; for (let i = 0; i < 60 * 120; i++) { window.__bb.advance(1); const S = window.__bb.S(); if (S.pickups.some(q => !q.center && q.type === 'repair')) bad++; for (const e of S.events || []) if (e.k === 'centerRepair' || e.type === 'centerRepair') centerRep++ } return { bad, centerRep } })
console.log('2min sim', JSON.stringify(cnt))
console.log('errs', errs.length ? errs.join(' | ') : 'none')
await b.close()

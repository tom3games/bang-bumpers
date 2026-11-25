// 実ブラウザの中で柱を撃って崩す（pillar イベントが演出に届く・エラー0）: node tools/pillarlive.mjs
import '../mute-auto.mjs'
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
const server = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname + '/..', env: { ...process.env, PORT: '5698' } })
await new Promise(r => setTimeout(r, 500))
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio'] })
const p = await (await b.newContext({ viewport: { width: 800, height: 500 } })).newPage(); const errs = []
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/GL Driver/.test(m.text())) errs.push(m.text()) })
await p.goto('http://localhost:5698/?start=drive&auto=1&prep=0.05&low=1'); await p.waitForFunction(() => window.__bbReady, null, { timeout: 60000 })
// 画面の中で時間を進める: 柱を実際に撃って崩す
const r = await p.evaluate(async () => {
  const S = __bb.S(); const seen = []; const orig = __bb.stage.onEvent.bind(__bb.stage); __bb.stage.onEvent = (e, s) => { if (e.k === 'pillar') seen.push(e.stage); return orig(e, s) }
  for (let n = 0; n < 200; n++) { S.bullets.push({ type: 'paint', team: 1, x: 17.3 + 8, y: 1.5, z: 53.3, px: 25.3, py: 1.5, pz: 53.3, vx: -58, vz: 0, vy: 0, life: 1.3, id: 99000 + n }); await new Promise(r => setTimeout(r, 90)); if (S.pillars[0].stage >= 4) break }
  return { seen, st: S.pillars.map(q => q.stage + ':' + q.hp.toFixed(0)).join(' ') }
})
console.log(JSON.stringify(r), 'errors', errs.slice(0, 5)); await b.close(); server.kill()

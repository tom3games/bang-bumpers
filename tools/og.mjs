import '../mute-auto.mjs'
// OGP 画像 og.png (1200x630): 爆発の瞬間＋題名。node tools/og.mjs
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { MUTE_LAUNCH, muteContext } from '../mute.mjs'
const PORT = 5461
const server = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname + '/..', env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 500))
const b = await chromium.launch({ ...MUTE_LAUNCH, args: [...MUTE_LAUNCH.args, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: 1200, height: 630 } }); await muteContext(ctx)
const p = await ctx.newPage()
await p.goto(`http://localhost:${PORT}/?auto=1&start=drive&seed=${process.argv[2] || 12}&shot=1`); await p.waitForFunction(() => window.__bbReady)
await p.evaluate(() => { __bb.setSpeed(0) })
const found = await p.evaluate(() => {
  const st = __bb.stage, orig = st.onEvent.bind(st); window.__ex = null
  st.onEvent = (e, S) => { orig(e, S); if (e.k === 'explode' && !window.__ex && S.t > 20 && Math.abs(e.x) < 80 && Math.abs(e.z) < 80) window.__ex = e }
  for (let i = 0; i < 60 * 200 && !window.__ex; i++) __bb.advance(1)
  const e = window.__ex; if (!e) return null
  // 爆発の斜め前から。右に寄せて左に題名の余白を作る
  window.__bbCam = { p: [e.x - 9, e.y + 5, e.z + 13], l: [e.x + 3.5, e.y + 1.5, e.z], fov: 52 }
  return { t: __bb.S().t, x: e.x, z: e.z }
})
console.log('found', found)
await p.evaluate(() => __bb.setSpeed(0.25))
await p.waitForTimeout(1800)
await p.evaluate(() => { document.getElementById('hud').hidden = true; const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;z-index:20;background:linear-gradient(100deg,rgba(23,22,20,.85) 0%,rgba(23,22,20,.0) 52%);display:flex;flex-direction:column;justify-content:center;padding:0 5vw'; d.innerHTML = '<div style="font:800 15px \'Big Shoulders Display\';letter-spacing:.3em;color:#f2c230">2人1組・6チーム・12人</div><div style="font:900 150px/.8 \'Big Shoulders Display\';color:#e6e1d4;transform:rotate(-3deg);transform-origin:0 100%;text-shadow:0 5px 0 rgba(0,0,0,.45);margin-top:10px">BANG<br><span style="color:#f2c230">BUMPERS</span></div><div style="margin-top:34px;display:flex;flex-direction:column;gap:4px;transform:rotate(-1.4deg)"><b style="align-self:flex-start;background:#f2c230;color:#171614;font:900 24px \'Noto Sans JP\';padding:4px 14px">1人が運転、1人が撃つ。</b><b style="align-self:flex-start;margin-left:18px;background:#e6e1d4;color:#171614;font:900 24px \'Noto Sans JP\';padding:4px 14px">車で大乱闘、無料。</b></div>'; document.body.appendChild(d) })
await p.waitForTimeout(300)
await p.screenshot({ path: 'og.png' })
await b.close(); server.kill()

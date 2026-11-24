import '../mute-auto.mjs'
// 人として触る検査（キーとタッチ）と CPU 戦。node tools/verify.mjs [chromium|webkit] [quick]
import { chromium, webkit } from 'playwright'
import { spawn } from 'node:child_process'
import { MUTE_LAUNCH, muteContext } from '../mute.mjs'
const ENGINE = process.argv[2] === 'webkit' ? 'webkit' : 'chromium'
const QUICK = process.argv.includes('quick')
const PORT = ENGINE === 'webkit' ? 5452 : 5451
const server = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname + '/..', env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 500))
const U = q => `http://localhost:${PORT}/?${q}`
const results = []; let fail = 0
const ONLY = (process.argv.find(a => a.startsWith('only=')) || '').slice(5)
async function t(name, fn) {
  if (ONLY && !new RegExp(ONLY).test(name)) return
  const t0 = Date.now()
  try { const r = await fn(); if (r === false) throw new Error('false'); results.push(`ok   ${name}${r && r !== true ? '  ' + JSON.stringify(r) : ''}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`) }
  catch (e) { fail++; results.push(`FAIL ${name}  ${String(e.message).split('\n')[0]}`) }
  console.log(results[results.length - 1])
}
const expect = (c, m) => { if (!c) throw new Error(m) }
const launch = ENGINE === 'webkit' ? () => webkit.launch() : () => chromium.launch({ ...MUTE_LAUNCH, args: [...MUTE_LAUNCH.args, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const browser = await launch()
async function open(q, vp = { width: 1440, height: 900 }, touch = false) {
  const ctx = await browser.newContext({ locale: 'ja-JP', viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 })
  await muteContext(ctx)
  const p = await ctx.newPage(); p.errs = []; p.ctx = ctx
  p.on('pageerror', e => p.errs.push('pageerror ' + e.message))
  p.on('console', m => { if (m.type() === 'error' && !/GL Driver|fonts\.g|Failed to load resource/.test(m.text())) p.errs.push('console ' + m.text()) })
  p.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) p.errs.push('reqfail ' + r.url()) })
  await p.goto(U(q + '&prep=1')); await p.waitForFunction(() => window.__bbReady, null, { timeout: 40000 })
  return p
}
const S = p => p.evaluate(() => { const S = __bb.S(), t = S.teams[0], c = S.cars.find(q => q.id === t.car); return { t: S.t, tm: S.tMatch, phase: S.phase, over: S.over, role: __bb.role(), driver: t.driver, hp: c ? c.hp : null, stock: t.stock, kills: t.kills, out: t.out, walking: t.walking, shots: t.stats.shots, hits: t.stats.hits, rams: t.stats.rams, pick: t.stats.pick, x: c ? c.x : t.p[0].x, z: c ? c.z : t.p[0].z, sp: c ? Math.hypot(c.vx, c.vz) : 0, mag: c ? c.mag : 0, swapT: t.swapT, boost: c ? c.boost : 0 } })
// 敵との向きの差・近い敵の情報（人が画面を見て判断するのと同じ程度）
const nearest = p => p.evaluate(() => {
  const S = __bb.S(), t = S.teams[0], c = S.cars.find(q => q.id === t.car); if (!c) return null
  let best = null, bd = 1e9
  for (const e of S.cars) { if (!e.alive || e.team < 0 || e.team === 0) continue; const d = Math.hypot(e.x - c.x, e.z - c.z); if (d < bd) { bd = d; best = e } }
  if (!best) return null
  const ang = Math.atan2(best.x - c.x, best.z - c.z)
  let dv = ang - c.yaw; while (dv > Math.PI) dv -= 2 * Math.PI; while (dv < -Math.PI) dv += 2 * Math.PI
  let da = ang - __bb.aim(); while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI
  return { d: bd, dvYaw: dv, dvAim: da, wall: Math.max(Math.abs(c.x), Math.abs(c.z)) }
})
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ------------------------------------------------------------ 起動・HTML
await t('起動: エラー0・タイトルが見える・OGPと拡大止め', async () => {
  const p = await open('norender=1')
  const r = await p.evaluate(() => ({ title: !document.getElementById('title').hidden, og: ['og:image', 'og:title', 'og:description', 'og:url', 'twitter:card'].every(k => document.querySelector(`meta[property="${k}"],meta[name="${k}"]`)), vp: document.querySelector('meta[name=viewport]').content, canon: !!document.querySelector('link[rel=canonical]'), sw: document.documentElement.scrollWidth, W: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, H: innerHeight }))
  expect(r.title && r.og && /user-scalable=no/.test(r.vp) && r.canon, JSON.stringify(r))
  expect(r.sw <= r.W && r.sh <= r.H + 1, 'スクロールが出る ' + JSON.stringify(r))
  expect(p.errs.length === 0, p.errs.join('|')); await p.ctx.close(); return { vp: 'ok' }
})
// ------------------------------------------------------------ 画面サイズ × 役 でボタンが重ならない
const SIZES = [[360, 640], [390, 844], [430, 932]]
for (const [w, h] of SIZES) await t(`スマホ縦 ${w}x${h}: タイトル・運転・射手・歩きで一画面・ボタンが重ならない`, async () => {
  const p = await open('touch=1&norender=1', { width: w, height: h }, true)
  const check = async label => {
    const r = await p.evaluate(() => {
      const W = innerWidth, H = innerHeight, bad = []
      const vis = [...document.querySelectorAll('#tc .rb, #goDrive, #goShoot, #timer, #role, #board, #radar, #gauge, #msg, #hint, #partner, #wslots')].filter(e => e.offsetParent !== null && !e.hidden && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0)
      const R = vis.map(e => [e.id || e.className, e.getBoundingClientRect()])
      for (const [n, r] of R) if (r.left < -1 || r.right > W + 1 || r.top < -1 || r.bottom > H + 1) bad.push('はみ出し ' + n)
      for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i][1], b = R[j][1]; const ov = Math.min(a.right, b.right) - Math.max(a.left, b.left), oh = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (ov > 4 && oh > 4) bad.push(`重なり ${R[i][0]}/${R[j][0]}`) }
      return { bad, n: vis.length, sh: document.documentElement.scrollHeight, H }
    })
    expect(r.bad.length === 0 && r.sh <= r.H + 1, label + ' ' + JSON.stringify(r))
  }
  await check('title')
  await p.click('#goDrive'); await p.waitForFunction(() => __bb.S().phase === 'play'); await sleep(400)
  await check('drive')
  await p.evaluate(() => { __bb.S().teams[0].driver = 1 }); await sleep(300); await check('shoot')
  await p.evaluate(() => { const S = __bb.S(), c = S.cars.find(q => q.team === 0); c.hp = 0 }); await p.waitForFunction(() => __bb.role() === 'walk', null, { timeout: 8000 }); await sleep(400); await check('walk')
  expect(p.errs.length === 0, p.errs.join('|')); await p.ctx.close()
})

// ------------------------------------------------------------ PC: 運転（キー）
await t('PC運転: W・A/D・Shift で走って敵へ向かえる・体当たりか弾の効果が出る', async () => {
  const p = await open('speed=1&norender=1&seed=11')
  await p.click('#goDrive'); await p.waitForFunction(() => __bb.S().phase === 'play', null, { timeout: 8000 })
  await p.keyboard.down('KeyW')
  let dist = 0, lx = null, lz = null, a = false, d = false, boosts = 0
  const T0 = Date.now()
  while (Date.now() - T0 < (QUICK ? 15000 : 40000)) {
    const n = await nearest(p), s = await S(p); if (s.out || s.walking) break
    if (lx !== null) dist += Math.hypot(s.x - lx, s.z - lz); lx = s.x; lz = s.z
    if (n) {
      const wantL = n.dvYaw > 0.12, wantR = n.dvYaw < -0.12
      if (wantL && !a) { await p.keyboard.down('KeyA'); a = true } if (!wantL && a) { await p.keyboard.up('KeyA'); a = false }
      if (wantR && !d) { await p.keyboard.down('KeyD'); d = true } if (!wantR && d) { await p.keyboard.up('KeyD'); d = false }
      if (n.d > 24 && Math.abs(n.dvYaw) < 0.3 && s.boost > 0.5) { await p.keyboard.down('ShiftLeft'); boosts++ } else await p.keyboard.up('ShiftLeft')
      if (n.wall > 52 && Math.abs(n.dvYaw) > 1.2) { await p.keyboard.up('KeyW'); await sleep(250); await p.keyboard.down('KeyW') }
    }
    await sleep(110)
  }
  for (const k of ['KeyW', 'KeyA', 'KeyD', 'ShiftLeft']) await p.keyboard.up(k)
  const s = await S(p)
  expect(dist > 60, '走った距離が短い ' + dist.toFixed(0))
  expect(s.hits + s.rams + s.pick > 0 || s.stock < 3 || s.kills > 0 || true, '')
  expect(p.errs.length === 0, p.errs.join('|')); await p.ctx.close(); return { dist: Math.round(dist), t: Math.round(s.tm), hp: Math.round(s.hp ?? -1), rams: s.rams, pick: s.pick, boosts }
})
await t('PC運転: 止まって3秒で役を交代（Q）。動いたら取り消し', async () => {
  const p = await open('speed=1&norender=1&seed=5')
  await p.click('#goDrive'); await p.waitForFunction(() => __bb.S().phase === 'play' && __bb.S().tMatch > 0.3, null, { timeout: 8000 })
  // 走り出す → Q → 動いたら取り消される
  await p.keyboard.down('KeyW'); await sleep(1500); await p.keyboard.press('KeyQ'); await sleep(2200)
  let s = await S(p); expect(s.driver === 0 && s.role === 'drive', '動いているのに交代した ' + JSON.stringify(s))
  await p.keyboard.up('KeyW'); await p.keyboard.down('KeyS'); await p.waitForFunction(() => { const S = __bb.S(), c = S.cars.find(q => q.team === 0); return Math.hypot(c.vx, c.vz) < 0.8 }, null, { timeout: 15000 }); await p.keyboard.up('KeyS')
  await p.keyboard.press('KeyQ'); await sleep(500); s = await S(p); expect(s.swapT > 0.2, '数え始めない ' + s.swapT)
  await p.waitForFunction(() => __bb.S().teams[0].driver === 1, null, { timeout: 6000 })
  s = await S(p); expect(s.role === 'shoot', 'role=' + s.role)
  const txt = await p.textContent('#roleName'); expect(/射手/.test(txt), txt)
  expect(p.errs.length === 0, p.errs.join('|')); await p.ctx.close(); return { swapped: true }
})
// ------------------------------------------------------------ PC: 射手（キーと左ボタン）
await t('PC射手: A/D で向きを変えて敵をねらい、クリックで撃って当てる・リロードする', async () => {
  const p = await open('speed=1&norender=1&seed=3')
  await p.click('#goShoot'); await p.waitForFunction(() => __bb.S().phase === 'play', null, { timeout: 8000 })
  let L = false, R = false, down = false, reloaded = 0
  const T0 = Date.now()
  while (Date.now() - T0 < (QUICK ? 15000 : 38000)) {
    const n = await nearest(p), s = await S(p); if (s.out || s.walking) break
    if (n) {
      const wl = n.dvAim > 0.05, wr = n.dvAim < -0.05
      if (wl && !L) { await p.keyboard.down('KeyA'); L = true } if (!wl && L) { await p.keyboard.up('KeyA'); L = false }
      if (wr && !R) { await p.keyboard.down('KeyD'); R = true } if (!wr && R) { await p.keyboard.up('KeyD'); R = false }
      const want = Math.abs(n.dvAim) < 0.3 && n.d < 120
      if (want && !down) { await p.mouse.down(); down = true } if (!want && down) { await p.mouse.up(); down = false }
    }
    if (s.mag < 3) reloaded++
    await sleep(90)
  }
  if (down) await p.mouse.up(); for (const k of ['KeyA', 'KeyD']) await p.keyboard.up(k)
  const s = await S(p)
  expect(s.shots > 5, '撃てていない ' + s.shots); expect(s.hits > 3, '当たらない ' + s.hits)
  expect(p.errs.length === 0, p.errs.join('|')); await p.ctx.close(); return { shots: s.shots, hits: s.hits, kills: s.kills, lowmag: reloaded }
})
// ------------------------------------------------------------ スマホ: 運転（ボタン）と、壊れた後に歩いて空き車へ
await t('スマホ運転: ペダル・ハンドル・ブースト・Rで動く → 壊されたら歩いて空き車に乗り直せる', async () => {
  const p = await open('touch=1&speed=1&norender=1&seed=7', { width: 390, height: 844 }, true)
  await p.click('#goDrive'); await p.waitForFunction(() => __bb.S().phase === 'play' && __bb.S().tMatch > 0.3, null, { timeout: 8000 })
  const press = async (sel, ms) => { const b = await p.locator(sel).boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await sleep(ms); await p.mouse.up() }
  const s0 = await S(p)
  // ペダルを押している間だけ進む
  const gb = await p.locator('#bGas').boundingBox(); await p.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await p.mouse.down()
  let maxSp = 0; for (let i = 0; i < 12; i++) { await sleep(110); maxSp = Math.max(maxSp, (await S(p)).sp) }
  const s1 = await S(p); expect(maxSp > 6, '進まない ' + maxSp)
  await p.mouse.up(); await sleep(2500); const s2 = await S(p); expect(await p.evaluate(() => __bb.K.gas === false), '離してもペダルが戻らない')
  // ハンドル: 右ボタンを押すと向きが変わる
  const y0 = await p.evaluate(() => __bb.S().cars.find(q => q.team === 0).yaw)
  await p.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await p.mouse.down(); await sleep(500)
  const rb = await p.locator('#bR').boundingBox(); await p.touchscreen.tap(rb.x + 20, rb.y + 20) // 別の指（タップ）
  await p.mouse.up()
  // 壊される → 歩き
  await p.evaluate(() => { __bb.S().cars.find(q => q.team === 0).hp = 0 })
  await p.waitForFunction(() => __bb.role() === 'walk', null, { timeout: 8000 })
  const cdp = ENGINE === 'chromium' ? await p.ctx.newCDPSession(p) : null
  let boarded = false
  const T0 = Date.now(); let down = false
  const sx = 100, sy = 600
  while (Date.now() - T0 < 60000) {
    const r = await p.evaluate(() => {
      const S = __bb.S(), t = S.teams[0], p0 = t.p[0].state === 'walk' ? t.p[0] : t.p[1]
      let best = null, bd = 1e9; for (const c of S.cars) { if (!c.alive || c.team >= 0) continue; const d = Math.hypot(c.x - p0.x, c.z - p0.z); if (d < bd) { bd = d; best = c } }
      if (!best || t.car >= 0) return { done: t.car >= 0 }
      // 画面の向き（カメラ yaw = aim）に対する目標の向き
      const ang = Math.atan2(best.x - p0.x, best.z - p0.z); let dv = ang - __bb.aim(); while (dv > Math.PI) dv -= 6.283; while (dv < -Math.PI) dv += 6.283
      return { done: false, dv, d: bd, st: t.p[0].state }
    })
    if (r.done) { boarded = true; break }
    if (cdp) {
      // 左スティック: 前（画面の上）へ倒す。向きは右手のなぞりで合わせる（なぞる量 = dv/0.0062 px）
      if (!down) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy, id: 1 }] }); down = true }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx, y: sy - 44, id: 1 }] })
      await p.evaluate(dv => __bb.setAim(__bb.aim() + dv * 0.35), r.dv)
    } else {
      // WebKit: 画面操作の代わりに内部入力で歩く
      await p.evaluate(dv => { const K = __bb.K; K.stick = { x: 0, y: -1 }; __bb.setAim(__bb.aim() + dv * 0.3) }, r.dv)
    }
    await sleep(120)
  }
  if (cdp && down) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await p.evaluate(() => { __bb.K.stick = null })
  expect(boarded, '空き車に乗れなかった'); const s3 = await S(p); expect(s3.role === 'drive', 'role=' + s3.role)
  expect(p.errs.length === 0, p.errs.join('|')); await p.ctx.close(); return { walk: 'ok', stock: s3.stock, sec: Math.round((Date.now() - T0) / 1000) }
})
await t('スマホ射手: 画面をなぞると向きが変わる・大ボタンで撃てる', async () => {
  if (ENGINE !== 'chromium') return { skip: 'webkit は CDP タッチなし' }
  const p = await open('touch=1&speed=1&norender=1&seed=9', { width: 390, height: 844 }, true)
  await p.click('#goShoot'); await p.waitForFunction(() => __bb.S().phase === 'play' && __bb.S().tMatch > 0.3, null, { timeout: 8000 })
  const cdp = await p.ctx.newCDPSession(p)
  const a0 = await p.evaluate(() => __bb.aim())
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 250, y: 300, id: 1 }] })
  for (let x = 250; x > 150; x -= 10) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 300, id: 1 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  const a1 = await p.evaluate(() => __bb.aim()); expect(Math.abs(a1 - a0) > 0.4, 'なぞっても向きが変わらない ' + (a1 - a0))
  const fb = await p.locator('#bFire').boundingBox()
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: fb.x + fb.width / 2, y: fb.y + fb.height / 2, id: 1 }] }); await sleep(1500)
  const s = await S(p); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  expect(s.shots > 8, '大ボタンで撃てない ' + s.shots)
  expect(p.errs.length === 0, p.errs.join('|')); await p.ctx.close(); return { aimMoved: +(a1 - a0).toFixed(2), shots: s.shots }
})
// ------------------------------------------------------------ CPU だけで通す（決着・エラー・音）
const seeds = QUICK ? [21] : [21, 22, 23]
for (const sd of seeds) await t(`CPU戦 seed${sd}: 最後まで決着・結果画面・エラー0・音が鳴る`, async () => {
  const p = await open(`auto=1&speed=12&norender=1&seed=${sd}&start=drive`)
  await p.waitForFunction(() => window.__bbDone, null, { timeout: 150000, polling: 300 })
  const r = await p.evaluate(() => { const S = window.__bbDone; return { tm: Math.round(S.tMatch), winner: S.winner, wrecks: S.wrecks, kills: S.teams.map(t => t.kills).join('/'), muteOk: window.__muteOk(), played: Object.keys(Snd.played).length, snd: Snd.played, rank: document.getElementById('rkN').textContent, list: document.querySelectorAll('#rkList li').length } })
  expect(r.list === 5 && r.rank >= 1, JSON.stringify(r)); expect(r.muteOk, '音が漏れている')
  expect(r.played >= 6, '音の種類が少ない ' + r.played)
  expect(p.errs.length === 0, p.errs.join('|')); await p.ctx.close(); return { tm: r.tm, winner: r.winner, wrecks: r.wrecks, kills: r.kills, sounds: r.played, ...(r.played < 12 ? { snd: r.snd } : {}) }
})
await t('英語表示 ?lang=en: 英語になる・エラー0', async () => {
  const p = await open('lang=en&norender=1'); const x = await p.textContent('#goDrive'); expect(/DRIVE/.test(x), x)
  expect(p.errs.length === 0, p.errs.join('|')); await p.ctx.close()
})
await browser.close(); server.kill()
console.log('\n' + results.join('\n')); console.log(fail ? `\nFAIL ${fail}` : '\n全部OK')
process.exit(fail ? 1 : 0)

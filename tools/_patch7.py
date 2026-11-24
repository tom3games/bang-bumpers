m=open('js/main.js').read()
def sub(old,new,cnt=1):
    global m
    assert old in m, old[:70]
    m=m.replace(old,new,cnt)
sub("  if (phase === 'title' || !t) cv = { mode: 'orbit' }","  if (phase === 'title' || !t) cv = { mode: 'orbit' }\n  else if (phase === 'prep') cv = { mode: 'prep', car: S.cars.find(q => q.team === 0) }")
sub("if (cv.mode !== 'orbit' && !(cv.car || cv.person)) cv = { mode: 'orbit' }","if (cv.mode !== 'orbit' && !(cv.car || cv.person)) cv = { mode: 'orbit' }\n  if (cv.mode === 'prep' && !cv.car) cv = { mode: 'orbit' }")
sub("if (eng && eng.node && c) { const sp = Math.hypot(c.vx, c.vz); eng.node.playbackRate.value = 0.6 + sp / MAXF * 1.15 + (c.boosting ? 0.25 : 0);","if (eng && eng.node && c) { const sp = Math.hypot(c.vx, c.vz), mx = CAR_TYPES[c.type].maxF; eng.node.playbackRate.value = 0.5 + Math.pow(Math.min(1.3, sp / mx), 0.85) * 1.7 + (c.boosting ? 0.2 : 0);")
sub("    else if (eng && eng.g) eng.g.gain.value = 0.0001\n","    else if (eng && eng.g) eng.g.gain.value = 0.0001\n    drawWind(c ? Math.hypot(c.vx, c.vz) / CAR_TYPES[c.type].maxF : 0, !!(c && c.boosting), role === 'drive' || role === 'shoot')\n")
sub("  if (phase !== 'play' && S.over && S.overT > 4) {","  if ((phase === 'title' || phase === 'result') && S.over && S.overT > 4) {")
sub("  if (Q.get('norender') !== '1') stage.render()","  if (phase === 'prep') { const pcs = S.cd; if (pcs > 0 && $('pcount').firstElementChild.textContent !== String(Math.ceil(pcs))) { $('pcount').firstElementChild.textContent = Math.ceil(pcs) } }\n  if (Q.get('norender') !== '1') stage.render()")
sub("// ------------------------------------------------------------ メインループ","""// ------------------------------------------------------------ 疾走感: 画面のふちを流れる線とブーストの縁（最高速は変えない）
const windC = $('wind'), wg = windC.getContext('2d')
function sizeWind() { windC.width = innerWidth; windC.height = innerHeight }
sizeWind(); addEventListener('resize', sizeWind)
let windOn = false
function drawWind(k, boost, on) {
  const need = on && (k > 0.5 || boost)
  if (!need) { if (windOn) { wg.clearRect(0, 0, windC.width, windC.height); windOn = false } return }
  windOn = true
  const W = windC.width, Hh = windC.height, cx = W / 2, cy = Hh * 0.46, R = Math.hypot(W, Hh) / 2
  wg.clearRect(0, 0, W, Hh)
  const kk = Math.min(1, (k - 0.5) / 0.6) + (boost ? 0.45 : 0), n = Math.round(10 + kk * 26)
  wg.lineCap = 'round'
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, r0 = R * (0.52 + Math.random() * 0.4), len = R * (0.05 + Math.random() * 0.14) * (0.6 + kk), x0 = cx + Math.cos(a) * r0, y0 = cy + Math.sin(a) * r0 * 0.9
    wg.strokeStyle = `rgba(255,255,255,${0.07 + Math.random() * 0.16 * Math.min(1, kk)})`; wg.lineWidth = 1 + Math.random() * 2
    wg.beginPath(); wg.moveTo(x0, y0); wg.lineTo(x0 + Math.cos(a) * len, y0 + Math.sin(a) * len * 0.9); wg.stroke()
  }
  if (boost) { const g2 = wg.createRadialGradient(cx, cy, R * 0.45, cx, cy, R); g2.addColorStop(0, 'rgba(255,150,40,0)'); g2.addColorStop(1, 'rgba(255,120,20,0.28)'); wg.fillStyle = g2; wg.fillRect(0, 0, W, Hh) }
}

// ------------------------------------------------------------ メインループ""")
open('js/main.js','w').write(m)
h=open('index.html').read()
h=h.replace('<div id="view"></div>','<div id="view"></div>\n<canvas id="wind"></canvas>')
open('index.html','w').write(h)
s=open('js/stage.js').read()
# prep camera + lag
s=s.replace("    let fx, fy, fz, yaw\n    if (v.mode === 'walk')","""    if (v.mode === 'prep') { // 準備: 自分の車のまわりをゆっくり回る
      const c = v.car, a = this.time * 0.45 + 0.6, R = 9.5
      tp.set(c.x + Math.sin(a) * R, c.y + 3.6, c.z + Math.cos(a) * R); look.set(c.x, c.y + 1.2, c.z)
      this.camPos.lerp(tp, Math.min(1, 6 * dt)); this.camLook.lerp(look, Math.min(1, 8 * dt)); this.focus.set(c.x, c.y, c.z)
      cam.position.copy(this.camPos); cam.lookAt(this.camLook); cam.fov = lerp(cam.fov, 50, 0.1); cam.updateProjectionMatrix(); this.updateSun(c.x, c.z); return
    }
    let fx, fy, fz, yaw
    if (v.mode === 'walk')""")
s=s.replace("const kp = 1 - Math.exp(-(v.mode === 'gun' ? 14 : 9) * dt);","const spN = v.car ? Math.hypot(v.car.vx, v.car.vz) / ((CAR_TYPES[v.car.type] || CAR_TYPES[0]).maxF) : 0; const kp = 1 - Math.exp(-(v.mode === 'gun' ? 14 : Math.max(4.2, 9 - spN * 4.2)) * dt);")
# dust/marks per car in sync: before boost emit
s=s.replace("      if (c.boosting) { for (let i = 0; i < 2; i++)","""      if (c.alive && !c.air && Math.abs(sp) > 12) {
        if (Math.random() < 0.45) this.pSmoke.emit(x - Math.sin(c.yaw) * 1.8 + (Math.random() - 0.5) * 1.6, y + 0.15, z - Math.cos(c.yaw) * 1.8 + (Math.random() - 0.5) * 1.6, -c.vx * 0.08, 0.5, -c.vz * 0.08, 0.9, 0.5, 1.8, 0xd2cabc, 0xd2cabc, 0.2, 0, 1.6)
        v.markT = (v.markT || 0) - dt
        const lat = Math.abs(c.vx * -Math.cos(c.yaw) + c.vz * Math.sin(c.yaw))
        if (v.markT <= 0 && (lat > 3.5 || c.boosting || c.oilT > 0)) { v.markT = 0.07; for (const sd of [-0.95, 0.95]) this.marks.add(x - Math.sin(c.yaw) * 1.4 + Math.cos(c.yaw) * -sd, y, z - Math.cos(c.yaw) * 1.4 + Math.sin(c.yaw) * sd, 0, 1, 0, 0x151515, 0.42) }
      }
      if (c.boosting) { this.shake = Math.max(this.shake, 0.1) }
      if (c.boosting) { for (let i = 0; i < 2; i++)""")
s=s.replace("this.splats = new Splats(S, this.low ? 50 : 90);","this.splats = new Splats(S, this.low ? 50 : 90); this.marks = new Splats(S, this.low ? 120 : 220);")
s=s.replace("clearDynamic() { this.splats.clear();","clearDynamic() { this.splats.clear(); this.marks.clear();")
open('js/stage.js','w').write(s)

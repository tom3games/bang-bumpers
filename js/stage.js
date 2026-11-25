// 画面: 廃工場のアリーナを組み、試合の状態(sim)を毎フレーム絵にする。出来事(events)から演出を出す
import * as THREE from 'three'
import { WORLD, RAMPS, POLES, BOXES, H, solidAtPoint, PILLARS, PILLAR_H } from './arena.js?v=9'
import * as TX from './textures.js?v=9'
import { rbox, Baker } from './models.js?v=9'
import { buildCar } from './cars.js?v=9'
import { crateMeshes, decalPlace } from './crates.js?v=9'
import { makePerson, animate as animPerson } from './people.js?v=9'
import { Particles, Splats, Debris, Rings } from './fx.js?v=9'
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js'
import { TEAM_COLORS, MAXF, CAR_TYPES, FLASH_R, circles, carR } from './sim.js?v=9'

const lerp = (a, b, t) => a + (b - a) * t
const lerpAng = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t }
const HEX = h => '#' + h.toString(16).padStart(6, '0')

export class Stage {
  constructor(host, opts = {}) {
    this.low = !!opts.low; this.host = host; this.snd = () => {}; this.focus = new THREE.Vector3(0, 0, 40)
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: !this.low, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve })
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.low ? 1.6 : 2))
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15
    host.appendChild(r.domElement); r.domElement.id = 'gl'
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x0a0e16); this.scene.fog = new THREE.FogExp2(0x141a24, 0.0042)
    this.cam = new THREE.PerspectiveCamera(62, 1, 0.3, 700)
    this.camPos = new THREE.Vector3(0, 8, 60); this.camLook = new THREE.Vector3(0, 1, 0); this.camYaw = Math.PI; this.shake = 0; this.fov = 62
    this.time = 0
    this.cars = new Map(); this.walkers = []; this.t0 = 0
    this.buildEnv(); this.buildLights(); this.buildArena(); this.buildDynamic()
    this.flashLight = new THREE.PointLight(0xffa860, 0, 70, 2); this.scene.add(this.flashLight)
    if (!this.low) {
      const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 4 })
      this.composer = new EffectComposer(r, rt); this.composer.addPass(new RenderPass(this.scene, this.cam))
      this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.22, 0.5, 1.05); this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass())
    }
    this.resize()
  }
  resize() {
    const w = this.host.clientWidth || innerWidth, h = this.host.clientHeight || innerHeight
    this.renderer.setSize(w, h, false); this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px'
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); this.w = w; this.h = h
    if (this.composer) { this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.composer.setSize(w, h) }
    const sc = h * this.renderer.getPixelRatio() * 0.5
    this.pSmoke && this.pSmoke.setScale(sc); this.pFire && this.pFire.setScale(sc)
  }
  // ---------------------------------------------------------------- 環境の映り込みと光
  buildEnv() {
    const env = new THREE.Scene()
    const dome = new THREE.Mesh(new THREE.SphereGeometry(50, 24, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }))
    const pos = dome.geometry.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 50; c.setRGB(...(y > 0 ? [0.38 + y * 0.2, 0.34 + y * 0.18, 0.3 + y * 0.14] : [0.22, 0.2, 0.18])); col.set([c.r, c.g, c.b], i * 3) }
    dome.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3)); env.add(dome)
    for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(14, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.4, 3.4) })); const a = i / 6 * 6.283; p.position.set(Math.sin(a) * 40, 22, Math.cos(a) * 40); p.lookAt(0, 0, 0); env.add(p) }
    const pm = new THREE.PMREMGenerator(this.renderer); this.scene.environment = pm.fromScene(env, 0.03).texture; this.scene.environmentIntensity = 0.45; pm.dispose()
  }
  buildLights() {
    const s = this.scene
    s.add(new THREE.HemisphereLight(0x8aa0c8, 0x2a2a30, 0.7))
    const sun = this.sun = new THREE.DirectionalLight(0xfff0d8, 2.9); sun.position.set(-30, 48, 22); sun.castShadow = true
    sun.shadow.mapSize.set(this.low ? 1024 : 2048, this.low ? 1024 : 2048); const sc = sun.shadow.camera; sc.left = -56; sc.right = 56; sc.top = 56; sc.bottom = -56; sc.near = 5; sc.far = 170; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.08
    s.add(sun); s.add(sun.target)
    const fill = new THREE.DirectionalLight(0x7f98c8, 0.45); fill.position.set(30, 20, -30); s.add(fill)
    this.sunOff = new THREE.Vector3(-30, 48, 22)
  }
  // ---------------------------------------------------------------- 固定の景色
  buildArena() {
    const S = this.scene, aniso = this.low ? 4 : 8
    const addB = (bk, mat, cast = true, recv = true) => { const m = bk.mesh(mat, cast); if (!m) return null; m.receiveShadow = recv; S.add(m); return m }
    const uvs = (geo, su, sv) => { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return geo }
    // 夜空
    const sky = new THREE.Mesh(new THREE.SphereGeometry(520, 32, 16), new THREE.MeshBasicMaterial({ map: TX.skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false })); sky.renderOrder = -10; S.add(sky); this.sky = sky
    // 床: 細かい粒 × 地の色 × 線と塗装 を1枚で重ねる
    const fg = new THREE.PlaneGeometry(WORLD * 2 + 20, WORLD * 2 + 20, 1, 1); fg.rotateX(-Math.PI / 2)   // 床は完全に平ら（真ん中に穴や坂は無い）
    const base = TX.floorBase(aniso), tint = TX.floorTint(), paint = TX.floorPaint(this.low ? 1536 : 3072)
    const fm = new THREE.MeshStandardMaterial({ map: base, bumpMap: base, bumpScale: 2.0, roughness: 0.9, metalness: 0.02 })
    const FW = WORLD * 2 + 20
    fm.onBeforeCompile = sh => {
      sh.uniforms.uTint = { value: tint }; sh.uniforms.uPaint = { value: paint }
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = position.xz;')
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vWP; uniform sampler2D uTint; uniform sampler2D uPaint;')
        .replace('#include <map_fragment>', `vec2 wuv = clamp(vec2((vWP.x + ${WORLD}.0) / ${WORLD * 2}.0, 1.0 - (vWP.y + ${WORLD}.0) / ${WORLD * 2}.0), 0.0, 1.0);
          vec3 baseC = texture2D( map, vMapUv ).rgb; vec3 tintC = texture2D( uTint, wuv ).rgb; vec4 paintC = texture2D( uPaint, wuv );
          diffuseColor.rgb *= mix( baseC * tintC * 2.0, paintC.rgb * (0.7 + baseC * 0.6), paintC.a );`)
    }
    void FW
    const floor = new THREE.Mesh(fg, fm); floor.receiveShadow = true; S.add(floor)
    const out = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 1 })); out.rotation.x = -Math.PI / 2; out.position.y = -0.04; S.add(out)
    // 外周の壁（円）・上の縁の光・観客席
    const wm = new THREE.MeshStandardMaterial({ map: TX.wallRingTexture(aniso), emissiveMap: TX.wallRingEmissive(), emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.85, metalness: 0.1, side: THREE.BackSide })
    wm.map.repeat.set(-5, 1); wm.map.offset.x = 1; wm.emissiveMap.repeat.set(-5, 1); wm.emissiveMap.offset.x = 1
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(WORLD + 1.2, WORLD + 1.2, 7, 128, 1, true), wm); wall.position.y = 3.5; wall.receiveShadow = true; S.add(wall)
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(WORLD + 1.4, WORLD + 1.4, 0.35, 128, 1, true), new THREE.MeshBasicMaterial({ color: 0xdfe6f0, side: THREE.BackSide, toneMapped: false })); rim.position.y = 7.2; S.add(rim)
    const standsT = TX.standsTexture(); standsT.repeat.set(4, 1)
    const stands = new THREE.Mesh(new THREE.CylinderGeometry(WORLD + 34, WORLD + 4, 30, 96, 1, true), new THREE.MeshBasicMaterial({ map: standsT, side: THREE.BackSide, fog: false })); stands.position.y = 15; S.add(stands)
    // 投光器の塔（外周に12本）: 鉄塔・足場・灯具の筐体とひさし・レンズ。光の玉は置かず、控えめな光の筋と地面の明るさで見せる
    const bt = new Baker(), bh = new Baker(), bg = new Baker(), beamM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { uCol: { value: new THREE.Color(0xffe9c4) } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); vY = uv.y; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uCol; varying vec3 vN; varying vec3 vV; varying float vY; void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float a = pow(f, 3.0) * (0.006 + 0.075 * vY * vY); gl_FragColor = vec4(uCol * a, a); }' })
    const up = new THREE.Vector3(0, 1, 0)
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * 6.283 + 0.13, sx = Math.sin(a), cz = Math.cos(a), x = sx * (WORLD + 12), z = cz * (WORLD + 12)
      const tx = Math.cos(a), tz = -Math.sin(a), ix = -sx, iz = -cz           // 横方向（接線）と内向き
      bt.add(new THREE.CylinderGeometry(1.35, 1.6, 1.4, 10), x, 0.7, z, 0x6e6c67)                            // 台座
      bt.add(new THREE.CylinderGeometry(0.42, 0.78, 36, 10), x, 18, z, 0x30343a)                            // 鉄塔
      for (let k = 0; k < 5; k++) bt.add(new THREE.CylinderGeometry(0.85 - k * 0.07, 0.85 - k * 0.07, 0.16, 10), x, 5 + k * 7, z, 0x24272b)   // 継ぎ目の輪
      bt.add(new THREE.CylinderGeometry(1.9, 1.9, 0.18, 14), x, 35.4, z, 0x25282c)                         // 足場
      bt.add(new THREE.TorusGeometry(1.9, 0.05, 5, 18), x, 36.5, z, 0x3a3e44, Math.PI / 2)                  // 手すり
      bt.add(new THREE.BoxGeometry(11, 0.5, 0.55), x + ix * 1.0, 37.0, z + iz * 1.0, 0x1d2024, 0, Math.atan2(tx, tz), 0)   // 灯具の枠
      for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++) {
        const off = (q - 1.5) * 2.5, px = x + ix * 1.5 + tx * off, pz = z + iz * 1.5 + tz * off, py = 36.6 + r * 1.75, ry = Math.atan2(ix, iz)
        bt.add(new THREE.BoxGeometry(2.1, 1.5, 0.7), px, py, pz, 0x15171a, 0, ry, 0)                          // 筐体
        bt.add(new THREE.BoxGeometry(2.2, 0.07, 0.65), px + ix * 0.4, py + 0.8, pz + iz * 0.4, 0x0e0f11, 0, ry, 0)   // ひさし
        bh.add(new THREE.BoxGeometry(1.75, 1.18, 0.06), px + ix * 0.38, py, pz + iz * 0.38, 0xd6cdb6, 0, ry, 0)   // レンズ（ほの明るい面）
      }
      // 光の筋: 灯具から地面へ向かう細長い円錐（とても薄い）
      const from = new THREE.Vector3(x + ix * 2, 37.6, z + iz * 2), to = new THREE.Vector3(ix * 38 + x * 0.0 + sx * 0, 0, iz * 38), len = from.distanceTo(to)
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 13, len, 18, 1, true), beamM)
      cone.position.copy(from).add(to).multiplyScalar(0.5); cone.quaternion.setFromUnitVectors(up, from.clone().sub(to).normalize()); cone.renderOrder = 2; S.add(cone)
    }
    addB(bt, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.6 }), false, false)
    { const m = bh.mesh(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), false); S.add(m) }
    // ジャンプ台: 円錐台（全周がなだらかな斜面・どの向きからも登れる）。上の縁に黄黒の輪
    const rampMat = new THREE.MeshStandardMaterial({ map: TX.concreteTexture(aniso), color: 0x77746d, roughness: 0.9, metalness: 0.05 })
    const edgeM = new THREE.MeshStandardMaterial({ map: TX.hazardTexture('#c9a233', aniso), roughness: 0.7 })
    const bRamp = new Baker(), bEdge = new Baker()
    for (const p of RAMPS) {
      const slant = Math.hypot(p.r0 - p.r1, p.h)
      const g = new THREE.CylinderGeometry(p.r1, p.r0, p.h, 72, 1, true); g.translate(0, p.h / 2, 0); uvs(g, 2 * Math.PI * p.r0 * 0.22, slant * 0.22)
      const cap = new THREE.CircleGeometry(p.r1, 48); cap.rotateX(-Math.PI / 2); cap.translate(0, p.h, 0); uvs(cap, p.r1 * 2 * 0.22, p.r1 * 2 * 0.22)
      bRamp.add(g, p.x, 0, p.z); bRamp.add(cap, p.x, 0, p.z)
      const rad = y => p.r0 - (p.r0 - p.r1) * y / p.h
      for (const [y0, y1] of [[0.02, 0.5], [p.h - 0.5, p.h - 0.02]]) {   // 斜面の裾と上の縁に、斜面に沿った黄黒の帯
        const rA = rad(y0) + 0.025, rB = rad(y1) + 0.025
        const band = new THREE.CylinderGeometry(rB, rA, y1 - y0, 72, 1, true); band.translate(0, (y0 + y1) / 2, 0); uvs(band, 2 * Math.PI * rA * 0.5, 0.5)
        bEdge.add(band, p.x, 0, p.z)
      }
    }
    addB(bRamp, rampMat); addB(bEdge, edgeM, false)
    // タイヤの山（柱は崩れるので buildPillars で作り直せる別の入れ物）
    const bTire = new Baker()
    for (const o of POLES) if (o.kind === 'tires') for (let i = 0; i < 4; i++) bTire.add(new THREE.TorusGeometry(0.66, 0.27, 8, 14), o.x + (i % 2) * 0.05, o.base + 0.27 + i * 0.4, o.z, 0x131314, Math.PI / 2)
    addB(bTire, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }))
    this.pillarGroup = new THREE.Group(); S.add(this.pillarGroup); this.buildPillars(null)
    // バリア
    const bBr = new Baker(), bBh = new Baker()
    for (const o of BOXES) {
      const w = Math.max(o.w, o.d), d = Math.min(o.w, o.d), sh = new THREE.Shape()
      sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(d * 0.28, o.h * 0.55); sh.lineTo(d * 0.18, o.h); sh.lineTo(-d * 0.18, o.h); sh.lineTo(-d * 0.28, o.h * 0.55); sh.closePath()
      const g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }); g.translate(0, 0, -w / 2); uvs(g, 0.3, 0.3)
      bBr.add(g, o.x, o.base, o.z, null, 0, o.w > o.d ? Math.PI / 2 : 0, 0)
      bBh.add(uvs(new THREE.BoxGeometry(o.w + 0.02, 0.2, o.d + 0.02), Math.max(o.w, o.d) / 1.1 * 0.5, 1), o.x, o.base + o.h - 0.22, o.z)
    }
    addB(bBr, new THREE.MeshStandardMaterial({ map: TX.concreteTexture(aniso), roughness: 0.9 })); addB(bBh, edgeM, false)
  }
  // ---------------------------------------------------------------- 柱（型枠コンクリート）。段階が変わった時だけ作り直す
  // stage 0 無傷 / 1 ひび / 2 上が欠けた（斜めのギザギザ）/ 3 折れた株 / 4 瓦礫の山（低い。車は乗り越える）
  buildPillars(S) {
    const aniso = this.low ? 4 : 8, stages = PILLARS.map((o, i) => S && S.pillars[i] ? S.pillars[i].stage : 0)
    this.pillarSig = stages.join('')
    const G = this.pillarGroup
    for (const m of [...G.children]) { G.remove(m); if (m.geometry) m.geometry.dispose() }
    if (!this.pm) {
      const pillarT = TX.pillarTexture(aniso), crackT = TX.crackTexture()
      this.pm = {
        pole: new THREE.MeshStandardMaterial({ map: TX.concreteTexture(aniso), roughness: 0.9 }),
        shaft: new THREE.MeshStandardMaterial({ map: pillarT, bumpMap: pillarT, bumpScale: 1.4, roughness: 0.92 }),
        warn: new THREE.MeshStandardMaterial({ map: TX.hazardTexture('#c9a233', aniso), roughness: 0.75 }), warnR: new THREE.MeshStandardMaterial({ map: TX.hazardTexture('#b5352c', aniso), roughness: 0.75 }),
        scuff: new THREE.MeshStandardMaterial({ map: TX.scuffTexture(), transparent: true, depthWrite: false, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
        crack: new THREE.MeshStandardMaterial({ map: crackT, transparent: true, depthWrite: false, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
        steel: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.7 }),
        rust: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.4 }),
        chunk: new THREE.MeshStandardMaterial({ map: TX.concreteTexture(aniso), color: 0x77746d, roughness: 0.95 }),
        dust: new THREE.MeshStandardMaterial({ map: TX.dustPatchTexture(), color: 0x6c6962, opacity: 0.8, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
      }
      this.chunkGeo = new THREE.IcosahedronGeometry(0.5, 0)
    }
    const M = this.pm, uvs = (geo, su, sv) => { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return geo }
    const bPole = new Baker(), bShaft = new Baker(), bBand = new Baker(), bBandR = new Baker(), bSteel = new Baker(), bTop = new Baker(), bScuff = new Baker(), bCrack = new Baker(), bChunk = new Baker(), bRust = new Baker(), bDust = new Baker()
    const mul = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
    // 上が斜めにちぎれた柱: 上の縁の高さを角度の関数で下げる（同じ角度なら側面とふたで同じだけ下がる）
    const jagged = (r, len, ph, depth) => {
      const g = new THREE.CylinderGeometry(r * 0.99, r * 1.03, len, 28, 1, false), pa = g.attributes.position
      const off = a => depth * (0.55 + 0.45 * Math.cos(a - ph)) + depth * 0.28 * Math.sin(a * 3 + ph * 2) * Math.sin(a * 5 + 1.3)
      for (let i = 0; i < pa.count; i++) { if (pa.getY(i) > 0) { const x = pa.getX(i), z = pa.getZ(i); pa.setY(i, pa.getY(i) - (Math.hypot(x, z) < 0.01 ? depth * 0.55 : off(Math.atan2(x, z)))) } }
      g.computeVertexNormals(); return g
    }
    for (const o of PILLARS) {
      const st = stages[o.pid], R = mul(o.pid * 977 + st * 131 + 5), r = o.r, y0 = o.base, H0 = o.h
      const hh = st < 2 ? H0 : PILLAR_H[st]           // 柱の頭の高さ
      if (st < 4) {
        bPole.add(uvs(new THREE.CylinderGeometry(r + 0.3, r + 0.4, 0.55, 24), 5, 1), o.x, y0 + 0.275, o.z)
        bPole.add(uvs(new THREE.CylinderGeometry(r + 0.2, r + 0.3, 0.2, 24), 5, 0.4), o.x, y0 + 0.65, o.z)
        const len = hh - 0.75, ph = R() * 6.283
        if (st < 2) bShaft.add(uvs(new THREE.CylinderGeometry(r, r * 1.03, H0 - 0.7, 28), 2, (H0 - 0.7) / 2.75), o.x, y0 + 0.75 + (H0 - 0.7) / 2, o.z)
        else bShaft.add(uvs(jagged(r, len, ph, st === 2 ? 1.5 : 0.9), 2, len / 2.75), o.x, y0 + 0.75 + len / 2, o.z)
        bBand.add(uvs(new THREE.CylinderGeometry(r + 0.04, r + 0.04, 1.5, 28, 1, true), Math.max(3, Math.round(r * 4)), 1), o.x, y0 + 1.6, o.z)
        if (st < 2) bBandR.add(uvs(new THREE.CylinderGeometry(r + 0.04, r + 0.04, 0.8, 28, 1, true), Math.max(3, Math.round(r * 4)), 0.5), o.x, y0 + H0 - 1.6, o.z)
        bScuff.add(uvs(new THREE.CylinderGeometry(r + 0.055, r + 0.055, 1.8, 28, 1, true), 2, 1), o.x, y0 + 1.7, o.z)
        for (let k = 1; k <= 3; k++) { const yy = 0.75 + k * (H0 - 0.7) / 4; if (yy < hh - 0.5) bSteel.add(new THREE.CylinderGeometry(r + 0.025, r + 0.025, 0.09, 28), o.x, y0 + yy, o.z, 0x5a5852) }
        bSteel.add(new THREE.CylinderGeometry(r + 0.34, r + 0.34, 0.05, 24), o.x, y0 + 0.56, o.z, 0x36383b)
        for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + 0.2; bSteel.add(new THREE.CylinderGeometry(0.07, 0.07, 0.17, 6), o.x + Math.sin(a) * (r + 0.24), y0 + 0.66, o.z + Math.cos(a) * (r + 0.24), 0x8d9094); bSteel.add(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 6), o.x + Math.sin(a) * (r + 0.24), y0 + 0.72, o.z + Math.cos(a) * (r + 0.24), 0x6c6f73) }
        if (st < 2) {
          bTop.add(uvs(new THREE.CylinderGeometry(r + 0.1, r + 0.2, 0.55, 24), 5, 1), o.x, y0 + H0 - 0.275, o.z)
          for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283 + 0.4, d = (r - 0.2) * (0.45 + 0.5 * ((k * 7) % 5) / 5); bSteel.add(new THREE.CylinderGeometry(0.03, 0.03, 0.9 + (k % 3) * 0.3, 5), o.x + Math.sin(a) * d, y0 + H0 + 0.35, o.z + Math.cos(a) * d, 0x7a4a2a, 0.1 * Math.sin(a * 3), 0, 0.1 * Math.cos(a * 2)) }
        } else {
          // ちぎれた断面から曲がった鉄筋が飛び出す
          for (let k = 0; k < 8; k++) { const a = R() * 6.283, d = (r - 0.3) * (0.3 + R() * 0.65), L = 0.7 + R() * 1.5, tx = (R() - 0.5) * 0.9, tz = (R() - 0.5) * 0.9; bRust.add(new THREE.CylinderGeometry(0.035, 0.035, L, 5), o.x + Math.sin(a) * d, y0 + hh - 0.5 + L / 2 - (st === 2 ? 0.6 : 0.2), o.z + Math.cos(a) * d, 0x7a4a2a, tx, 0, tz) }
        }
        if (st >= 1) bCrack.add(uvs(new THREE.CylinderGeometry(r + 0.05, r + 0.05, Math.min(len, st === 1 ? H0 - 2 : len) - 0.4, 28, 1, true), 1, Math.min(len, 9) / 5), o.x, y0 + 0.95 + (Math.min(len, st === 1 ? H0 - 2 : len) - 0.4) / 2, o.z)
      } else {
        bPole.add(new THREE.CylinderGeometry(r + 0.34, r + 0.4, 0.12, 24), o.x, y0 + 0.06, o.z)     // 土台の跡（平ら）
        for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283 + 0.2; bSteel.add(new THREE.CylinderGeometry(0.07, 0.07, 0.17, 6), o.x + Math.sin(a) * (r + 0.24), y0 + 0.1, o.z + Math.cos(a) * (r + 0.24), 0x8d9094) }
      }
      // 足もとに散った塊。段階が進むほど多く、低い（0.5m 以下）
      const nChunk = [0, 0, 6, 11, 20][st], mound = st === 4
      for (let k = 0; k < nChunk; k++) {
        const a = R() * 6.283, d = mound ? R() * R() * (r + 1.2) + 0.2 : r + 0.4 + R() * (1.5 + st), sz = mound ? 0.35 + R() * 0.55 : 0.18 + R() * 0.3
        const sy = mound ? Math.min(0.5, sz * (0.45 + R() * 0.35)) : Math.min(0.4, sz * 0.7)
        bChunk.add(this.chunkGeo, o.x + Math.sin(a) * d, y0 + sy * 0.35, o.z + Math.cos(a) * d, null, R() * 3, R() * 6.28, R() * 3, sz, sy * 2, sz * (0.7 + R() * 0.5))
      }
      if (st === 4) for (let k = 0; k < 6; k++) { const a = R() * 6.283, d = R() * 1.6, L = 0.6 + R() * 1.1; bRust.add(new THREE.CylinderGeometry(0.03, 0.03, L, 5), o.x + Math.sin(a) * d, y0 + 0.3, o.z + Math.cos(a) * d, 0x7a4a2a, (R() - 0.5) * 2.2, R() * 3, (R() - 0.5) * 2.2) }
      if (st >= 2) { const g = new THREE.CircleGeometry(r + 1.2 + st * 0.85, 28); g.rotateX(-Math.PI / 2); bDust.add(g, o.x, y0 + 0.03, o.z) }
    }
    const add = (bk, mat, cast = true, recv = true, ro = 0) => { const m = bk.mesh(mat, cast); if (!m) return; m.receiveShadow = recv; if (ro) m.renderOrder = ro; G.add(m) }
    add(bPole, M.pole); add(bTop, M.pole); add(bShaft, M.shaft); add(bBand, M.warn, true, false); add(bBandR, M.warnR, true, false); add(bScuff, M.scuff, false, true, 1); add(bCrack, M.crack, false, true, 1)
    add(bSteel, M.steel); add(bRust, M.rust); add(bChunk, M.chunk); add(bDust, M.dust, false, true, 1)
  }
  // 柱が崩れた瞬間: 土煙・落ちる塊・低い音。from→stage でちぎれた分の高さに土煙を出す
  pillarCollapse(e) {
    const sm = this.pSmoke, rnd = Math.random, st = e.stage, hi = PILLAR_H[e.from], lo = Math.max(0.4, PILLAR_H[st])
    const big = st >= 2
    if (st === 1) {
      for (let i = 0; i < 6; i++) sm.emit(e.x + (rnd() - 0.5) * 1.6, e.y + 2 + rnd() * 5, e.z + (rnd() - 0.5) * 1.6, (rnd() - 0.5) * 0.8, 0.3, (rnd() - 0.5) * 0.8, 1.6, 0.6, 1.8, 0xb9b4a8, 0xa39e92, 0.32, 0, 1.4)
      this.snd('thud', { vol: this.vol(e.x, e.z, 0.5, 40), rate: 0.7 }); this.snd('clink', { vol: this.vol(e.x, e.z, 0.35, 34), rate: 0.5 }); this.addShake(e.x, e.z, 0.08)
      return
    }
    const nd = this.low ? 16 : 34
    for (let i = 0; i < nd; i++) {
      const a = rnd() * 6.283, u = 1 + rnd() * (st === 4 ? 4.5 : 3.2), y = e.y + lo + rnd() * (Math.min(hi, lo + 6) - lo)
      sm.emit(e.x + Math.sin(a) * e.r * 0.8, y, e.z + Math.cos(a) * e.r * 0.8, Math.sin(a) * u, 0.3 + rnd() * 1.1, Math.cos(a) * u, 2.4 + rnd() * 1.6, 1.0 + rnd() * 0.8, 3.8 + rnd() * 2.4, rnd() < 0.5 ? 0xa39e92 : 0x948f84, 0x7d796f, 0.34, 0, 1.6)
    }
    // 落ちる塊（数と寿命は Debris が絞る）。大きいのと小さいのを混ぜる
    const nb = this.low ? 5 : 9
    for (let i = 0; i < nb; i++) {
      const m = new THREE.Mesh(this.chunkGeo, this.pm.chunk); const k = i < 3 ? 1.0 + rnd() * 0.5 : 0.2 + rnd() * 0.35
      m.scale.set(k * (0.8 + rnd() * 0.5), k * (0.6 + rnd() * 0.5), k * (0.8 + rnd() * 0.5)); m.position.set(e.x + (rnd() - 0.5) * 2, e.y + lo + rnd() * Math.min(5, hi - lo), e.z + (rnd() - 0.5) * 2); m.castShadow = i < 3
      m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); this.scene.add(m)
      const a = rnd() * 6.283, u = 2 + rnd() * 5; this.debris.fling(m, new THREE.Vector3(Math.sin(a) * u, 1 + rnd() * 3, Math.cos(a) * u), 5)
    }
    const v = 0.55 + (st - 2) * 0.1
    this.snd('crash', { vol: this.vol(e.x, e.z, 1, 55), rate: v }); this.snd('debris', { vol: this.vol(e.x, e.z, 0.9, 50), rate: 0.6 })
    this.snd('boom', { vol: this.vol(e.x, e.z, big ? 0.45 : 0.3, 60), rate: 0.5 }); this.snd('thud', { vol: this.vol(e.x, e.z, 0.8, 50), rate: 0.55 })
    this.addShake(e.x, e.z, 0.35 + (st - 2) * 0.12)
  }
  // ---------------------------------------------------------------- 動く物の入れ物
  buildDynamic() {
    const S = this.scene, sc = 800
    this.pSmoke = new Particles(S, this.low ? 700 : 1400, false, sc); this.pFire = new Particles(S, this.low ? 700 : 1400, true, sc)
    this.splats = new Splats(S, this.low ? 50 : 90); this.marks = new Splats(S, this.low ? 120 : 220); this.debris = new Debris(S); this.rings = new Rings(S)
    // 弾
    this.bulletM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 6, 5), new THREE.MeshBasicMaterial({ toneMapped: false }), 160); this.bulletM.frustumCulled = false; this.bulletM.count = 0; S.add(this.bulletM)
    this.confM = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), 200); this.confM.frustumCulled = false; this.confM.count = 0; S.add(this.confM)
    this.rockets = []
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group(), b = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.1, 10), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.4 })); b.rotation.x = Math.PI / 2; g.add(b)
      const n = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 10), new THREE.MeshStandardMaterial({ color: 0xd8372a, roughness: 0.4 })); n.rotation.x = Math.PI / 2; n.position.z = 0.75; g.add(n)
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 4), new THREE.MeshStandardMaterial({ color: 0xb08a50 })); st.rotation.x = Math.PI / 2; st.position.z = -1.0; g.add(st)
      g.scale.setScalar(0.75); g.visible = false; S.add(g); this.rockets.push(g)
    }
    // 手榴弾・タレット
    this.grenades = []; this.turretMs = []
    for (let i = 0; i < 6; i++) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), new THREE.MeshStandardMaterial({ color: 0x4a5a36, roughness: 0.5, metalness: 0.4 })); b.castShadow = true; g.add(b); const l = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3a2a, toneMapped: false })); l.position.set(0, 0.3, 0); g.add(l); g.visible = false; S.add(g); this.grenades.push(g) }
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group(), base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.5, 12), new THREE.MeshStandardMaterial({ color: 0x2a2e33, roughness: 0.5, metalness: 0.6 })); base.position.y = 0.25; base.castShadow = true; g.add(base)
      const head = new THREE.Group(); head.position.y = 0.95; g.add(head)
      const bx = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.9), new THREE.MeshStandardMaterial({ color: 0x37b7d6, roughness: 0.35, metalness: 0.3 })); bx.castShadow = true; head.add(bx)
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 0.9, roughness: 0.3 })); br.rotation.x = Math.PI / 2; br.position.z = 0.9; head.add(br)
      g.visible = false; S.add(g); this.turretMs.push({ g, head })
    }
    // 地雷・オイル・拾い物
    this.mineMs = []; this.oilMs = []
    const mg = new THREE.CylinderGeometry(0.62, 0.7, 0.22, 16), mm = new THREE.MeshStandardMaterial({ color: 0x3b4a2e, roughness: 0.55, metalness: 0.4 }), lg = new THREE.SphereGeometry(0.12, 8, 6)
    for (let i = 0; i < 10; i++) { const g = new THREE.Group(); const b = new THREE.Mesh(mg, mm); b.castShadow = true; g.add(b); const l = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ color: 0xff2a1a, toneMapped: false })); l.position.y = 0.16; g.add(l); g.visible = false; S.add(g); this.mineMs.push({ g, l }) }
    const og = new THREE.CircleGeometry(1, 28); og.rotateX(-Math.PI / 2)
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(og, new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.92, polygonOffset: true, polygonOffsetFactor: -3 })); m.visible = false; m.receiveShadow = true; S.add(m); this.oilMs.push(m) }
    this.pickMs = []
    const icons = { turbo: 'bolt', spear: 'spear', oil: 'oil', mine: 'mine', repair: 'plus', grenade: 'gren', flash: 'flash', smoke: 'cloud', ricochet: 'zig', turret: 'tur' }
    this.pickIcons = {}
    for (const k in icons) this.pickIcons[k] = this.iconTex(null, icons[k])
    const CR = crateMeshes()
    const decG = new THREE.PlaneGeometry(1, 1)
    for (let i = 0; i < 32; i++) {
      const g = new THREE.Group(), kinds = {}
      for (const k of ['driver', 'gunner', 'repair']) { const m = CR[k].clone(); m.visible = false; m.castShadow = true; m.receiveShadow = true; g.add(m); kinds[k] = m }
      const dm = new THREE.MeshStandardMaterial({ transparent: true, depthWrite: false, roughness: 0.7, metalness: 0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })
      const dTop = new THREE.Mesh(decG, dm); dTop.rotation.x = -Math.PI / 2; const dF = new THREE.Mesh(decG, dm), dB = new THREE.Mesh(decG, dm); dB.rotation.y = Math.PI
      g.add(dTop, dF, dB)
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.29, 40), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.07; g.add(ring)
      g.scale.setScalar(1.3); g.rotation.y = i * 2.4
      g.visible = false; S.add(g); this.pickMs.push({ g, kinds, dm, dec: [dTop, dF, dB], ring })
    }
    // 人の入れ物（10人ぶん）
    // 空き車のそばの矢印
    this.arrowTex = this.iconTex('#e8b81c', 'arrow')
  }
  iconTex(bg, kind) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')
    if (bg) { g.fillStyle = bg; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.strokeStyle = '#f2efe6'; g.lineWidth = 6; g.stroke() }
    g.fillStyle = bg ? '#f2efe6' : 'rgba(236,230,208,0.92)'; g.strokeStyle = g.fillStyle; g.lineWidth = 8; g.lineCap = 'round'; g.lineJoin = 'round'
    if (kind === 'rocket') { g.beginPath(); g.moveTo(64, 20); g.quadraticCurveTo(84, 50, 78, 84); g.lineTo(50, 84); g.quadraticCurveTo(44, 50, 64, 20); g.fill(); g.beginPath(); g.moveTo(50, 84); g.lineTo(40, 104); g.lineTo(56, 94); g.moveTo(78, 84); g.lineTo(88, 104); g.lineTo(72, 94); g.fill() }
    else if (kind === 'conf') { g.beginPath(); g.moveTo(34, 98); g.lineTo(50, 52); g.lineTo(76, 78); g.closePath(); g.fill(); for (const [x, y, r] of [[78, 34, 7], [96, 56, 6], [60, 28, 5], [98, 82, 5], [84, 54, 4]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill() } }
    else if (kind === 'mine') { g.beginPath(); g.arc(64, 70, 26, 0, 7); g.fill(); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; g.beginPath(); g.moveTo(64 + Math.cos(a) * 24, 70 + Math.sin(a) * 24); g.lineTo(64 + Math.cos(a) * 38, 70 + Math.sin(a) * 38); g.stroke() } }
    else if (kind === 'oil') { g.beginPath(); g.moveTo(64, 24); g.quadraticCurveTo(100, 64, 86, 86); g.quadraticCurveTo(64, 112, 42, 86); g.quadraticCurveTo(28, 64, 64, 24); g.fill() }
    else if (kind === 'plus') { g.fillRect(54, 26, 20, 76); g.fillRect(26, 54, 76, 20) }
    else if (kind === 'bolt') { g.beginPath(); g.moveTo(74, 16); g.lineTo(38, 70); g.lineTo(60, 70); g.lineTo(50, 112); g.lineTo(92, 54); g.lineTo(68, 54); g.closePath(); g.fill() }
    else if (kind === 'spear') { g.beginPath(); g.moveTo(104, 24); g.lineTo(78, 30); g.lineTo(98, 50); g.closePath(); g.fill(); g.beginPath(); g.moveTo(24, 104); g.lineTo(92, 36); g.lineWidth = 9; g.stroke() }
    else if (kind === 'flash') { g.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, r = i % 2 ? 22 : 40; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r) } g.closePath(); g.fill() }
    else if (kind === 'gren') { g.beginPath(); g.arc(64, 74, 28, 0, 7); g.fill(); g.fillRect(56, 30, 16, 16); g.beginPath(); g.moveTo(72, 34); g.lineTo(96, 24); g.stroke() }
    else if (kind === 'cloud') { for (const [x, y, r] of [[46, 72, 20], [66, 60, 24], [86, 74, 18], [64, 80, 22]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill() } }
    else if (kind === 'zig') { g.beginPath(); g.moveTo(26, 40); g.lineTo(52, 90); g.lineTo(76, 36); g.lineTo(102, 88); g.stroke() }
    else if (kind === 'tur') { g.fillRect(36, 70, 56, 26); g.fillRect(48, 48, 32, 24); g.fillRect(76, 54, 30, 8) }
    else if (kind === 'arrow') { g.fillStyle = '#1d1c1a'; g.beginPath(); g.moveTo(64, 104); g.lineTo(26, 54); g.lineTo(50, 54); g.lineTo(50, 24); g.lineTo(78, 24); g.lineTo(78, 54); g.lineTo(102, 54); g.closePath(); g.fill() }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }
  // 人（読み込みのあとで呼ぶ）: 歩く人10人ぶん
  initPeople() {
    if (this.walkers.length) return
    for (let i = 0; i < 12; i++) {
      const col = TEAM_COLORS[i >> 1], p = makePerson({ shirt: 0x3a3d38, pants: 0x34382f, shoes: 0x1c1c1c, vest: col, sleeve: 0.62, helm: 0x575c48 }, { anim: true })
      p.g = p.root; p.g.visible = false; p.g.rotation.order = 'YXZ'; this.scene.add(p.g); this.walkers.push(p)
    }
  }
  // ---------------------------------------------------------------- 車の見た目を作る・直す
  carView(c) {
    let v = this.cars.get(c.id)
    if (v && v.type !== c.type) { this.dropCar(v); this.cars.delete(c.id); v = null }
    if (!v) {
      const team = c.team
      const col = team >= 0 ? TEAM_COLORS[team] : [0x9a9da2, 0x5c6168, 0x6b4f3a, 0x3d4658, 0x5f6a48, 0x8d8774][c.id % 6]
      v = buildCar(col, team >= 0 ? team + 1 : 0, c.type); v.type = c.type; v.g.scale.setScalar((CAR_TYPES[c.type] || CAR_TYPES[0]).scale); v.team = team; v.col = col; v.hpShown = 100; v.wheelRot = 0; v.smokeT = 0; v.fireT = 0; v.flash = 0; v.pitchAcc = 0; v.ps = 0; v.psV = 0; v.rs = 0; v.rsV = 0; v.hv = 0; v.hvV = 0; v.sp0 = 0; v.exploded = false; v.hoodOpen = 0
      v.g.traverse(o => { if (o.isMesh) o.matrixAutoUpdate = true })
      this.scene.add(v.g); this.cars.set(c.id, v)
      if (team < 0) for (const m of v.paints) m.color.setHex(col)
      v.beacon.visible = team < 0; v.crew.visible = team >= 0
    }
    if (v.team !== c.team) { // 空き車に乗った（色が変わる）
      v.team = c.team; const col = c.team >= 0 ? TEAM_COLORS[c.team] : v.col
      v.base.setHex(col); for (const m of v.paints) m.color.setHex(col); v.flag.material.color.setHex(col); v.beacon.visible = c.team < 0; v.crew.visible = c.team >= 0
      if (c.team >= 0) this.rings.ring(c.x, c.y, c.z, 3.5, col, 0.6)
    }
    return v
  }
  setHumanRole(c, humanTeam, humanDrives) {
    const v = this.cars.get(c.id); if (!v || c.team !== humanTeam) return
    const sand = 0xcdbf98, olive = 0x575c48   // 操作している側だけ砂色、ほかは緑がかった灰
    v.drv.helm.material.color.setHex(humanDrives ? sand : olive); v.gun.helm.material.color.setHex(humanDrives ? olive : sand)
  }
  // ---------------------------------------------------------------- 毎フレーム
  sync(S, alpha, dt, ctx) {
    this.time += dt
    if (S.pillars) { const sig = S.pillars.map(p => p.stage).join(''); if (sig !== this.pillarSig) this.buildPillars(S) }
    this.sky.position.copy(this.cam.position)
    if (this.flashLight.intensity > 1) this.flashLight.intensity *= Math.exp(-dt * 7); else this.flashLight.intensity = 0
    const seen = new Set()
    for (const c of S.cars) {
      seen.add(c.id)
      const v = this.carView(c)
      const x = lerp(c.px, c.x, alpha), y = lerp(c.py, c.y, alpha), z = lerp(c.pz, c.z, alpha), yaw = lerpAng(c.pyaw, c.yaw, alpha)
      const pitch = lerp(c.ppitch, c.pitch, alpha), roll = lerp(c.proll, c.roll, alpha)
      v.g.position.set(x, y + (c.lift || 0), z)
      { const dx = x - this.cam.position.x, dz = z - this.cam.position.z, far = dx * dx + dz * dz > 4900   // 影の届かない遠い車は影を作らない
        if (far !== v.far) { v.far = far; v.g.traverse(o => { if (o.isMesh) o.castShadow = !far }) } }
      const sp = c.vx * Math.sin(c.yaw) + c.vz * Math.cos(c.yaw)
      // 車体のばね: 加速で後ろに沈む・ブレーキで前にのめる・曲がりで外へ傾く・着地でたわんで戻る（重い車ほどゆっくり大きく）
      const mass = (CAR_TYPES[c.type] || CAR_TYPES[0]).mass, w = 6.283 * (3.1 - 0.7 * mass), zeta = 0.3
      const axT = Math.max(-0.14, Math.min(0.14, -(c.ax || 0) * 0.0095 * (0.8 + 0.4 * mass))), rollT = -Math.max(-0.2, Math.min(0.2, (c.yawRate || 0) * sp * 0.0105 * (0.8 + 0.4 * mass)))
      const sub = Math.max(1, Math.ceil(dt / 0.012)), h = dt / sub
      for (let i = 0; i < sub; i++) {
        v.psV += (w * w * ((c.air ? 0 : axT) - v.ps) - 2 * zeta * w * v.psV) * h; v.ps += v.psV * h
        v.rsV += (w * w * ((c.air ? 0 : rollT) - v.rs) - 2 * zeta * w * v.rsV) * h; v.rs += v.rsV * h
        v.hvV += (w * w * 1.4 * (0 - v.hv) - 2 * 0.28 * w * 1.2 * v.hvV) * h; v.hv += v.hvV * h
      }
      v.sp0 = sp
      const hulk = !c.alive
      if (hulk) { const k = Math.min(1, c.wreckT / 0.9); v.g.rotation.set(-pitch, yaw, -roll + 0.38 * k * (((c.id * 7) % 2) ? 1 : -1), 'YXZ'); v.body.scale.set(1, 1 - 0.18 * k, 1) }
      else { v.g.rotation.set(-pitch + v.ps, yaw, -roll + v.rs, 'YXZ'); v.body.position.y = v.hv + Math.sin(this.time * 14 + c.id) * 0.008 * Math.min(1, Math.abs(sp) / 10) }
      // 車輪
      v.wheelRot += sp * dt / 0.52
      for (const w of v.wheels) { w.spin.rotation.x = v.wheelRot; if (w.front) w.piv.rotation.y = -c.steer * 0.5 }
      // 砲塔
      v.turret.rotation.y = lerpAng(c.pgun, c.gunYaw, alpha) - yaw
      v.gun.flash.visible = v.flash > 0; v.flash -= dt
      v.flag.rotation.y = Math.PI / 2 + Math.sin(this.time * 9 + c.id) * 0.25 + Math.min(1, Math.abs(sp) / 14) * 0.5; v.flag.scale.x = 0.9 + Math.sin(this.time * 13 + c.id) * 0.1
      { const on = c.alive && c.spearT > 0; v.spear.visible = on || v.spear.scale.z > 0.05; v.spear.scale.z += ((on ? 1 : 0.01) - v.spear.scale.z) * Math.min(1, 12 * dt); if (!on && v.spear.scale.z < 0.05) v.spear.visible = false }
      if (c.team < 0 && c.alive) { v.beacon.rotation.y += dt * 4; v.beacon.material.emissiveIntensity = 0.8 + Math.sin(this.time * 6) * 0.5; v.g.position.y = y }
      // 壊れ具合の色・煙・火
      this.damageFx(c, v, dt)
      // 当たった時の白い点滅
      for (const m of v.paints) { m.emissive.setHex(0xffffff); m.emissiveIntensity = c.dmgFlash > 0 ? c.dmgFlash * 1.2 : 0 }
      // 速度が出ている時の土煙と、ブーストの炎
      if (c.alive && !c.air && Math.abs(sp) > 3 && (c.oilT > 0 || Math.abs(c.vx * Math.cos(c.yaw) * -1 + c.vz * Math.sin(c.yaw)) > 4.5)) { this.pSmoke.emit(x - Math.sin(c.yaw) * 1.4, y + 0.2, z - Math.cos(c.yaw) * 1.4, (Math.random() - 0.5) * 1.5, 0.8, (Math.random() - 0.5) * 1.5, 0.7, 0.7, 2.0, 0xcfc8ba, 0xcfc8ba, 0.28, 0, 1) }
      if (c.alive && !c.air && Math.abs(sp) > 12) {
        if (Math.random() < 0.45) this.pSmoke.emit(x - Math.sin(c.yaw) * 1.8 + (Math.random() - 0.5) * 1.6, y + 0.15, z - Math.cos(c.yaw) * 1.8 + (Math.random() - 0.5) * 1.6, -c.vx * 0.08, 0.5, -c.vz * 0.08, 0.9, 0.5, 1.8, 0xd2cabc, 0xd2cabc, 0.2, 0, 1.6)
        v.markT = (v.markT || 0) - dt
        const lat = Math.abs(c.vx * -Math.cos(c.yaw) + c.vz * Math.sin(c.yaw))
        if (v.markT <= 0 && (lat > 3.5 || c.boosting || c.oilT > 0)) { v.markT = 0.07; for (const sd of [-0.95, 0.95]) this.marks.add(x - Math.sin(c.yaw) * 1.4 + Math.cos(c.yaw) * -sd, y, z - Math.cos(c.yaw) * 1.4 + Math.sin(c.yaw) * sd, 0, 1, 0, 0x151515, 0.42) }
      }
      if (c.boosting) { this.shake = Math.max(this.shake, 0.1) }
      if (c.boosting) { for (let i = 0; i < 2; i++) this.pFire.emit(x - Math.sin(c.yaw) * 2.2 + (Math.random() - 0.5) * 0.4, y + 0.55, z - Math.cos(c.yaw) * 2.2 + (Math.random() - 0.5) * 0.4, -Math.sin(c.yaw) * 7, 0.3, -Math.cos(c.yaw) * 7, 0.25, 0.9, 0.2, 0xffb04a, 0xff4a10, 0.9, 0, 3) }
    }
    for (const [id, v] of this.cars) if (!seen.has(id)) { this.dropCar(v); this.cars.delete(id) }
    this.syncPeople(S, alpha, dt, ctx)
    this.syncBullets(S, alpha, dt)
    this.syncThings(S, dt)
    this.pSmoke.update(dt); this.pFire.update(dt); this.debris.update(dt); this.rings.update(dt)
    if (!this.low || Math.random() < 0.5) { const f = this.focus; this.pSmoke.emit(f.x + (Math.random() - 0.5) * 60, 1 + Math.random() * 12, f.z + (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 0.6, 0.15, (Math.random() - 0.5) * 0.6, 7, 0.07, 0.07, 0xfff4d8, 0xfff4d8, 0.4, 0, 0) }
  }
  damageFx(c, v, dt) {
    const hp = c.alive ? c.hp : 0
    const burn = 1 - Math.max(0, Math.min(1, hp / 70))
    const base = v.base
    for (const m of v.paints) m.color.copy(base).lerp(_scorch, c.alive ? burn * 0.72 : 0.9)
    v.hoodOpen += ((hp < 40 ? 1 : 0) - v.hoodOpen) * Math.min(1, 5 * dt)
    if (!c.alive) v.hoodOpen = 1
    v.hoodPivot.rotation.x = -v.hoodOpen * 0.95
    const px = c.x + Math.sin(c.yaw) * 1.4, pz = c.z + Math.cos(c.yaw) * 1.4
    if (c.alive) {
      if (hp < 65) { v.smokeT -= dt; if (v.smokeT <= 0) { v.smokeT = hp < 40 ? 0.04 : 0.1; const dark = hp < 40; this.pSmoke.emit(px + (Math.random() - 0.5) * 0.6, c.y + 1.3, pz + (Math.random() - 0.5) * 0.6, c.vx * 0.2 + (Math.random() - 0.5) * 0.8, 2.2 + Math.random(), c.vz * 0.2 + (Math.random() - 0.5) * 0.8, dark ? 1.7 : 1.3, 0.5, dark ? 3.2 : 2.2, dark ? 0x2a2826 : 0x9a9690, dark ? 0x1a1918 : 0xb4b0a8, dark ? 0.75 : 0.5, -0.4, 0.6) } }
      if (hp < 22) { v.fireT -= dt; if (v.fireT <= 0) { v.fireT = 0.035; this.pFire.emit(px + (Math.random() - 0.5) * 0.9, c.y + 1.2, pz + (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 1.2, 2.6 + Math.random() * 1.5, (Math.random() - 0.5) * 1.2, 0.55, 0.9, 0.2, 0xffb74a, 0xff3a0a, 0.95, -0.5, 0.3) } }
    } else if (c.wreckT < 13) {
      const k = 1 - c.wreckT / 13
      v.fireT -= dt; if (v.fireT <= 0) { v.fireT = 0.05; this.pFire.emit(c.x + (Math.random() - 0.5) * 2, c.y + 1.0, c.z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1.2, 2.5 * k + 1, (Math.random() - 0.5) * 1.2, 0.6, 1.1 * k + 0.3, 0.2, 0xffb74a, 0xff3a0a, 0.9, -0.5, 0.3) }
      v.smokeT -= dt; if (v.smokeT <= 0) { v.smokeT = 0.08; this.pSmoke.emit(c.x + (Math.random() - 0.5) * 1.5, c.y + 1.5, c.z + (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 0.8, 2.6, (Math.random() - 0.5) * 0.8, 2.4, 0.8, 4.2, 0x1e1d1c, 0x2a2927, 0.7 * k + 0.2, -0.3, 0.5) }
    }
  }
  syncPeople(S, alpha, dt, ctx) {
    let wi = 0
    for (const t of S.teams) {
      const car = t.car >= 0 ? S.cars.find(q => q.id === t.car) : null
      if (car) this.setHumanRole(car, S.humanTeam, t.driver === 0 && ctx.human)
      for (const p of t.p) {
        const w = this.walkers[t.id * 2 + p.idx]
        if (p.state === 'walk' || p.state === 'fly') {
          w.g.visible = true
          const x = lerp(p.px, p.x, alpha), y = lerp(p.py, p.y, alpha), z = lerp(p.pz, p.z, alpha)
          w.g.position.set(x, y, z)
          const moving = p.state === 'walk' && (Math.hypot(p.x - p.px, p.z - p.pz) > 0.001)
          if (p.state === 'fly') { w.g.rotation.set(Math.sin(this.time * 9 + p.idx) * 0.8, p.yaw, Math.cos(this.time * 7) * 0.8, 'YXZ'); animPerson(w, dt, 0, true) }
          else {
            w.g.rotation.set(0, lerpAng(w.g.rotation.y, p.yaw, Math.min(1, 12 * dt)), 0)
            const spd = Math.hypot(p.x - p.px, p.z - p.pz) / Math.max(dt, 1e-3) * Math.min(1, 1)
            w.sp = (w.sp || 0) + ((moving ? Math.min(spd, 9) : 0) - (w.sp || 0)) * Math.min(1, dt * 10)
            animPerson(w, dt, w.sp, false)
            if (p.invT > 0) w.g.visible = Math.floor(this.time * 14) % 2 === 0
          }
        } else w.g.visible = false
      }
    }
  }
  syncBullets(S, alpha, dt) {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), v = new THREE.Vector3(), s = new THREE.Vector3(), z = new THREE.Vector3(0, 0, 1)
    let nb = 0, nc = 0, nr = 0, ng = 0
    for (const b of S.bullets) {
      const x = lerp(b.px, b.x, alpha), y = lerp(b.py, b.y, alpha), zz = lerp(b.pz, b.z, alpha)
      if (b.type === 'paint' || b.type === 'cork' || b.type === 'spring') {
        if (nb >= 160) continue
        v.set(b.vx, b.vy, b.vz); const L = v.length() || 1; v.multiplyScalar(1 / L); q.setFromUnitVectors(z, v)
        if (b.type === 'spring') s.set(0.9, 0.9, 0.9); else if (b.type === 'cork') s.set(0.38, 0.38, 4.8); else s.set(0.42, 0.42, 3.0)
        m4.compose(new THREE.Vector3(x, y, zz), q, s); this.bulletM.setMatrixAt(nb, m4)
        this.bulletM.setColorAt(nb, b.type === 'cork' ? c.setHex(0xffd9a0).multiplyScalar(1.5) : b.type === 'spring' ? c.setHex(0xaab0b8).multiplyScalar(1.0) : (b.bounces > 0 ? c.setHex(0xffc060).multiplyScalar(1.7) : c.setHex(0xffe2b0).lerp(_team.setHex(TEAM_COLORS[b.team] ?? 0xffffff), 0.28).multiplyScalar(1.5))); nb++
      } else if (b.type === 'grenade') {
        const g = this.grenades[ng++]; if (!g) continue
        g.visible = true; g.position.set(x, y, zz); g.rotation.x += 0.2; g.rotation.z += 0.15
        g.children[0].material.color.setHex(b.flash ? 0xcfe8f2 : 0x4a5a36)
        if (Math.floor(this.time * 8) % 2 === 0) g.children[1].material.color.setHex(b.flash ? 0xffffff : 0xff3a2a); else g.children[1].material.color.setHex(0x331010)
      } else if (b.type === 'confetti') {
        if (nc >= 200) continue
        q.setFromEuler(new THREE.Euler(this.time * 9 + b.hue, this.time * 7 + b.id, 0)); s.set(1, 1, 1)
        m4.compose(new THREE.Vector3(x, y, zz), q, s); this.confM.setMatrixAt(nc, m4); this.confM.setColorAt(nc, c.setHex(CONF[b.hue % CONF.length])); nc++
      } else if (b.type === 'rocket') {
        const r = this.rockets[nr++]; if (!r) continue
        r.visible = true; r.position.set(x, y, zz); r.rotation.set(-Math.atan2(b.vy, Math.hypot(b.vx, b.vz)), b.yaw, 0, 'YXZ')
        for (let i = 0; i < 2; i++) this.pFire.emit(x - Math.sin(b.yaw) * 1.1, y, zz - Math.cos(b.yaw) * 1.1, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 0.35, 0.5, 0.1, 0xffe08a, 0xff6a1a, 0.95, 0, 2)
        this.pSmoke.emit(x - Math.sin(b.yaw) * 1.2, y, zz - Math.cos(b.yaw) * 1.2, 0, 0.3, 0, 1.1, 0.5, 1.9, 0xe8e4da, 0xc9c5bb, 0.45, 0, 0.5)
        if (Math.random() < 0.6) this.pFire.emit(x, y, zz, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, 0.5, 0.12, 0.04, 0xffe9a0, 0xff9a30, 1, 8, 0.5)
      }
    }
    this.bulletM.count = nb; this.bulletM.instanceMatrix.needsUpdate = true; if (this.bulletM.instanceColor) this.bulletM.instanceColor.needsUpdate = true
    this.confM.count = nc; this.confM.instanceMatrix.needsUpdate = true; if (this.confM.instanceColor) this.confM.instanceColor.needsUpdate = true
    for (let i = nr; i < this.rockets.length; i++) this.rockets[i].visible = false
    for (let i = ng; i < this.grenades.length; i++) this.grenades[i].visible = false
  }
  syncThings(S, dt) {
    S.mines.forEach((m, i) => { const o = this.mineMs[i]; if (!o) return; o.g.visible = true; o.g.position.set(m.x, m.y + 0.1, m.z); o.l.visible = m.arm > 0 ? Math.floor(this.time * 10) % 2 === 0 : Math.floor(this.time * 3) % 2 === 0 })
    for (let i = S.mines.length; i < this.mineMs.length; i++) this.mineMs[i].g.visible = false
    S.oils.forEach((o, i) => { const m = this.oilMs[i]; if (!m) return; m.visible = true; m.position.set(o.x, o.y + 0.05, o.z); const k = Math.min(1, (14 - o.life) / 0.5 + 0.2, o.life / 1); m.scale.setScalar(o.r * Math.max(0.2, k)) })
    for (let i = S.oils.length; i < this.oilMs.length; i++) this.oilMs[i].visible = false
    S.pickups.forEach((p, i) => {
      const o = this.pickMs[i]; if (!o) return
      o.g.visible = p.t <= 0
      if (p.t > 0) return
      const y = H(p.x, p.z)
      o.g.position.set(p.x, y, p.z); o.g.scale.setScalar(p.center ? 2.1 : 1.3)
      if (o.type !== p.type) {
        o.type = p.type; const role = ROLE_G.has(p.type) ? 'gunner' : p.type === 'repair' ? 'repair' : 'driver'
        for (const k in o.kinds) o.kinds[k].visible = k === role
        o.dm.map = this.pickIcons[p.type]; o.dm.needsUpdate = true; o.ring.material.color.setHex(PICKC[p.type])
        const d = decalPlace(role), [dT, dF, dB] = o.dec
        dT.position.set(d.x, d.topY, 0); dT.scale.set(d.s, d.s, 1)
        dF.position.set(d.x, d.faceY, d.faceZ); dF.scale.set(d.s, d.s, 1)
        dB.position.set(-d.x, d.faceY, -d.faceZ); dB.scale.set(d.s, d.s, 1)
      }
      o.ring.material.opacity = (p.center ? 0.5 : 0.34) + Math.sin(this.time * (p.center ? 4 : 3) + i) * 0.1
    })
    // タレット
    S.turrets.forEach((t, i) => { const o = this.turretMs[i]; if (!o) return; o.g.visible = true; o.g.position.set(t.x, t.y, t.z); o.head.rotation.y = t.yaw; const k = Math.min(1, t.life / 1.2, (18 - t.life) / 0.4 + 0.1); o.g.scale.setScalar(Math.max(0.05, k)) })
    for (let i = S.turrets.length; i < this.turretMs.length; i++) this.turretMs[i].g.visible = false
    // 煙幕: 大きな煙のかたまりを出し続ける
    for (const m of S.smokes) { const k = Math.min(1, m.life / 2); for (let i = 0; i < 3; i++) { const a = Math.random() * 6.28, r = Math.random() * m.r * 0.8; this.pSmoke.emit(m.x + Math.sin(a) * r, m.y + 0.5 + Math.random() * 3.5, m.z + Math.cos(a) * r, (Math.random() - 0.5) * 0.8, 0.4, (Math.random() - 0.5) * 0.8, 3.4, 3.5, 6, 0xdfe3e6, 0xc2c7cc, 0.5 * k, 0, 0.3) } }
  }
  // ---------------------------------------------------------------- 出来事 → 演出と音
  // 捨てる車の見た目を解放する（長い配信でメモリが増えないように）
  dropCar(v) { this.scene.remove(v.g); v.g.traverse(o => { if (o.geometry && o.geometry.userData && o.geometry.userData.own) o.geometry.dispose() }); for (const m of v.own || []) { if (m && m.map && m.map.dispose) m.map.dispose(); if (m && m.dispose) m.dispose() } }
  dist(x, z) { return Math.hypot(x - this.focus.x, z - this.focus.z) }
  vol(x, z, base = 1, r = 26) { return base / (1 + (this.dist(x, z) / r) ** 2) }
  onEvent(e, S) {
    const sm = this.pSmoke, fi = this.pFire, rnd = Math.random
    switch (e.k) {
      case 'shot': {
        if (e.w === 'spring') { this.snd('spring', { vol: this.vol(e.x, e.z, 0.6, 30), rate: 1.0 + rnd() * 0.3 }); break }
        if (e.w === 'cork') { this.snd('pop', { vol: this.vol(e.x, e.z, 0.9, 40), rate: 0.7 }); this.snd('shot', { vol: this.vol(e.x, e.z, 0.35, 40), rate: 1.8 }); break }
        const col = TEAM_COLORS[e.team] ?? 0xffffff
        const car = S.cars.find(c => c.team === e.team && c.alive); const v = car && this.cars.get(car.id); if (v) v.flash = 0.05
        if (e.w === 'paint') { this.snd('pop', { vol: this.vol(e.x, e.z, 0.5, 30), rate: 1.1 + rnd() * 0.5, jitter: 0.08 }); fi.emit(e.x, e.y, e.z, 0, 0, 0, 0.07, 0.34, 0.12, 0xfff0c8, col, 0.7) }
        else if (e.w === 'rocket') { this.snd('whoosh', { vol: this.vol(e.x, e.z, 0.8, 34), rate: 1.4 }); this.snd('spring', { vol: this.vol(e.x, e.z, 0.5, 30), rate: 0.9 }); for (let i = 0; i < 6; i++) sm.emit(e.x, e.y, e.z, (rnd() - 0.5) * 3, rnd() * 2, (rnd() - 0.5) * 3, 0.9, 0.5, 1.6, 0xe8e4da, 0xc9c5bb, 0.5, 0, 1.5) }
        else { this.snd('shot', { vol: this.vol(e.x, e.z, 0.6, 30), rate: 1.3 }); this.snd('paper', { vol: this.vol(e.x, e.z, 0.6, 30), rate: 1.2 }); this.confettiBurst(e.x, e.y, e.z, 14, 6) }
        break
      }
      case 'bhit': {
        const col = TEAM_COLORS[e.team] ?? 0xffffff
        if (e.what === 'car' || e.what === 'person') {
          for (let i = 0; i < 6; i++) fi.emit(e.x, e.y, e.z, (rnd() - 0.5) * 6, rnd() * 4, (rnd() - 0.5) * 6, 0.4, 0.45, 0.15, col, col, 1, 14, 0.5)
          this.snd(e.w === 'confetti' ? 'paper' : e.w === 'turret' ? 'clink' : 'clink', { vol: this.vol(e.x, e.z, 0.5, 28), rate: 1 + rnd() * 0.4 })
        } else {
          const sp = Math.hypot(e.vx, e.vz) || 1
          let nx = 0, ny = 0, nz = 0
          if (e.what === 'ground') ny = 1
          else if (e.what === 'wall') { const rr = Math.hypot(e.x, e.z) || 1; nx = -e.x / rr; nz = -e.z / rr }
          else { nx = -e.vx / sp; nz = -e.vz / sp }
          if (e.w !== 'confetti') { this.splats.add(e.x, e.y, e.z, nx, ny, nz, col, e.what === 'ground' ? 1.1 : 0.9); this.snd('plop', { vol: this.vol(e.x, e.z, 0.28, 24), rate: 1.2 }) }
          else this.confettiBurst(e.x, e.y, e.z, 5, 4)
          for (let i = 0; i < 4; i++) fi.emit(e.x, e.y, e.z, nx * 3 + (rnd() - 0.5) * 4, ny * 3 + rnd() * 3, nz * 3 + (rnd() - 0.5) * 4, 0.35, 0.35, 0.1, col, col, 1, 12, 0.5)
          if (e.pid != null) for (let i = 0; i < 2; i++) sm.emit(e.x, e.y, e.z, nx * 1.2 + (rnd() - 0.5), 0.4 + rnd() * 0.6, nz * 1.2 + (rnd() - 0.5), 1.0, 0.3, 1.1, 0xb9b4a8, 0xa39e92, 0.3, 0, 1.4)
        }
        break
      }
      case 'ram': {
        const p = Math.min(1, e.power / 18)
        for (let i = 0; i < 6 + p * 18; i++) fi.emit(e.x, e.y, e.z, (rnd() - 0.5) * 12 * (0.4 + p), rnd() * 7 * (0.4 + p), (rnd() - 0.5) * 12 * (0.4 + p), 0.4 + rnd() * 0.3, 0.3, 0.05, 0xfff0b0, 0xff7a20, 1, 20, 0.3)
        for (let i = 0; i < 3 + p * 6; i++) sm.emit(e.x, e.y - 0.4, e.z, (rnd() - 0.5) * 3, 1 + rnd() * 2, (rnd() - 0.5) * 3, 0.9, 0.8, 2.6, 0xbfb8aa, 0xbfb8aa, 0.45, 0, 1)
        this.snd(e.power > 12 ? 'crash' : 'hitl', { vol: this.vol(e.x, e.z, 0.35 + p * 0.65, 30), rate: 0.85 + rnd() * 0.3 })
        this.addShake(e.x, e.z, 0.1 + p * 0.5)
        for (const id of [e.a, e.b]) { const kv = this.cars.get(id); if (kv) { kv.hvV -= p * 2.5; kv.rsV += (Math.random() - 0.5) * p * 3 } }
        if (e.power > 11) for (const id of [e.a, e.b]) { const v = this.cars.get(id); if (v && rnd() < 0.6) this.fling(v, e.x, e.z, 7 + p * 6) }
        break
      }
      case 'wall': { const p = Math.min(1, e.power / 16); for (let i = 0; i < 4 + p * 10; i++) fi.emit(e.x, e.y, e.z, (rnd() - 0.5) * 8, rnd() * 5, (rnd() - 0.5) * 8, 0.35, 0.3, 0.05, 0xfff0b0, 0xff7a20, 1, 20, 0.3); this.snd('clink', { vol: this.vol(e.x, e.z, 0.3 + p * 0.5, 28), rate: 0.7 + rnd() * 0.3 }); this.addShake(e.x, e.z, 0.05 + p * 0.25); break }
      case 'explode': this.bigExplosion(e, S); break
      case 'boom': this.firework(e); break
      case 'pillar': this.pillarCollapse(e); break
      case 'land': { const lv = this.cars.get(e.id); if (lv) lv.hvV -= Math.min(5, e.power * 0.5); if (lv) lv.psV += 0.8 * (Math.random() - 0.3)
        const p = Math.min(1, e.power / 16); for (let i = 0; i < 8 + p * 12; i++) { const a = rnd() * 6.28; sm.emit(e.x + Math.sin(a), e.y + 0.2, e.z + Math.cos(a), Math.sin(a) * (3 + p * 3), 0.6, Math.cos(a) * (3 + p * 3), 0.9, 0.8, 2.6, 0xcbc4b6, 0xcbc4b6, 0.5, 0, 2) } if (e.power > 7) { this.snd('thud', { vol: this.vol(e.x, e.z, 0.4 + p * 0.5, 30), rate: 0.8 }); this.addShake(e.x, e.z, 0.1 + p * 0.3) } break }
      case 'pickup': { const c = PICKC[e.type] || 0xffffff; for (let i = 0; i < 18; i++) { const a = rnd() * 6.28, u = 2 + rnd() * 4; fi.emit(e.x, e.y + 1.2, e.z, Math.sin(a) * u, 3 + rnd() * 5, Math.cos(a) * u, 0.9, 0.5, 0.1, c, 0xffffff, 1, 8, 0.6) } this.rings.ring(e.x, e.y, e.z, 3, c, 0.5); this.snd('bell', { vol: this.vol(e.x, e.z, 0.5, 30), rate: 1.2 }); break }
      case 'repair': { for (let i = 0; i < 20; i++) fi.emit(e.x + (rnd() - 0.5) * 2, e.y + 0.5, e.z + (rnd() - 0.5) * 2, 0, 2 + rnd() * 3, 0, 1, 0.5, 0.1, 0x6bff9a, 0xffffff, 0.9, -1, 0.5); this.snd('repair', { vol: this.vol(e.x, e.z, 0.7, 30) }); break }
      case 'pdie': { const c = TEAM_COLORS[e.team]; for (let i = 0; i < 14; i++) fi.emit(e.x, e.y + 1, e.z, (rnd() - 0.5) * 9, rnd() * 8, (rnd() - 0.5) * 9, 0.8, 0.5, 0.1, c, 0xffffff, 1, 18, 0.4); this.confettiBurst(e.x, e.y + 1, e.z, 14, 7); this.snd('roll', { vol: this.vol(e.x, e.z, 0.4, 24), rate: 1.4 }); break }
      case 'plant': for (let i = 0; i < 5; i++) sm.emit(e.x, e.y + 0.1, e.z, (rnd() - 0.5) * 2, 0.5, (rnd() - 0.5) * 2, 0.6, 0.4, 1.2, 0xcbc4b6, 0xcbc4b6, 0.4, 0, 2); this.snd('thud', { vol: this.vol(e.x, e.z, 0.25, 22), rate: 1.3 }); break
      case 'runover': this.snd('punch', { vol: this.vol(e.x, e.z, 0.6, 24) }); this.confettiBurst(e.x, e.y + 1, e.z, 8, 5); break
      case 'dropMine': this.snd('latch', { vol: this.vol(e.x, e.z, 0.5, 24) }); break
      case 'dropOil': this.snd('splash', { vol: this.vol(e.x, e.z, 0.6, 24) }); for (let i = 0; i < 10; i++) fi.emit(e.x, e.y + 0.3, e.z, (rnd() - 0.5) * 4, 2 + rnd() * 3, (rnd() - 0.5) * 4, 0.6, 0.35, 0.1, 0x222228, 0x222228, 1, 14, 0.2); break
      case 'slip': this.snd('roll', { vol: this.vol(e.x, e.z, 0.35, 24), rate: 1.6 }); break
      case 'reload': this.snd('latch', { vol: this.vol(e.x, e.z, 0.35, 22), rate: 0.9 }); break
      case 'reloaded': this.snd('pin', { vol: this.vol(e.x, e.z, 0.35, 22), rate: 1.0 }); break
      case 'overheat': for (let i = 0; i < 10; i++) sm.emit(e.x, e.y + 2.5, e.z, (rnd() - 0.5) * 1.5, 2 + rnd(), (rnd() - 0.5) * 1.5, 1.2, 0.5, 1.8, 0xf0eee8, 0xf0eee8, 0.6, -0.5, 0.5); this.snd('splash', { vol: this.vol(e.x, e.z, 0.4, 22), rate: 1.8 }); break
      case 'board': this.snd('horn', { vol: this.vol(e.x, e.z, 0.35, 30), rate: 1.5 }); for (let i = 0; i < 10; i++) sm.emit(e.x, e.y + 0.4, e.z, (rnd() - 0.5) * 5, 1, (rnd() - 0.5) * 5, 0.8, 0.8, 2, 0xcbc4b6, 0xcbc4b6, 0.5, 0, 2); break
      case 'swap': this.snd('switch', { vol: 0.6 }); break
      case 'respawn': { const col = TEAM_COLORS[e.team]; for (let i = 0; i < 16; i++) sm.emit(e.x, e.y + 0.5, e.z, (rnd() - 0.5) * 7, 1 + rnd() * 2.5, (rnd() - 0.5) * 7, 1.0, 0.8, 2.8, 0xfff0c0, 0xcbc4b6, 0.5, 0, 2); this.rings.ring(e.x, e.y, e.z, 4.5, col, 0.7); this.snd('horn', { vol: this.vol(e.x, e.z, 0.4, 36), rate: 1.5 }); break }
      case 'centerRepair': this.rings.ring(e.x, e.y, e.z, 7, 0x43d17a, 0.9, 0.8); this.snd('bell', { vol: 0.4, rate: 1.5 }); break
      case 'spare': for (let i = 0; i < 14; i++) sm.emit(e.x, e.y + 0.5, e.z, (rnd() - 0.5) * 6, 1 + rnd() * 2, (rnd() - 0.5) * 6, 1.0, 0.8, 2.6, 0xfff0c0, 0xcbc4b6, 0.5, 0, 2); this.rings.ring(e.x, e.y, e.z, 3.5, 0xffd23a, 0.6); break
      case 'vanish': for (let i = 0; i < 8; i++) sm.emit(e.x, e.y + 0.6, e.z, (rnd() - 0.5) * 3, 1 + rnd(), (rnd() - 0.5) * 3, 1.2, 1.2, 3.5, 0x4a4845, 0x4a4845, 0.5, 0, 1); break
      case 'flash': this.rings.flash(e.x, e.y, e.z, 12, 0xffffff, 0.35); this.rings.ring(e.x, e.y, e.z, FLASH_R * 0.5, 0xdff4ff, 0.6, 0.6); for (let i = 0; i < 20; i++) fi.emit(e.x, e.y, e.z, (rnd() - 0.5) * 22, rnd() * 10, (rnd() - 0.5) * 22, 0.8, 0.5, 0.1, 0xffffff, 0xcfeaff, 1, 8, 0.6); this.snd('bell', { vol: this.vol(e.x, e.z, 0.32, 40), rate: 2.4 }); this.snd('boom5', { vol: this.vol(e.x, e.z, 0.35, 40), rate: 1.7 }); break
      case 'throw': this.snd('whoosh', { vol: this.vol(e.x, e.z, 0.5, 26), rate: 1.7 }); break
      case 'bounce': this.snd('spring', { vol: this.vol(e.x, e.z, 0.4, 26), rate: 1.3 + rnd() * 0.5 }); for (let i = 0; i < 4; i++) fi.emit(e.x, e.y, e.z, (rnd() - 0.5) * 5, rnd() * 4, (rnd() - 0.5) * 5, 0.3, 0.3, 0.05, 0xfff0b0, 0xffb040, 1, 14, 0.4); break
      case 'smoke': this.snd('splash', { vol: this.vol(e.x, e.z, 0.7, 30), rate: 0.7 }); break
      case 'turret': this.snd('latch', { vol: this.vol(e.x, e.z, 0.6, 26), rate: 0.8 }); this.rings.ring(e.x, e.y, e.z, 3, 0x37b7d6, 0.5); break
      case 'turretEnd': if (e.dead) { this.snd('boom2', { vol: this.vol(e.x, e.z, 0.5, 30), rate: 1.6 }); for (let i = 0; i < 14; i++) fi.emit(e.x, e.y + 1, e.z, (rnd() - 0.5) * 10, rnd() * 8, (rnd() - 0.5) * 10, 0.7, 0.4, 0.1, 0xffe08a, 0xff6a20, 1, 18, 0.3) } break
      case 'spear': this.snd('spear', { vol: this.vol(e.x, e.z, 0.7, 30) }); this.rings.ring(e.x, e.y, e.z, 3, 0xe8b81c, 0.4); break
      case 'turbo': this.snd('whoosh', { vol: this.vol(e.x, e.z, 0.7, 30), rate: 1.0 }); this.rings.ring(e.x, e.y, e.z, 4, 0xffa020, 0.5); break
      case 'ricochet': this.snd('spring', { vol: this.vol(e.x, e.z, 0.6, 30), rate: 1.6 }); this.rings.ring(e.x, e.y, e.z, 3, 0xffd24a, 0.5); break
      case 'wswap': this.snd('latch', { vol: this.vol(e.x, e.z, 0.35, 22), rate: 1.2 }); break
      case 'takeoff': break
    }
  }
  addShake(x, z, a) { const d = this.dist(x, z); this.shake = Math.max(this.shake, a / (1 + d / 12)) }
  confettiBurst(x, y, z, n, sp) { for (let i = 0; i < n; i++) this.pSmoke.emit(x, y, z, (Math.random() - 0.5) * sp * 2, Math.random() * sp, (Math.random() - 0.5) * sp * 2, 1.4, 0.34, 0.3, CONF[i % CONF.length], CONF[(i + 2) % CONF.length], 1, 9, 1.4, 1) }
  fling(v, x, z, speed) {
    const pool = v.fl.filter(o => o.parent !== this.scene)
    const o = pool[(Math.random() * pool.length) | 0]; if (!o) return
    const p = new THREE.Vector3(); o.getWorldPosition(p); this.debris.fling(o, new THREE.Vector3((p.x - x) * 0.8 + (Math.random() - 0.5) * 4, 5 + Math.random() * speed * 0.5, (p.z - z) * 0.8 + (Math.random() - 0.5) * 4), 12)
  }
  bigExplosion(e, S) {
    const fi = this.pFire, sm = this.pSmoke, rnd = Math.random
    this.rings.flash(e.x, e.y, e.z, 7, 0xfff3c8, 0.3); this.rings.ring(e.x, e.y - 0.8, e.z, 14, 0xffc070, 0.7, 0.9)
    this.flashLight.position.set(e.x, e.y + 3, e.z); this.flashLight.intensity = 5200
    for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, u = rnd() * 9; fi.emit(e.x, e.y, e.z, Math.sin(a) * u, 2 + rnd() * 9, Math.cos(a) * u, 0.7 + rnd() * 0.5, 2.2, 0.4, 0xffe08a, 0xff3a0a, 0.95, -2, 1.2) }
    for (let i = 0; i < 40; i++) fi.emit(e.x, e.y, e.z, (rnd() - 0.5) * 24, rnd() * 20, (rnd() - 0.5) * 24, 0.9 + rnd() * 0.5, 0.3, 0.08, 0xfff0b0, 0xff8a20, 1, 22, 0.2)
    for (let i = 0; i < 18; i++) { const a = rnd() * 6.28, u = rnd() * 5; sm.emit(e.x + Math.sin(a), e.y, e.z + Math.cos(a), Math.sin(a) * u, 3 + rnd() * 6, Math.cos(a) * u, 2.2 + rnd(), 1.6, 6.5, 0x1b1a19, 0x3a3836, 0.85, -0.5, 0.7) }
    this.confettiBurst(e.x, e.y, e.z, 30, 10)
    const v = this.cars.get(e.id)
    if (v) { for (let i = 0; i < v.fl.length; i++) this.fling(v, e.x, e.z, 16)
      for (const w of v.wheels) { const p = new THREE.Vector3(); w.spin.getWorldPosition(p); const m = w.spin; this.debris.fling(m, new THREE.Vector3((rnd() - 0.5) * 16, 8 + rnd() * 8, (rnd() - 0.5) * 16), 18); void p } }
    this.snd('boom', { vol: this.vol(e.x, e.z, 1, 40), rate: 0.9 + rnd() * 0.2 }); this.snd('debris', { vol: this.vol(e.x, e.z, 0.6, 34), delay: 0.15 })
    this.addShake(e.x, e.z, 1.2); if (this.dist(e.x, e.z) < 26) this.hitStop = 0.06
  }
  firework(e) {
    const fi = this.pFire, sm = this.pSmoke, rnd = Math.random, small = e.how === 'mine'
    const cols = small ? [0xffc040, 0xff6a20] : [0xffd890, 0xff7a28]
    this.rings.flash(e.x, e.y, e.z, small ? 3.5 : 5, 0xfff3c8, 0.22); this.rings.ring(e.x, e.y - 0.5, e.z, e.r * 1.05, cols[0], 0.55, 0.85)
    const n = small ? 30 : 70
    for (let i = 0; i < n; i++) { const a = rnd() * 6.28, b = Math.acos(rnd() * 2 - 1), u = (small ? 9 : 16) * (0.5 + rnd() * 0.6); fi.emit(e.x, e.y, e.z, Math.sin(b) * Math.sin(a) * u, Math.cos(b) * u + 2, Math.sin(b) * Math.cos(a) * u, 0.9 + rnd() * 0.5, 0.55, 0.12, cols[i % 2], cols[(i + 1) % 2], 1, 6, 1.3) }
    for (let i = 0; i < 8; i++) sm.emit(e.x, e.y, e.z, (rnd() - 0.5) * 8, rnd() * 4, (rnd() - 0.5) * 8, 1.6, 1.4, 4.2, 0x5a5652, 0x7a7670, 0.6, -0.3, 1)
    if (!small) this.confettiBurst(e.x, e.y, e.z, 20, 9)
    this.snd(small ? 'boom2' : 'boom5', { vol: this.vol(e.x, e.z, 0.9, 40), rate: small ? 1.1 : 0.8 }); this.addShake(e.x, e.z, small ? 0.5 : 0.7)
  }
  // ---------------------------------------------------------------- カメラ
  // v = { mode, yaw, pitch, car, person }
  updateCamera(S, v, dt, alpha) {
    const cam = this.cam, tp = new THREE.Vector3(), look = new THREE.Vector3()
    let dist = 6.2, h = 3.0, fovT = 64, lookAhead = 9, lh = 1.1
    if (v.mode === 'orbit') { // タイトル・観戦: 夜のアリーナをゆっくり回る
      const a = this.time * 0.06 + 0.8, R = 98
      tp.set(Math.sin(a) * R, 28 + Math.sin(this.time * 0.2) * 2, Math.cos(a) * R); look.set(0, 1.5, 0); fovT = 58
      this.camPos.lerp(tp, Math.min(1, 3 * dt)); this.camLook.lerp(look, Math.min(1, 5 * dt)); this.focus.set(0, 0, 0)
      cam.position.copy(this.camPos); cam.lookAt(this.camLook); cam.fov = lerp(cam.fov, fovT, 0.1); cam.updateProjectionMatrix(); this.updateSun(0, 0); return
    }
    if (v.mode === 'prep') { // 準備: 自分の車のまわりをゆっくり回る
      const c = v.car, a = this.time * 0.45 + 0.6, R = 9.5
      tp.set(c.x + Math.sin(a) * R, c.y + 3.6, c.z + Math.cos(a) * R); look.set(c.x, c.y + 1.2, c.z)
      if (cam.aspect < 1) look.y -= 2.6   // 縦画面では札の上に車が見えるよう、少し下を見る
      this.camPos.lerp(tp, Math.min(1, 6 * dt)); this.camLook.lerp(look, Math.min(1, 8 * dt)); this.focus.set(c.x, c.y, c.z)
      cam.position.copy(this.camPos); cam.lookAt(this.camLook); cam.fov = lerp(cam.fov, 50, 0.1); cam.updateProjectionMatrix(); this.updateSun(c.x, c.z); return
    }
    let fx, fy, fz, yaw
    if (v.mode === 'walk') { const p = v.person; fx = lerp(p.px, p.x, alpha); fy = lerp(p.py, p.y, alpha); fz = lerp(p.pz, p.z, alpha); yaw = v.yaw; dist = 4.6; h = 2.2; lookAhead = 9; lh = 1.2 }
    else {
      const c = v.car; fx = lerp(c.px, c.x, alpha); fy = lerp(c.py, c.y, alpha); fz = lerp(c.pz, c.z, alpha)
      yaw = v.mode === 'gun' ? v.yaw : lerpAng(c.pyaw, c.yaw, alpha)
      const sp = Math.hypot(c.vx, c.vz)
      if (v.mode === 'drive') { // 車の向きと進む向きの間を見る
        if (sp > 4) { const vy = Math.atan2(c.vx, c.vz); let d = vy - yaw; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; if (Math.abs(d) < 1.2) yaw += d * 0.35 }
        dist = 4.5 + Math.min(1.8, sp * 0.06); h = 1.8 + Math.min(0.5, sp * 0.017); // 2026-11-25 本人「運転の時、もっとカメラ近づけて」6.0〜9.0→4.5〜6.3m lh = 1.35; lookAhead = 11 + Math.min(10, sp * 0.4); fovT = 64 + Math.min(12, sp * 0.4) + (c.boosting ? 7 : 0)
      } else { dist = 5.9; h = 3.0; lookAhead = 34; lh = 1.7; fovT = 66 }
    }
    if (this.cam.aspect < 1) { const pf = 1 + (1 - this.cam.aspect) * 0.22; dist *= pf; h *= pf * 0.95 }
    // 向きはなめらかに追う
    if (this.camYaw === undefined || v.snap) this.camYaw = yaw
    const k = v.mode === 'gun' || v.mode === 'walk' ? 1 : 1 - Math.exp(-5.5 * dt)
    this.camYaw = lerpAng(this.camYaw, yaw, k)
    const sy = Math.sin(this.camYaw), cy = Math.cos(this.camYaw)
    // 車から後ろへ光線を伸ばし、壁・柱・地面に当たったらその手前まで寄せる（射手でも運転でも）
    const camAt = dd => [fx - sy * dd, fy + h * (0.55 + 0.45 * dd / dist) + 0.4, fz - cy * dd]
    let d = dist
    for (let t = 0.6; t <= dist; t += 0.35) {
      const [x, y, z] = camAt(t)
      if (x * x + z * z > (WORLD - 0.5) * (WORLD - 0.5) || solidAtPoint(x, y, z) || solidAtPoint(x, y - 0.5, z) || y < H(x, z) + 0.5) { d = Math.max(2.4, t - 0.7); break }
    }
    { const [cx, cy2, cz] = camAt(d); tp.set(cx, cy2, cz) }
    tp.y = Math.max(tp.y, H(tp.x, tp.z) + 1.0)
    look.set(fx + sy * lookAhead, fy + lh, fz + cy * lookAhead)
    if (v.snap) { this.camPos.copy(tp); this.camLook.copy(look) }
    else { const spN = v.car ? Math.hypot(v.car.vx, v.car.vz) / ((CAR_TYPES[v.car.type] || CAR_TYPES[0]).maxF) : 0; const kp = 1 - Math.exp(-(v.mode === 'gun' ? 14 : Math.max(4.2, 9 - spN * 4.2)) * dt); this.camPos.lerp(tp, kp); this.camLook.lerp(look, 1 - Math.exp(-12 * dt)) }
    cam.position.copy(this.camPos)
    this.shake = Math.max(0, this.shake - dt * 2.4)
    if (this.shake > 0.01) cam.position.add(new THREE.Vector3((Math.random() - 0.5) * this.shake * 0.5, (Math.random() - 0.5) * this.shake * 0.5, (Math.random() - 0.5) * this.shake * 0.5))
    cam.lookAt(this.camLook)
    cam.fov = lerp(cam.fov, fovT, 1 - Math.exp(-4 * dt)); cam.updateProjectionMatrix()
    this.focus.set(fx, fy, fz); this.updateSun(fx, fz)
  }
  updateSun(x, z) { this.sun.position.set(x + this.sunOff.x, this.sunOff.y, z + this.sunOff.z); this.sun.target.position.set(x, 0, z); this.sun.target.updateMatrixWorld() }
  // 画面の真ん中の印が指す所（光線を伸ばして、地面・障害物・車・壁に当たった点）
  aimPoint(S, me, maxD = 150) {
    this.cam.updateMatrixWorld(); const o = this.cam.position, d = this.cam.getWorldDirection(_aimDir)
    for (let t = 2.5; t < maxD; t += 0.7) {
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t
      if (x * x + z * z > WORLD * WORLD) return { x, y, z, t, hit: 'wall' }
      if (y < H(x, z)) return { x, y, z, t, hit: 'ground' }
      if (solidAtPoint(x, y, z)) return { x, y, z, t, hit: 'obst' }
      for (const c of S.cars) { if (c === me || !c.alive || Math.abs(y - (c.y + 1.0)) > 1.5) continue; for (const [cx, cz] of circles(c)) if (Math.hypot(x - cx, z - cz) < carR(c) + 0.15) return { x, y, z, t, hit: 'car', car: c } }
    }
    return { x: o.x + d.x * maxD, y: o.y + d.y * maxD, z: o.z + d.z * maxD, t: maxD, hit: 'none' }
  }
  project(x, y, z, out) { out.set(x, y, z).project(this.cam); return out }
  render() { if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.cam) }
  clearDynamic() { this.splats.clear(); this.marks.clear(); this.pSmoke.clear(); this.pFire.clear(); for (const [, v] of this.cars) this.dropCar(v); this.cars.clear(); this.camYaw = undefined }
}
const _aimDir = new THREE.Vector3()
const _scorch = new THREE.Color(0x1c1a18), _white = new THREE.Color(0xffffff), _team = new THREE.Color()
const CONF = [0x6b6258, 0x8a7a62, 0x4a4a48, 0x9a8f7c, 0x575149, 0xb0a48c]
const PICKC = { turbo: 0xd98a3a, spear: 0xd98a3a, oil: 0xd98a3a, mine: 0xd98a3a, repair: 0x3c9a63, grenade: 0x3a9fbe, flash: 0x3a9fbe, smoke: 0x3a9fbe, ricochet: 0x3a9fbe, turret: 0x3a9fbe }
const ROLE_G = new Set(['grenade', 'flash', 'smoke', 'ricochet', 'turret'])
const BOXG = new THREE.BoxGeometry(1.15, 1.15, 1.15), SPHG = new THREE.SphereGeometry(0.78, 18, 14)

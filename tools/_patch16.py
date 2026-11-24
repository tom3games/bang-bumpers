def edit(path, pairs):
    s=open(path).read()
    for a,b in pairs:
        assert a in s, (path, a[:70]); s=s.replace(a,b,1)
    open(path,'w').write(s)
edit('js/sim.js',[
("grenade: { role: 'G', name: '手榴弾', ammo: 3 },","grenade: { role: 'G', name: '手榴弾', ammo: 3 }, flash: { role: 'G', name: '閃光弾', ammo: 2 },"),
("['ricochet', 2], ['turret', 2]]\nfunction pickType(S) { let r = S.rng() * 20,","['ricochet', 2], ['turret', 2], ['flash', 2]]\nfunction pickType(S) { let r = S.rng() * 22,"),
("turboT: 0, spearT: 0, thr: 0,","turboT: 0, spearT: 0, flashT: 0, flashDur: 1, thr: 0,"),
("c.dmgFlash = Math.max(0, c.dmgFlash - dt)\n","c.dmgFlash = Math.max(0, c.dmgFlash - dt); c.flashT = Math.max(0, c.flashT - dt)\n"),
("  else if (it.type === 'smoke') {","  else if (it.type === 'flash') { S.bullets.push({ type: 'grenade', flash: true, team: t.id, x: c.x + dx * 1.4, y: c.y + 2.4, z: c.z + dz * 1.4, px: c.x, py: c.y + 2.4, pz: c.z, vx: dx * 22 + c.vx * 0.6, vz: dz * 22 + c.vz * 0.6, vy: 8, life: 1.5, id: UID++ }); ev(S, { k: 'throw', team: t.id, x: c.x, y: c.y + 2.4, z: c.z }) }\n  else if (it.type === 'smoke') {"),
("      if (b.life <= 0) { explode(S, b.x, b.y, b.z, b.team, 6.5, 40, 'rocket'); B.splice(i, 1) }","      if (b.life <= 0) { if (b.flash) flashBurst(S, b.x, b.y, b.z, b.team); else explode(S, b.x, b.y, b.z, b.team, 6.5, 40, 'rocket'); B.splice(i, 1) }"),
("export function angDiff(a, b)","""// 閃光弾: 近いほど長く・強く。敵は最大約3秒、自分たち（投げた車も）は4割まで。壁ごしは半分
export const FLASH_R = 24
function flashBurst(S, x, y, z, by) {
  ev(S, { k: 'flash', x, y, z, team: by })
  for (const c of S.cars) {
    if (!c.alive || c.team < 0) continue
    const d = Math.hypot(c.x - x, c.z - z, c.y + 1.5 - y); if (d > FLASH_R) continue
    let dur = 3.0 * Math.pow(1 - d / FLASH_R, 0.8) + 0.25
    if (!lineClear(x, y, z, c.x, c.y + 1.5, c.z)) dur *= 0.5
    if (c.team === by) dur *= 0.4
    if (dur > c.flashT) { c.flashT = dur; c.flashDur = dur }
  }
}
export function angDiff(a, b)"""),
])
edit('js/cpu.js',[
("export function cpuDrive(S, t, c, dt, humanGunAim = null) {\n  const m = mem(t),","export function cpuDrive(S, t, c, dt, humanGunAim = null) {\n  if (c.flashT > 0.05) return { throttle: 0.75, steer: 0, boost: false }   // 目がくらんでいる間は、ただまっすぐ走る\n  const m = mem(t),"),
("  const want = tx != null ? Math.atan2(tx - c.x, tz - c.z) + m.noise * (0.025 + dist * 0.0012) :","  const blind = c.flashT > 0.05 ? (S.rng() - 0.5) * 0.9 : 0\n  const want = tx != null ? Math.atan2(tx - c.x, tz - c.z) + blind + m.noise * (0.025 + dist * 0.0012) :"),
("    if (it === 'grenade' && tx != null && dist > 8 && dist < 32) useG = true","    if (it === 'grenade' && tx != null && dist > 8 && dist < 32) useG = true\n    else if (it === 'flash' && tx != null && dist > 7 && dist < 24) useG = true"),
])
edit('js/stage.js',[
("g.visible = true; g.position.set(x, y, zz); g.rotation.x += 0.2; g.rotation.z += 0.15\n        if (Math.floor(this.time * 8) % 2 === 0) g.children[1].material.color.setHex(0xff3a2a); else g.children[1].material.color.setHex(0x331010)","g.visible = true; g.position.set(x, y, zz); g.rotation.x += 0.2; g.rotation.z += 0.15\n        g.children[0].material.color.setHex(b.flash ? 0xcfe8f2 : 0x4a5a36)\n        if (Math.floor(this.time * 8) % 2 === 0) g.children[1].material.color.setHex(b.flash ? 0xffffff : 0xff3a2a); else g.children[1].material.color.setHex(0x331010)"),
("grenade: ['#1fa6cf', 'gren'],","grenade: ['#1fa6cf', 'gren'], flash: ['#1fa6cf', 'flash'],"),
("grenade: 0x1fa6cf, smoke: 0x1fa6cf,","grenade: 0x1fa6cf, flash: 0x1fa6cf, smoke: 0x1fa6cf,"),
("const ROLE_G = new Set(['grenade',","const ROLE_G = new Set(['grenade', 'flash',"),
("    else if (kind === 'gren') {","    else if (kind === 'flash') { g.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, r = i % 2 ? 22 : 40; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r) } g.closePath(); g.fill() }\n    else if (kind === 'gren') {"),
("      case 'throw':","      case 'flash': this.rings.flash(e.x, e.y, e.z, 12, 0xffffff, 0.35); this.rings.ring(e.x, e.y, e.z, FLASH_R * 0.5, 0xdff4ff, 0.6, 0.6); for (let i = 0; i < 20; i++) fi.emit(e.x, e.y, e.z, (rnd() - 0.5) * 22, rnd() * 10, (rnd() - 0.5) * 22, 0.8, 0.5, 0.1, 0xffffff, 0xcfeaff, 1, 8, 0.6); this.snd('bell', { vol: this.vol(e.x, e.z, 0.32, 40), rate: 2.4 }); this.snd('boom5', { vol: this.vol(e.x, e.z, 0.35, 40), rate: 1.7 }); break\n      case 'throw':"),
("import { TEAM_COLORS, MAXF, CAR_TYPES } from './sim.js?v=2'","import { TEAM_COLORS, MAXF, CAR_TYPES, FLASH_R } from './sim.js?v=2'"),
])
edit('js/main.js',[
("      case 'overheat':","      case 'flash': { const mc = myTeam() && myTeam().car >= 0 ? S.cars.find(q => q.id === myTeam().car) : null; if (mc && mc.flashT > 0.3) { Snd.muffle(Math.min(2.2, mc.flashT * 0.8)); playSnd('bell', { vol: 0.16, rate: 3.2 }) } break }\n      case 'overheat':"),
("    engine.update(S, dt, c,","    { const fx = $('flashfx'), a = c && c.flashT > 0 ? Math.min(0.82, Math.min(1, c.flashT / 0.9) * 0.82 * Math.min(1, c.flashT / Math.max(0.5, c.flashDur * 0.6))) : 0; fx.style.opacity = a.toFixed(3) }\n    engine.update(S, dt, c,"),
])
edit('index.html',[
('<div id="view"></div>','<div id="view"></div>\n<div id="flashfx"></div>'),
])
c=open('style.css').read()
c+="#flashfx{position:fixed;inset:0;z-index:7;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 46%,#fff 0%,#fff 55%,rgba(255,255,255,.88) 100%);transition:opacity .08s linear}\n"
open('style.css','w').write(c)

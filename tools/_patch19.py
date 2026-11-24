def edit(path, pairs):
    s=open(path).read()
    for a,b in pairs:
        assert a in s, (path, a[:70]); s=s.replace(a,b,1)
    open(path,'w').write(s)
edit('js/sim.js',[
("export const TEAM_COLORS = [0xe8452e, 0x2f78e6, 0xf2c230, 0x38b25a, 0xe05cb4]","export const TEAM_COLORS = [0xa8392f, 0x2f5f9a, 0xb8962f, 0x3c7a4e, 0x8d4c85]"),
("paint: { name: 'ペイント弾',","paint: { name: '機関銃',"),
("rocket: { name: '花火ロケット',","rocket: { name: 'ロケット弾',"),
("confetti: { name: '紙吹雪',","confetti: { name: '散弾',"),
("spring: { name: 'バネの鉄球',","spring: { name: '跳ね玉',"),
("cork: { name: 'コルク砲',","cork: { name: '狙撃砲',"),
])
edit('js/stage.js',[
("const CONF = [0xff4a8a, 0xffd23a, 0x4ad0ff, 0xa0ff5a, 0xff7a2a, 0xffffff, 0xb07aff]","const CONF = [0x6b6258, 0x8a7a62, 0x4a4a48, 0x9a8f7c, 0x575149, 0xb0a48c]"),
("const PICKC = { turbo: 0xf08a1e, spear: 0xf08a1e, oil: 0xf08a1e, mine: 0xf08a1e, repair: 0x2f9e57, grenade: 0x1fa6cf, flash: 0x1fa6cf, smoke: 0x1fa6cf, ricochet: 0x1fa6cf, turret: 0x1fa6cf }","const PICKC = { turbo: 0xd98a3a, spear: 0xd98a3a, oil: 0xd98a3a, mine: 0xd98a3a, repair: 0x3c9a63, grenade: 0x3a9fbe, flash: 0x3a9fbe, smoke: 0x3a9fbe, ricochet: 0x3a9fbe, turret: 0x3a9fbe }"),
("turbo: ['#f08a1e', 'bolt'], spear: ['#f08a1e', 'spear'], oil: ['#f08a1e', 'oil'], mine: ['#f08a1e', 'mine'], repair: ['#2f9e57', 'plus'], grenade: ['#1fa6cf', 'gren'], flash: ['#1fa6cf', 'flash'], smoke: ['#1fa6cf', 'cloud'], ricochet: ['#1fa6cf', 'zig'], turret: ['#1fa6cf', 'tur']","turbo: ['#c97a2e', 'bolt'], spear: ['#c97a2e', 'spear'], oil: ['#c97a2e', 'oil'], mine: ['#c97a2e', 'mine'], repair: ['#34855a', 'plus'], grenade: ['#2f8aa8', 'gren'], flash: ['#2f8aa8', 'flash'], smoke: ['#2f8aa8', 'cloud'], ricochet: ['#2f8aa8', 'zig'], turret: ['#2f8aa8', 'tur']"),
# bullets smaller & realistic
("        if (b.type === 'spring') s.set(1.7, 1.7, 1.7); else if (b.type === 'cork') s.set(0.8, 0.8, 5.5); else s.set(1, 1, 3.6)","        if (b.type === 'spring') s.set(0.9, 0.9, 0.9); else if (b.type === 'cork') s.set(0.38, 0.38, 4.8); else s.set(0.42, 0.42, 3.0)"),
("this.bulletM.setColorAt(nb, b.type === 'cork' ? c.setHex(0xe8c080).multiplyScalar(1.3) : b.type === 'spring' ? c.setHex(TEAM_COLORS[b.team] ?? 0xffffff).lerp(_white, 0.55).multiplyScalar(1.4) : (b.bounces > 0 ? c.setHex(0xffd24a).multiplyScalar(1.7) : c.setHex(TEAM_COLORS[b.team] ?? 0xffffff).multiplyScalar(1.6))); nb++","this.bulletM.setColorAt(nb, b.type === 'cork' ? c.setHex(0xffd9a0).multiplyScalar(1.5) : b.type === 'spring' ? c.setHex(0xaab0b8).multiplyScalar(1.0) : (b.bounces > 0 ? c.setHex(0xffc060).multiplyScalar(1.7) : c.setHex(0xffe2b0).lerp(_team.setHex(TEAM_COLORS[b.team] ?? 0xffffff), 0.28).multiplyScalar(1.5))); nb++"),
("const _scorch = new THREE.Color(0x1c1a18), _white = new THREE.Color(0xffffff)","const _scorch = new THREE.Color(0x1c1a18), _white = new THREE.Color(0xffffff), _team = new THREE.Color()"),
("new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false })","new THREE.SphereGeometry(0.16, 6, 5), new THREE.MeshBasicMaterial({ toneMapped: false })"),
# firework colors -> orange/white
("const cols = small ? [0xffc040, 0xff6a20] : [[0xff4a8a, 0xffd23a], [0x4ad0ff, 0xffffff], [0xa0ff5a, 0xffe14a]][(rnd() * 3) | 0]","const cols = small ? [0xffc040, 0xff6a20] : [0xffd890, 0xff7a28]"),
])
# rocket mesh smaller
s=open('js/stage.js').read()
s=s.replace("g.visible = false; S.add(g); this.rockets.push(g)","g.scale.setScalar(0.75); g.visible = false; S.add(g); this.rockets.push(g)")
s=s.replace("const wm = new THREE.MeshStandardMaterial({ map: TX.wallRingTexture(aniso), emissiveMap: TX.wallRingEmissive(), emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.85, metalness: 0.1, side: THREE.BackSide })\n    wm.map.repeat.set(5, 1)","const wm = new THREE.MeshStandardMaterial({ map: TX.wallRingTexture(aniso), emissiveMap: TX.wallRingEmissive(), emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.85, metalness: 0.1, side: THREE.BackSide })\n    wm.map.repeat.set(-5, 1); wm.map.offset.x = 1; wm.emissiveMap.repeat.set(-5, 1); wm.emissiveMap.offset.x = 1")
s=s.replace("const a = this.time * 0.06 + 0.8, R = 64\n      tp.set(Math.sin(a) * R, 15 + Math.sin(this.time * 0.2) * 2, Math.cos(a) * R)","const a = this.time * 0.06 + 0.8, R = 80\n      tp.set(Math.sin(a) * R, 24 + Math.sin(this.time * 0.2) * 2, Math.cos(a) * R)")
open('js/stage.js','w').write(s)
t=open('js/textures.js').read()
t=t.replace("g.fillStyle = '#4b4d50'; g.beginPath(); g.arc(X(0), Z(0), WORLD * k, 0, 7); g.fill()","g.fillStyle = '#5c5f63'; g.beginPath(); g.arc(X(0), Z(0), WORLD * k, 0, 7); g.fill()")
t=t.replace("gr.addColorStop(0, 'rgba(255,238,205,0.20)')","gr.addColorStop(0, 'rgba(255,238,205,0.34)')")
open('js/textures.js','w').write(t)
c=open('style.css').read()
c=c.replace(":root{--y:#f2c230;",":root{--y:#d3ad4a;")
c=c.replace("--drv:#f08a1e;--gun:#1fa6cf","--drv:#d98a3a;--gun:#3a9fbe")
c+="\n:root{--drv:#d98a3a;--gun:#3a9fbe}\n"
open('style.css','w').write(c)
m=open('js/main.js').read()
m=m.replace("paint: ['ペイント弾', '連射できる。撃ち続けると熱くなる', 'Rapid fire. Heats up'], rocket: ['花火ロケット', '追いかける花火。爆発が大きい', 'Homing firework. Big blast'], confetti: ['紙吹雪', '近くで一気に広がる散弾', 'Close-range spread'], spring: ['バネの鉄球', '跳ね返って転がる重い玉', 'Bouncing steel ball'], cork: ['コルク砲', '速くて遠くまで届く一発', 'Fast, long-range single shot']","paint: ['機関銃', '連射できる。撃ち続けると熱くなる', 'Rapid fire. Heats up'], rocket: ['ロケット弾', '追いかける。爆発が大きい', 'Homing. Big blast'], confetti: ['散弾', '近くで一気に広がる', 'Close-range spread'], spring: ['跳ね玉', '跳ね返って転がる重い玉', 'Bouncing slug'], cork: ['狙撃砲', '速くて遠くまで届く一発', 'Fast, long-range single shot']")
# cars: 3 types
m=m.replace("const CAR_NOTE_EN = ['Balanced all-rounder', 'Fast and light, fragile', 'Slow but tough, hits hard', 'Nimble, long boost']\nconst CAR_NAME_EN = ['Balance', 'Zoom', 'Thud', 'Nimble']","const CAR_NOTE_EN = ['Balanced all-rounder', 'Fast and light, fragile', 'Slow but tough, hits hard']\nconst CAR_NAME_EN = ['Balance', 'Zoom', 'Thud']")
open('js/main.js','w').write(m)

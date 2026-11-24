def edit(path, pairs):
    s=open(path).read()
    for a,b in pairs:
        assert a in s, (path, a[:70]); s=s.replace(a,b,1)
    open(path,'w').write(s)
edit('js/models.js',[
("  mesh(mat, shadow = true) { if (!this.geos.length) return null; const o = new THREE.Mesh(mergeGeometries(this.geos), mat);","  mesh(mat, shadow = true) { if (!this.geos.length) return null; const o = new THREE.Mesh(mergeGeometries(this.geos), mat); o.geometry.userData.own = true;"),
("return { g: root, body, spear, paint, parts,","const own = [paint, helmG.material, helmD.material, flag.material, nm, nt, beacon.material, flash.material]\n  return { own, g: root, body, spear, paint, parts,"),
])
edit('js/stage.js',[
("    if (v && v.type !== c.type) { this.scene.remove(v.g); this.cars.delete(c.id); v = null }","    if (v && v.type !== c.type) { this.dropCar(v); this.cars.delete(c.id); v = null }"),
("    for (const [id, v] of this.cars) if (!seen.has(id)) { this.scene.remove(v.g); this.cars.delete(id) }","    for (const [id, v] of this.cars) if (!seen.has(id)) { this.dropCar(v); this.cars.delete(id) }"),
("for (const [, v] of this.cars) this.scene.remove(v.g); this.cars.clear();","for (const [, v] of this.cars) this.dropCar(v); this.cars.clear();"),
("  dist(x, z) { return","  // 捨てる車の見た目を解放する（長い配信でメモリが増えないように）\n  dropCar(v) { this.scene.remove(v.g); v.g.traverse(o => { if (o.geometry && o.geometry.userData && o.geometry.userData.own) o.geometry.dispose() }); for (const m of v.own || []) { if (m && m.map && m.map.dispose) m.map.dispose(); if (m && m.dispose) m.dispose() } }\n  dist(x, z) { return"),
("this.addShake(e.x, e.z, 1.2); this.hitStop = 0.07","this.addShake(e.x, e.z, 1.2); if (this.dist(e.x, e.z) < 26) this.hitStop = 0.06"),
("      this.camPos.lerp(tp, Math.min(1, 6 * dt)); this.camLook.lerp(look, Math.min(1, 8 * dt)); this.focus.set(c.x, c.y, c.z)","      if (cam.aspect < 1) look.y -= 2.6   // 縦画面では札の上に車が見えるよう、少し下を見る\n      this.camPos.lerp(tp, Math.min(1, 6 * dt)); this.camLook.lerp(look, Math.min(1, 8 * dt)); this.focus.set(c.x, c.y, c.z)"),
# bunting variation
("    for (const zz of [-24, 24]) for (let i = 0; i < 40; i++) { const x = -58 + i * 2.95; m4.makeTranslation(x, 20.2 + Math.sin(i * 1.3) * 0.12, zz); im.setMatrixAt(k, m4); im.setColorAt(k, c.setHex(TEAM_COLORS[i % 5])); k++ }","    for (const zz of [-24, 24]) for (let i = 0; i < 40; i++) { if ((i * 7 + (zz > 0 ? 3 : 0)) % 11 === 0) continue; const x = -58 + i * 2.95 + Math.sin(i * 2.1) * 0.25, sag = Math.sin((i / 39) * Math.PI) * 1.6, sc = 0.8 + ((i * 13) % 5) * 0.1; m4.compose(new THREE.Vector3(x, 20.8 - sag + Math.sin(i * 1.3) * 0.1, zz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.sin(i * 1.7) * 0.18)), new THREE.Vector3(sc, sc, sc)); im.setMatrixAt(k, m4); im.setColorAt(k, c.setHex(TEAM_COLORS[(i * 3 + (zz > 0 ? 2 : 0)) % 5])); k++ }"),
])
edit('js/arena.js',[
("{ x: -26, z: -98, ang: Math.PI / 2, len: 15, w: 9, h: 4.2 }, { x: 26, z: 98, ang: -Math.PI / 2, len: 15, w: 9, h: 4.2 },\n  { x: 98, z: -26, ang: 0, len: 15, w: 9, h: 4.2 }, { x: -98, z: 26, ang: Math.PI, len: 15, w: 9, h: 4.2 },","{ x: -26, z: -98, ang: Math.PI / 2, len: 14, w: 9, h: 5.4 }, { x: 26, z: 98, ang: -Math.PI / 2, len: 14, w: 9, h: 5.4 },\n  { x: 98, z: -26, ang: 0, len: 14, w: 9, h: 5.4 }, { x: -98, z: 26, ang: Math.PI, len: 14, w: 9, h: 5.4 },"),
("[36, 98, 12, 5, 4.5, 'machine'], [-36, -100, 12, 5, 4.5, 'machine']","[48, 86, 12, 5, 4.5, 'machine'], [-48, -88, 12, 5, 4.5, 'machine']"),
])

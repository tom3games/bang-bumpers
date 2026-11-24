import re
m=open('js/main.js').read()
def sub(a,b):
    global m
    assert a in m, a[:70]
    m=m.replace(a,b,1)
sub("import { cleanName, cpuNames, NAME_MAX } from './names.js'","import { cleanName, cpuNames, NAME_MAX } from './names.js'\nimport { EngineMix } from './engine.js'")
sub("  roll: ['snd/roll1.mp3', 'snd/roll2.mp3'],","  eng: ['snd/eng_idle.wav', 'snd/eng_mid.wav', 'snd/eng_high.wav'], roll: ['snd/roll1.mp3', 'snd/roll2.mp3'],")
sub("const sfxLast = {}","const engine = new EngineMix()\nlet bgmOn = false\nfunction bgm(v, fade = 1.4) {\n  if (!Snd.ctx) return\n  if (!bgmOn) { bgmOn = true; Snd.loop('bgm', 'snd/bgm_suno.mp3', v, 1.5); return }\n  const l = Snd.loops.bgm; if (l && l.g) { const t = Snd.ctx.currentTime; l.g.gain.cancelScheduledValues(t); l.g.gain.setValueAtTime(l.g.gain.value, t); l.g.gain.linearRampToValueAtTime(v, t + fade); l.vol = v }\n}\nconst sfxLast = {}")
sub("  Snd.init(); Snd.loop('bgm', 'snd/bgm.mp3', 0.26, 1.2); Snd.loop('amb', 'snd/amb1.mp3', 0.1, 1); Snd.loop('eng', 'snd/engine.mp3', 0.0001, 0.3)","  Snd.init(); bgm(0.26); Snd.loop('amb', 'snd/amb1.mp3', 0.08, 1)")
sub("  phase = 'play'; $('prep').hidden = true; $('hud').hidden = false; snapCam = true","  phase = 'play'; $('prep').hidden = true; $('hud').hidden = false; snapCam = true; bgm(0.17, 2.5)")
sub("  Snd.loop('eng', null)\n}","  engine.clear(); bgm(0.26)\n}")
sub("  playSnd(rank <= 2 ? 'win' : 'lose', { vol: 0.9 }); Snd.duck(0.3, 3)","  playSnd(rank <= 2 ? 'win' : 'lose', { vol: 0.9 }); Snd.duck(0.3, 3); engine.clear(); bgm(0.26)")
# remove old engine block in frame
a=m.index("    // エンジン音\n"); b=m.index("    drawWind(")
m=m[:a]+"    engine.update(S, dt, c, stage.camYaw, muted, S.phase === 'play' && !S.over)\n    { const sp = c ? Math.hypot(c.vx, c.vz) : 0\n      if (c && c.slip > 4.2 && !c.air && sp > 6 && performance.now() - (window.__scrub || 0) > 380) { window.__scrub = performance.now(); playSnd('roll', { vol: Math.min(0.5, c.slip * 0.06), rate: 1.7 + Math.random() * 0.3 }) } }\n"+m[b:]
sub("await Promise.race([Snd.prefetch(['snd/bgm.mp3', 'snd/amb1.mp3', 'snd/engine.mp3'])","await Promise.race([Snd.prefetch(['snd/bgm_suno.mp3', 'snd/amb1.mp3'])")
# title first gesture: start bgm
sub("  Snd.init()\n})\naddEventListener('keyup'","  Snd.init(); if (phase === 'title') bgm(0.26)\n})\naddEventListener('keyup'")
sub("view.addEventListener('mousedown', e => { if (e.button === 0) { K.mouseDown = true; Snd.init();","view.addEventListener('mousedown', e => { if (e.button === 0) { K.mouseDown = true; Snd.init(); if (phase === 'title') bgm(0.26);")
open('js/main.js','w').write(m)

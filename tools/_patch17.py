import re
s=open('js/sim.js').read()
a=s.index("  const lim = WORLD - 3"); b=s.index("  if (hit > 5) {")
s=s[:a]+"""  const lim = WORLD - 3
  let hit = 0
  { const rr = Math.hypot(c.x, c.z); if (rr > lim) { const nx = c.x / rr, nz = c.z / rr; c.x = nx * lim; c.z = nz * lim; const vn = c.vx * nx + c.vz * nz; if (vn > 0) { hit = vn; c.vx -= 1.5 * vn * nx; c.vz -= 1.5 * vn * nz } } }
"""+s[b:]
def sub(a,b):
    global s
    assert a in s, a[:70]; s=s.replace(a,b,1)
sub("if (solidAtPoint(b.x, b.y, b.z) || Math.abs(b.x) > WORLD || Math.abs(b.z) > WORLD) { b.x = b.px; b.z = b.pz; b.vx *= -0.5; b.vz *= -0.5 }","if (solidAtPoint(b.x, b.y, b.z) || b.x * b.x + b.z * b.z > WORLD * WORLD) { b.x = b.px; b.z = b.pz; b.vx *= -0.5; b.vz *= -0.5 }")
sub("if (Math.abs(b.x) > WORLD || Math.abs(b.z) > WORLD) { hitK = 'wall'; b.x = clamp(b.x, -WORLD, WORLD); b.z = clamp(b.z, -WORLD, WORLD) }","if (b.x * b.x + b.z * b.z > WORLD * WORLD) { hitK = 'wall'; const rr = Math.hypot(b.x, b.z); b.x *= WORLD / rr; b.z *= WORLD / rr }")
sub("        if (Math.abs(b.px + b.vx * dt) > WORLD || solidAtPoint(b.px + b.vx * dt, b.py, b.pz)) b.vx = -b.vx; else b.vz = -b.vz\n        if (b.type === 'rocket') b.yaw = Math.atan2(b.vx, b.vz)\n        if (Math.abs(b.pz + b.vz * dt) > WORLD) b.vz = -b.vz","        { const nx = b.px + b.vx * dt, nz = b.pz + b.vz * dt\n          if (nx * nx + nz * nz > WORLD * WORLD) { const rr = Math.hypot(b.px, b.pz) || 1, ux = b.px / rr, uz = b.pz / rr, vn = b.vx * ux + b.vz * uz; b.vx -= 2 * vn * ux; b.vz -= 2 * vn * uz }\n          else if (solidAtPoint(nx, b.py, b.pz)) b.vx = -b.vx; else b.vz = -b.vz }\n        if (b.type === 'rocket') b.yaw = Math.atan2(b.vx, b.vz)") if "if (Math.abs(b.pz + b.vz * dt) > WORLD) b.vz = -b.vz" in s else None
s=s.replace("        p.x = clamp(p.x, -WORLD + 1.5, WORLD - 1.5); p.z = clamp(p.z, -WORLD + 1.5, WORLD - 1.5)","        { const rr = Math.hypot(p.x, p.z); if (rr > WORLD - 2) { p.x *= (WORLD - 2) / rr; p.z *= (WORLD - 2) / rr } }")
s=s.replace("      p.x = clamp(nx, -WORLD + 1.5, WORLD - 1.5); p.z = clamp(nz, -WORLD + 1.5, WORLD - 1.5)","      p.x = nx; p.z = nz; { const rr = Math.hypot(p.x, p.z); if (rr > WORLD - 2) { p.x *= (WORLD - 2) / rr; p.z *= (WORLD - 2) / rr } }")
open('js/sim.js','w').write(s)
c=open('js/cpu.js').read()
c=c.replace("import { H, WORLD, HALF, DOORS, pushOutCircle, lineClear, clamp } from './arena.js?v=3'","import { H, WORLD, pushOutCircle, lineClear, clamp } from './arena.js?v=3'")
c=c.replace("  if (Math.abs(x) > WORLD - 2.2 || Math.abs(z) > WORLD - 2.2) return true","  if (x * x + z * z > (WORLD - 3) * (WORLD - 3)) return true")
a=c.index("  // 建屋の中と外をまたぐ時は"); b=c.index("  let goal = Math.atan2")
c=c[:a]+c[b:]
open('js/cpu.js','w').write(c)

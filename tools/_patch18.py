s=open('js/sim.js').read()
def sub(a,b):
    global s
    assert a in s, a[:70]; s=s.replace(a,b,1)
sub("const maxSteer = (0.62 - 0.4 * clamp(Math.abs(sp) / 30, 0, 1)) * T.steer","const maxSteer = (0.31 - 0.19 * clamp(Math.abs(sp) / 30, 0, 1)) * T.steer")
sub("const under = 1 - 0.42 * clamp(spN * spN * Math.abs(c.steer) * 1.4, 0, 1)","const under = 1 - 0.24 * clamp(spN * spN * Math.abs(c.steer) * 1.4, 0, 1)")
sub("const hard = clamp((Math.abs(c.steer) - 0.5) / 0.25, 0, 1) * clamp((Math.abs(sp) / vmax - 0.45) / 0.2, 0, 1) * (thrIn > 0.3 ? 1 : 0)","const hard = clamp((Math.abs(c.steer) - 0.8) / 0.15, 0, 1) * clamp((Math.abs(sp) / vmax - 0.6) / 0.2, 0, 1) * (thrIn > 0.3 ? 1 : 0)")
sub("grip *= (1 - 0.42 * clamp(Math.abs(c.steer) * Math.abs(sp) / 20, 0, 1) * (1 + 0.35 * hard)) * (1 - 0.86 * c.hb)","grip *= (1 - 0.14 * clamp(Math.abs(c.steer) * Math.abs(sp) / 25, 0, 1) - 0.5 * hard) * (1 - 0.88 * c.hb)")
sub("steer: 1.0, grip: 4.2,","steer: 1.0, grip: 9.0,"); sub("steer: 0.9, grip: 3.6,","steer: 0.9, grip: 8.0,"); sub("steer: 0.8, grip: 3.3,","steer: 0.8, grip: 9.5,")
# remove 4th car
a=s.index("  { id: 'agile'"); b=s.index("]", a)
s=s[:a]+s[b:]
open('js/sim.js','w').write(s)

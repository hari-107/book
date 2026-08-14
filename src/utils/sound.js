/**
 * Tiny procedural WebAudio foley — no audio files, everything synthesized:
 * paper flips, photo slaps, leather creaks, stamp thumps, compass ticks.
 * Volumes are deliberately subtle; the book should whisper, not perform.
 * The AudioContext unlocks on the first user gesture. Press M to mute.
 */

let ctx = null
let master = null
let enabled = true

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function initSound() {
  const unlock = () => ac()
  window.addEventListener('pointerdown', unlock, { once: true })
  window.addEventListener('keydown', unlock, { once: true })
}

export function toggleMute() {
  enabled = !enabled
  return enabled
}

function noiseBuffer(c, dur) {
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return buf
}

function noise(c, { dur, type = 'bandpass', from = 800, to = 300, q = 1, gain = 0.1, delay = 0 }) {
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c, dur)
  const filt = c.createBiquadFilter()
  filt.type = type
  filt.Q.value = q
  const g = c.createGain()
  const t0 = c.currentTime + delay
  filt.frequency.setValueAtTime(from, t0)
  filt.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + dur)
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
  src.connect(filt).connect(g).connect(master)
  src.start(t0)
  src.stop(t0 + dur + 0.02)
}

function tone(c, { dur, type = 'sine', from = 90, to = 50, gain = 0.1, delay = 0 }) {
  const osc = c.createOscillator()
  osc.type = type
  const g = c.createGain()
  const t0 = c.currentTime + delay
  osc.frequency.setValueAtTime(from, t0)
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur)
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
  osc.connect(g).connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

export function sfx(name) {
  if (!enabled) return
  let c
  try {
    c = ac()
  } catch {
    return
  }
  if (!c) return
  try {
    switch (name) {
      case 'flip': // paper sliding through air, then settling
        noise(c, { dur: 0.34, from: 1500, to: 320, q: 0.8, gain: 0.09 })
        noise(c, { dur: 0.1, from: 2400, to: 900, q: 2, gain: 0.05, delay: 0.3 })
        break
      case 'slap': // a photograph hitting parchment
        noise(c, { dur: 0.06, type: 'lowpass', from: 1100, to: 500, gain: 0.16 })
        tone(c, { dur: 0.11, from: 120, to: 55, gain: 0.12 })
        break
      case 'creak': // old leather + spine giving way
        tone(c, { dur: 1.15, type: 'sawtooth', from: 68, to: 42, gain: 0.035 })
        noise(c, { dur: 1.1, type: 'lowpass', from: 500, to: 140, gain: 0.045 })
        noise(c, { dur: 0.25, from: 900, to: 400, q: 3, gain: 0.03, delay: 0.75 })
        break
      case 'thump': // rubber stamp
        tone(c, { dur: 0.14, from: 95, to: 48, gain: 0.16 })
        noise(c, { dur: 0.05, type: 'lowpass', from: 700, to: 300, gain: 0.08 })
        break
      case 'tick': // compass needle
        noise(c, { dur: 0.03, type: 'highpass', from: 2500, to: 2000, gain: 0.07 })
        break
      case 'pop': // the button that should not be pressed
        tone(c, { dur: 0.18, type: 'square', from: 220, to: 90, gain: 0.07 })
        noise(c, { dur: 0.28, from: 1800, to: 250, gain: 0.1 })
        break
      default:
        break
    }
  } catch {
    /* audio is garnish — never let it break the book */
  }
}

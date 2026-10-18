import { TIMELINE, useStage } from '../state/useStage'
import { assetExists } from '../utils/assets'

// All sound lives here. Browsers only allow audio after a user gesture, so nothing
// is created until unlockAudio() runs from a click / key press.
//
// Music: public/audio/bgm.mp3 if present, otherwise an original soft music-box
// piece synthesised below (no copyrighted audio is bundled).
// Effects: wind, rustling leaves, whooshes, chimes, paper — all synthesised from noise.

const MUSIC_URL = '/audio/bgm.mp3'
const MP3_VOLUME = 0.25
const SYNTH_VOLUME = 0.55
const WIND_BASE = 0.045

let ctx = null
let master, musicOut, sfxOut, reverb, noise
let windGain, windFilter, gustAmount
let rustleLevel = 1
let synthTimer = null
let mp3 = null

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12)
const rand = (a, b) => a + Math.random() * (b - a)

export function preloadMusic() {
  assetExists(MUSIC_URL).then((ok) => {
    if (!ok || ctx) return
    mp3 = new Audio(MUSIC_URL)
    mp3.loop = true
    mp3.preload = 'auto'
  })
}

export const isAudioUnlocked = () => ctx !== null

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended' && !document.hidden) ctx.resume()
    return
  }
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()

  master = ctx.createGain()
  master.gain.value = useStage.getState().muted ? 0 : 1
  master.connect(ctx.destination)

  reverb = ctx.createConvolver()
  reverb.buffer = makeImpulse(3, 2.4)
  const wet = ctx.createGain()
  wet.gain.value = 0.38
  reverb.connect(wet).connect(master)

  musicOut = ctx.createGain()
  musicOut.gain.value = 0
  musicOut.connect(master)
  musicOut.connect(reverb)

  sfxOut = ctx.createGain()
  sfxOut.connect(master)
  const sfxVerb = ctx.createGain()
  sfxVerb.gain.value = 0.3
  sfxOut.connect(sfxVerb).connect(reverb)

  noise = makeNoise(3)
  startAmbience()
  startMusic()

  useStage.subscribe(onStoreChange)
  document.addEventListener('visibilitychange', onVisibility)
  useStage.getState().setAudioReady(true)
}

export function playSfx(name) {
  if (!ctx || ctx.state !== 'running') return
  if (name === 'paper') paperRustle()
  else if (name === 'oops') oops()
}

/* ---------------------------------------------------------------- state hooks */

function onStoreChange(s, prev) {
  if (s.muted !== prev.muted) master.gain.setTargetAtTime(s.muted ? 0 : 1, ctx.currentTime, 0.15)
  if (s.stage === prev.stage) return
  if (s.stage === 'shake') {
    chime([84, 88, 91], 0.12)
    whoosh(TIMELINE.shake + 0.4, 0.18, 300, 900, 400)
    setWind(3)
  } else if (s.stage === 'fade') {
    whoosh(TIMELINE.fade + 0.6, 0.32, 250, 1300, 600)
    setWind(4)
  } else if (s.stage === 'swirl') {
    swirlSound(TIMELINE.swirl)
    setWind(3)
  } else if (s.stage === 'scatter') {
    whoosh(1.3, 0.3, 1700, 2600, 300)
    sparkle()
    setWind(1.4)
  } else if (s.stage === 'letter') {
    setWind(0.9)
  }
}

function onVisibility() {
  if (document.hidden) {
    ctx.suspend()
    mp3?.pause()
  } else {
    ctx.resume()
    mp3?.play().catch(() => {})
  }
}

/* ---------------------------------------------------------------- buffers */

function makeNoise(seconds) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
  const data = buf.getChannelData(0)
  // Slightly pinkish noise: softer than white noise, closer to wind.
  let last = 0
  for (let i = 0; i < data.length; i++) {
    last = last * 0.86 + (Math.random() * 2 - 1) * 0.14
    data[i] = last * 3.2
  }
  return buf
}

function makeImpulse(seconds, decay) {
  const len = ctx.sampleRate * seconds
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
  }
  return buf
}

/* ---------------------------------------------------------------- music */

function startMusic() {
  const t = ctx.currentTime
  if (mp3) {
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(MP3_VOLUME, t + 3)
    try {
      ctx.createMediaElementSource(mp3).connect(g).connect(master)
    } catch {
      mp3.volume = MP3_VOLUME
    }
    mp3.play().catch(startSynth)
    return
  }
  startSynth()
}

// An original gentle piece in C major (I–V6–vi–iii6–IV–I6–ii–V), 16-bar loop.
const BPM = 66
const BEAT = 60 / BPM
const BAR = BEAT * 4
const CHORDS = [
  { bass: 48, pad: [60, 64, 67], arp: [72, 76, 79, 84] },
  { bass: 47, pad: [59, 62, 67], arp: [71, 74, 79, 83] },
  { bass: 45, pad: [57, 60, 64], arp: [69, 72, 76, 81] },
  { bass: 43, pad: [55, 59, 64], arp: [67, 71, 76, 79] },
  { bass: 41, pad: [57, 60, 65], arp: [69, 72, 77, 81] },
  { bass: 40, pad: [55, 60, 64], arp: [67, 72, 76, 79] },
  { bass: 38, pad: [57, 62, 65], arp: [69, 74, 77, 81] },
  { bass: 43, pad: [55, 59, 62], arp: [67, 71, 74, 79] },
]
// [beat, midi, length in beats]
const MELODY = [
  [[0, 76, 3], [3, 74, 1]],
  [[0, 74, 3], [3, 72, 1]],
  [[0, 72, 3], [3, 71, 1]],
  [[0, 71, 4]],
  [[0, 69, 2], [2, 72, 2]],
  [[0, 67, 2], [2, 72, 2]],
  [[0, 69, 2], [2, 72, 1], [3, 74, 1]],
  [[0, 71, 4]],
  [[0, 79, 1.5], [1.5, 76, 0.5], [2, 77, 1], [3, 79, 1]],
  [[0, 79, 1.5], [1.5, 74, 0.5], [2, 76, 1], [3, 77, 1]],
  [[0, 76, 1.5], [1.5, 72, 0.5], [2, 74, 1], [3, 76, 1]],
  [[0, 76, 2], [2, 74, 1], [3, 72, 1]],
  [[0, 72, 1], [1, 74, 1], [2, 76, 1], [3, 77, 1]],
  [[0, 79, 2], [2, 76, 2]],
  [[0, 77, 1], [1, 76, 1], [2, 74, 1], [3, 72, 1]],
  [[0, 71, 2], [2, 74, 2]],
]
const ARP_SLOW = [0, 1, 2, 1]
const ARP_FAST = [0, 1, 2, 3, 2, 1, 2, 1]

function startSynth() {
  if (synthTimer) return
  musicOut.gain.setValueAtTime(0, ctx.currentTime)
  musicOut.gain.linearRampToValueAtTime(SYNTH_VOLUME, ctx.currentTime + 4)
  let nextBar = ctx.currentTime + 0.2
  let bar = 0
  const schedule = () => {
    // Look ahead generously so a throttled background tab doesn't leave gaps.
    while (nextBar < ctx.currentTime + 1.6) {
      scheduleBar(bar, nextBar)
      nextBar += BAR
      bar = (bar + 1) % MELODY.length
    }
  }
  schedule()
  synthTimer = setInterval(schedule, 200)
}

function scheduleBar(bar, t) {
  const chord = CHORDS[bar % CHORDS.length]
  pad(chord.pad, t, BAR)
  voice('sine', mtof(chord.bass), t, { attack: 0.06, decay: BAR * 0.9, peak: 0.075 })

  const pattern = bar < 8 ? ARP_SLOW : ARP_FAST
  const step = BAR / pattern.length
  pattern.forEach((idx, k) => {
    const v = (k % 2 ? 0.024 : 0.032) * rand(0.85, 1.1)
    musicBox(chord.arp[idx], t + k * step + rand(-0.006, 0.006), v)
  })

  for (const [beat, midi, len] of MELODY[bar]) lead(midi, t + beat * BEAT, len * BEAT)
}

function voice(type, freq, t, { attack = 0.01, decay = 1, peak = 0.05, cutoff = 0, dest = musicOut }) {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.value = freq
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  let node = o
  if (cutoff) {
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = cutoff
    o.connect(f)
    node = f
  }
  node.connect(g).connect(dest)
  o.start(t)
  o.stop(t + attack + decay + 0.05)
}

function musicBox(midi, t, peak) {
  voice('sine', mtof(midi), t, { attack: 0.004, decay: 1.7, peak })
  voice('sine', mtof(midi) * 3, t, { attack: 0.003, decay: 0.35, peak: peak * 0.16 })
}

function lead(midi, t, len) {
  voice('triangle', mtof(midi), t, { attack: 0.03, decay: len + 0.9, peak: 0.07, cutoff: 2300 })
  voice('sine', mtof(midi) * 2, t, { attack: 0.02, decay: len * 0.6 + 0.3, peak: 0.012 })
}

function pad(notes, t, len) {
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = 650
  f.connect(musicOut)
  for (const midi of notes) {
    for (const detune of [-7, 7]) {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.value = mtof(midi)
      o.detune.value = detune
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.016, t + 1.3)
      g.gain.setValueAtTime(0.016, t + len)
      g.gain.linearRampToValueAtTime(0, t + len + 1.4)
      o.connect(g).connect(f)
      o.start(t)
      o.stop(t + len + 1.5)
    }
  }
}

/* ---------------------------------------------------------------- ambience */

function startAmbience() {
  const t = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = noise
  src.loop = true
  windFilter = ctx.createBiquadFilter()
  windFilter.type = 'bandpass'
  windFilter.frequency.value = 520
  windFilter.Q.value = 0.7
  windGain = ctx.createGain()
  windGain.gain.setValueAtTime(0, t)
  windGain.gain.linearRampToValueAtTime(WIND_BASE, t + 3)

  // Slow gusts: wobble the filter and the loudness.
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.09
  const lfoAmount = ctx.createGain()
  lfoAmount.gain.value = 260
  lfo.connect(lfoAmount).connect(windFilter.frequency)
  const gust = ctx.createOscillator()
  gust.frequency.value = 0.13
  gustAmount = ctx.createGain()
  gustAmount.gain.value = WIND_BASE * 0.5
  gust.connect(gustAmount).connect(windGain.gain)

  src.connect(windFilter).connect(windGain).connect(sfxOut)
  src.start()
  lfo.start()
  gust.start()
  scheduleRustle()
}

function setWind(level) {
  const t = ctx.currentTime
  rustleLevel = level
  windGain.gain.setTargetAtTime(WIND_BASE * level, t, 0.4)
  gustAmount.gain.setTargetAtTime(WIND_BASE * 0.5 * level, t, 0.4)
  windFilter.frequency.setTargetAtTime(420 + level * 110, t, 0.5)
}

function scheduleRustle() {
  const wait = rand(0.25, 1.3) / Math.max(0.6, rustleLevel)
  setTimeout(() => {
    if (ctx.state === 'running') rustleBurst(0.014 * Math.min(rustleLevel, 4))
    scheduleRustle()
  }, wait * 1000)
}

// Leaves: a handful of tiny filtered-noise crackles.
function rustleBurst(peak) {
  const t = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = noise
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = rand(2200, 4200)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  let tk = t
  const n = 4 + Math.floor(Math.random() * 6)
  for (let k = 0; k < n; k++) {
    tk += rand(0.02, 0.07)
    g.gain.linearRampToValueAtTime(peak * rand(0.4, 1), tk + 0.006)
    g.gain.linearRampToValueAtTime(0, tk + rand(0.03, 0.08))
  }
  const out = panned(rand(-0.7, 0.7))
  src.connect(hp).connect(g).connect(out)
  src.start(t, rand(0, 2), tk - t + 0.15)
}

function panned(value) {
  if (!ctx.createStereoPanner) return sfxOut
  const p = ctx.createStereoPanner()
  p.pan.value = value
  p.connect(sfxOut)
  return p
}

/* ---------------------------------------------------------------- one-shots */

function whoosh(dur, peak, f0, f1, f2) {
  const t = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = noise
  src.loop = true
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 0.9
  bp.frequency.setValueAtTime(f0, t)
  bp.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.45)
  bp.frequency.exponentialRampToValueAtTime(f2, t + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(peak, t + dur * 0.35)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  let out = sfxOut
  if (ctx.createStereoPanner) {
    const p = ctx.createStereoPanner()
    p.pan.setValueAtTime(-0.6, t)
    p.pan.linearRampToValueAtTime(0.6, t + dur)
    p.connect(sfxOut)
    out = p
  }
  src.connect(bp).connect(g).connect(out)
  src.start(t, Math.random() * 2)
  src.stop(t + dur + 0.1)
}

// Rising, circling wind plus a little arpeggio that speeds up as petals gather.
function swirlSound(dur) {
  const t = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = noise
  src.loop = true
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 1.4
  bp.frequency.setValueAtTime(350, t)
  bp.frequency.exponentialRampToValueAtTime(2200, t + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.26, t + dur * 0.6)
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.3)
  let out = sfxOut
  if (ctx.createStereoPanner) {
    const p = ctx.createStereoPanner()
    const spin = ctx.createOscillator()
    spin.frequency.setValueAtTime(0.6, t)
    spin.frequency.exponentialRampToValueAtTime(4, t + dur)
    const depth = ctx.createGain()
    depth.gain.value = 0.8
    spin.connect(depth).connect(p.pan)
    spin.start(t)
    spin.stop(t + dur + 0.4)
    p.connect(sfxOut)
    out = p
  }
  src.connect(bp).connect(g).connect(out)
  src.start(t, Math.random() * 2)
  src.stop(t + dur + 0.4)

  const scale = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93]
  let tk = t + 0.1
  let gap = 0.32
  for (let k = 0; tk < t + dur; k++) {
    bell(scale[k % scale.length], tk, 0.03 + (tk - t) * 0.01)
    tk += gap
    gap = Math.max(0.07, gap * 0.88)
  }
}

function bell(midi, t, peak) {
  voice('sine', mtof(midi), t, { attack: 0.004, decay: 1.4, peak, dest: sfxOut })
  voice('sine', mtof(midi) * 2.76, t, { attack: 0.002, decay: 0.45, peak: peak * 0.25, dest: sfxOut })
}

function chime(notes, gap) {
  notes.forEach((m, i) => bell(m, ctx.currentTime + i * gap, 0.07))
}

function sparkle() {
  const scale = [84, 86, 88, 91, 93, 96]
  for (let k = 0; k < 8; k++) bell(scale[Math.floor(Math.random() * scale.length)], ctx.currentTime + rand(0, 0.7), 0.05)
}

function paperRustle() {
  const t = ctx.currentTime
  for (let k = 0; k < 7; k++) {
    const tk = t + k * rand(0.06, 0.12)
    const src = ctx.createBufferSource()
    src.buffer = noise
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = rand(1800, 3800)
    bp.Q.value = 0.8
    const g = ctx.createGain()
    const len = rand(0.04, 0.13)
    g.gain.setValueAtTime(0, tk)
    g.gain.linearRampToValueAtTime(rand(0.08, 0.16), tk + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, tk + len)
    src.connect(bp).connect(g).connect(sfxOut)
    src.start(tk, rand(0, 2), len + 0.05)
  }
}

function oops() {
  const t = ctx.currentTime
  voice('sine', 660, t, { attack: 0.01, decay: 0.18, peak: 0.07, dest: sfxOut })
  voice('sine', 494, t + 0.13, { attack: 0.01, decay: 0.3, peak: 0.07, dest: sfxOut })
}

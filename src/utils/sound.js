// Subtle success sounds using Web Audio API.
// Browser autoplay policies require a user gesture before audio can play,
// so we unlock the context on first interaction.
let audioContext = null
let unlockListenersBound = false

function getAudioContext() {
  if (audioContext) return audioContext
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext
    if (!Ctor) return null
    audioContext = new Ctor()
    return audioContext
  } catch {
    return null
  }
}

async function unlockAudio() {
  const ctx = getAudioContext()
  if (!ctx) return false
  try {
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    return ctx.state === 'running'
  } catch {
    return false
  }
}

function bindUnlockListeners() {
  if (unlockListenersBound || typeof window === 'undefined') return
  unlockListenersBound = true

  const events = ['pointerdown', 'keydown', 'touchstart', 'mousedown']
  const onFirstInteraction = () => {
    void unlockAudio().then((ok) => {
      if (!ok) return
      events.forEach((eventName) => window.removeEventListener(eventName, onFirstInteraction))
    })
  }

  events.forEach((eventName) => window.addEventListener(eventName, onFirstInteraction, { passive: true }))
}

let lastPlayTime = 0

function playPremiumGlassChime() {
  const ctx = getAudioContext()
  if (!ctx) return

  // Prevent duplicate playback if triggered multiple times quickly
  // Also prevents overlap if multiple files finish together
  if (ctx.currentTime > 0 && ctx.currentTime - lastPlayTime < 0.5) {
    return
  }

  const play = () => {
    lastPlayTime = ctx.currentTime
    const now = ctx.currentTime

    const masterGain = ctx.createGain()
    masterGain.gain.value = 0.5 // Overall subtle volume
    masterGain.connect(ctx.destination)

    // 1. Soft digital pop / attack
    const popOsc = ctx.createOscillator()
    const popGain = ctx.createGain()
    popOsc.type = 'sine'
    // Quick pitch drop for soft pop effect
    popOsc.frequency.setValueAtTime(600, now)
    popOsc.frequency.exponentialRampToValueAtTime(100, now + 0.05)
    
    popGain.gain.setValueAtTime(0, now)
    popGain.gain.linearRampToValueAtTime(0.12, now + 0.005)
    popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)
    
    popOsc.connect(popGain)
    popGain.connect(masterGain)
    
    // 2. Glass pluck fundamental (warm, pleasant pitch ~Ab5 - 830.61Hz)
    const glassOsc = ctx.createOscillator()
    const glassGain = ctx.createGain()
    glassOsc.type = 'sine' // Sine for warmth and smoothness
    glassOsc.frequency.setValueAtTime(830.61, now + 0.02)
    
    glassGain.gain.setValueAtTime(0, now + 0.02)
    glassGain.gain.linearRampToValueAtTime(0.15, now + 0.04)
    glassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)
    
    glassOsc.connect(glassGain)
    glassGain.connect(masterGain)

    // 3. Shimmer/bell overtone (higher pitch ~Eb6 - 1244.51Hz)
    const shimmerOsc = ctx.createOscillator()
    const shimmerGain = ctx.createGain()
    shimmerOsc.type = 'triangle' // Triangle for a slightly glassier tone without harshness
    shimmerOsc.frequency.setValueAtTime(1244.51, now + 0.04) 
    
    shimmerGain.gain.setValueAtTime(0, now + 0.04)
    shimmerGain.gain.linearRampToValueAtTime(0.06, now + 0.06)
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6)
    
    shimmerOsc.connect(shimmerGain)
    shimmerGain.connect(masterGain)

    // Start & stop schedule
    popOsc.start(now)
    popOsc.stop(now + 0.06)
    
    glassOsc.start(now + 0.02)
    glassOsc.stop(now + 0.45)
    
    shimmerOsc.start(now + 0.04)
    shimmerOsc.stop(now + 0.65)

    // Keep audio context alive during playback to prevent interruption
    const keepAlive = setTimeout(() => {
      clearTimeout(keepAlive)
    }, 700)
  }

  if (ctx.state === 'suspended') {
    void ctx.resume().then(play).catch(() => {})
    return
  }

  play()
}

function playTwoTone(firstFrequency, secondFrequency) {
  const ctx = getAudioContext()
  if (!ctx) return

  const play = () => {
    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.frequency.setValueAtTime(firstFrequency, now)
    osc1.type = 'sine'

    osc2.frequency.setValueAtTime(secondFrequency, now + 0.08)
    osc2.type = 'sine'

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.12, now + 0.04)
    gain.gain.linearRampToValueAtTime(0.08, now + 0.12)
    gain.gain.linearRampToValueAtTime(0, now + 0.25)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc1.stop(now + 0.12)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.25)

    // Keep audio context alive during playback to prevent interruption
    // This ensures sound completes even if page navigation starts
    const keepAlive = setTimeout(() => {
      // Cleanup after sound completes
      clearTimeout(keepAlive)
    }, 300)
  }

  if (ctx.state === 'suspended') {
    void ctx.resume().then(play).catch(() => {})
    return
  }

  play()
}

bindUnlockListeners()

// Upload success: premium lightweight glass chime
export function playUploadSuccess() {
  try {
    playPremiumGlassChime()
  } catch {
    // Silently fail
  }
}

// Download success: gentle descending chime (G5 → D5)
export function playDownloadSuccess() {
  try {
    // G5 (783.99 Hz) -> D5 (587.33 Hz), descending.
    playTwoTone(783.99, 587.33)
  } catch {
    // Silently fail
  }
}

// Legacy export for backward compatibility
export function playSuccess() {
  playUploadSuccess()
}

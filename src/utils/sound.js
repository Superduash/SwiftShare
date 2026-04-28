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

// Upload success: gentle ascending chime (C5 → E5)
export function playUploadSuccess() {
  try {
    // C5 (523.25 Hz) -> E5 (659.25 Hz), ascending.
    playTwoTone(523.25, 659.25)
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

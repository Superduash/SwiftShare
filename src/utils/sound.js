// Subtle success sounds using Web Audio API
let audioContext = null
let isInitialized = false

function initAudio() {
  if (isInitialized) return
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    isInitialized = true
  } catch (error) {
    // Audio not supported
    isInitialized = false
  }
}

// Upload success: gentle ascending chime (C5 → E5)
export function playUploadSuccess() {
  try {
    initAudio()
    if (!audioContext) return

    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }

    const now = audioContext.currentTime
    const osc1 = audioContext.createOscillator()
    const osc2 = audioContext.createOscillator()
    const gain = audioContext.createGain()

    // C5 (523.25 Hz) → E5 (659.25 Hz) - ascending
    osc1.frequency.setValueAtTime(523.25, now)
    osc1.type = 'sine'
    
    osc2.frequency.setValueAtTime(659.25, now + 0.08)
    osc2.type = 'sine'

    // Very subtle volume (0.08 max)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.08, now + 0.04)
    gain.gain.linearRampToValueAtTime(0.06, now + 0.12)
    gain.gain.linearRampToValueAtTime(0, now + 0.25)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(audioContext.destination)

    osc1.start(now)
    osc1.stop(now + 0.12)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.25)
  } catch (error) {
    // Silently fail
  }
}

// Download success: gentle descending chime (G5 → D5)
export function playDownloadSuccess() {
  try {
    initAudio()
    if (!audioContext) return

    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }

    const now = audioContext.currentTime
    const osc1 = audioContext.createOscillator()
    const osc2 = audioContext.createOscillator()
    const gain = audioContext.createGain()

    // G5 (783.99 Hz) → D5 (587.33 Hz) - descending
    osc1.frequency.setValueAtTime(783.99, now)
    osc1.type = 'sine'
    
    osc2.frequency.setValueAtTime(587.33, now + 0.08)
    osc2.type = 'sine'

    // Very subtle volume (0.08 max)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.08, now + 0.04)
    gain.gain.linearRampToValueAtTime(0.06, now + 0.12)
    gain.gain.linearRampToValueAtTime(0, now + 0.25)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(audioContext.destination)

    osc1.start(now)
    osc1.stop(now + 0.12)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.25)
  } catch (error) {
    // Silently fail
  }
}

// Legacy export for backward compatibility
export function playSuccess() {
  playUploadSuccess()
}

// Simple subtle sounds using Web Audio API
let audioContext = null
let isInitialized = false

function initAudio() {
  if (isInitialized) return
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    isInitialized = true
  } catch (error) {
    isInitialized = false
  }
}

export function playSuccess() {
  try {
    initAudio()
    if (!audioContext) return
    if (audioContext.state === 'suspended') audioContext.resume()

    const now = audioContext.currentTime
    const osc1 = audioContext.createOscillator()
    const osc2 = audioContext.createOscillator()
    const gain = audioContext.createGain()

    osc1.type = 'sine'
    osc2.type = 'sine'
    
    // Very subtle, soft chime (C5 to E5, extremely quiet)
    osc1.frequency.setValueAtTime(523.25, now)
    osc2.frequency.setValueAtTime(659.25, now + 0.08)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.02, now + 0.05)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.12)
    gain.gain.linearRampToValueAtTime(0, now + 0.3)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(audioContext.destination)

    osc1.start(now)
    osc1.stop(now + 0.15)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.3)
  } catch (e) {}
}

export function playError() {
  try {
    initAudio()
    if (!audioContext) return
    if (audioContext.state === 'suspended') audioContext.resume()

    const now = audioContext.currentTime
    const osc1 = audioContext.createOscillator()
    const osc2 = audioContext.createOscillator()
    const gain = audioContext.createGain()

    osc1.type = 'sine'
    osc2.type = 'triangle'
    
    // Soft, muted double low beep
    osc1.frequency.setValueAtTime(220, now)
    osc2.frequency.setValueAtTime(200, now + 0.12)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.02, now + 0.03)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.1)
    gain.gain.linearRampToValueAtTime(0.02, now + 0.15)
    gain.gain.linearRampToValueAtTime(0, now + 0.3)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(audioContext.destination)

    osc1.start(now)
    osc1.stop(now + 0.1)
    osc2.start(now + 0.12)
    osc2.stop(now + 0.3)
  } catch (e) {}
}

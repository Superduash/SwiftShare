import { describe, it, expect } from 'vitest'
import registry from './theme-registry.json'
import {
  validateRegistry,
  resolveInitial,
  toggleMode,
  pickManual,
  setRandom,
  shuffle,
  repair,
  migrateLegacy,
  getThemeById,
  getThemesByMode,
} from './themeEngine.js'

function makePseudoRng(seed = 123456789) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe('Theme Engine & Registry Unit Tests', () => {
  it('Scenario 11: registry validation passes with symmetric pairs and opposite modes', () => {
    expect(() => validateRegistry(registry)).not.toThrow()
    expect(registry.themes.length).toBe(12)
    const darkThemes = getThemesByMode(registry, 'dark')
    const lightThemes = getThemesByMode(registry, 'light')
    expect(darkThemes.length).toBe(6)
    expect(lightThemes.length).toBe(6)
  })

  it('Scenario 1: first visit yields mode=dark, random=true, theme in dark pool', () => {
    const rng = makePseudoRng(1)
    const initial = resolveInitial(null, registry, rng)
    expect(initial.v).toBe(2)
    expect(initial.mode).toBe('dark')
    expect(initial.random).toBe(true)
    const darkThemes = getThemesByMode(registry, 'dark').map((t) => t.id)
    expect(darkThemes).toContain(initial.theme)
  })

  it('Scenario 2: random ON, mode dark, 200 reloads all in dark pool and never same as previous', () => {
    const rng = makePseudoRng(42)
    let state = resolveInitial(null, registry, rng)
    const darkPool = getThemesByMode(registry, 'dark').map((t) => t.id)

    for (let i = 0; i < 200; i++) {
      const prevTheme = state.theme
      state = resolveInitial(state, registry, rng)
      expect(state.mode).toBe('dark')
      expect(darkPool).toContain(state.theme)
      expect(state.theme).not.toBe(prevTheme)
    }
  })

  it('Scenario 3: random ON, toggle -> light, then 200 reloads all in light pool, random still true', () => {
    const rng = makePseudoRng(99)
    let state = resolveInitial(null, registry, rng)
    expect(state.mode).toBe('dark')

    state = toggleMode(state, registry, rng)
    expect(state.mode).toBe('light')
    expect(state.random).toBe(true)
    const lightPool = getThemesByMode(registry, 'light').map((t) => t.id)
    expect(lightPool).toContain(state.theme)

    for (let i = 0; i < 200; i++) {
      const prevTheme = state.theme
      state = resolveInitial(state, registry, rng)
      expect(state.mode).toBe('light')
      expect(state.random).toBe(true)
      expect(lightPool).toContain(state.theme)
      expect(state.theme).not.toBe(prevTheme)
    }
  })

  it('Scenario 4: random OFF, theme=volcanic, toggle -> ember; toggle again -> volcanic', () => {
    let state = pickManual({ mode: 'dark', random: true, theme: 'sunset' }, registry, 'volcanic')
    expect(state.theme).toBe('volcanic')
    expect(state.mode).toBe('dark')
    expect(state.random).toBe(false)

    state = toggleMode(state, registry)
    expect(state.mode).toBe('light')
    expect(state.theme).toBe('ember')
    expect(state.random).toBe(false)

    state = toggleMode(state, registry)
    expect(state.mode).toBe('dark')
    expect(state.theme).toBe('volcanic')
    expect(state.random).toBe(false)
  })

  it('Scenario 5: random ON, manual pick sakura -> theme=sakura, mode=light, random=false', () => {
    const initial = { v: 2, mode: 'dark', random: true, theme: 'sunset', last: { dark: 'sunset' } }
    const picked = pickManual(initial, registry, 'sakura')
    expect(picked.theme).toBe('sakura')
    expect(picked.mode).toBe('light')
    expect(picked.random).toBe(false)
    expect(picked.last.light).toBe('sakura')
  })

  it('Scenario 6: random OFF, toggle mode x 2 returns to the original theme for all 12 themes', () => {
    for (const theme of registry.themes) {
      let state = pickManual(null, registry, theme.id)
      expect(state.theme).toBe(theme.id)
      state = toggleMode(state, registry)
      expect(state.theme).toBe(theme.pair)
      state = toggleMode(state, registry)
      expect(state.theme).toBe(theme.id)
    }
  })

  it('Scenario 7: random switch ON while on midnight -> random=true, theme in dark pool != midnight', () => {
    const rng = makePseudoRng(777)
    const state = pickManual(null, registry, 'midnight')
    expect(state.random).toBe(false)
    expect(state.theme).toBe('midnight')

    const turnedOn = setRandom(state, registry, true, rng)
    expect(turnedOn.random).toBe(true)
    expect(turnedOn.mode).toBe('dark')
    expect(turnedOn.theme).not.toBe('midnight')
    const darkPool = getThemesByMode(registry, 'dark').map((t) => t.id)
    expect(darkPool).toContain(turnedOn.theme)
  })

  it('Scenario 8: corrupted JSON, unknown theme id, mode-theme mismatch repaired safely', () => {
    expect(() => repair(null, registry)).not.toThrow()
    expect(() => repair('invalid', registry)).not.toThrow()
    expect(() => repair({ theme: 'nonexistent-theme', mode: 'light' }, registry)).not.toThrow()

    // Mode-theme mismatch: theme is 'forest' (dark) but mode says 'light'
    const repairedMismatch = repair({ theme: 'forest', mode: 'light' }, registry)
    expect(repairedMismatch.mode).toBe('dark') // Mode is always derived from theme
    expect(repairedMismatch.theme).toBe('forest')

    const repairedCorrupt = repair({ theme: 'alien-glow', mode: 'dark' }, registry)
    expect(repairedCorrupt.theme).toBe('sunset')
    expect(repairedCorrupt.mode).toBe('dark')
  })

  it('Scenario 9: legacy keys migration converts old format and respects manual vs random', () => {
    const legacyWithRandom = {
      swiftshare_theme: JSON.stringify('midnight'),
      swiftshare_theme_mode: 'dark',
      swiftshare_settings: JSON.stringify({ randomTheme: true }),
    }
    const migrated1 = migrateLegacy(legacyWithRandom, registry)
    expect(migrated1.v).toBe(2)
    expect(migrated1.random).toBe(true)
    expect(migrated1.theme).toBe('midnight')
    expect(migrated1.mode).toBe('dark')

    const legacyManual = {
      swiftshare_theme: JSON.stringify('sakura'),
      swiftshare_theme_mode: 'light',
      swiftshare_settings: JSON.stringify({ randomTheme: false }),
    }
    const migrated2 = migrateLegacy(legacyManual, registry)
    expect(migrated2.v).toBe(2)
    expect(migrated2.random).toBe(false)
    expect(migrated2.theme).toBe('sakura')
    expect(migrated2.mode).toBe('light')
  })

  it('Scenario 10: storage event from another tab adopted without re-randomize', () => {
    const fromOtherTab = {
      v: 2,
      mode: 'light',
      random: true,
      theme: 'sunrise',
      last: { light: 'sunrise', dark: 'sunset' },
    }
    const adopted = repair(fromOtherTab, registry)
    expect(adopted.theme).toBe('sunrise')
    expect(adopted.mode).toBe('light')
    expect(adopted.random).toBe(true)
  })
})

/**
 * Pure theme engine for SwiftShare (No React dependencies)
 * Handles state transitions, validation, random picking, and legacy migration.
 */

export const STORAGE_KEY_V2 = 'swiftshare:theme:v2'

export function validateRegistry(registry) {
  if (!registry || !Array.isArray(registry.themes)) {
    throw new Error('Theme registry must contain an array of themes')
  }

  const ids = new Set()
  for (const t of registry.themes) {
    if (!t.id || !t.mode || !t.pair) {
      throw new Error(`Theme ${JSON.stringify(t)} missing required id, mode, or pair`)
    }
    if (ids.has(t.id)) {
      throw new Error(`Duplicate theme id: ${t.id}`)
    }
    ids.add(t.id)
  }

  // Verify pair symmetry and opposite modes
  for (const t of registry.themes) {
    const pair = registry.themes.find((other) => other.id === t.pair)
    if (!pair) {
      throw new Error(`Theme '${t.id}' references non-existent pair '${t.pair}'`)
    }
    if (pair.mode === t.mode) {
      throw new Error(`Theme '${t.id}' and pair '${pair.id}' must have opposite modes`)
    }
    if (pair.pair !== t.id) {
      throw new Error(`Asymmetric pair: '${t.id}' pairs with '${pair.id}', but '${pair.id}' pairs with '${pair.pair}'`)
    }
  }

  return true
}

export function getThemeById(registry, themeId) {
  return registry.themes.find((t) => t.id === themeId) || null
}

export function getThemesByMode(registry, mode) {
  return registry.themes.filter((t) => t.mode === mode)
}

export function pickRandomTheme(registry, mode, lastThemeId, rng = Math.random) {
  const pool = getThemesByMode(registry, mode)
  if (pool.length === 0) {
    throw new Error(`No themes found for mode: ${mode}`)
  }
  const filtered = pool.length > 1 ? pool.filter((t) => t.id !== lastThemeId) : pool
  const candidates = filtered.length > 0 ? filtered : pool
  const index = Math.floor(rng() * candidates.length)
  return candidates[index]
}

export function repair(prefs, registry) {
  const defaultMode = registry?.default?.mode || 'dark'
  const defaultRandom = registry?.default?.random !== false

  if (!prefs || typeof prefs !== 'object') {
    const defaultTheme = defaultMode === 'light' ? 'sunrise' : 'sunset'
    return {
      v: 2,
      mode: defaultMode,
      random: defaultRandom,
      theme: defaultTheme,
      last: { [defaultMode]: defaultTheme },
    }
  }

  let themeObj = getThemeById(registry, prefs.theme)
  let mode = prefs.mode === 'light' ? 'light' : 'dark'

  if (!themeObj) {
    // If unknown theme id, fall back to default for mode
    const fallbackId = mode === 'light' ? 'sunrise' : 'sunset'
    themeObj = getThemeById(registry, fallbackId) || registry.themes[0]
  }

  // Mode is always derived from theme to maintain consistency
  mode = themeObj.mode

  const random = typeof prefs.random === 'boolean' ? prefs.random : defaultRandom
  const last = { ...(prefs.last || {}) }
  last[mode] = themeObj.id

  return {
    v: 2,
    mode,
    random,
    theme: themeObj.id,
    last,
  }
}

export function resolveInitial(storedPrefs, registry, rng = Math.random) {
  const valid = repair(storedPrefs, registry)

  if (valid.random) {
    const picked = pickRandomTheme(registry, valid.mode, valid.last?.[valid.mode], rng)
    return {
      ...valid,
      theme: picked.id,
      mode: picked.mode,
      last: {
        ...valid.last,
        [picked.mode]: picked.id,
      },
    }
  }

  return valid
}

export function toggleMode(prefs, registry, rng = Math.random) {
  const current = repair(prefs, registry)
  const nextMode = current.mode === 'dark' ? 'light' : 'dark'

  if (current.random) {
    const picked = pickRandomTheme(registry, nextMode, current.last?.[nextMode], rng)
    return {
      ...current,
      mode: nextMode,
      theme: picked.id,
      last: {
        ...current.last,
        [nextMode]: picked.id,
      },
    }
  }

  // Random is OFF: exact paired counterpart
  const currentTheme = getThemeById(registry, current.theme)
  let nextThemeId = currentTheme ? currentTheme.pair : null
  const nextThemeObj = getThemeById(registry, nextThemeId)

  if (!nextThemeObj || nextThemeObj.mode !== nextMode) {
    nextThemeId = nextMode === 'light' ? 'sunrise' : 'sunset'
  }

  return {
    ...current,
    mode: nextMode,
    theme: nextThemeId,
    last: {
      ...current.last,
      [nextMode]: nextThemeId,
    },
  }
}

export function pickManual(prefs, registry, themeId) {
  const current = repair(prefs, registry)
  const themeObj = getThemeById(registry, themeId)
  if (!themeObj) return current

  return {
    ...current,
    random: false,
    theme: themeObj.id,
    mode: themeObj.mode,
    last: {
      ...current.last,
      [themeObj.mode]: themeObj.id,
    },
  }
}

export function setRandom(prefs, registry, randomFlag, rng = Math.random) {
  const current = repair(prefs, registry)
  if (!randomFlag) {
    return {
      ...current,
      random: false,
    }
  }
  return shuffle({ ...current, random: true }, registry, rng)
}

export function shuffle(prefs, registry, rng = Math.random) {
  const current = repair(prefs, registry)
  const picked = pickRandomTheme(registry, current.mode, current.theme, rng)
  return {
    ...current,
    random: true,
    theme: picked.id,
    mode: picked.mode,
    last: {
      ...current.last,
      [picked.mode]: picked.id,
    },
  }
}

export function migrateLegacy(legacyStorage, registry) {
  if (!legacyStorage || typeof legacyStorage !== 'object') return null

  const rawTheme = legacyStorage.swiftshare_theme
  const rawMode = legacyStorage.swiftshare_theme_mode
  const rawSettings = legacyStorage.swiftshare_settings

  if (!rawTheme && !rawMode && !rawSettings) return null

  let parsedTheme = null
  try {
    parsedTheme = rawTheme ? JSON.parse(rawTheme) : null
  } catch {
    parsedTheme = rawTheme
  }

  let parsedSettings = null
  try {
    parsedSettings = rawSettings ? JSON.parse(rawSettings) : null
  } catch {}

  const hasManualTheme = Boolean(parsedTheme && getThemeById(registry, parsedTheme))
  const random = parsedSettings && typeof parsedSettings.randomTheme === 'boolean'
    ? parsedSettings.randomTheme
    : !hasManualTheme

  let targetTheme = hasManualTheme ? parsedTheme : (rawMode === 'light' ? 'sunrise' : 'sunset')
  let themeObj = getThemeById(registry, targetTheme) || registry.themes[0]

  return {
    v: 2,
    mode: themeObj.mode,
    random,
    theme: themeObj.id,
    last: {
      [themeObj.mode]: themeObj.id,
    },
  }
}

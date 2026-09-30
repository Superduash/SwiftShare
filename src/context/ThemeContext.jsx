import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import registry from '../theme/theme-registry.json'
import {
  STORAGE_KEY_V2,
  resolveInitial,
  toggleMode as engineToggleMode,
  pickManual as enginePickManual,
  setRandom as engineSetRandom,
  shuffle as engineShuffle,
  repair as engineRepair,
  getThemeById,
} from '../theme/themeEngine.js'

const ThemeContext = createContext({
  theme: 'sunset',
  mode: 'dark',
  isDark: true,
  random: true,
  themes: registry.themes,
  toggleMode: () => {},
  setMode: () => {},
  pickTheme: () => {},
  setRandom: () => {},
  shuffle: () => {},
})

function applyThemeToDocument(themeId, mode) {
  const themeObj = getThemeById(registry, themeId)
  if (!themeObj) return

  const html = document.documentElement
  html.setAttribute('data-theme', themeObj.id)
  html.setAttribute('data-mode', mode)
  html.style.colorScheme = mode
  html.style.backgroundColor = themeObj.boot.bg
  html.style.color = themeObj.boot.text

  const metaTheme = document.querySelector('meta[name="theme-color"]')
  if (metaTheme) {
    metaTheme.setAttribute('content', themeObj.boot.themeColor)
  }
}

export function ThemeProvider({ children }) {
  const [prefs, setPrefs] = useState(() => {
    // 1. First priority: read pre-resolved state from window.__SS_THEME__
    if (typeof window !== 'undefined' && window.__SS_THEME__?.prefs) {
      return engineRepair(window.__SS_THEME__.prefs, registry)
    }

    // 2. Fallback: read localStorage
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_V2)
        const parsed = raw ? JSON.parse(raw) : null
        return resolveInitial(parsed, registry)
      } catch (err) {
        return resolveInitial(null, registry)
      }
    }

    return resolveInitial(null, registry)
  })

  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  const saveAndApply = useCallback((nextPrefs, skipViewTransition = false) => {
    const isReduced = typeof document !== 'undefined' && (
      document.body.classList.contains('reduce-motion') ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    )

    const executeApply = () => {
      setPrefs(nextPrefs)
      applyThemeToDocument(nextPrefs.theme, nextPrefs.mode)
      try {
        localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(nextPrefs))
      } catch {}
    }

    if (
      !skipViewTransition &&
      !isReduced &&
      typeof document !== 'undefined' &&
      typeof document.startViewTransition === 'function'
    ) {
      document.startViewTransition(executeApply)
    } else {
      executeApply()
    }
  }, [])

  // Listen to cross-tab storage changes
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY_V2 && e.newValue) {
        try {
          const incoming = JSON.parse(e.newValue)
          const repaired = engineRepair(incoming, registry)
          setPrefs(repaired)
          applyThemeToDocument(repaired.theme, repaired.mode)
        } catch {}
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Ensure DOM is in sync on mount
  useEffect(() => {
    applyThemeToDocument(prefs.theme, prefs.mode)
  }, [prefs.theme, prefs.mode])

  const toggleMode = useCallback(() => {
    const next = engineToggleMode(prefsRef.current, registry)
    saveAndApply(next)
  }, [saveAndApply])

  const setMode = useCallback((desiredMode) => {
    if (prefsRef.current.mode === desiredMode) return
    const next = engineToggleMode(prefsRef.current, registry)
    saveAndApply(next)
  }, [saveAndApply])

  const pickTheme = useCallback((themeId) => {
    const next = enginePickManual(prefsRef.current, registry, themeId)
    saveAndApply(next)
  }, [saveAndApply])

  const setRandomMode = useCallback((randomFlag) => {
    const next = engineSetRandom(prefsRef.current, registry, randomFlag)
    saveAndApply(next)
  }, [saveAndApply])

  const shuffleTheme = useCallback(() => {
    const next = engineShuffle(prefsRef.current, registry)
    saveAndApply(next)
  }, [saveAndApply])

  const contextValue = useMemo(() => ({
    theme: prefs.theme,
    mode: prefs.mode,
    isDark: prefs.mode === 'dark',
    random: prefs.random,
    themes: registry.themes,
    toggleMode,
    setMode,
    pickTheme,
    setRandom: setRandomMode,
    shuffle: shuffleTheme,
    // Compatibility helpers for existing callers
    setTheme: pickTheme,
    toggleThemeMode: toggleMode,
  }), [prefs.theme, prefs.mode, prefs.random, toggleMode, setMode, pickTheme, setRandomMode, shuffleTheme])

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

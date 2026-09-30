import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { getTheme, saveTheme, getThemeMode, saveThemeMode, getSettings, saveSettings } from '../utils/storage'

export const DARK_THEMES = ['sunset', 'dark', 'midnight', 'lavender', 'forest', 'volcanic']
export const LIGHT_THEMES = ['sunrise', 'light', 'sakura']
export const VALID_THEMES = [...DARK_THEMES, ...LIGHT_THEMES]

export const THEME_PAIRS = {
  sunset: 'sunrise',
  sunrise: 'sunset',
  dark: 'light',
  light: 'dark',
  midnight: 'sakura',
  sakura: 'midnight',
  lavender: 'sakura',
  forest: 'sunrise',
  volcanic: 'sunrise',
}

const ThemeContext = createContext({
  theme: 'sunset',
  themeMode: 'dark',
  isDark: true,
  setTheme: () => {},
  toggleThemeMode: () => {},
})

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    let saved = getTheme()
    if (saved === 'system') saved = null
    if (VALID_THEMES.includes(saved)) return saved
    return 'sunset'
  })

  const [themeMode, setThemeModeState] = useState(() => {
    const stored = getThemeMode()
    if (stored === 'light' || stored === 'dark') return stored
    return LIGHT_THEMES.includes(theme) ? 'light' : 'dark'
  })

  const isDark = themeMode === 'dark'

  const setTheme = useCallback((newTheme) => {
    if (!VALID_THEMES.includes(newTheme)) return
    const mode = LIGHT_THEMES.includes(newTheme) ? 'light' : 'dark'
    setThemeState(newTheme)
    setThemeModeState(mode)
    document.documentElement.setAttribute('data-theme', newTheme)
    saveTheme(newTheme)
    saveThemeMode(mode)
  }, [])

  const toggleThemeMode = useCallback(() => {
    const nextMode = isDark ? 'light' : 'dark'
    let nextTheme = THEME_PAIRS[theme]
    if (!nextTheme || (nextMode === 'light' && !LIGHT_THEMES.includes(nextTheme)) || (nextMode === 'dark' && !DARK_THEMES.includes(nextTheme))) {
      nextTheme = nextMode === 'light' ? 'sunrise' : 'sunset'
    }

    setThemeModeState(nextMode)
    setThemeState(nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
    saveTheme(nextTheme)
    saveThemeMode(nextMode)
  }, [isDark, theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const contextValue = useMemo(() => ({
    theme,
    themeMode,
    isDark,
    setTheme,
    toggleThemeMode,
  }), [theme, themeMode, isDark, setTheme, toggleThemeMode])

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

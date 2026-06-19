import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { getTheme, saveTheme } from '../utils/storage'

const ThemeContext = createContext({
  theme: 'sunset',
  setTheme: () => {}
})

const VALID_THEMES = ['sunset', 'sunrise', 'dark', 'light', 'midnight', 'sakura', 'lavender', 'forest', 'volcanic']

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    let saved = getTheme()
    if (saved === 'system') saved = null // handle legacy config
    if (VALID_THEMES.includes(saved)) return saved
    return 'sunset'
  })

  const setTheme = useCallback((newTheme) => {
    if (!VALID_THEMES.includes(newTheme)) return
    setThemeState(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    saveTheme(newTheme)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

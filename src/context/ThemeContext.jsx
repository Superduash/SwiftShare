import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { getTheme, saveTheme } from '../utils/storage'

const ThemeContext = createContext({
  theme: 'sunrise',
  setTheme: () => {}
})

const VALID_THEMES = ['sunrise', 'sunset', 'dark', 'light', 'midnight', 'sakura', 'lavender', 'forest', 'volcanic']

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    let saved = getTheme()
    // Migrate old names
    if (saved === 'sunset') saved = 'sunrise'
    else if (saved === 'sunset-dark') saved = 'sunset'
    return VALID_THEMES.includes(saved) ? saved : 'sunrise'
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

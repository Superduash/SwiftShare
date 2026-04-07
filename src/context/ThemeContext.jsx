import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getTheme, saveTheme } from '../utils/storage'

const ThemeContext = createContext({ 
  theme: 'terracotta', 
  setTheme: () => {} 
})

const VALID_THEMES = ['terracotta', 'dark', 'light', 'ocean']

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = getTheme()
    return VALID_THEMES.includes(saved) ? saved : 'terracotta'
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

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

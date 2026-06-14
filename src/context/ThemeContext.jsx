import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { getTheme, saveTheme } from '../utils/storage'

const ThemeContext = createContext({
  theme: 'sunrise',
  setTheme: () => {}
})

const VALID_THEMES = ['system', 'sunset', 'sunrise', 'dark', 'light', 'midnight', 'sakura', 'lavender', 'forest', 'volcanic']

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = getTheme()
    return VALID_THEMES.includes(saved) ? saved : 'system'
  })

  const setTheme = useCallback((newTheme) => {
    if (!VALID_THEMES.includes(newTheme)) return
    setThemeState(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    saveTheme(newTheme)
  }, [])

  useEffect(() => {
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light')
      const listener = (e) => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
      }
      mq.addEventListener('change', listener)
      return () => mq.removeEventListener('change', listener)
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
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

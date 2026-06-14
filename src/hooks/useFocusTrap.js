import { useEffect } from 'react'

const FOCUSABLE = 'a,button,input,textarea,select,[tabindex]:not([tabindex="-1"])'

export function useFocusTrap(ref, active) {
  useEffect(() => {
    if (!active || !ref.current) return
    const el = ref.current
    const focusable = [...el.querySelectorAll(FOCUSABLE)].filter(n => !n.disabled)
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first.focus()

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    el.addEventListener('keydown', onKeyDown)
    return () => el.removeEventListener('keydown', onKeyDown)
  }, [active, ref])
}

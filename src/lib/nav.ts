// One shared "step back" list, so the phone's back button, the browser's back button and the in-app «Volver» all do the same
// thing: undo the last move. Every forward move registers how to undo itself and adds a browser history entry.
import { useCallback, useEffect, useRef } from 'react'

type Step = { back: () => void; alive: boolean }
const steps: Step[] = []

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const step = steps.pop()
    if (!step) return // nothing of ours left: the browser leaves the app as usual
    if (step.alive) step.back()
    else window.history.back() // its screen is gone: skip over the entry
  })
}

/** Remembers a move: `back` restores what was on screen before it. */
export function pushStep(back: () => void): Step {
  const step = { back, alive: true }
  steps.push(step)
  window.history.pushState({ duat: steps.length }, '')
  return step
}

/** The in-app «Volver»: one step back when there is one, otherwise `fallback`. */
export function goBack(fallback: () => void) {
  if (steps.some((s) => s.alive)) window.history.back()
  else fallback()
}

/** Forget every remembered move (sign-out, preview mode). */
export function clearSteps() {
  steps.length = 0
}

/** For a screen with its own inner pages: its moves stop counting once the screen is closed. */
export function useSteps() {
  const mine = useRef<Step[]>([])
  useEffect(() => {
    const own = mine.current
    return () => own.forEach((s) => (s.alive = false))
  }, [])
  return useCallback((back: () => void) => {
    mine.current.push(pushStep(back))
  }, [])
}

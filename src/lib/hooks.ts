import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from '../api.ts'

type LoadState<T> = { key: string; base: string; data: T | null; error: string }

/** Runs an async loader on mount and whenever `key` changes. */
export function useLoad<T>(loader: () => Promise<T>, key: string) {
  const [tick, setTick] = useState(0)
  const requestKey = `${key}#${tick}`
  const [state, setState] = useState<LoadState<T> | null>(null)

  useEffect(() => {
    let cancelled = false
    loader()
      .then((data) => {
        if (!cancelled) setState({ key: requestKey, base: key, data, error: '' })
      })
      .catch((e) => {
        if (!cancelled) setState({ key: requestKey, base: key, data: null, error: errorMessage(e) })
      })
    return () => {
      cancelled = true
    }
    // the loader closes over the values summarised by `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  const current = state && state.key === requestKey ? state : null
  // a reload of the same thing keeps the old data on screen until the new data arrives
  const stale = !current && state && state.base === key ? state.data : null
  const reload = useCallback(() => setTick((t) => t + 1), [])
  const setData = useCallback((data: T) => setState({ key: requestKey, base: key, data, error: '' }), [requestKey, key])
  return { data: current?.data ?? stale, error: current?.error ?? '', loading: !current, reload, setData }
}

/** Wraps an action with busy/error/success state for a button. */
export function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const run = useCallback(async (fn: () => Promise<string | void>) => {
    setBusy(true)
    setError('')
    setDone('')
    try {
      const msg = await fn()
      if (msg) setDone(msg)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }, [])
  return { busy, error, done, run }
}

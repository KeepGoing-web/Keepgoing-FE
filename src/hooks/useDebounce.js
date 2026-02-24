import { useState, useEffect } from 'react'

/**
 * Debounce a value by the given delay (ms).
 * Returns the debounced value that updates only after
 * the caller stops changing it for `delay` ms.
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

import { useEffect, useState } from 'react'

// Generic localStorage-backed state. Reads `key` on init (falling back to
// `initialValue`) and writes on every change. Reused by CartContext today;
// safe to reuse for e.g. an "orders" or "wishlist" feature later.
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored !== null ? JSON.parse(stored) : initialValue
    } catch (err) {
      console.warn(`useLocalStorage: failed to read "${key}"`, err)
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (err) {
      console.warn(`useLocalStorage: failed to write "${key}"`, err)
    }
  }, [key, value])

  return [value, setValue]
}

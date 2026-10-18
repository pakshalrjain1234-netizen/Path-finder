import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'pathfinder-saved-locations'

export function useSavedLocations() {
  const [savedIds, setSavedIds] = useState<string[]>([])

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return
    }

    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setSavedIds(parsed.filter((value): value is string => typeof value === 'string'))
      }
    } catch {
      setSavedIds([])
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedIds))
  }, [savedIds])

  const api = useMemo(
    () => ({
      savedIds,
      isSaved: (id: string) => savedIds.includes(id),
      save: (id: string) => setSavedIds((prev) => (prev.includes(id) ? prev : [...prev, id])),
      remove: (id: string) => setSavedIds((prev) => prev.filter((item) => item !== id)),
      toggle: (id: string) => setSavedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])),
    }),
    [savedIds],
  )

  return api
}

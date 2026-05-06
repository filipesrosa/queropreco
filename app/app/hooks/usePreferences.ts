'use client'

import { useState, useEffect } from 'react'

export type Interest = 'cesta-basica' | 'vegano' | 'sem-lactose' | 'ofertas'

type Location = { lat: number; lng: number; label: string }

type Preferences = {
  interests: Interest[]
  location: Location | null
}

const DEFAULT: Preferences = { interests: [], location: null }
const KEY = 'qp_prefs'

function load(): Preferences {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT
    return { ...DEFAULT, ...JSON.parse(raw) }
  } catch {
    return DEFAULT
  }
}

function save(prefs: Preferences) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {}
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT)

  useEffect(() => {
    setPrefs(load())
  }, [])

  function setInterests(interests: Interest[]) {
    const next = { ...prefs, interests }
    setPrefs(next)
    save(next)
  }

  function setLocation(location: Location | null) {
    const next = { ...prefs, location }
    setPrefs(next)
    save(next)
  }

  return { preferences: prefs, setInterests, setLocation }
}

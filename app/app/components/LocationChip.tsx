'use client'

import { useState, useEffect } from 'react'
import { usePreferences } from '../hooks/usePreferences'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export function LocationChip() {
  const { preferences, setLocation } = usePreferences()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'denied'>('idle')

  useEffect(() => {
    if (!preferences.location) return
    // Refresh label silently with corrected priority (city over suburb)
    async function refreshLabel() {
      const { lat, lng } = preferences.location!
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'User-Agent': 'QueroPreco/1.0' } }
        )
        const data = await res.json() as { address?: { city?: string; town?: string; municipality?: string; village?: string; suburb?: string; neighbourhood?: string } }
        const a = data.address
        const city = a?.city ?? a?.town ?? a?.municipality ?? a?.village
        const label = city ?? a?.suburb ?? a?.neighbourhood ?? preferences.location!.label
        if (label !== preferences.location!.label) {
          setLocation({ ...preferences.location!, label })
        }
      } catch {}
      setStatus('done')
    }
    refreshLabel()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function detect() {
    if (!navigator.geolocation) { setStatus('denied'); return }
    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        let label = 'Localização atual'
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'User-Agent': 'QueroPreco/1.0' } }
          )
          const data = await res.json() as { address?: { city?: string; town?: string; municipality?: string; village?: string; suburb?: string; neighbourhood?: string; state?: string } }
          const a = data.address
          const city = a?.city ?? a?.town ?? a?.municipality ?? a?.village
          const sub = a?.suburb ?? a?.neighbourhood
          label = city ?? sub ?? label
        } catch {}
        setLocation({ lat, lng, label })
        setStatus('done')
      },
      () => setStatus('denied')
    )
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-1.5 text-sm text-ink/50">
        <div className="w-3.5 h-3.5 border-2 border-brand/40 border-t-brand rounded-full animate-spin" />
        Detectando localização...
      </div>
    )
  }

  if (status === 'done' && preferences.location) {
    return (
      <button
        onClick={detect}
        className="flex items-center gap-1.5 text-sm text-brand font-medium"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.083 3.218-4.467 3.218-7.327a6.507 6.507 0 00-6.507-6.507 6.507 6.507 0 00-6.507 6.507c0 2.86 1.274 5.244 3.218 7.327a19.58 19.58 0 002.683 2.282 16.975 16.975 0 001.144.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
        Sua localização: {preferences.location.label}
      </button>
    )
  }

  if (status === 'denied') {
    return (
      <span className="text-sm text-ink/40">Localização não disponível</span>
    )
  }

  return (
    <button
      onClick={detect}
      className="flex items-center gap-1.5 text-sm text-ink/50 hover:text-brand transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
      Usar minha localização
    </button>
  )
}

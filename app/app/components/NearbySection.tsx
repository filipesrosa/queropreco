'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePreferences } from '../hooks/usePreferences'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type NearbyStore = {
  id: string
  name: string
  address: string
  distanceKm: number
}

export function NearbySection() {
  const { preferences } = usePreferences()
  const [stores, setStores] = useState<NearbyStore[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const loc = preferences.location
    if (!loc) return

    fetch(`${API_URL}/establishments/nearby?lat=${loc.lat}&lng=${loc.lng}&radiusKm=10&limit=5`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.data) setStores(data.data)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [preferences.location])

  if (!preferences.location || (!loaded && stores.length === 0)) return null
  if (loaded && stores.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-ink/35 uppercase tracking-[0.15em]">
          Lojas perto de você
        </p>
        <Link href="/mapa" className="text-xs text-brand font-medium">
          Ver no mapa →
        </Link>
      </div>
      <div className="space-y-2">
        {stores.map((store) => (
          <Link
            key={store.id}
            href={`/lojas/${store.id}`}
            className="flex items-center justify-between bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-ink/6 hover:border-brand/20 transition-all"
          >
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm font-medium text-ink truncate">{store.name}</p>
              <p className="text-xs text-ink/40 mt-0.5 truncate">{store.address}</p>
            </div>
            <span className="text-xs font-semibold text-brand shrink-0">
              {store.distanceKm < 1
                ? `${Math.round(store.distanceKm * 1000)} m`
                : `${store.distanceKm.toFixed(1)} km`}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

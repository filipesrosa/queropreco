'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Link from 'next/link'
import { usePreferences } from '../hooks/usePreferences'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// Fix default marker icons broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

type Establishment = {
  id: string
  name: string
  cnpj: string
  address: string
  latitude: number
  longitude: number
  distanceKm: number
}

export function MapView() {
  const { preferences } = usePreferences()
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [loading, setLoading] = useState(true)
  const [center, setCenter] = useState<[number, number]>([-22.37, -46.96])

  useEffect(() => {
    async function load() {
      let lat = preferences.location?.lat
      let lng = preferences.location?.lng

      if (!lat || !lng) {
        await new Promise<void>((resolve) => {
          if (!navigator.geolocation) { resolve(); return }
          navigator.geolocation.getCurrentPosition(
            (pos) => { lat = pos.coords.latitude; lng = pos.coords.longitude; resolve() },
            () => resolve()
          )
        })
      }

      if (lat && lng) {
        setCenter([lat, lng])
        try {
          const res = await fetch(`${API_URL}/establishments/nearby?lat=${lat}&lng=${lng}&radiusKm=15&limit=30`)
          if (res.ok) {
            const data = await res.json() as { data: Establishment[] }
            setEstablishments(data.data)
          }
        } catch {}
      } else {
        // Fallback: load all establishments
        try {
          const res = await fetch(`${API_URL}/establishments`)
          if (res.ok) {
            const data = await res.json() as { data: Array<Establishment & { billCount: number; lastSeenAt: string }> }
            setEstablishments(
              data.data
                .filter((e) => e.latitude && e.longitude)
                .map((e) => ({ ...e, distanceKm: 0 }))
            )
          }
        } catch {}
      }
      setLoading(false)
    }
    load()
  }, [preferences.location])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-ink/40">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        <p className="text-sm">Carregando mapa...</p>
      </div>
    )
  }

  if (establishments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2 text-center px-6">
        <svg className="w-10 h-10 text-ink/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
        <p className="text-sm text-ink/50">Nenhum estabelecimento com coordenadas ainda.</p>
        <p className="text-xs text-ink/30">Escaneie cupons para geocodificar automaticamente.</p>
      </div>
    )
  }

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: 'calc(100vh - 200px)', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {establishments.map((est, i) => (
        <Marker
          key={est.id}
          position={[est.latitude, est.longitude]}
          icon={i === 0 ? greenIcon : new L.Icon.Default()}
        >
          <Popup>
            <div className="min-w-[160px]">
              <p className="font-semibold text-sm leading-tight">{est.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{est.address}</p>
              {est.distanceKm > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">{est.distanceKm.toFixed(1)} km</p>
              )}
              <Link
                href={`/lojas/${est.id}`}
                className="mt-2 block text-xs text-center bg-orange-500 text-white rounded-lg py-1.5 px-3 hover:bg-orange-600 transition-colors"
              >
                Ver preços →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

'use client'

import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('./MapView').then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-ink/40">
      <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      <p className="text-sm">Carregando mapa...</p>
    </div>
  ),
})

export default function MapaPage() {
  return (
    <main className="min-h-screen bg-neutral">
      <header className="bg-white px-6 pt-10 pb-4 border-b border-ink/6">
        <h1 className="text-xl font-bold text-ink">Mapa de Preços</h1>
        <p className="text-sm text-ink/40 mt-1">Pin verde = loja mais barata perto de você</p>
      </header>
      <MapView />
    </main>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 30) return `${days} dias atrás`
  const months = Math.floor(days / 30)
  return `${months} ${months === 1 ? 'mês' : 'meses'} atrás`
}

type Establishment = {
  id: string
  cnpj: string
  name: string
  address: string
  billCount: number
  lastSeenAt: string
}

export default function LojasPage() {
  const router = useRouter()
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch(`${API}/establishments`)
      .then((r) => r.json())
      .then(({ data }) => setEstablishments(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = query.trim()
    ? establishments.filter((e) =>
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.address?.toLowerCase().includes(query.toLowerCase())
      )
    : establishments

  return (
    <main className="min-h-screen bg-neutral flex flex-col">
      <header className="bg-white border-b border-ink/6 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-xl hover:bg-ink/5 transition-colors shrink-0"
        >
          <svg className="w-5 h-5 text-ink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 flex items-center gap-2 bg-ink/5 rounded-xl px-3 py-2">
          <svg className="w-4 h-4 text-ink/35 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar estabelecimento..."
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink/35 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-ink/30 hover:text-ink/60">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 px-4 py-4">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <p className="font-semibold text-ink">
              {query ? 'Nenhum resultado' : 'Nenhum estabelecimento'}
            </p>
            <p className="text-sm text-ink/45">
              {query
                ? `Nenhum estabelecimento encontrado para "${query}"`
                : 'Registre cupons para ver os estabelecimentos aqui'}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <ul className="space-y-2">
            {filtered.map((est) => (
              <li key={est.id}>
                <button
                  onClick={() => router.push(`/lojas/${est.id}`)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-ink/6 hover:border-brand/30 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink text-sm truncate">{est.name}</p>
                      {est.address && (
                        <p className="text-xs text-ink/40 mt-0.5 truncate">{est.address}</p>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-ink/20 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-ink/50">
                      {est.billCount} {est.billCount === 1 ? 'cupom' : 'cupons'}
                    </span>
                    <span className="text-xs text-ink/35">·</span>
                    <span className="text-xs text-ink/40">{timeAgo(est.lastSeenAt)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import type { ItemGroup } from '../../types/nfce'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 30) return `${days} dias atrás`
  const months = Math.floor(days / 30)
  return `${months} ${months === 1 ? 'mês' : 'meses'} atrás`
}

export default function SearchPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ItemGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearched(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/items/search?q=${encodeURIComponent(q)}`)
        const json = await res.json()
        setResults(json.data ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
        setSearched(true)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [query])

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
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar item..."
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

        {!loading && query.trim().length < 2 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center">
              <svg className="w-7 h-7 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            </div>
            <p className="font-semibold text-ink">Buscar um item</p>
            <p className="text-sm text-ink/45 max-w-xs">
              Digite o nome de um produto para comparar preços entre diferentes estabelecimentos
            </p>
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <p className="font-semibold text-ink">Nenhum resultado</p>
            <p className="text-sm text-ink/45">
              Nenhum item encontrado para <span className="font-medium">&ldquo;{query.trim()}&rdquo;</span>
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <ul className="space-y-2">
            {results.map((group) => (
              <li key={group.key}>
                <button
                  onClick={() => router.push(`/item?q=${encodeURIComponent(group.key)}`)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-ink/6 hover:border-brand/30 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-ink text-sm leading-snug flex-1">
                      {group.description}
                    </p>
                    <svg className="w-4 h-4 text-ink/20 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    {group.minPrice === group.maxPrice ? (
                      <span className="text-base font-bold text-brand">{fmt(group.minPrice)}</span>
                    ) : (
                      <span className="text-base font-bold text-brand">
                        {fmt(group.minPrice)}
                        <span className="text-ink/35 font-normal text-sm"> – {fmt(group.maxPrice)}</span>
                      </span>
                    )}

                    <span className="text-xs text-ink/35">·</span>
                    <span className="text-xs text-ink/50">
                      {group.establishments.length} {group.establishments.length === 1 ? 'estabelecimento' : 'estabelecimentos'}
                    </span>
                    <span className="text-xs text-ink/35">·</span>
                    <span className="text-xs text-ink/40">{timeAgo(group.lastSeenAt)}</span>
                  </div>

                  {group.establishments.length > 1 && (
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      {group.establishments.slice(0, 3).map((est) => (
                        <span
                          key={est.cnpj}
                          className="text-[11px] bg-ink/5 text-ink/50 px-2 py-0.5 rounded-full"
                        >
                          {est.name}
                        </span>
                      ))}
                      {group.establishments.length > 3 && (
                        <span className="text-[11px] text-ink/35 px-1">+{group.establishments.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

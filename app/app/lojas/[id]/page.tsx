'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 30) return `${days} dias atrás`
  const months = Math.floor(days / 30)
  return `${months} ${months === 1 ? 'mês' : 'meses'} atrás`
}

type EstItem = {
  key: string
  description: string
  productName: string | null
  latestPrice: number
  lastSeenAt: string
}

type EstablishmentInfo = {
  id: string
  cnpj: string
  name: string
  address: string
}

export default function LojaDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [establishment, setEstablishment] = useState<EstablishmentInfo | null>(null)
  const [items, setItems] = useState<EstItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`${API}/establishments/${id}/items`)
      .then((r) => {
        if (!r.ok) throw new Error('Estabelecimento não encontrado')
        return r.json()
      })
      .then(({ establishment, data }) => {
        setEstablishment(establishment)
        setItems(data ?? [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <main className="min-h-screen bg-neutral flex flex-col">
      <header className="bg-white border-b border-ink/6 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-xl hover:bg-ink/5 transition-colors shrink-0"
        >
          <svg className="w-5 h-5 text-ink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold text-ink truncate">
            {establishment?.name ?? (loading ? '...' : 'Estabelecimento')}
          </h1>
          {establishment?.address && (
            <p className="text-xs text-ink/40 truncate mt-0.5">{establishment.address}</p>
          )}
        </div>
      </header>

      <div className="flex-1 px-4 py-4">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center mt-4">
            <p className="text-red-700 font-semibold">Erro ao carregar</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <p className="font-semibold text-ink">Nenhum item encontrado</p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <p className="text-xs text-ink/40 mb-3">
              {items.length} {items.length === 1 ? 'item' : 'itens'} registrados
            </p>
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.key}>
                  <button
                    onClick={() => router.push(`/item?q=${encodeURIComponent(item.key)}`)}
                    className="w-full bg-white rounded-2xl px-4 py-3 shadow-sm border border-ink/6 hover:border-brand/30 hover:shadow-md transition-all text-left flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">
                        {item.productName ?? item.description}
                      </p>
                      {item.productName && (
                        <p className="text-[11px] text-ink/35 truncate">{item.description}</p>
                      )}
                      <p className="text-xs text-ink/40 mt-0.5">{timeAgo(item.lastSeenAt)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-brand">{fmt(item.latestPrice)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  )
}

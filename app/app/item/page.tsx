'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import type { ItemDetail, ItemDetailRecord } from '../../types/nfce'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

function daysLabel(iso: string): string {
  const d = daysSince(iso)
  if (d === 0) return 'hoje'
  if (d === 1) return 'ontem'
  return `há ${d}d`
}

function getPriceTrend(history: ItemDetailRecord[], cnpj: string): 'up' | 'down' | 'stable' {
  const records = history
    .filter(r => r.establishment.cnpj === cnpj)
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
  if (records.length < 2) return 'stable'
  const diff = records[0].unitPrice - records[1].unitPrice
  if (diff > 0.01) return 'up'
  if (diff < -0.01) return 'down'
  return 'stable'
}

function RouteButtons({ address }: { address: string }) {
  if (!address) return null
  const q = encodeURIComponent(address)
  return (
    <div className="flex gap-2 mt-3">
      <a
        href={`https://waze.com/ul?q=${q}&navigate=yes`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-1.5 bg-[#33CCFF] text-white text-xs font-semibold py-2 px-3 rounded-xl"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/>
        </svg>
        Waze
      </a>
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${q}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-1.5 bg-[#4285F4] text-white text-xs font-semibold py-2 px-3 rounded-xl"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        Maps
      </a>
    </div>
  )
}

function BestPriceCard({ record }: { record: ItemDetailRecord }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
      <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-widest mb-2">Melhor preço atual</p>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-bold text-emerald-700">{fmt(record.unitPrice)}</p>
          <p className="text-sm text-emerald-600 mt-1 font-medium">{record.establishment.name}</p>
          {record.establishment.address && (
            <p className="text-xs text-emerald-500 mt-0.5 leading-relaxed">{record.establishment.address}</p>
          )}
          <p className="text-xs text-emerald-500 mt-0.5">{fmtDate(record.issuedAt)}</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
      </div>
      <RouteButtons address={record.establishment.address} />
    </div>
  )
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <span className="text-red-400 text-xs font-bold">↑</span>
  if (trend === 'down') return <span className="text-emerald-500 text-xs font-bold">↓</span>
  return null
}

function ItemContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const key = searchParams.get('q') ?? ''

  const [detail, setDetail] = useState<ItemDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!key) { router.replace('/search'); return }

    fetch(`${API}/items/detail?key=${encodeURIComponent(key)}`)
      .then((res) => res.json())
      .then(({ data }) => {
        if (!data) throw new Error('Item não encontrado')
        setDetail(data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [key, router])

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral flex flex-col">
        <Header onBack={() => router.back()} title="..." />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    )
  }

  if (error || !detail) {
    return (
      <main className="min-h-screen bg-neutral flex flex-col">
        <Header onBack={() => router.back()} title="Item" />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-sm w-full">
            <p className="text-red-700 font-semibold">Erro ao carregar</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold"
            >
              Voltar
            </button>
          </div>
        </div>
      </main>
    )
  }

  const best = detail.byEstablishment[0]
  const worst = detail.byEstablishment[detail.byEstablishment.length - 1]
  const maxSavings = best && worst && worst !== best
    ? worst.unitPrice - best.unitPrice
    : 0

  return (
    <main className="min-h-screen bg-neutral flex flex-col">
      <Header onBack={() => router.back()} title={detail.productName ?? detail.description} />

      <div className="flex-1 overflow-y-auto pb-8 space-y-3 pt-4 px-4">
        {/* Best price */}
        {best && <BestPriceCard record={best} />}

        {/* Comparison by establishment */}
        {detail.byEstablishment.length > 1 && (
          <section className="bg-white rounded-2xl border border-ink/6 overflow-hidden">
            <div className="px-4 py-3 border-b border-ink/6">
              <h2 className="font-semibold text-ink text-sm">Comparação atual</h2>
              {maxSavings > 0.01 && (
                <p className="text-xs text-emerald-600 mt-0.5">
                  Economize {fmt(maxSavings)} comprando no {best.establishment.name} vs {worst.establishment.name}
                </p>
              )}
            </div>
            <ul className="divide-y divide-ink/5">
              {detail.byEstablishment.map((record, i) => {
                const barWidth = best ? (best.unitPrice / record.unitPrice) * 100 : 100
                const pct = best && i > 0
                  ? (((record.unitPrice - best.unitPrice) / best.unitPrice) * 100).toFixed(0)
                  : null
                const stale = daysSince(record.issuedAt) > 60
                const trend = getPriceTrend(detail.history, record.establishment.cnpj)

                return (
                  <li key={record.establishment.cnpj} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {i === 0 && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-1.5 py-0.5 rounded-full shrink-0">
                            melhor
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-ink truncate">{record.establishment.name}</p>
                            <TrendIcon trend={trend} />
                          </div>
                          <p className="text-[11px] text-ink/40 truncate leading-snug">{record.description}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-xs text-ink/40">{daysLabel(record.issuedAt)}</p>
                            {stale && (
                              <span className="text-[10px] bg-amber-100 text-amber-600 font-medium px-1 py-0.5 rounded-full">
                                dado antigo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${i === 0 ? 'text-emerald-600' : 'text-ink'}`}>
                          {fmt(record.unitPrice)}
                        </p>
                        {pct !== null && (
                          <p className="text-[11px] text-red-400 font-medium">+{pct}% mais caro</p>
                        )}
                      </div>
                    </div>
                    {/* Price bar */}
                    <div className="w-full bg-ink/5 rounded-full h-1.5 mt-2">
                      <div
                        className={`h-1.5 rounded-full transition-all ${i === 0 ? 'bg-emerald-400' : 'bg-ink/20'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* Price history */}
        <section className="bg-white rounded-2xl border border-ink/6 overflow-hidden">
          <div className="px-4 py-3 border-b border-ink/6">
            <h2 className="font-semibold text-ink text-sm">
              Histórico{' '}
              <span className="text-ink/35 font-normal">({detail.history.length})</span>
            </h2>
          </div>
          {detail.history.length === 0 ? (
            <p className="px-4 py-4 text-sm text-ink/45">Nenhum registro encontrado.</p>
          ) : (
            <ul className="divide-y divide-ink/5">
              {detail.history.map((record) => (
                <li key={record.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink truncate">{record.establishment.name}</p>
                    <p className="text-[11px] text-ink/40 truncate leading-snug">{record.description}</p>
                    <p className="text-xs text-ink/40 mt-0.5">{fmtDate(record.issuedAt)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-ink">{fmt(record.unitPrice)}</p>
                    <p className="text-[11px] text-ink/35">
                      {record.quantity} {record.unit}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <header className="bg-white border-b border-ink/6 px-4 py-4 flex items-center gap-3 shrink-0">
      <button onClick={onBack} className="p-1.5 rounded-xl hover:bg-ink/5 transition-colors shrink-0">
        <svg className="w-5 h-5 text-ink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 className="text-sm font-semibold text-ink truncate">{title}</h1>
    </header>
  )
}

export default function ItemPage() {
  return (
    <Suspense>
      <ItemContent />
    </Suspense>
  )
}

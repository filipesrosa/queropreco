'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { CompareData, EstablishmentSummary, ProductComparison } from '../../types/nfce'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function daysLabel(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'hoje'
  if (d === 1) return 'ontem'
  return `há ${d}d`
}

function priceIndexLabel(idx: number | null): { text: string; color: string } {
  if (idx === null) return { text: 'sem comparação', color: 'text-ink/35' }
  const pct = Math.round((idx - 1) * 100)
  if (pct <= 1) return { text: 'melhor preço', color: 'text-emerald-600' }
  if (pct <= 8) return { text: `+${pct}% em média`, color: 'text-amber-600' }
  return { text: `+${pct}% em média`, color: 'text-red-500' }
}

function RouteButtons({ address }: { address: string }) {
  if (!address) return null
  const q = encodeURIComponent(address)
  return (
    <div className="flex gap-2 mt-4">
      <a
        href={`https://waze.com/ul?q=${q}&navigate=yes`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-1.5 bg-[#33CCFF] text-white text-sm font-semibold py-2.5 px-3 rounded-xl"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
        </svg>
        Waze
      </a>
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${q}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-1.5 bg-[#4285F4] text-white text-sm font-semibold py-2.5 px-3 rounded-xl"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
        Maps
      </a>
    </div>
  )
}

function StoreCard({
  est,
  rank,
  onTap,
}: {
  est: EstablishmentSummary
  rank: number
  onTap: () => void
}) {
  const { text, color } = priceIndexLabel(est.priceIndex)
  const rankBg = rank === 0 ? 'bg-emerald-500' : rank === 1 ? 'bg-amber-400' : 'bg-slate-400'

  return (
    <button
      onClick={onTap}
      className="w-52 shrink-0 bg-white rounded-2xl border border-ink/6 p-4 text-left flex flex-col gap-1.5 active:scale-[0.97] transition-transform touch-manipulation"
    >
      <div className="flex items-start gap-2">
        <span
          className={`w-6 h-6 rounded-full ${rankBg} text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5`}
        >
          {rank + 1}
        </span>
        <p className="text-sm font-semibold text-ink leading-tight line-clamp-2">{est.name}</p>
      </div>
      {est.address && (
        <p className="text-[11px] text-ink/40 leading-snug line-clamp-2">{est.address}</p>
      )}
      <p className={`text-[11px] font-semibold ${color}`}>{text}</p>
      <div className="flex items-center gap-2 text-[11px] text-ink/35 mt-auto pt-1">
        <span>{est.itemCount} {est.itemCount === 1 ? 'item' : 'itens'}</span>
        <span>·</span>
        <span>{daysLabel(est.lastVisit)}</span>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-brand font-medium mt-0.5">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        Ver produtos
      </div>
    </button>
  )
}

function StoreDetailSheet({
  est,
  onClose,
}: {
  est: EstablishmentSummary
  onClose: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'az' | 'price-asc' | 'price-desc'>('az')

  useEffect(() => {
    const id = setTimeout(() => setOpen(true), 10)
    return () => clearTimeout(id)
  }, [])

  const handleClose = () => {
    setOpen(false)
    setTimeout(onClose, 280)
  }

  const filtered = est.items
    .filter((item) =>
      search.trim() === '' ||
      item.description.toLowerCase().includes(search.trim().toLowerCase())
    )
    .sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price
      if (sort === 'price-desc') return b.price - a.price
      return a.description.localeCompare(b.description, 'pt-BR')
    })

  const { text, color } = priceIndexLabel(est.priceIndex)

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '88dvh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-0 shrink-0">
          <div className="w-10 h-1 rounded-full bg-ink/15" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 border-b border-ink/6 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-ink leading-tight">{est.name}</h2>
              {est.address && (
                <p className="text-sm text-ink/45 mt-1 leading-snug">{est.address}</p>
              )}
              <p className={`text-sm font-semibold mt-2 ${color}`}>{text}</p>
            </div>
            <button
              onClick={handleClose}
              aria-label="Fechar"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-ink/6 shrink-0 active:bg-ink/12 transition-colors touch-manipulation"
            >
              <svg className="w-4 h-4 text-ink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <RouteButtons address={est.address} />
        </div>

        {/* Search + sort controls */}
        <div className="px-4 pt-3 pb-2 space-y-2 border-b border-ink/6 shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="search"
              placeholder="Buscar produto…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-ink/5 rounded-xl border-0 outline-none focus:ring-2 focus:ring-brand/30 placeholder:text-ink/30"
            />
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSort('az')}
              className={`flex-1 text-[11px] py-1.5 rounded-full font-medium transition-colors touch-manipulation ${sort === 'az' ? 'bg-brand text-white' : 'bg-ink/6 text-ink/50'}`}
            >
              A–Z
            </button>
            <button
              onClick={() => setSort('price-asc')}
              className={`flex-1 text-[11px] py-1.5 rounded-full font-medium transition-colors touch-manipulation ${sort === 'price-asc' ? 'bg-brand text-white' : 'bg-ink/6 text-ink/50'}`}
            >
              Menor preço
            </button>
            <button
              onClick={() => setSort('price-desc')}
              className={`flex-1 text-[11px] py-1.5 rounded-full font-medium transition-colors touch-manipulation ${sort === 'price-desc' ? 'bg-brand text-white' : 'bg-ink/6 text-ink/50'}`}
            >
              Maior preço
            </button>
          </div>
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <p className="px-5 pt-3 pb-1 text-[11px] text-ink/35">
            {filtered.length} {filtered.length === 1 ? 'item' : 'itens'}
            {search.trim() !== '' && ` para "${search.trim()}"`}
          </p>

          {filtered.length === 0 ? (
            <p className="px-5 py-4 text-sm text-ink/40">Nenhum produto encontrado.</p>
          ) : (
            <ul className="divide-y divide-ink/5 pb-10">
              {filtered.map((item) => (
                <li key={item.key}>
                  <Link
                    href={`/item?q=${encodeURIComponent(item.key)}`}
                    onClick={handleClose}
                    className="flex items-center justify-between gap-3 px-5 py-4 active:bg-ink/5 transition-colors touch-manipulation"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink leading-snug line-clamp-2">{item.description}</p>
                      <p className="text-[11px] text-ink/35 mt-0.5">{daysLabel(item.issuedAt)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-ink">{fmt(item.price)}</p>
                      {item.stale && (
                        <span className="text-[10px] text-amber-500 block">⚠ antigo</span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}

function cellClass(price: number, bestPrice: number): string {
  const ratio = price / bestPrice
  if (ratio <= 1.01) return 'text-emerald-700 font-semibold bg-emerald-50'
  if (ratio <= 1.08) return 'text-amber-600'
  return 'text-red-500'
}

function CompareTable({
  establishments,
  products,
}: {
  establishments: EstablishmentSummary[]
  products: ProductComparison[]
}) {
  const [sort, setSort] = useState<'savings' | 'az'>('savings')

  const sorted = [...products].sort((a, b) =>
    sort === 'savings'
      ? b.maxSavings - a.maxSavings
      : a.description.localeCompare(b.description, 'pt-BR')
  )

  const shortName = (name: string) => name.split(' ')[0].slice(0, 12)

  return (
    <section className="bg-white rounded-2xl border border-ink/6 overflow-hidden">
      <div className="px-4 py-3 border-b border-ink/6 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink text-sm shrink-0">Tabela cruzada</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setSort('savings')}
            className={`text-[11px] px-2.5 py-1.5 rounded-full font-medium transition-colors touch-manipulation ${sort === 'savings' ? 'bg-brand text-white' : 'bg-ink/6 text-ink/50'}`}
          >
            Maior economia
          </button>
          <button
            onClick={() => setSort('az')}
            className={`text-[11px] px-2.5 py-1.5 rounded-full font-medium transition-colors touch-manipulation ${sort === 'az' ? 'bg-brand text-white' : 'bg-ink/6 text-ink/50'}`}
          >
            A–Z
          </button>
        </div>
      </div>

      <p className="px-4 py-2 text-[11px] text-ink/30 border-b border-ink/5">
        ← deslize para ver todas as lojas
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-max w-full text-xs">
          <thead className="border-b border-ink/6 bg-ink/[0.02]">
            <tr>
              <th className="sticky left-0 bg-white z-10 text-left px-4 py-3 font-semibold text-ink/40 min-w-[9rem] border-r border-ink/6 whitespace-nowrap">
                Produto
              </th>
              {establishments.map((est) => (
                <th
                  key={est.cnpj}
                  className="px-3 py-3 font-semibold text-ink/60 text-center whitespace-nowrap min-w-[5.5rem]"
                  title={est.name}
                >
                  {shortName(est.name)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {sorted.map((product) => (
              <tr key={product.key} className="active:bg-ink/[0.03] transition-colors">
                <td className="sticky left-0 bg-white z-10 px-4 py-3.5 border-r border-ink/6 align-top">
                  <Link href={`/item?q=${encodeURIComponent(product.key)}`} className="block touch-manipulation">
                    <p className="font-medium text-ink leading-snug line-clamp-2 max-w-[8rem]">
                      {product.description}
                    </p>
                    {product.maxSavings > 0.01 && (
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                        economize {fmt(product.maxSavings)}
                      </p>
                    )}
                  </Link>
                </td>
                {establishments.map((est) => {
                  const entry = product.prices[est.cnpj]
                  if (!entry) {
                    return (
                      <td key={est.cnpj} className="px-3 py-3.5 text-center text-ink/20">
                        —
                      </td>
                    )
                  }
                  const cc = cellClass(entry.price, product.bestPrice)
                  return (
                    <td key={est.cnpj} className={`px-3 py-3.5 text-center ${cc}`}>
                      <span className="block">{fmt(entry.price)}</span>
                      {entry.stale && (
                        <span className="text-[10px] text-amber-400" title="Dado com mais de 60 dias">
                          ⚠
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <header className="bg-white border-b border-ink/6 px-4 py-4 flex items-center gap-3 shrink-0">
      <button
        onClick={onBack}
        className="p-2 rounded-xl hover:bg-ink/5 active:bg-ink/10 transition-colors shrink-0 touch-manipulation"
      >
        <svg className="w-5 h-5 text-ink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 className="text-sm font-semibold text-ink">Dashboard de Preços</h1>
    </header>
  )
}

export default function ComparePage() {
  const router = useRouter()
  const [data, setData] = useState<CompareData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStore, setSelectedStore] = useState<EstablishmentSummary | null>(null)

  useEffect(() => {
    fetch(`${API}/compare`)
      .then((res) => res.json())
      .then((d: CompareData) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral flex flex-col">
        <Header onBack={() => router.back()} />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-neutral flex flex-col">
        <Header onBack={() => router.back()} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-sm w-full">
            <p className="text-red-700 font-semibold">Erro ao carregar</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
          </div>
        </div>
      </main>
    )
  }

  const noData = data.establishments.length === 0
  const noCross = data.products.length === 0

  return (
    <main className="min-h-screen bg-neutral flex flex-col">
      <Header onBack={() => router.back()} />

      {noData ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="bg-white border border-ink/6 rounded-2xl p-8 text-center max-w-sm w-full">
            <div className="w-14 h-14 bg-brand-light rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <p className="font-semibold text-ink">Nenhuma nota capturada</p>
            <p className="text-sm text-ink/45 mt-1.5 leading-relaxed">
              Capture notas fiscais para ver o dashboard de preços.
            </p>
            <Link
              href="/scan"
              className="mt-4 inline-block px-6 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold touch-manipulation"
            >
              Escanear nota
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-10 pt-4 space-y-4">
          {/* Stats bar */}
          <div className="px-4">
            <div className="bg-white rounded-2xl border border-ink/6 px-4 py-3.5 flex items-center justify-around text-center">
              <div>
                <p className="text-2xl font-bold text-ink">{data.establishments.length}</p>
                <p className="text-[11px] text-ink/40 mt-0.5">
                  {data.establishments.length === 1 ? 'loja' : 'lojas'}
                </p>
              </div>
              <div className="w-px h-8 bg-ink/8" />
              <div>
                <p className="text-2xl font-bold text-ink">{data.totalProducts}</p>
                <p className="text-[11px] text-ink/40 mt-0.5">produtos</p>
              </div>
              <div className="w-px h-8 bg-ink/8" />
              <div>
                <p className="text-2xl font-bold text-emerald-600">{data.products.length}</p>
                <p className="text-[11px] text-ink/40 mt-0.5">comparados</p>
              </div>
            </div>
          </div>

          {/* Stores */}
          <div>
            <p className="px-4 text-[11px] font-semibold text-ink/35 uppercase tracking-[0.15em] mb-2">
              Lojas — toque para ver produtos
            </p>
            <div className="relative">
              <div className="pl-4 flex gap-3 overflow-x-auto pb-3">
                {data.establishments.map((est, i) => (
                  <StoreCard
                    key={est.cnpj}
                    est={est}
                    rank={i}
                    onTap={() => setSelectedStore(est)}
                  />
                ))}
                <div className="w-4 shrink-0" />
              </div>
              {/* Fade hint: more cards to the right */}
              <div className="absolute right-0 top-0 bottom-3 w-12 bg-gradient-to-l from-neutral to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Cross table */}
          <div className="px-4">
            <p className="text-[11px] font-semibold text-ink/35 uppercase tracking-[0.15em] mb-2">
              Comparação de Preços
            </p>
            {noCross ? (
              <div className="bg-white rounded-2xl border border-ink/6 p-6 text-center">
                <p className="text-sm font-medium text-ink">Sem comparações cruzadas ainda</p>
                <p className="text-xs text-ink/45 mt-1.5 leading-relaxed">
                  Capture notas de pelo menos 2 lojas com produtos em comum para ver a tabela.
                </p>
              </div>
            ) : (
              <CompareTable establishments={data.establishments} products={data.products} />
            )}
          </div>
        </div>
      )}

      {/* Store detail sheet */}
      {selectedStore && (
        <StoreDetailSheet
          est={selectedStore}
          onClose={() => setSelectedStore(null)}
        />
      )}
    </main>
  )
}

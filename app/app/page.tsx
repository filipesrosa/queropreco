import Link from 'next/link'
import Image from 'next/image'
import logo from '../assets/images/quero-preco-logo.png'
import { InterestChips } from './components/InterestChips'
import { LocationChip } from './components/LocationChip'
import { NearbySection } from './components/NearbySection'
import { SearchHero } from './components/SearchHero'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type HomeData = {
  stats: { totalProducts: number; totalEstablishments: number; totalBills: number }
  topSavings: Array<{
    key: string
    description: string
    bestPrice: number
    bestEstablishment: string
    maxSavings: number
    pricesCount: number
  }>
  recentItems: Array<{
    description: string
    price: number
    establishmentName: string
    issuedAt: string
  }>
}

async function getHomeData(): Promise<HomeData | null> {
  try {
    const res = await fetch(`${API_URL}/home?limit=6`, { next: { revalidate: 120 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatItemDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default async function HomePage() {
  const data = await getHomeData()

  return (
    <main className="min-h-screen bg-neutral">
      {/* Header */}
      <header className="bg-white px-6 pt-10 pb-5 border-b border-ink/6">
        <div className="max-w-lg mx-auto">
          <Image src={logo} alt="Quero Preço" height={48} className="h-10 w-auto mb-5" priority />
          <SearchHero />
          <div className="mt-3">
            <LocationChip />
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-8">
        {/* Interest chips */}
        <section>
          <p className="text-[11px] font-semibold text-ink/35 uppercase tracking-[0.15em] mb-3">
            Meus interesses
          </p>
          <InterestChips />
        </section>

        {/* Nearby stores */}
        <NearbySection />

        {/* Top savings */}
        {data && data.topSavings.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-ink/35 uppercase tracking-[0.15em]">
                Maiores economias agora
              </p>
              <Link href="/compare" className="text-xs text-brand font-medium">
                Ver todos →
              </Link>
            </div>
            <div className="space-y-2.5">
              {data.topSavings.map((item) => (
                <Link
                  key={item.key}
                  href={`/item?q=${encodeURIComponent(item.key)}`}
                  className="flex items-start justify-between bg-white rounded-2xl p-4 shadow-sm border border-ink/6 hover:border-brand/20 hover:shadow-md transition-all group"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="font-medium text-ink text-sm leading-tight line-clamp-2">
                      {item.description}
                    </p>
                    <p className="text-xs text-ink/45 mt-1 truncate">{item.bestEstablishment}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-ink">{formatCurrency(item.bestPrice)}</p>
                    <p className="text-xs text-green-600 font-medium">
                      -{formatCurrency(item.maxSavings)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recent items carousel */}
        {data && data.recentItems.length > 0 && (
          <section>
            <p className="text-[11px] font-semibold text-ink/35 uppercase tracking-[0.15em] mb-3">
              Adicionado recentemente
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
              {data.recentItems.map((item, i) => (
                <Link
                  key={i}
                  href={`/search?q=${encodeURIComponent(item.description.split(' ').slice(0, 3).join(' '))}`}
                  className="flex-shrink-0 w-44 bg-white rounded-2xl p-3.5 shadow-sm border border-ink/6 snap-start hover:border-brand/20 transition-all"
                >
                  <p className="text-xs font-medium text-ink leading-tight line-clamp-3 mb-2">
                    {item.description}
                  </p>
                  <p className="text-base font-bold text-ink">{formatCurrency(item.price)}</p>
                  <p className="text-[11px] text-ink/40 mt-1 truncate">{item.establishmentName}</p>
                  <p className="text-[10px] text-ink/30 mt-0.5">{formatItemDate(item.issuedAt)}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA social */}
        <section>
          <div className="bg-brand rounded-2xl p-5 text-white">
            <p className="font-semibold text-base">Ajude a comunidade</p>
            <p className="text-sm text-white/80 mt-1 mb-4">
              Escaneie seu cupom fiscal e ajude a manter os preços atualizados para todos.
            </p>
            <Link
              href="/scan"
              className="inline-flex items-center gap-2 bg-white text-brand font-semibold text-sm px-4 py-2 rounded-xl hover:bg-brand-light transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zM3 14a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm10 1a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Escanear agora
            </Link>
          </div>
        </section>

        {/* Quick links */}
        <section className="grid grid-cols-2 gap-3">
          <Link
            href="/compare"
            className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-ink/6 hover:border-brand/20 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Comparar</p>
              <p className="text-xs text-ink/40">Entre lojas</p>
            </div>
          </Link>
          <Link
            href="/lojas"
            className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-ink/6 hover:border-brand/20 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 2.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Lojas</p>
              <p className="text-xs text-ink/40">Estabelecimentos</p>
            </div>
          </Link>
        </section>

        {/* Stats */}
        {data && (
          <div className="text-center text-xs text-ink/30 pb-2">
            {data.stats.totalProducts.toLocaleString('pt-BR')} produtos ·{' '}
            {data.stats.totalEstablishments.toLocaleString('pt-BR')} lojas ·{' '}
            {data.stats.totalBills.toLocaleString('pt-BR')} cupons
          </div>
        )}
      </div>
    </main>
  )
}

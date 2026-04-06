'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface BillSummary {
  id: string
  establishment: { name: string; cnpj: string }
  invoice: { issuedAt: string; number: string; series: string } | null
  payment: { totalAmount: string; totalItems: number } | null
}

interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function BillsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [bills, setBills] = useState<BillSummary[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(searchParams.get('from') ?? '')
  const [to, setTo] = useState(searchParams.get('to') ?? '')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    params.set('page', String(page))
    params.set('limit', '10')

    fetch(`${API}/bills?${params}`)
      .then((r) => r.json())
      .then(({ data, meta: m }) => {
        setBills(data ?? [])
        setMeta(m)
      })
      .finally(() => setLoading(false))
  }, [from, to, page])

  return (
    <main className="min-h-screen bg-neutral flex flex-col">
      <header className="bg-white border-b border-ink/6 px-4 py-4 flex items-center gap-3 shrink-0">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl hover:bg-ink/5 transition-colors">
          <svg className="w-5 h-5 text-ink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-ink">Notas capturadas</h1>
        {meta && (
          <span className="ml-auto text-xs text-ink/35 font-medium">
            {meta.total} nota{meta.total !== 1 ? 's' : ''}
          </span>
        )}
      </header>

      {/* Date filter */}
      <div className="bg-white border-b border-ink/6 px-4 py-3 shrink-0">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-[11px] font-medium text-ink/35 mb-1 uppercase tracking-wide">De</label>
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1) }}
              className="w-full border border-ink/15 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[11px] font-medium text-ink/35 mb-1 uppercase tracking-wide">Até</label>
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1) }}
              className="w-full border border-ink/15 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all"
            />
          </div>
          {(from || to) && (
            <button
              type="button"
              onClick={() => { setFrom(''); setTo(''); setPage(1) }}
              className="px-3 py-2 text-sm text-ink/50 hover:text-ink/80 border border-ink/15 rounded-xl shrink-0 transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-ink/5 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-ink/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-ink/40 font-medium">Nenhuma nota encontrada</p>
            {(from || to) && (
              <p className="text-ink/30 text-sm mt-1">Tente ajustar o filtro de datas</p>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-ink/5">
            {bills.map((bill) => (
              <li key={bill.id}>
                <Link
                  href={`/bills/${bill.id}`}
                  className="flex items-center gap-3 px-5 py-4 bg-white hover:bg-neutral transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink truncate">
                      {bill.establishment.name || bill.establishment.cnpj}
                    </p>
                    <p className="text-xs text-ink/35 mt-0.5">
                      {bill.invoice
                        ? new Date(bill.invoice.issuedAt).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                          })
                        : '—'}
                      {bill.invoice && ` · NF ${bill.invoice.number}-${bill.invoice.series}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-ink text-sm">
                      {bill.payment ? fmt(parseFloat(String(bill.payment.totalAmount))) : '—'}
                    </p>
                    <p className="text-xs text-ink/35 mt-0.5">
                      {bill.payment
                        ? `${bill.payment.totalItems} ${bill.payment.totalItems === 1 ? 'item' : 'itens'}`
                        : '—'}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-ink/20 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="bg-white border-t border-ink/8 px-5 py-3 flex items-center justify-between shrink-0">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 text-sm font-medium text-ink/60 border border-ink/15 rounded-xl disabled:opacity-40 hover:bg-ink/3 transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-sm text-ink/35 font-medium">{page} / {meta.totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page >= meta.totalPages}
            className="px-4 py-2 text-sm font-medium text-ink/60 border border-ink/15 rounded-xl disabled:opacity-40 hover:bg-ink/3 transition-colors"
          >
            Próxima →
          </button>
        </div>
      )}
    </main>
  )
}

export default function BillsPage() {
  return (
    <Suspense>
      <BillsContent />
    </Suspense>
  )
}

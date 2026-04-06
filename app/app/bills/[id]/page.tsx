'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { use } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface BillDetail {
  id: string
  notes: string | null
  establishment: { name: string; cnpj: string; address: string }
  invoice: {
    number: string
    series: string
    issuedAt: string
    accessKey: string
    authorizationProtocol: string
    environment: string
    type: string
    operator: string
  } | null
  payment: {
    totalAmount: string
    amountPaid: string
    change: string
    method: string
    totalItems: number
  } | null
  taxes: { totalTaxes: string; taxPercentage: string } | null
  items: {
    id: string
    description: string
    code: string
    quantity: string
    unit: string
    unitPrice: string
    totalPrice: string
  }[]
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function n(v: string | null | undefined) {
  return parseFloat(v ?? '0') || 0
}

export default function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [bill, setBill] = useState<BillDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/bills/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Nota não encontrada')
        return res.json()
      })
      .then(({ data }) => setBill(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral flex flex-col">
        <Header onBack={() => router.back()} />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    )
  }

  if (error || !bill) {
    return (
      <main className="min-h-screen bg-neutral flex flex-col">
        <Header onBack={() => router.back()} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-sm w-full">
            <p className="text-red-700 font-semibold">Nota não encontrada</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-neutral flex flex-col">
      <Header onBack={() => router.back()} />

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Establishment */}
        <section className="bg-white border-b border-ink/6 px-5 py-4">
          <p className="font-semibold text-ink">{bill.establishment.name || '—'}</p>
          <p className="text-xs text-ink/40 mt-0.5">CNPJ: {bill.establishment.cnpj}</p>
          {bill.establishment.address && (
            <p className="text-xs text-ink/40">{bill.establishment.address}</p>
          )}
        </section>

        {/* Invoice info */}
        {bill.invoice && (
          <section className="px-5 py-3 bg-neutral border-b border-ink/6">
            <div className="flex gap-4 text-xs text-ink/40">
              <span>Nº {bill.invoice.number} · Série {bill.invoice.series}</span>
              <span>
                {new Date(bill.invoice.issuedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                })}
              </span>
            </div>
            {bill.invoice.accessKey && (
              <p className="text-[10px] text-ink/30 mt-1 break-all font-mono">{bill.invoice.accessKey}</p>
            )}
            {bill.invoice.authorizationProtocol && (
              <p className="text-xs text-ink/30 mt-0.5">Protocolo: {bill.invoice.authorizationProtocol}</p>
            )}
          </section>
        )}

        {/* Items */}
        <section className="bg-white mt-2 border-y border-ink/6">
          <div className="px-5 py-3 border-b border-ink/6">
            <h3 className="font-semibold text-ink">
              Itens{' '}
              <span className="text-ink/35 font-normal text-sm">({bill.items.length})</span>
            </h3>
          </div>
          {bill.items.length === 0 ? (
            <div className="px-5 py-4 bg-amber-50 text-center">
              <p className="text-amber-700 text-sm font-medium">Itens não disponíveis — nota capturada via código de barras</p>
            </div>
          ) : (
            <ul className="divide-y divide-ink/5">
              {bill.items.map((item) => (
                <li key={item.id} className="px-5 py-3">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm text-ink flex-1 leading-snug">{item.description}</p>
                    <p className="text-sm font-semibold text-ink shrink-0">{fmt(n(item.totalPrice))}</p>
                  </div>
                  <p className="text-xs text-ink/35 mt-0.5">
                    {n(item.quantity)} {item.unit} × {fmt(n(item.unitPrice))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Payment summary */}
        {bill.payment && (
          <section className="bg-white mt-2 border-y border-ink/6 px-5 py-4 space-y-2">
            <Row label="Subtotal" value={fmt(n(bill.payment.totalAmount))} bold />
            <Row label="Pago" value={fmt(n(bill.payment.amountPaid))} />
            {n(bill.payment.change) > 0 && (
              <Row label="Troco" value={fmt(n(bill.payment.change))} />
            )}
            <Row label="Forma de pagamento" value={bill.payment.method} />
            {bill.taxes && n(bill.taxes.totalTaxes) > 0 && (
              <Row
                label={`Impostos (${n(bill.taxes.taxPercentage)}%)`}
                value={fmt(n(bill.taxes.totalTaxes))}
              />
            )}
          </section>
        )}

        {/* Notes */}
        {bill.notes && (
          <section className="bg-white mt-2 border-y border-ink/6 px-5 py-4">
            <p className="text-[11px] font-semibold text-ink/35 uppercase tracking-widest mb-1.5">Observações</p>
            <p className="text-sm text-ink/60">{bill.notes}</p>
          </section>
        )}
      </div>
    </main>
  )
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <header className="bg-white border-b border-ink/6 px-4 py-4 flex items-center gap-3 shrink-0">
      <button onClick={onBack} className="p-1.5 rounded-xl hover:bg-ink/5 transition-colors">
        <svg className="w-5 h-5 text-ink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 className="text-base font-semibold text-ink">Detalhe da Nota</h1>
    </header>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? 'font-semibold text-ink' : 'text-ink/45'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-bold text-ink' : 'text-ink/70'}`}>{value}</span>
    </div>
  )
}

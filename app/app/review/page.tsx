'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback, Suspense } from 'react'
import type { NFCeReceipt, Item } from '../../types/nfce'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function sessionHeaders(): HeadersInit {
  const id = typeof window !== 'undefined'
    ? (localStorage.getItem('qp_session_id') ?? '')
    : ''
  return { 'Content-Type': 'application/json', 'X-Session-Id': id }
}

function ReviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const url = searchParams.get('url') ?? ''
  const barcode = searchParams.get('barcode') ?? ''

  const [receipt, setReceipt] = useState<NFCeReceipt | null>(null)
  const [original, setOriginal] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!url && !barcode) { router.replace('/'); return }

    const endpoint = barcode ? `${API}/bills/barcode` : `${API}/bills/capture`
    const body = barcode ? { accessKey: barcode } : { url }

    fetch(endpoint, {
      method: 'POST',
      headers: sessionHeaders(),
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? `Erro ${res.status}`)
        }
        return res.json()
      })
      .then(({ receipt: r }: { receipt: NFCeReceipt }) => {
        setReceipt(r)
        setOriginal(JSON.stringify(r))
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [url, barcode, router])

  const hasChanges = receipt !== null && JSON.stringify(receipt) !== original

  const handleSave = useCallback(async () => {
    if (!receipt) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/bills`, {
        method: 'POST',
        headers: sessionHeaders(),
        body: JSON.stringify(receipt),
      })
      if (!res.ok) throw new Error('Falha ao salvar')
      router.push('/')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao salvar')
      setSaving(false)
    }
  }, [receipt, router])

  function updateEstablishment(field: string, value: string) {
    setReceipt((r) => r ? { ...r, establishment: { ...r.establishment, [field]: value } } : r)
  }

  function updateItem(index: number, field: keyof Item, value: string) {
    setReceipt((r) => {
      if (!r) return r
      const items = r.items.map((item, i) => {
        if (i !== index) return item
        const num = parseFloat(value.replace(',', '.')) || 0
        const updated = { ...item, [field]: num }
        updated.totalPrice = parseFloat((updated.quantity * updated.unitPrice).toFixed(2))
        return updated
      })
      const totalAmount = items.reduce((s, it) => s + it.totalPrice, 0)
      return {
        ...r,
        items,
        payment: { ...r.payment, totalItems: items.length, totalAmount, amountPaid: totalAmount },
      }
    })
  }

  function updateNotes(value: string) {
    setReceipt((r) => r ? { ...r, notes: value } : r)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral flex flex-col">
        <Header onBack={() => router.back()} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-[3px] border-brand border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-ink/45 text-sm">Carregando nota fiscal...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error || !receipt) {
    return (
      <main className="min-h-screen bg-neutral flex flex-col">
        <Header onBack={() => router.back()} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-sm w-full">
            <p className="text-red-700 font-semibold">Falha ao capturar nota</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-neutral flex flex-col">
      <Header onBack={() => router.back()} />

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Establishment */}
        <section className="bg-white border-b border-ink/6 px-5 py-4">
          {editing ? (
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-ink/35 uppercase tracking-widest">Estabelecimento</label>
              <input
                value={receipt.establishment.name}
                onChange={(e) => updateEstablishment('name', e.target.value)}
                className="w-full border border-ink/15 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all"
                placeholder="Nome"
              />
              <input
                value={receipt.establishment.address}
                onChange={(e) => updateEstablishment('address', e.target.value)}
                className="w-full border border-ink/15 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all"
                placeholder="Endereço"
              />
            </div>
          ) : (
            <div>
              <p className="font-semibold text-ink">{receipt.establishment.name || '—'}</p>
              <p className="text-xs text-ink/40 mt-0.5">CNPJ: {receipt.establishment.cnpj}</p>
              {receipt.establishment.address && (
                <p className="text-xs text-ink/40">{receipt.establishment.address}</p>
              )}
            </div>
          )}
        </section>

        {/* Invoice info */}
        <section className="px-5 py-3 bg-neutral border-b border-ink/6">
          <div className="flex gap-4 text-xs text-ink/40">
            <span>Nº {receipt.invoice.number} · Série {receipt.invoice.series}</span>
            <span>
              {new Date(receipt.invoice.issuedAt).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
              })}
            </span>
          </div>
          {receipt.invoice.accessKey && (
            <p className="text-[10px] text-ink/30 mt-1 break-all font-mono">{receipt.invoice.accessKey}</p>
          )}
        </section>

        {/* Items */}
        <section className="bg-white mt-2 border-y border-ink/6">
          <div className="px-5 py-3 border-b border-ink/6 flex items-center justify-between">
            <h3 className="font-semibold text-ink">
              Itens{' '}
              <span className="text-ink/35 font-normal text-sm">({receipt.items.length})</span>
            </h3>
          </div>
          {receipt.items.length === 0 && (
            <div className="px-5 py-4 bg-amber-50 border-b border-amber-100 text-center">
              <p className="text-amber-700 text-sm font-semibold">Itens não disponíveis</p>
              <p className="text-amber-600 text-xs mt-0.5">
                A nota foi capturada via código de barras. Use o QR Code para obter os itens automaticamente, ou adicione-os manualmente abaixo.
              </p>
            </div>
          )}
          <ul className="divide-y divide-ink/5">
            {receipt.items.map((item, i) => (
              <li key={i} className="px-5 py-3">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm text-ink flex-1 leading-snug">{item.description}</p>
                  <p className="text-sm font-semibold text-ink shrink-0">{fmt(item.totalPrice)}</p>
                </div>
                {editing ? (
                  <div className="mt-2.5 flex gap-2">
                    <div className="flex-1">
                      <label className="text-[11px] text-ink/40 font-medium">Qtd</label>
                      <input
                        type="number"
                        step="0.001"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                        className="w-full border border-ink/15 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] text-ink/40 font-medium">Preço unit.</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                        className="w-full border border-ink/15 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-ink/35 mt-0.5">
                    {item.quantity} {item.unit} × {fmt(item.unitPrice)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Payment summary */}
        <section className="bg-white mt-2 border-y border-ink/6 px-5 py-4 space-y-2">
          <Row label="Subtotal" value={fmt(receipt.payment.totalAmount)} bold />
          <Row label="Forma de pagamento" value={receipt.payment.method} />
          {receipt.taxes.totalTaxes > 0 && (
            <Row
              label={`Impostos (${receipt.taxes.taxPercentage}%)`}
              value={fmt(receipt.taxes.totalTaxes)}
            />
          )}
        </section>

        {/* Notes */}
        {(receipt.notes || editing) && (
          <section className="bg-white mt-2 border-y border-ink/6 px-5 py-4">
            <label className="text-[11px] font-semibold text-ink/35 uppercase tracking-widest block mb-2.5">
              Observações
            </label>
            {editing ? (
              <textarea
                value={receipt.notes ?? ''}
                onChange={(e) => updateNotes(e.target.value)}
                rows={3}
                className="w-full border border-ink/15 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all resize-none"
              />
            ) : (
              <p className="text-sm text-ink/60">{receipt.notes}</p>
            )}
          </section>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-ink/8 px-5 py-4 flex gap-3 safe-area-pb">
        <button
          onClick={() => setEditing((v) => !v)}
          className="flex-1 py-3 rounded-xl border border-ink/15 text-ink/70 font-semibold text-sm hover:bg-ink/3 transition-colors"
        >
          {editing ? 'Cancelar' : 'Editar'}
        </button>

        {hasChanges ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-dark disabled:opacity-40 transition-colors shadow-sm"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        ) : (
          <button
            onClick={() => router.push('/')}
            className="flex-1 py-3 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors shadow-sm"
          >
            Confirmar ✓
          </button>
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
      <h1 className="text-base font-semibold text-ink">Revisão da Nota</h1>
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

export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewContent />
    </Suspense>
  )
}

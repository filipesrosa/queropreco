'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback, Suspense } from 'react'
import type { NFCeReceipt, Item } from '../../types/nfce'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function ReviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const url = searchParams.get('url') ?? ''

  const [receipt, setReceipt] = useState<NFCeReceipt | null>(null)
  const [original, setOriginal] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!url) { router.replace('/'); return }

    fetch(`${API}/bills/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json()
          throw new Error(body.error ?? `Erro ${res.status}`)
        }
        return res.json()
      })
      .then(({ receipt: r }: { receipt: NFCeReceipt }) => {
        setReceipt(r)
        setOriginal(JSON.stringify(r))
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [url, router])

  const hasChanges = receipt !== null && JSON.stringify(receipt) !== original

  const handleSave = useCallback(async () => {
    if (!receipt) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      <main className="min-h-screen bg-gray-50 flex flex-col">
        <Header onBack={() => router.back()} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 text-sm">Carregando nota fiscal...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error || !receipt) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col">
        <Header onBack={() => router.back()} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-sm w-full">
            <p className="text-red-700 font-semibold">Falha ao capturar nota</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <Header onBack={() => router.back()} />

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Establishment */}
        <section className="bg-white border-b border-gray-100 px-5 py-4">
          {editing ? (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Estabelecimento</label>
              <input
                value={receipt.establishment.name}
                onChange={(e) => updateEstablishment('name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome"
              />
              <input
                value={receipt.establishment.address}
                onChange={(e) => updateEstablishment('address', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Endereço"
              />
            </div>
          ) : (
            <div>
              <p className="font-semibold text-gray-900">{receipt.establishment.name || '—'}</p>
              <p className="text-xs text-gray-500 mt-0.5">CNPJ: {receipt.establishment.cnpj}</p>
              {receipt.establishment.address && (
                <p className="text-xs text-gray-500">{receipt.establishment.address}</p>
              )}
            </div>
          )}
        </section>

        {/* Invoice info */}
        <section className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex gap-4 text-xs text-gray-500">
            <span>Nº {receipt.invoice.number} • Série {receipt.invoice.series}</span>
            <span>
              {new Date(receipt.invoice.issuedAt).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
              })}
            </span>
          </div>
          {receipt.invoice.accessKey && (
            <p className="text-xs text-gray-400 mt-1 break-all">{receipt.invoice.accessKey}</p>
          )}
        </section>

        {/* Items */}
        <section className="bg-white mt-2 border-y border-gray-100">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">
              Itens <span className="text-gray-400 font-normal text-sm">({receipt.items.length})</span>
            </h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {receipt.items.map((item, i) => (
              <li key={i} className="px-5 py-3">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm text-gray-800 flex-1 leading-snug">{item.description}</p>
                  <p className="text-sm font-medium text-gray-900 shrink-0">{fmt(item.totalPrice)}</p>
                </div>
                {editing ? (
                  <div className="mt-2 flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Qtd</label>
                      <input
                        type="number"
                        step="0.001"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Preço unit.</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.quantity} {item.unit} × {fmt(item.unitPrice)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Payment summary */}
        <section className="bg-white mt-2 border-y border-gray-100 px-5 py-4 space-y-1.5">
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
          <section className="bg-white mt-2 border-y border-gray-100 px-5 py-4">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
              Observações
            </label>
            {editing ? (
              <textarea
                value={receipt.notes ?? ''}
                onChange={(e) => updateNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            ) : (
              <p className="text-sm text-gray-600">{receipt.notes}</p>
            )}
          </section>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-5 py-4 flex gap-3 safe-area-pb">
        <button
          onClick={() => setEditing((v) => !v)}
          className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
        >
          {editing ? 'Cancelar edição' : 'Editar'}
        </button>

        {hasChanges ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        ) : (
          <button
            onClick={() => router.push('/')}
            className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors"
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
    <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3 shrink-0">
      <button onClick={onBack} className="p-1 rounded-lg hover:bg-gray-100">
        <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 className="text-base font-semibold text-gray-900">Revisão da Nota</h1>
    </header>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{value}</span>
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

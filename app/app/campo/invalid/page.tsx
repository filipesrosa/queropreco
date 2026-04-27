'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function todayLocal() {
  return new Date().toLocaleDateString('en-CA')
}

function localTimezone() {
  const offset = -new Date().getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  const hh = String(Math.floor(abs / 60)).padStart(2, '0')
  const mm = String(abs % 60).padStart(2, '0')
  return `${sign}${hh}:${mm}`
}

type InvalidRecord = {
  id: string
  value: string
  nome: string | null
  cpf: string | null
  createdAt: string
}

export default function CampoInvalidPage() {
  const router = useRouter()
  const [date, setDate] = useState(todayLocal())
  const [records, setRecords] = useState<InvalidRecord[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch() {
    setLoading(true)
    setError(null)
    setRecords(null)
    try {
      const tz = encodeURIComponent(localTimezone())
      const res = await fetch(`${API}/campo/invalid?date=${date}&timezone=${tz}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`)
      setRecords(data.records)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-neutral flex flex-col">
      <header className="bg-white border-b border-ink/6 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-xl hover:bg-ink/5 transition-colors"
        >
          <svg className="w-5 h-5 text-ink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-ink">Leituras defeituosas</h1>
      </header>

      <div className="flex-1 flex flex-col items-center px-6 pt-10 pb-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-ink/70">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-ink/15 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all"
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full bg-brand text-white font-semibold py-3.5 rounded-xl hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Buscando...
              </span>
            ) : 'Buscar'}
          </button>

          {records !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink/50">Registros defeituosos</span>
              <span className="font-bold text-red-500">{records.length}</span>
            </div>
          )}

          {records !== null && records.length === 0 && (
            <div className="bg-white border border-ink/10 rounded-2xl px-6 py-8 text-center shadow-sm">
              <p className="text-sm text-ink/45">Nenhum registro defeituoso nesta data.</p>
            </div>
          )}

          {records !== null && records.length > 0 && (
            <div className="space-y-3">
              {records.map(r => (
                <div key={r.id} className="bg-white border border-red-100 rounded-2xl px-4 py-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-ink/60">
                      {r.nome ?? <span className="text-ink/30 italic">sem nome</span>}
                    </span>
                    <span className="text-xs text-ink/35">
                      {new Date(r.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {r.cpf && (
                    <p className="text-xs text-ink/45">CPF: {r.cpf}</p>
                  )}
                  <p className="text-xs text-ink/40 break-all font-mono leading-relaxed">{r.value}</p>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              {error}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

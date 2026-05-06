'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function todayLocal() {
  const now = new Date()
  return now.toLocaleDateString('en-CA') // YYYY-MM-DD in local time
}

function localTimezone() {
  const offset = -new Date().getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  const hh = String(Math.floor(abs / 60)).padStart(2, '0')
  const mm = String(abs % 60).padStart(2, '0')
  return `${sign}${hh}:${mm}`
}

export default function CampoCountPage() {
  const router = useRouter()
  const [date, setDate] = useState(todayLocal())
  const [result, setResult] = useState<{ count: number; date: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const tz = encodeURIComponent(localTimezone())
      const res = await fetch(`${API}/internal/campo/count?date=${date}&timezone=${tz}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`)

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    setDownloading(true)
    setError(null)
    try {
      const tz = encodeURIComponent(localTimezone())
      const res = await fetch(`${API}/campo/export?date=${date}&timezone=${tz}`)
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cupons-${date}.txt`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao baixar')
    } finally {
      setDownloading(false)
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
        <h1 className="text-base font-semibold text-ink">Contagem de leituras</h1>
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

          {result && (
            <div className="bg-white border border-ink/10 rounded-2xl px-6 py-8 text-center shadow-sm">
              <p className="text-sm text-ink/45 mb-2">
                {new Date(result.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-6xl font-bold text-brand">{result.count}</p>
              <p className="text-sm text-ink/45 mt-2">leituras registradas</p>
            </div>
          )}

          {result && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full border border-brand text-brand font-semibold py-3.5 rounded-xl hover:bg-brand/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {downloading ? 'Baixando...' : 'Baixar arquivo de cupons'}
            </button>
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

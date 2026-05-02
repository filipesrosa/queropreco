'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface ReaderRow {
  readerName: string
  readerCpf: string
  userId: string | null
  count: number
  goal: number | null
  goalPercent: number | null
}

interface AnonData {
  count: number
  dates: { date: string; count: number }[]
}

function ProgressBar({ percent }: { percent: number }) {
  const capped = Math.min(percent, 100)
  const color = percent >= 100 ? 'bg-green-500' : percent >= 60 ? 'bg-blue-500' : 'bg-yellow-400'
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${capped}%` }} />
    </div>
  )
}

export default function ReportsPage() {
  const [readers, setReaders] = useState<ReaderRow[]>([])
  const [anon, setAnon] = useState<AnonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  function fetchReports() {
    setLoading(true)
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    Promise.all([
      fetch(`${API}/backoffice/reports/readers?${params}`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`${API}/backoffice/readings/anonymous?${params}`, { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([r, a]) => { setReaders(r); setAnon(a) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchReports() }, [])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Relatórios</h1>
        <Link href="/backoffice/reports/goals"
          className="px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 font-medium text-sm">
          Gerenciar metas
        </Link>
      </div>

      {/* Date filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs text-gray-500 font-medium mb-3">Filtrar período</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">De</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Até</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-end">
            <button onClick={fetchReports}
              className="w-full sm:w-auto bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-blue-700">
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* Readers */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-medium text-gray-800">Leituras por Leitor</h2>
        </div>
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Carregando...</p>
        ) : readers.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">Nenhuma leitura registrada.</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {readers.map((r) => (
              <div key={r.readerCpf} className="px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{r.readerName}</p>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">{r.readerCpf}</p>
                  {r.goal != null && r.goalPercent != null && (
                    <div className="mt-1.5">
                      <span className="text-xs text-gray-500">Meta: {r.goalPercent}%</span>
                      <ProgressBar percent={r.goalPercent} />
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-blue-700">{r.count}</p>
                  <p className="text-xs text-gray-400">leituras</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Anonymous */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-medium text-gray-800">Leituras Anônimas</h2>
          {anon && <span className="text-sm font-semibold text-gray-700">{anon.count} total</span>}
        </div>
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Carregando...</p>
        ) : !anon || anon.count === 0 ? (
          <p className="p-4 text-sm text-gray-500">Nenhuma leitura anônima no período.</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {anon.dates.map((d) => (
              <div key={d.date} className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-700">{d.date}</span>
                <span className="font-semibold text-gray-800">{d.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

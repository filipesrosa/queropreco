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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Relatórios</h1>
        <Link href="/backoffice/reports/goals" className="text-sm text-blue-600 hover:underline">
          Gerenciar metas →
        </Link>
      </div>

      {/* Date filter */}
      <div className="flex gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">De</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Até</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm" />
        </div>
        <button onClick={fetchReports}
          className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm hover:bg-blue-700">
          Filtrar
        </button>
      </div>

      {/* Readers table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-medium text-gray-800">Leituras por Leitor</h2>
        </div>
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Carregando...</p>
        ) : readers.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">Nenhuma leitura registrada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs">
              <tr>
                <th className="text-left px-4 py-2">Leitor</th>
                <th className="text-left px-4 py-2">CPF</th>
                <th className="text-right px-4 py-2">Leituras</th>
                <th className="text-left px-4 py-2 w-40">Meta semanal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {readers.map((r) => (
                <tr key={r.readerCpf} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.readerName}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono">{r.readerCpf}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-700">{r.count}</td>
                  <td className="px-4 py-3">
                    {r.goal != null && r.goalPercent != null ? (
                      <div>
                        <span className="text-xs text-gray-500">{r.goalPercent}%</span>
                        <ProgressBar percent={r.goalPercent} />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Sem meta</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Anonymous readings */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-medium text-gray-800">Leituras Anônimas (sem login)</h2>
          {anon && <span className="text-sm font-semibold text-gray-700">{anon.count} total</span>}
        </div>
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Carregando...</p>
        ) : !anon || anon.count === 0 ? (
          <p className="p-4 text-sm text-gray-500">Nenhuma leitura anônima no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs">
              <tr>
                <th className="text-left px-4 py-2">Data</th>
                <th className="text-right px-4 py-2">Quantidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {anon.dates.map((d) => (
                <tr key={d.date}>
                  <td className="px-4 py-2 text-gray-700">{d.date}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-800">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useSSE } from '../../hooks/useSSE'

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
  mobile: number
  desktop: number
  dates: { date: string; total: number; mobile: number; desktop: number }[]
}

interface DonationRow {
  entityId: string | null
  entityName: string
  total: number
  donated: number
  pending: number
}

interface DonationData {
  byEntity: DonationRow[]
}

function ProgressBar({ percent, color }: { percent: number; color?: string }) {
  const capped = Math.min(percent, 100)
  const cls = color ?? (percent >= 100 ? 'bg-green-500' : percent >= 60 ? 'bg-blue-500' : 'bg-yellow-400')
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      <div className={`h-2 rounded-full transition-all ${cls}`} style={{ width: `${capped}%` }} />
    </div>
  )
}

function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

export default function ReportsPage() {
  const [readers, setReaders] = useState<ReaderRow[]>([])
  const [anon, setAnon] = useState<AnonData | null>(null)
  const [donations, setDonations] = useState<DonationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  function fetchReports() {
    setLoading(true)
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const qs = params.toString()
    Promise.all([
      fetch(`${API}/backoffice/reports/readers${qs ? `?${qs}` : ''}`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`${API}/backoffice/readings/anonymous${qs ? `?${qs}` : ''}`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`${API}/backoffice/readings/donations${qs ? `?${qs}` : ''}`, { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([r, a, d]) => { setReaders(r); setAnon(a); setDonations(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  function fetchDonationsSilent() {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const qs = params.toString()
    fetch(`${API}/backoffice/readings/donations${qs ? `?${qs}` : ''}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setDonations(d))
      .catch(() => {})
  }

  useEffect(() => { fetchReports() }, [])

  const fetchDonationsRef = useRef(fetchDonationsSilent)
  useEffect(() => { fetchDonationsRef.current = fetchDonationsSilent })
  useSSE(`${API}/backoffice/donations/stream`, () => {
    fetchDonationsRef.current()
  })

  const totalDonated = donations?.byEntity.reduce((s, r) => s + r.donated, 0) ?? 0
  const totalAll = donations?.byEntity.reduce((s, r) => s + r.total, 0) ?? 0
  const donationPercent = totalAll > 0 ? Math.round((totalDonated / totalAll) * 100) : 0

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
          {anon && anon.count > 0 && (
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="7" y="2" width="10" height="20" rx="2" /><circle cx="12" cy="18" r="0.5" fill="currentColor" /></svg>
                {anon.mobile}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
                {anon.desktop}
              </span>
              <span className="font-semibold text-gray-700">{anon.count} total</span>
            </div>
          )}
        </div>
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Carregando...</p>
        ) : !anon || anon.count === 0 ? (
          <p className="p-4 text-sm text-gray-500">Nenhuma leitura anônima no período.</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {anon.dates.map((d) => (
              <div key={d.date} className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-700">{formatDateBR(d.date)}</span>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {d.mobile > 0 && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="7" y="2" width="10" height="20" rx="2" /><circle cx="12" cy="18" r="0.5" fill="currentColor" /></svg>
                      {d.mobile}
                    </span>
                  )}
                  {d.desktop > 0 && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
                      {d.desktop}
                    </span>
                  )}
                  <span className="font-semibold text-gray-800">{d.total}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Donation status */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-medium text-gray-800">Status de Doação de Chaves</h2>
          {!loading && totalAll > 0 && (
            <span className="text-sm font-semibold text-gray-700">{donationPercent}% doado</span>
          )}
        </div>
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Carregando...</p>
        ) : !donations || donations.byEntity.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">Nenhuma leitura registrada no período.</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {/* Overall summary if multiple entities */}
            {donations.byEntity.length > 1 && (
              <div className="px-4 py-3 bg-gray-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total geral</span>
                  <span className="text-xs text-gray-500">{totalDonated} / {totalAll}</span>
                </div>
                <ProgressBar percent={donationPercent} color={donationPercent >= 100 ? 'bg-green-500' : donationPercent >= 60 ? 'bg-blue-500' : 'bg-yellow-400'} />
                <div className="flex gap-4 mt-2">
                  <span className="text-xs text-green-600 font-medium">✓ {totalDonated} doados</span>
                  <span className="text-xs text-orange-500 font-medium">⏳ {totalAll - totalDonated} pendentes</span>
                </div>
              </div>
            )}
            {donations.byEntity.map((row) => {
              const pct = row.total > 0 ? Math.round((row.donated / row.total) * 100) : 0
              const barColor = pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : 'bg-yellow-400'
              return (
                <div key={row.entityId ?? 'anon'} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800">{row.entityName}</span>
                    <span className="text-xs text-gray-500">{row.donated} / {row.total}</span>
                  </div>
                  <ProgressBar percent={pct} color={barColor} />
                  <div className="flex gap-4 mt-1.5">
                    <span className="text-xs text-green-600">{row.donated} doados</span>
                    <span className="text-xs text-orange-500">{row.pending} pendentes</span>
                    <span className="text-xs text-gray-400 ml-auto">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

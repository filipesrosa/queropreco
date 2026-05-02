'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Reading {
  id: string
  accessKey: string
  readerName: string | null
  createdAt: string
}

function getOffset() {
  const off = -new Date().getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const h = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')
  const m = String(Math.abs(off) % 60).padStart(2, '0')
  return `${sign}${h}:${m}`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function CopyKey({ accessKey }: { accessKey: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(accessKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-left group"
      title="Copiar chave"
    >
      <span className="text-[10px] font-mono text-gray-600 group-hover:text-blue-600 transition-colors break-all leading-tight">
        {accessKey}
      </span>
      {copied ? (
        <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
        </svg>
      )}
    </button>
  )
}

export default function ReadingPage() {
  const [count, setCount] = useState<number | null>(null)
  const [readings, setReadings] = useState<Reading[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    try {
      const raw = document.cookie.split('; ').find((c) => c.startsWith('qp_user='))?.split('=')[1]
      if (raw) setRole(JSON.parse(decodeURIComponent(raw))?.role ?? null)
    } catch {}
  }, [])

  function load() {
    const today = new Date().toISOString().slice(0, 10)
    const tz = encodeURIComponent(getOffset())

    Promise.all([
      fetch(`${API}/backoffice/readings/count?date=${today}&timezone=${tz}`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`${API}/backoffice/readings/today?date=${today}&timezone=${tz}`, { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([c, r]) => {
        setCount(c.count ?? 0)
        setReadings(Array.isArray(r) ? r : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const showReader = role === 'ENTITY_ADMIN' || role === 'ADMIN'

  const filteredReadings = search.trim()
    ? readings.filter((r) => r.accessKey.includes(search.replace(/\D/g, '')))
    : readings

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-gray-900">Leitura de Cupons</h1>

      {/* Count + extract toggle */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Leituras hoje</p>
            <p className="text-4xl font-bold text-blue-600">
              {loading ? '—' : (count ?? '—')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={load}
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm font-medium"
              title="Atualizar"
            >
              ↻
            </button>
            {readings.length > 0 && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 text-sm font-medium"
              >
                {expanded ? 'Ocultar extrato' : 'Ver extrato'}
              </button>
            )}
          </div>
        </div>

        {expanded && readings.length > 0 && (
          <div className="border-t border-gray-100">
            {/* Search */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por chave de acesso..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Header */}
            <div className="px-4 py-2 bg-gray-50 flex items-center gap-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <span className="w-20 shrink-0">Hora</span>
              <span className="flex-1">Chave de Acesso</span>
              {showReader && <span className="w-28 text-right shrink-0">Leitor</span>}
            </div>

            {/* Rows */}
            <ul className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {filteredReadings.length === 0 ? (
                <li className="px-4 py-4 text-sm text-gray-400 text-center">Nenhum resultado.</li>
              ) : filteredReadings.map((r) => (
                <li key={r.id} className="px-4 py-2.5 flex items-center gap-3">
                  <span className="w-20 text-xs text-gray-400 shrink-0 font-mono">{fmtTime(r.createdAt)}</span>
                  <div className="flex-1 min-w-0">
                    <CopyKey accessKey={r.accessKey} />
                  </div>
                  {showReader && (
                    <span className="w-28 text-right text-xs text-gray-500 truncate shrink-0">
                      {r.readerName ?? '—'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/backoffice/reading/scan" className="bg-blue-600 text-white rounded-xl p-6 text-center hover:bg-blue-700 transition-colors">
          <div className="text-3xl mb-2">📷</div>
          <div className="font-medium">Câmera</div>
          <div className="text-xs text-blue-200 mt-1">QR Code pela câmera</div>
        </Link>
        <Link href="/backoffice/reading/usb" className="bg-emerald-600 text-white rounded-xl p-6 text-center hover:bg-emerald-700 transition-colors">
          <div className="text-3xl mb-2">🔌</div>
          <div className="font-medium">Leitor USB</div>
          <div className="text-xs text-emerald-200 mt-1">QR Code por leitor USB</div>
        </Link>
        <Link href="/backoffice/reading/manual" className="bg-gray-800 text-white rounded-xl p-6 text-center hover:bg-gray-900 transition-colors">
          <div className="text-3xl mb-2">⌨️</div>
          <div className="font-medium">Digitar Chave</div>
          <div className="text-xs text-gray-400 mt-1">Entrada manual</div>
        </Link>
      </div>
    </div>
  )
}

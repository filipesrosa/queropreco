'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function ReadingPage() {
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const offset = (() => {
      const d = new Date()
      const off = -d.getTimezoneOffset()
      const sign = off >= 0 ? '+' : '-'
      const h = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')
      const m = String(Math.abs(off) % 60).padStart(2, '0')
      return `${sign}${h}:${m}`
    })()

    fetch(`${API}/backoffice/readings/count?date=${today}&timezone=${encodeURIComponent(offset)}`, {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((d) => setCount(d.count ?? 0))
      .catch(() => setCount(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-gray-900">Leitura de Cupons</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm text-gray-500 mb-1">Leituras hoje</p>
        <p className="text-4xl font-bold text-blue-600">
          {loading ? '—' : (count ?? '—')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/backoffice/reading/scan"
          className="bg-blue-600 text-white rounded-xl p-6 text-center hover:bg-blue-700 transition-colors"
        >
          <div className="text-3xl mb-2">📷</div>
          <div className="font-medium">Escanear QR Code</div>
        </Link>
        <Link
          href="/backoffice/reading/manual"
          className="bg-gray-800 text-white rounded-xl p-6 text-center hover:bg-gray-900 transition-colors"
        >
          <div className="text-3xl mb-2">⌨️</div>
          <div className="font-medium">Digitar Chave</div>
        </Link>
      </div>
    </div>
  )
}

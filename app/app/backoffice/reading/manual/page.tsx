'use client'

import Link from 'next/link'
import { useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function ManualReadingPage() {
  const [key, setKey] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const accessKey = key.replace(/\D/g, '')
    if (accessKey.length !== 44) {
      setMessage('A chave deve ter exatamente 44 dígitos')
      setStatus('error')
      return
    }
    setStatus('loading')
    try {
      const res = await fetch(`${API}/backoffice/readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accessKey }),
      })
      if (res.ok) {
        setMessage('Cupom registrado com sucesso!')
        setStatus('success')
        setKey('')
      } else {
        const data = await res.json()
        setMessage(data.error ?? 'Erro ao registrar')
        setStatus('error')
      }
    } catch {
      setMessage('Erro de conexão')
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/backoffice/reading"
          className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm font-medium">
          ← Voltar
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Digitar Chave de Acesso</h1>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chave de Acesso (44 dígitos)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={key}
            onChange={(e) => { setKey(e.target.value); setStatus('idle') }}
            placeholder="00000000000000000000000000000000000000000000"
            maxLength={44}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">{key.replace(/\D/g, '').length}/44 dígitos</p>
        </div>

        {status === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm font-medium">
            ✓ {message}
          </div>
        )}
        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="bg-blue-600 text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {status === 'loading' ? 'Registrando...' : 'Registrar Cupom'}
        </button>
      </form>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function CampoPage() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return

    setStatus('loading')
    setErrorMsg(null)

    try {
      const res = await fetch(`${API}/campo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? `Erro ${res.status}`)
      }

      setValue('')
      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro desconhecido')
      setStatus('error')
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
        <h1 className="text-base font-semibold text-ink">Campo</h1>
      </header>

      <div className="flex-1 flex flex-col items-center px-6 pt-10 pb-12">
        <div className="w-full max-w-sm space-y-6">
          <p className="text-sm text-ink/45 text-center">
            Digite um texto para armazenar
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                if (status !== 'idle') setStatus('idle')
              }}
              placeholder="Digite seu texto aqui..."
              rows={5}
              className="w-full border border-ink/15 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all placeholder:text-ink/25 resize-none"
            />

            {status === 'success' && (
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Valor armazenado com sucesso!
              </div>
            )}

            {status === 'error' && errorMsg && (
              <div className="flex items-center gap-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={!value.trim() || status === 'loading'}
              className="w-full bg-brand text-white font-semibold py-3.5 rounded-xl hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {status === 'loading' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </span>
              ) : 'Salvar'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function CampoPage() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [lastChave, setLastChave] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function extractChave(val: string): string | null {
    return val.match(/p=(\d{44})/)?.[1] ?? null
  }

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function submit(val: string) {
    if (!val.trim()) return

    setStatus('loading')
    setErrorMsg(null)

    try {
      const res = await fetch(`${API}/campo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: val, nome, cpf }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? `Erro ${res.status}`)
      }

      setLastChave(extractChave(val))
      setValue('')
      setStatus('success')
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
      statusTimerRef.current = setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro desconhecido')
      setStatus('error')
    } finally {
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit(value)
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
            Aponte o leitor para o QR Code da nota fiscal
          </p>

          <form onSubmit={(e) => { e.preventDefault(); submit(value) }} className="space-y-4">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome"
              className="w-full border border-ink/15 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all placeholder:text-ink/25"
            />

            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="CPF"
              className="w-full border border-ink/15 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all placeholder:text-ink/25"
            />

            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Aguardando leitura..."
              className="w-full border border-ink/15 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all placeholder:text-ink/25"
            />

            {status === 'success' && (
              <div className="flex flex-col gap-1 text-sm font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Salvo!
                </div>
                {lastChave && (
                  <span className="text-xs font-normal text-emerald-700 break-all">
                    Última chave de acesso salva: {lastChave}
                  </span>
                )}
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

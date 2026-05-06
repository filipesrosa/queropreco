'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type ProgressEvent = {
  id: string
  status: 'ok' | 'error'
  message?: string
  processed: number
  errors: number
  remaining: number
}

type Phase = 'idle' | 'streaming' | 'done' | 'error'

export default function CampoProcessPage() {
  const router = useRouter()
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>('idle')
  const [total, setTotal] = useState(0)
  const [progress, setProgress] = useState<ProgressEvent | null>(null)
  const [final, setFinal] = useState<{ processed: number; errors: number; viaCaptcha: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorGroups, setErrorGroups] = useState<Record<string, number>>({})
  const abortRef = useRef<AbortController | null>(null)
  const errorLogRef = useRef<string[]>([])

  async function fetchPending() {
    try {
      const res = await fetch(`${API}/campo/pending`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`)
      setPendingCount(data.count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar pendentes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPending()
    return () => { abortRef.current?.abort() }
  }, [])

  async function handleProcess() {
    setPhase('streaming')
    setFinal(null)
    setProgress(null)
    setError(null)
    setErrorGroups({})
    errorLogRef.current = []

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${API}/campo/process`, { method: 'POST', signal: controller.signal })
      if (!res.ok || !res.body) throw new Error(`Erro ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          const lines = part.trim().split('\n')
          const eventType = lines.find(l => l.startsWith('event:'))?.slice(6).trim()
          const rawData = lines.find(l => l.startsWith('data:'))?.slice(5).trim()
          if (!eventType || !rawData) continue
          const payload = JSON.parse(rawData)
          if (eventType === 'start') {
            setTotal(payload.total)
          } else if (eventType === 'progress') {
            setProgress(payload as ProgressEvent)
            if (payload.status === 'error' && payload.message) {
              errorLogRef.current.push(payload.message as string)
            }
          } else if (eventType === 'done') {
            const groups: Record<string, number> = {}
            for (const msg of errorLogRef.current) {
              groups[msg] = (groups[msg] ?? 0) + 1
            }
            setErrorGroups(groups)
            setFinal(payload)
            setPhase('done')
            setLoading(true)
            fetchPending()
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setPhase('idle')
        setLoading(true)
        fetchPending()
        return
      }
      setError(err instanceof Error ? err.message : 'Erro ao processar')
      setPhase('error')
    } finally {
      abortRef.current = null
    }
  }

  function handleStop() {
    abortRef.current?.abort()
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
        <h1 className="text-base font-semibold text-ink">Processar leituras</h1>
      </header>

      <div className="flex-1 flex flex-col items-center px-6 pt-10 pb-12">
        <div className="w-full max-w-sm space-y-6">

          <div className="bg-white border border-ink/10 rounded-2xl px-6 py-8 text-center shadow-sm">
            <p className="text-sm text-ink/45 mb-2">leituras pendentes</p>
            {loading ? (
              <div className="flex justify-center py-2">
                <span className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <p className="text-6xl font-bold text-brand">{pendingCount ?? '—'}</p>
            )}
            <p className="text-sm text-ink/45 mt-2">aguardando processamento</p>
          </div>

          <button
            onClick={handleProcess}
            disabled={phase === 'streaming' || loading || pendingCount === 0}
            className="w-full bg-brand text-white font-semibold py-3.5 rounded-xl hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {phase === 'streaming' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processando...
              </span>
            ) : 'Processar'}
          </button>

          {phase === 'streaming' && (
            <button
              onClick={handleStop}
              className="w-full border border-red-300 text-red-500 font-semibold py-3.5 rounded-xl hover:bg-red-50 transition-colors"
            >
              Parar
            </button>
          )}

          {phase === 'streaming' && (
            <div className="bg-white border border-ink/10 rounded-2xl px-6 py-5 shadow-sm space-y-3">
              <div className="flex justify-between text-xs text-ink/50">
                <span>Progresso</span>
                <span>{progress ? progress.processed + progress.errors : 0} / {total}</span>
              </div>
              <div className="w-full bg-ink/8 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-brand h-2 rounded-full transition-all duration-300"
                  style={{ width: total > 0 ? `${((progress ? progress.processed + progress.errors : 0) / total) * 100}%` : '0%' }}
                />
              </div>
              {progress && (
                <div className="flex justify-around text-center pt-1">
                  <div>
                    <p className="text-lg font-bold text-emerald-600">{progress.processed}</p>
                    <p className="text-xs text-ink/45">processadas</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-500">{progress.errors}</p>
                    <p className="text-xs text-ink/45">erros</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-ink/40">{progress.remaining}</p>
                    <p className="text-xs text-ink/45">restantes</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {final && (
            <div className="bg-white border border-ink/10 rounded-2xl px-6 py-6 shadow-sm space-y-3">
              <p className="text-sm font-medium text-ink/70 text-center">Resultado</p>
              <div className="flex justify-around text-center">
                <div>
                  <p className="text-3xl font-bold text-emerald-600">{final.processed}</p>
                  <p className="text-xs text-ink/45 mt-1">processadas</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-500">{final.errors}</p>
                  <p className="text-xs text-ink/45 mt-1">erros</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-ink/50">{final.total}</p>
                  <p className="text-xs text-ink/45 mt-1">total</p>
                </div>
              </div>
              {final.viaCaptcha > 0 && (
                <div className="mt-3 pt-3 border-t border-ink/6 text-center">
                  <p className="text-sm text-ink/50">
                    <span className="font-semibold text-amber-500">{final.viaCaptcha}</span> lidas via reCAPTCHA
                  </p>
                </div>
              )}
            </div>
          )}

          {final && Object.keys(errorGroups).length > 0 && (
            <div className="bg-white border border-red-100 rounded-2xl px-6 py-5 shadow-sm space-y-2">
              <p className="text-sm font-medium text-red-500">Motivo dos erros</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {Object.entries(errorGroups)
                  .sort((a, b) => b[1] - a[1])
                  .map(([msg, count]) => (
                    <div key={msg} className="flex items-start justify-between gap-3 text-xs">
                      <span className="text-ink/55 break-all">{msg}</span>
                      <span className="text-red-400 font-semibold shrink-0">×{count}</span>
                    </div>
                  ))}
              </div>
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

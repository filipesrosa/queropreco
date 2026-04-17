'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useCallback, Suspense } from 'react'
import dynamic from 'next/dynamic'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const QrScanner = dynamic(
  () => import('../../components/QrScanner').then((m) => m.QrScanner),
  { ssr: false, loading: () => <ScannerSkeleton /> }
)

function ScannerSkeleton() {
  return (
    <div className="w-full max-w-sm h-72 bg-ink/8 rounded-2xl animate-pulse mx-auto" />
  )
}

function sessionHeaders(): HeadersInit {
  const id = typeof window !== 'undefined' ? (localStorage.getItem('qp_session_id') ?? '') : ''
  return { 'Content-Type': 'application/json', 'X-Session-Id': id }
}

type BatchStatus = 'idle' | 'loading' | 'ok' | 'error'

function ScanContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const barcodeMode = searchParams.get('mode') === 'barcode'

  const [barcode, setBarcode] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [batchMode, setBatchMode] = useState(false)
  const [batchCount, setBatchCount] = useState(0)
  const [batchStatus, setBatchStatus] = useState<BatchStatus>('idle')

  const handleScan = useCallback(
    async (scannedUrl: string) => {
      if (!batchMode) {
        router.push(`/review?url=${encodeURIComponent(scannedUrl)}`)
        return
      }

      setBatchStatus('loading')
      try {
        const res = await fetch(`${API}/bills/capture`, {
          method: 'POST',
          headers: sessionHeaders(),
          body: JSON.stringify({ url: scannedUrl }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? `Erro ${res.status}`)
        }
        setBatchCount((c) => c + 1)
        setBatchStatus('ok')
        setTimeout(() => setBatchStatus('idle'), 1500)
      } catch {
        setBatchStatus('error')
        setTimeout(() => setBatchStatus('idle'), 2000)
      }
    },
    [batchMode, router]
  )

  function handleBarcodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 44)
    setBarcode(raw)
  }

  function handleSubmitBarcode(e: React.FormEvent) {
    e.preventDefault()
    if (barcode.length !== 44) return
    setLoading(true)
    router.push(`/review?barcode=${barcode}`)
  }

  const formatted = barcode.replace(/(.{4})/g, '$1 ').trim()

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
        <h1 className="text-base font-semibold text-ink">
          {barcodeMode ? 'Código de Barras' : 'Escanear QR Code'}
        </h1>
      </header>

      <div className="flex-1 flex flex-col items-center px-6 pt-8 pb-12 gap-6">
        {barcodeMode ? (
          <div className="w-full max-w-sm">
            <p className="text-sm text-ink/45 mb-5 text-center">
              Digite os 44 dígitos da chave de acesso da nota fiscal
            </p>
            <form onSubmit={handleSubmitBarcode} className="space-y-4">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatted}
                  onChange={handleBarcodeChange}
                  placeholder="0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000"
                  className="w-full border border-ink/15 rounded-xl px-4 py-3 text-sm font-mono tracking-wide bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all placeholder:text-ink/25"
                />
                <p className={`text-xs mt-1.5 text-right font-medium ${barcode.length === 44 ? 'text-brand' : 'text-ink/30'}`}>
                  {barcode.length}/44 dígitos
                </p>
              </div>
              <button
                type="submit"
                disabled={barcode.length !== 44 || loading}
                className="w-full bg-brand text-white font-semibold py-3.5 rounded-xl hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {loading ? 'Carregando...' : 'Consultar Nota'}
              </button>
            </form>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-4">
            {cameraError ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
                <p className="text-red-700 text-sm font-semibold">Erro ao acessar câmera</p>
                <p className="text-red-500 text-xs mt-1">{cameraError}</p>
                <button
                  onClick={() => router.push('/scan?mode=barcode')}
                  className="mt-3 text-brand text-sm font-medium underline underline-offset-2"
                >
                  Digitar código de barras
                </button>
              </div>
            ) : (
              <QrScanner onScan={handleScan} onError={setCameraError} continuous={batchMode} />
            )}

            {/* Batch mode toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={batchMode}
                  onChange={(e) => {
                    setBatchMode(e.target.checked)
                    if (!e.target.checked) {
                      setBatchCount(0)
                      setBatchStatus('idle')
                    }
                  }}
                />
                <div className="w-10 h-6 bg-ink/15 rounded-full peer-checked:bg-brand transition-colors" />
                <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
              </div>
              <span className="text-sm font-medium text-ink/70">Leitura em Batch</span>
            </label>

            {/* Batch feedback */}
            {batchMode && (
              <div className="flex items-center gap-2 min-h-[28px]">
                {batchStatus === 'loading' && (
                  <div className="flex items-center gap-2 text-sm text-ink/50">
                    <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                    <span>Capturando...</span>
                  </div>
                )}
                {batchStatus === 'ok' && (
                  <span className="text-sm font-semibold text-emerald-600">
                    ✓ {batchCount} {batchCount === 1 ? 'cupom capturado' : 'cupons capturados'}
                  </span>
                )}
                {batchStatus === 'error' && (
                  <span className="text-sm font-medium text-red-500">Falha ao capturar — tente novamente</span>
                )}
                {batchStatus === 'idle' && batchCount > 0 && (
                  <span className="text-sm text-ink/40">
                    {batchCount} {batchCount === 1 ? 'cupom capturado' : 'cupons capturados'}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

export default function ScanPage() {
  return (
    <Suspense>
      <ScanContent />
    </Suspense>
  )
}

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useCallback, Suspense } from 'react'
import dynamic from 'next/dynamic'

const QrScanner = dynamic(
  () => import('../../components/QrScanner').then((m) => m.QrScanner),
  { ssr: false, loading: () => <ScannerSkeleton /> }
)

function ScannerSkeleton() {
  return (
    <div className="w-full max-w-sm h-72 bg-gray-200 rounded-2xl animate-pulse mx-auto" />
  )
}

function ScanContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlMode = searchParams.get('mode') === 'url'

  const [url, setUrl] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const goToReview = useCallback(
    (scannedUrl: string) => {
      router.push(`/review?url=${encodeURIComponent(scannedUrl)}`)
    },
    [router]
  )

  function handleSubmitUrl(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    try {
      new URL(trimmed)
    } catch {
      return
    }
    setLoading(true)
    router.push(`/review?url=${encodeURIComponent(trimmed)}`)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 rounded-lg hover:bg-gray-100">
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-gray-900">
          {urlMode ? 'Digitar URL da Nota' : 'Escanear QR Code'}
        </h1>
      </header>

      <div className="flex-1 flex flex-col items-center px-6 pt-8 pb-12 gap-6">
        {urlMode ? (
          <div className="w-full max-w-sm">
            <p className="text-sm text-gray-500 mb-4 text-center">
              Cole ou digite a URL da nota fiscal eletrônica
            </p>
            <form onSubmit={handleSubmitUrl} className="space-y-4">
              <textarea
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                rows={4}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                type="submit"
                disabled={!url.trim() || loading}
                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Carregando...' : 'Buscar Nota'}
              </button>
            </form>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            {cameraError ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-red-700 text-sm font-medium">Erro ao acessar câmera</p>
                <p className="text-red-500 text-xs mt-1">{cameraError}</p>
                <button
                  onClick={() => router.push('/scan?mode=url')}
                  className="mt-3 text-blue-600 text-sm underline"
                >
                  Digitar URL manualmente
                </button>
              </div>
            ) : (
              <QrScanner onScan={goToReview} onError={setCameraError} />
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

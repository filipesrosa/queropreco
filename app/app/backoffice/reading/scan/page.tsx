'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useState } from 'react'
import type { ComponentProps } from 'react'
import type { QrScanner as QrScannerType } from '../../../../components/QrScanner'

const QrScanner = dynamic<ComponentProps<typeof QrScannerType>>(
  () => import('../../../../components/QrScanner').then((m) => m.QrScanner),
  { ssr: false, loading: () => <p className="text-gray-500 text-sm">Carregando câmera...</p> },
)

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function extractAccessKey(raw: string): string | null {
  const m = raw.match(/(?:chave=|p=|chNFe=)(\d{44})/)
  if (m) return m[1]
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 44) return digits
  return null
}

export default function BackofficeScanPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [scanning, setScanning] = useState(true)

  const handleScan = useCallback(
    async (raw: string) => {
      if (status === 'loading') return
      const accessKey = extractAccessKey(raw)
      if (!accessKey) {
        setMessage('QR Code sem chave de acesso válida')
        setStatus('error')
        setTimeout(() => { setStatus('idle'); setScanning(true) }, 2000)
        return
      }

      setScanning(false)
      setStatus('loading')
      try {
        const res = await fetch(`${API}/backoffice/readings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ accessKey }),
        })
        if (res.ok) {
          setMessage('Cupom registrado!')
          setStatus('success')
        } else {
          const data = await res.json()
          setMessage(data.error ?? 'Erro ao registrar')
          setStatus('error')
        }
      } catch {
        setMessage('Erro de conexão')
        setStatus('error')
      }
      setTimeout(() => { setStatus('idle'); setScanning(true) }, 2500)
    },
    [status],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/backoffice/reading" className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm font-medium">← Voltar</Link>
        <h1 className="text-xl font-semibold text-gray-900">Escanear QR Code</h1>
      </div>

      {scanning && (
        <QrScanner onScan={handleScan} />
      )}

      {status === 'loading' && (
        <div className="text-center py-4 text-blue-600 text-sm">Registrando...</div>
      )}
      {status === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-center font-medium">
          ✓ {message}
        </div>
      )}
      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-center">
          {message}
        </div>
      )}
    </div>
  )
}

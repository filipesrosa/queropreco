'use client'

import { useEffect, useRef } from 'react'

interface Props {
  onScan: (result: string) => void
  onError?: (error: string) => void
}

export function QrScanner({ onScan, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null)

  useEffect(() => {
    let stopped = false

    async function start() {
      const { Html5Qrcode } = await import('html5-qrcode')

      if (!containerRef.current || stopped) return

      const scanner = new Html5Qrcode('qr-reader-container')
      scannerRef.current = scanner

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (text) => {
            onScan(text)
            scanner.stop().catch(() => {})
          },
          undefined
        )
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'Falha ao acessar câmera')
      }
    }

    start()

    return () => {
      stopped = true
      scannerRef.current?.stop().catch(() => {})
    }
  }, [onScan, onError])

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        id="qr-reader-container"
        ref={containerRef}
        className="w-full max-w-sm overflow-hidden rounded-2xl"
      />
      <p className="text-sm text-gray-500 text-center">
        Aponte a câmera para o QR Code da nota fiscal
      </p>
    </div>
  )
}

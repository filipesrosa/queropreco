import Link from 'next/link'
import Image from 'next/image'
import logo from '../assets/images/quero-preco.png'

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral flex flex-col">
      {/* Header */}
      <header className="bg-white px-6 pt-10 pb-7 flex items-center justify-center gap-4 border-b border-ink/6">
        <Image
          src={logo}
          alt="Quero Preço"
          height={80}
          className="h-16 w-auto"
          priority
        />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-3">
        <p className="text-[11px] font-semibold text-ink/35 uppercase tracking-[0.15em] mb-3">
          Capturar nota fiscal
        </p>

        <div className="w-full max-w-sm space-y-3">
          <Link
            href="/scan"
            className="flex items-center gap-4 w-full bg-white rounded-2xl p-5 shadow-sm border border-ink/6 hover:border-brand/30 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-light flex items-center justify-center shrink-0 group-hover:bg-brand/15 transition-colors">
              <svg className="w-6 h-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zM3 14a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm10 1a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink">Escanear QR Code</p>
              <p className="text-sm text-ink/45 mt-0.5">Use a câmera para ler o código</p>
            </div>
            <svg className="w-5 h-5 text-ink/20 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link
            href="/scan?mode=barcode"
            className="flex items-center gap-4 w-full bg-white rounded-2xl p-5 shadow-sm border border-ink/6 hover:border-brand/30 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-light flex items-center justify-center shrink-0 group-hover:bg-brand/15 transition-colors">
              <svg className="w-6 h-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2v16H3V4zm4 0h1v16H7V4zm3 0h2v16h-2V4zm4 0h1v16h-1V4zm3 0h2v16h-2V4zm4 0h1v16h-1V4z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink">Código de barras</p>
              <p className="text-sm text-ink/45 mt-0.5">Digite os 44 dígitos da nota</p>
            </div>
            <svg className="w-5 h-5 text-ink/20 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="w-full max-w-sm mt-5 space-y-3">
          <p className="text-[11px] font-semibold text-ink/35 uppercase tracking-[0.15em]">
            Explorar preços
          </p>
          <Link
            href="/search"
            className="flex items-center gap-4 w-full bg-white rounded-2xl p-5 shadow-sm border border-ink/6 hover:border-brand/30 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-light flex items-center justify-center shrink-0 group-hover:bg-brand/15 transition-colors">
              <svg className="w-6 h-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink">Comparar Preços</p>
              <p className="text-sm text-ink/45 mt-0.5">Veja o histórico por item</p>
            </div>
            <svg className="w-5 h-5 text-ink/20 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <Link
          href="/bills"
          className="flex items-center gap-1.5 text-sm text-brand hover:text-brand-dark transition-colors mt-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Ver notas capturadas
        </Link>
      </div>
    </main>
  )
}

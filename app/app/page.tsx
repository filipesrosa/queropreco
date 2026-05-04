import Link from 'next/link'
import Image from 'next/image'
import logo from '../assets/images/quero-preco-logo.png'

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
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink">Chave de acesso</p>
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink">Buscar por item</p>
              <p className="text-sm text-ink/45 mt-0.5">Veja o histórico por produto</p>
            </div>
            <svg className="w-5 h-5 text-ink/20 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/compare"
            className="flex items-center gap-4 w-full bg-white rounded-2xl p-5 shadow-sm border border-ink/6 hover:border-brand/30 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-light flex items-center justify-center shrink-0 group-hover:bg-brand/15 transition-colors">
              <svg className="w-6 h-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink">Comparativo de Preços</p>
              <p className="text-sm text-ink/45 mt-0.5">Compare preços entre estabelecimentos</p>
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

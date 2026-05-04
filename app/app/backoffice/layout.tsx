import BackofficeHeader from './components/BackofficeHeader'

function BgDecorations() {
  const bars = [6,10,14,17,22,26,30,35,39,43,47,52,56,60,64,68,73,77,81,85,90,94]
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      {/* Price tag — top left */}
      <svg className="absolute -top-10 -left-10 w-80 h-80 text-blue-400 opacity-[0.07]" viewBox="0 0 100 100" fill="none">
        <path d="M20 10h30a4 4 0 0 1 3 1.3l28 28a4 4 0 0 1 0 5.7L56 69.3a4 4 0 0 1-5.7 0l-28-28A4 4 0 0 1 21 38V14a4 4 0 0 1 4-4h-5Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
        <circle cx="34" cy="26" r="4" stroke="currentColor" strokeWidth="2.5"/>
      </svg>
      {/* R$ coin — bottom right */}
      <svg className="absolute -bottom-14 -right-14 w-96 h-96 text-emerald-400 opacity-[0.07]" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="3"/>
        <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3"/>
        <text x="50" y="57" textAnchor="middle" fontSize="22" fontWeight="700" fontFamily="sans-serif" fill="currentColor">R$</text>
      </svg>
      {/* Barcode — bottom left */}
      <svg className="absolute -bottom-4 -left-2 w-64 h-64 text-gray-400 opacity-[0.08]" viewBox="0 0 100 60" fill="none">
        {bars.map((x, i) => (
          <rect key={i} x={x} y="8" width={i % 3 === 0 ? 2.5 : 1.5} height="36" fill="currentColor"/>
        ))}
      </svg>
      {/* % — top right */}
      <svg className="absolute -top-8 right-6 w-56 h-56 text-yellow-400 opacity-[0.07]" viewBox="0 0 100 100" fill="none">
        <text x="50" y="82" textAnchor="middle" fontSize="90" fontWeight="900" fontFamily="sans-serif" fill="currentColor">%</text>
      </svg>
      {/* Shopping cart — center right edge */}
      <svg className="absolute top-1/2 -translate-y-1/2 -right-10 w-64 h-64 text-blue-300 opacity-[0.06]" viewBox="0 0 100 100" fill="none">
        <path d="M15 20h10l10 38h35l8-26H30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="42" cy="66" r="5" stroke="currentColor" strokeWidth="2.5"/>
        <circle cx="62" cy="66" r="5" stroke="currentColor" strokeWidth="2.5"/>
      </svg>
    </div>
  )
}

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <BgDecorations />
      <BackofficeHeader />
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}

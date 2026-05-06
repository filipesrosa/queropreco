'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  {
    href: '/',
    label: 'Início',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-brand' : 'text-ink/40'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: '/search',
    label: 'Buscar',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-brand' : 'text-ink/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
    ),
  },
  {
    href: '/scan',
    label: 'Escanear',
    icon: (_active: boolean) => (
      <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
        {/* top-left finder */}
        <rect x="2" y="2" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="4" y="4" width="3" height="3" rx="0.4"/>
        {/* top-right finder */}
        <rect x="15" y="2" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="17" y="4" width="3" height="3" rx="0.4"/>
        {/* bottom-left finder */}
        <rect x="2" y="15" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="4" y="17" width="3" height="3" rx="0.4"/>
        {/* data dots */}
        <rect x="15" y="15" width="2" height="2" rx="0.3"/>
        <rect x="18" y="15" width="2" height="2" rx="0.3"/>
        <rect x="15" y="18" width="2" height="2" rx="0.3"/>
        <rect x="19" y="19" width="3" height="3" rx="0.4"/>
        {/* timing dots center */}
        <rect x="11" y="2" width="2" height="2" rx="0.3"/>
        <rect x="11" y="5" width="2" height="2" rx="0.3"/>
        <rect x="11" y="11" width="2" height="2" rx="0.3"/>
        <rect x="2" y="11" width="2" height="2" rx="0.3"/>
        <rect x="5" y="11" width="2" height="2" rx="0.3"/>
      </svg>
    ),
    isScan: true,
  },
  {
    href: '/mapa',
    label: 'Mapa',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-brand' : 'text-ink/40'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
  {
    href: '/perfil',
    label: 'Perfil',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-brand' : 'text-ink/40'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
]

export function TabBar() {
  const pathname = usePathname()

  if (pathname.startsWith('/backoffice')) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-ink/8 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)

          if (tab.isScan) {
            return (
              <Link key={tab.href} href={tab.href} className="flex flex-col items-center -mt-5">
                <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center shadow-lg shadow-brand/30">
                  {tab.icon(false)}
                </div>
                <span className="text-[10px] font-medium text-ink/40 mt-1">{tab.label}</span>
              </Link>
            )
          }

          return (
            <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-0.5 py-1 px-3">
              {tab.icon(active)}
              <span className={`text-[10px] font-medium ${active ? 'text-brand' : 'text-ink/40'}`}>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

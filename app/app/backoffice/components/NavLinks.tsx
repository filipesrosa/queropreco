'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

function getUser() {
  if (typeof document === 'undefined') return null
  try {
    const raw = document.cookie
      .split('; ')
      .find((c) => c.startsWith('qp_user='))
      ?.split('=')[1]
    return raw ? JSON.parse(decodeURIComponent(raw)) : null
  } catch {
    return null
  }
}

const IconScan = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="11" rx="2"/>
    <line x1="7" y1="11" x2="7" y2="14"/><line x1="10" y1="10" x2="10" y2="15"/>
    <line x1="13" y1="11" x2="13" y2="14"/><line x1="16" y1="10" x2="16" y2="15"/>
  </svg>
)

const IconChart = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="19" x2="4" y2="12"/><line x1="9" y1="19" x2="9" y2="6"/>
    <line x1="14" y1="19" x2="14" y2="10"/><line x1="19" y1="19" x2="19" y2="4"/>
    <line x1="2" y1="19" x2="22" y2="19"/>
  </svg>
)

const IconGear = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)

const IconTag = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
)

export default function NavLinks() {
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    setRole(getUser()?.role ?? null)
  }, [])

  const link = (href: string, label: string, icon: React.ReactNode) => {
    const active = pathname.startsWith(href)
    return (
      <Link
        key={href}
        href={href}
        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-all duration-150 ${
          active
            ? 'bg-blue-50 text-blue-600 font-medium'
            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
        }`}
      >
        {icon}
        {label}
      </Link>
    )
  }

  return (
    <nav className="flex items-center gap-0.5">
      {link('/backoffice/reading', 'Leitura', <IconScan />)}
      {(role === 'ENTITY_ADMIN' || role === 'ADMIN') && link('/backoffice/reports', 'Relatórios', <IconChart />)}
      {role === 'ADMIN' && link('/backoffice/management', 'Gestão', <IconGear />)}
      {role === 'ADMIN' && link('/backoffice/products', 'Produtos', <IconTag />)}
    </nav>
  )
}

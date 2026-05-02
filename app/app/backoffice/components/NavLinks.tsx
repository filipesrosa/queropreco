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

export default function NavLinks() {
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    setRole(getUser()?.role ?? null)
  }, [])

  const link = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={`text-sm ${pathname.startsWith(href) ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="flex gap-4">
      {link('/backoffice/reading', 'Leitura')}
      {(role === 'ENTITY_ADMIN' || role === 'ADMIN') && link('/backoffice/reports', 'Relatórios')}
      {role === 'ADMIN' && link('/backoffice/management', 'Gestão')}
      {role === 'ADMIN' && link('/backoffice/products', 'Produtos')}
    </nav>
  )
}

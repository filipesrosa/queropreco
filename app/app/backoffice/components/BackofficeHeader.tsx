'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/assets/images/quero-preco-logo.png'
import NavLinks from './NavLinks'
import LogoutButton from './LogoutButton'

export default function BackofficeHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  if (pathname === '/backoffice/login') return null

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Image src={logo} alt="Quero Preço" width={26} className="shrink-0" />
          <span className="text-sm font-semibold text-gray-700 tracking-wide">Backoffice</span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4 flex-1 ml-5">
          <div className="w-px h-4 bg-gray-200 shrink-0" />
          <NavLinks />
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/backoffice/change-password"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              Alterar senha
            </Link>
            <LogoutButton />
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden sticky top-14 z-40 bg-white border-b border-gray-100 shadow-sm px-4 py-3 flex flex-col gap-1">
          <NavLinks onNavigate={() => setOpen(false)} />
          <div className="mt-2 pt-2 border-t border-gray-100 flex flex-col gap-1">
            <Link
              href="/backoffice/change-password"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-xl hover:bg-gray-50 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              Alterar senha
            </Link>
            <LogoutButton />
          </div>
        </div>
      )}
    </>
  )
}

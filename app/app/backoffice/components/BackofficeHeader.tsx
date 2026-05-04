'use client'

import { usePathname } from 'next/navigation'
import Image from 'next/image'
import logo from '@/assets/images/quero-preco-logo.png'
import NavLinks from './NavLinks'
import LogoutButton from './LogoutButton'

export default function BackofficeHeader() {
  const pathname = usePathname()
  if (pathname === '/backoffice/login') return null

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 h-14 flex items-center justify-between">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2.5">
          <Image src={logo} alt="Quero Preço" width={26} className="shrink-0" />
          <span className="text-sm font-semibold text-gray-700 tracking-wide">Backoffice</span>
        </div>
        <div className="w-px h-4 bg-gray-200 shrink-0" />
        <NavLinks />
      </div>
      <LogoutButton />
    </header>
  )
}

import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionInit } from './components/SessionInit'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Quero Preço',
  description: 'Comparador de preços por nota fiscal',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={inter.className}>
      <body><SessionInit />{children}</body>
    </html>
  )
}

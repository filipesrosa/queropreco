import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionInit } from './components/SessionInit'
import { TabBar } from './components/TabBar'

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
      <body>
        <SessionInit />
        <div className="pb-20">{children}</div>
        <TabBar />
      </body>
    </html>
  )
}

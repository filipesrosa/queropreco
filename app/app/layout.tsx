import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Quero Preço',
  description: 'Comparador de preços por nota fiscal',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}

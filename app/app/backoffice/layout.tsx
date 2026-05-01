import LogoutButton from './components/LogoutButton'
import NavLinks from './components/NavLinks'

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-gray-900">Backoffice</span>
          <NavLinks />
        </div>
        <LogoutButton />
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}

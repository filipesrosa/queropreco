'use client'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function LogoutButton() {
  async function logout() {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' })
    window.location.href = '/backoffice/login'
  }

  return (
    <button
      onClick={logout}
      className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-all duration-150"
      title="Sair"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
      Sair
    </button>
  )
}

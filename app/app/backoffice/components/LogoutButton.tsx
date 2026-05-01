'use client'

import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function LogoutButton() {
  const router = useRouter()

  async function logout() {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' })
    router.push('/backoffice/login')
  }

  return (
    <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-800 underline">
      Sair
    </button>
  )
}

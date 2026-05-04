'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import logo from '@/assets/images/quero-preco-logo.png'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const EMAIL_PROVIDERS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br']

function BgIcons() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      <svg className="absolute -top-6 -left-6 w-64 h-64 text-blue-100 opacity-70" viewBox="0 0 100 100" fill="none">
        <path d="M20 10h30a4 4 0 0 1 3 1.3l28 28a4 4 0 0 1 0 5.7L56 69.3a4 4 0 0 1-5.7 0l-28-28A4 4 0 0 1 21 38V14a4 4 0 0 1 4-4h-5Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
        <circle cx="34" cy="26" r="4" stroke="currentColor" strokeWidth="2.5"/>
      </svg>
      <svg className="absolute top-12 -right-10 w-56 h-56 text-emerald-100 opacity-80" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="3"/>
        <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3"/>
        <text x="50" y="57" textAnchor="middle" fontSize="22" fontWeight="700" fontFamily="sans-serif" fill="currentColor">R$</text>
      </svg>
      <svg className="absolute bottom-16 -left-4 w-48 h-48 text-gray-200 opacity-90" viewBox="0 0 100 60" fill="none">
        {[6,10,14,17,22,26,30,35,39,43,47,52,56,60,64,68,73,77,81,85,90,94].map((x, i) => (
          <rect key={i} x={x} y="8" width={i % 3 === 0 ? 2.5 : 1.5} height="36" fill="currentColor"/>
        ))}
        <text x="50" y="56" textAnchor="middle" fontSize="7" fontFamily="monospace" fill="currentColor" letterSpacing="2">0 48932 01234 5</text>
      </svg>
      <svg className="absolute -bottom-8 -right-8 w-72 h-72 text-blue-100 opacity-60" viewBox="0 0 100 100" fill="none">
        <path d="M15 20h10l10 38h35l8-26H30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="42" cy="66" r="5" stroke="currentColor" strokeWidth="2.5"/>
        <circle cx="62" cy="66" r="5" stroke="currentColor" strokeWidth="2.5"/>
      </svg>
      <svg className="absolute top-1/2 -translate-y-1/2 -left-8 w-48 h-48 text-yellow-100 opacity-80" viewBox="0 0 100 100" fill="none">
        <text x="50" y="72" textAnchor="middle" fontSize="80" fontWeight="900" fontFamily="sans-serif" fill="currentColor">%</text>
      </svg>
      <svg className="absolute top-8 right-1/4 w-32 h-32 text-gray-200 opacity-70" viewBox="0 0 60 80" fill="none">
        <path d="M8 4h44v72L44 68l-8 8-8-8-8 8-8-8-4 8V4Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
        <line x1="16" y1="22" x2="44" y2="22" stroke="currentColor" strokeWidth="2"/>
        <line x1="16" y1="32" x2="44" y2="32" stroke="currentColor" strokeWidth="2"/>
        <line x1="16" y1="42" x2="32" y2="42" stroke="currentColor" strokeWidth="2"/>
        <line x1="34" y1="42" x2="44" y2="42" stroke="currentColor" strokeWidth="2"/>
        <line x1="16" y1="52" x2="28" y2="52" stroke="currentColor" strokeWidth="2"/>
        <line x1="32" y1="52" x2="44" y2="52" stroke="currentColor" strokeWidth="3"/>
      </svg>
      <svg className="absolute bottom-8 left-1/4 w-36 h-36 text-emerald-100 opacity-70" viewBox="0 0 80 80" fill="none">
        <ellipse cx="40" cy="60" rx="26" ry="8" stroke="currentColor" strokeWidth="2.5"/>
        <ellipse cx="40" cy="50" rx="26" ry="8" stroke="currentColor" strokeWidth="2.5"/>
        <ellipse cx="40" cy="40" rx="26" ry="8" stroke="currentColor" strokeWidth="2.5"/>
        <line x1="14" y1="40" x2="14" y2="60" stroke="currentColor" strokeWidth="2.5"/>
        <line x1="66" y1="40" x2="66" y2="60" stroke="currentColor" strokeWidth="2.5"/>
      </svg>
      <svg className="absolute top-6 left-1/3 w-28 h-28 text-blue-100 opacity-60" viewBox="0 0 80 80" fill="none">
        <rect x="12" y="28" width="56" height="44" rx="4" stroke="currentColor" strokeWidth="2.5"/>
        <path d="M28 28c0-8.8 7.2-16 16-16s16 7.2 16 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const atIndex = email.indexOf('@')
  const domainTyped = atIndex >= 0 ? email.slice(atIndex + 1) : null
  const suggestions =
    domainTyped !== null
      ? EMAIL_PROVIDERS.filter((p) => p.startsWith(domainTyped) && p !== domainTyped)
      : []

  function pickSuggestion(domain: string) {
    setEmail(email.slice(0, atIndex + 1) + domain)
    setActiveIdx(-1)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!suggestions.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      pickSuggestion(suggestions[activeIdx])
    } else if (e.key === 'Escape') {
      setActiveIdx(-1)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erro ao fazer login')
        return
      }
      window.location.href = '/backoffice/reading'
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-50">
      <BgIcons />
      <div className="relative z-10 w-full max-w-sm px-4">
        <div className="flex justify-center mb-8">
          <Image src={logo} alt="Quero Preço" width={96} />
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h1 className="text-xs font-bold text-gray-400 tracking-[0.25em] uppercase text-center mb-7">
            Login Backoffice
          </h1>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                E-mail
              </label>
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setActiveIdx(-1) }}
                onKeyDown={handleKeyDown}
                required
                autoComplete="off"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              {suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
                  {suggestions.map((s, i) => (
                    <li key={s}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s) }}
                        className={`w-full text-left px-3 py-2 text-sm transition ${
                          i === activeIdx ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-gray-400">{email.slice(0, atIndex + 1)}</span>
                        <span className="font-medium">{s.slice(domainTyped!.length)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition shadow-md shadow-blue-200/60"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

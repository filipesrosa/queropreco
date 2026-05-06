'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SearchHero() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q.length < 2) return
    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <svg className="w-5 h-5 text-ink/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="O que quer comprar hoje?"
        className="w-full bg-neutral border border-ink/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-brand/40 focus:bg-white transition-all"
      />
    </form>
  )
}

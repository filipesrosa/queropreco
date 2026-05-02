'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function extractAccessKey(raw: string): string | null {
  const m = raw.match(/(?:chave=|p=|chNFe=)(\d{44})/)
  if (m) return m[1]
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 44) return digits
  return null
}

type Status = 'idle' | 'loading' | 'success' | 'error' | 'invalid'

interface GoalData {
  target: number | null
  current: number
  goalPercent: number | null
  weekStart: string
}

function ProgressBar({ percent }: { percent: number }) {
  if (percent > 100) {
    const overflowPercent = Math.min(percent - 100, 100)
    return (
      <div className="flex flex-col gap-1">
        <div className="w-full bg-green-100 rounded-full h-3">
          <div className="h-3 w-full rounded-full bg-green-500" />
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="h-2 rounded-full bg-green-700 transition-all duration-300" style={{ width: `${overflowPercent}%` }} />
        </div>
      </div>
    )
  }
  const color = percent >= 100 ? 'bg-green-500' : percent >= 60 ? 'bg-blue-500' : 'bg-yellow-400'
  return (
    <div className="w-full bg-gray-100 rounded-full h-3">
      <div className={`h-3 rounded-full transition-all duration-300 ${color}`} style={{ width: `${percent}%` }} />
    </div>
  )
}

export default function UsbReaderPage() {
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [count, setCount] = useState(0)
  const [goal, setGoal] = useState<GoalData | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    fetch(`${API}/backoffice/my-goal`, { credentials: 'include' })
      .then((r) => r.json())
      .then(setGoal)
      .catch(() => {})
  }, [])

  async function submit(raw: string) {
    const accessKey = extractAccessKey(raw.trim())
    if (!accessKey) {
      setStatus('invalid')
      setMessage('QR Code sem chave de acesso válida')
      setValue('')
      setTimeout(() => { setStatus('idle'); inputRef.current?.focus() }, 2000)
      return
    }

    setStatus('loading')
    try {
      const res = await fetch(`${API}/backoffice/readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accessKey }),
      })
      if (res.ok) {
        setStatus('success')
        setMessage('Cupom registrado!')
        setCount((c) => c + 1)
        setGoal((g) => g ? { ...g, current: g.current + 1, goalPercent: g.target ? Math.round(((g.current + 1) / g.target) * 100) : null } : g)
      } else {
        const data = await res.json()
        setStatus('error')
        setMessage(data.error ?? 'Erro ao registrar')
      }
    } catch {
      setStatus('error')
      setMessage('Erro de conexão')
    } finally {
      setValue('')
      setTimeout(() => { setStatus('idle'); inputRef.current?.focus() }, 2000)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (value.trim()) submit(value)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/backoffice/reading"
          className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm font-medium">
          ← Voltar
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Leitor USB</h1>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Leituras nesta sessão</p>
            <p className="text-4xl font-bold text-blue-600 mt-1">{count}</p>
          </div>
          {goal?.target != null && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Meta semanal</p>
              <p className="text-4xl font-bold text-gray-800 mt-1">
                {goal.current}
                <span className="text-lg font-normal text-gray-400"> / {goal.target}</span>
                {goal.current > goal.target && (
                  <span className="ml-1 text-base font-semibold text-green-600">(+{goal.current - goal.target})</span>
                )}
              </p>
            </div>
          )}
        </div>

        {goal?.target != null && goal.goalPercent != null && (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>Progresso semanal</span>
              <span className={`font-semibold ${goal.goalPercent >= 100 ? 'text-green-600' : 'text-gray-700'}`}>
                {goal.goalPercent}%
                {goal.goalPercent >= 100 && ' ✓'}
                {goal.goalPercent > 100 && ' além da meta'}
              </span>
            </div>
            <ProgressBar percent={goal.goalPercent} />
          </div>
        )}
      </div>

      {/* Scanner input */}
      <div className="bg-white rounded-xl border-2 border-dashed border-blue-300 p-6 flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
          <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75V16.5ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
          </svg>
        </div>

        <div className="text-center">
          <p className="font-medium text-gray-800">Aponte o leitor para o QR Code</p>
          <p className="text-sm text-gray-400 mt-1">O campo abaixo deve estar selecionado</p>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => inputRef.current?.focus(), 100)}
          placeholder="Aguardando leitura..."
          className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-center placeholder:text-gray-300"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      {/* Feedback */}
      {status === 'loading' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="text-blue-700 text-sm font-medium">Registrando...</span>
        </div>
      )}
      {status === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm font-medium">
          ✓ {message}
        </div>
      )}
      {(status === 'error' || status === 'invalid') && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">
          {message}
        </div>
      )}
    </div>
  )
}

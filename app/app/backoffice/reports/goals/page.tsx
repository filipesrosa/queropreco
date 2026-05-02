'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Goal {
  id: string
  userId: string
  entityId: string
  weekStart: string
  target: number
  current: number
  goalPercent: number
  notifiedAt: string | null
  user: { name: string; cpf: string }
}

interface Reader {
  id: string
  name: string
  cpf: string
  role: string
}

function ProgressBar({ percent }: { percent: number }) {
  const capped = Math.min(percent, 100)
  const color = percent >= 100 ? 'bg-green-500' : percent >= 60 ? 'bg-blue-500' : 'bg-yellow-400'
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${capped}%` }} />
    </div>
  )
}

function mondayISO(offset = 0): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff + offset * 7)
  return d.toISOString().slice(0, 10)
}

const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [readers, setReaders] = useState<Reader[]>([])
  const [weekStart, setWeekStart] = useState(mondayISO(0))
  const [loading, setLoading] = useState(true)
  const [newUserId, setNewUserId] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  function loadGoals() {
    setLoading(true)
    fetch(`${API}/backoffice/goals?${new URLSearchParams({ weekStart })}`, { credentials: 'include' })
      .then((r) => r.json())
      .then(setGoals)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch(`${API}/users`, { credentials: 'include' })
      .then((r) => r.json())
      .then((users) => setReaders(users.filter((u: Reader) => u.role === 'READER')))
      .catch(() => {})
  }, [])

  useEffect(() => { loadGoals() }, [weekStart])

  async function createGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!newUserId || !newTarget) return
    setSaving(true)
    try {
      await fetch(`${API}/backoffice/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: newUserId, weekStart, target: Number(newTarget) }),
      })
      setNewUserId(''); setNewTarget(''); loadGoals()
    } finally { setSaving(false) }
  }

  async function updateGoal(id: string) {
    if (!editTarget) return
    setEditSaving(true)
    try {
      await fetch(`${API}/backoffice/goals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ target: Number(editTarget) }),
      })
      setEditId(null); loadGoals()
    } finally { setEditSaving(false) }
  }

  const goalsSet = new Set(goals.map((g) => g.userId))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/backoffice/reports"
          className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm font-medium">
          ← Relatórios
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Metas Semanais</h1>
      </div>

      {/* Week selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
        <button onClick={() => setWeekStart(mondayISO(-1))}
          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium text-sm">
          ←
        </button>
        <span className="flex-1 text-sm text-gray-700 text-center font-medium">Semana de {weekStart}</span>
        <button onClick={() => setWeekStart(mondayISO(1))}
          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium text-sm">
          →
        </button>
        <button onClick={() => setWeekStart(mondayISO(0))}
          className="px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 font-medium text-sm">
          Hoje
        </button>
      </div>

      {/* New goal form */}
      <form onSubmit={createGoal} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
        <h2 className="font-medium text-gray-800 text-sm">Adicionar meta</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Leitor</label>
            <select value={newUserId} onChange={(e) => setNewUserId(e.target.value)} className={inputCls}>
              <option value="">Selecionar leitor...</option>
              {readers.filter((r) => !goalsSet.has(r.id)).map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.cpf})</option>
              ))}
            </select>
          </div>
          <div className="sm:w-36">
            <label className="block text-xs text-gray-500 mb-1">Meta (leituras)</label>
            <input type="number" min="1" value={newTarget} onChange={(e) => setNewTarget(e.target.value)}
              placeholder="ex: 50" className={inputCls} />
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Salvando...' : 'Adicionar'}
        </button>
      </form>

      {/* Goals list */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : goals.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">Nenhuma meta definida para esta semana.</p>
        ) : (
          goals.map((g) => (
            <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{g.user.name}</p>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">{g.user.cpf}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-blue-700">{g.current}</p>
                  <p className="text-xs text-gray-400">de {g.target}</p>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>{g.goalPercent}%</span>
                  {g.notifiedAt && <span className="text-green-600 font-medium">✓ Meta atingida</span>}
                </div>
                <ProgressBar percent={g.goalPercent} />
              </div>

              {editId === g.id ? (
                <div className="flex flex-col gap-2">
                  <input type="number" min="1" value={editTarget}
                    onChange={(e) => setEditTarget(e.target.value)}
                    placeholder="Nova meta"
                    className={inputCls} />
                  <div className="flex gap-2">
                    <button onClick={() => updateGoal(g.id)} disabled={editSaving}
                      className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium text-sm">
                      {editSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-medium text-sm">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setEditId(g.id); setEditTarget(String(g.target)) }}
                  className="w-full py-2.5 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 font-medium text-sm">
                  Editar meta
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

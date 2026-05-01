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

  function loadGoals() {
    setLoading(true)
    const params = new URLSearchParams({ weekStart })
    fetch(`${API}/backoffice/goals?${params}`, { credentials: 'include' })
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
      setNewUserId('')
      setNewTarget('')
      loadGoals()
    } finally {
      setSaving(false)
    }
  }

  async function updateGoal(id: string) {
    if (!editTarget) return
    await fetch(`${API}/backoffice/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ target: Number(editTarget) }),
    })
    setEditId(null)
    loadGoals()
  }

  const goalsSet = new Set(goals.map((g) => g.userId))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/backoffice/reports" className="text-gray-500 hover:text-gray-800">← Relatórios</Link>
        <h1 className="text-xl font-semibold text-gray-900">Metas Semanais</h1>
      </div>

      {/* Week selector */}
      <div className="flex gap-2 items-center">
        <button onClick={() => setWeekStart(mondayISO(-1))} className="px-2 py-1 border rounded text-sm">←</button>
        <span className="text-sm text-gray-700 min-w-[120px] text-center">Semana de {weekStart}</span>
        <button onClick={() => setWeekStart(mondayISO(1))} className="px-2 py-1 border rounded text-sm">→</button>
        <button onClick={() => setWeekStart(mondayISO(0))} className="text-xs text-blue-600 underline ml-2">Hoje</button>
      </div>

      {/* New goal form */}
      <form onSubmit={createGoal} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Leitor</label>
          <select value={newUserId} onChange={(e) => setNewUserId(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
            <option value="">Selecionar leitor...</option>
            {readers.filter((r) => !goalsSet.has(r.id)).map((r) => (
              <option key={r.id} value={r.id}>{r.name} ({r.cpf})</option>
            ))}
          </select>
        </div>
        <div className="w-28">
          <label className="block text-xs text-gray-500 mb-1">Meta (leituras)</label>
          <input type="number" min="1" value={newTarget} onChange={(e) => setNewTarget(e.target.value)}
            placeholder="ex: 50"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
        </div>
        <button type="submit" disabled={saving}
          className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50">
          {saving ? '...' : 'Adicionar'}
        </button>
      </form>

      {/* Goals list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Carregando...</p>
        ) : goals.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">Nenhuma meta definida para esta semana.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs">
              <tr>
                <th className="text-left px-4 py-2">Leitor</th>
                <th className="text-right px-4 py-2">Realizadas</th>
                <th className="text-right px-4 py-2">Meta</th>
                <th className="text-left px-4 py-2 w-40">Progresso</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {goals.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{g.user.name}</div>
                    <div className="text-xs text-gray-400">{g.user.cpf}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-700">{g.current}</td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {editId === g.id ? (
                      <input
                        type="number" min="1" value={editTarget}
                        onChange={(e) => setEditTarget(e.target.value)}
                        className="w-16 border border-blue-400 rounded px-1 py-0.5 text-sm text-right"
                      />
                    ) : (
                      g.target
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-500">
                      {g.goalPercent}%
                      {g.notifiedAt && <span className="ml-2 text-green-600">✓ Meta atingida</span>}
                    </div>
                    <ProgressBar percent={g.goalPercent} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editId === g.id ? (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => updateGoal(g.id)}
                          className="text-xs text-blue-600 hover:underline">Salvar</button>
                        <button onClick={() => setEditId(null)}
                          className="text-xs text-gray-400 hover:underline">Cancelar</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditId(g.id); setEditTarget(String(g.target)) }}
                        className="text-xs text-gray-500 hover:text-gray-800 underline">
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

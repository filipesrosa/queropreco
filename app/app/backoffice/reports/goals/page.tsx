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
  recurring: boolean
  inherited: boolean
  user: { name: string; cpf: string }
}

interface Reader {
  id: string
  name: string
  cpf: string
  role: string
}

function getUser() {
  if (typeof document === 'undefined') return null
  try {
    const raw = document.cookie.split('; ').find((c) => c.startsWith('qp_user='))?.split('=')[1]
    return raw ? JSON.parse(decodeURIComponent(raw)) : null
  } catch { return null }
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

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div className="relative">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className="w-8 h-5 bg-gray-200 rounded-full peer-checked:bg-blue-600 transition-colors" />
        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-3" />
      </div>
      <span className="text-xs text-gray-600">{label}</span>
    </label>
  )
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [readers, setReaders] = useState<Reader[]>([])
  const [weekStart, setWeekStart] = useState(mondayISO(0))
  const [loading, setLoading] = useState(true)
  const [newUserId, setNewUserId] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newRecurring, setNewRecurring] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState('')
  const [editRecurring, setEditRecurring] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [weekDays, setWeekDays] = useState<number | null>(null)
  const [weekDaysSaving, setWeekDaysSaving] = useState(false)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const u = getUser()
    setRole(u?.role ?? null)
  }, [])

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

  useEffect(() => {
    fetch(`${API}/backoffice/entity-config`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setWeekDays(d.weekDays) })
      .catch(() => {})
  }, [])

  useEffect(() => { loadGoals() }, [weekStart])

  async function saveWeekDays(value: number) {
    setWeekDaysSaving(true)
    try {
      await fetch(`${API}/backoffice/entity-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ weekDays: value }),
      })
      setWeekDays(value)
      loadGoals()
    } finally { setWeekDaysSaving(false) }
  }

  async function createGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!newUserId || !newTarget) return
    setSaving(true)
    try {
      await fetch(`${API}/backoffice/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: newUserId, weekStart, target: Number(newTarget), recurring: newRecurring }),
      })
      setNewUserId(''); setNewTarget(''); setNewRecurring(false); loadGoals()
    } finally { setSaving(false) }
  }

  async function updateGoal(g: Goal) {
    if (!editTarget) return
    setEditSaving(true)
    try {
      if (g.inherited) {
        // Create explicit goal for this week
        await fetch(`${API}/backoffice/goals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId: g.userId, weekStart, target: Number(editTarget), recurring: editRecurring }),
        })
      } else {
        await fetch(`${API}/backoffice/goals/${g.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ target: Number(editTarget), recurring: editRecurring }),
        })
      }
      setEditId(null); loadGoals()
    } finally { setEditSaving(false) }
  }

  function startEdit(g: Goal) {
    setEditId(g.inherited ? `inherited:${g.userId}` : g.id)
    setEditTarget(String(g.target))
    setEditRecurring(g.recurring)
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

      {/* Week days config (ENTITY_ADMIN or ADMIN) */}
      {weekDays !== null && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-500 font-medium">Dias contabilizados por semana</p>
            <p className="text-xs text-gray-400 mt-0.5">Leituras fora do período não contam para a meta</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={weekDays}
              onChange={(e) => saveWeekDays(Number(e.target.value))}
              disabled={weekDaysSaving}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value={5}>5 dias (Seg–Sex)</option>
              <option value={6}>6 dias (Seg–Sáb)</option>
              <option value={7}>7 dias (Seg–Dom)</option>
            </select>
            {weekDaysSaving && <span className="text-xs text-gray-400">Salvando...</span>}
          </div>
        </div>
      )}

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
        <Toggle checked={newRecurring} onChange={setNewRecurring} label="Aplicar às próximas semanas" />
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
          goals.map((g) => {
            const cardEditId = g.inherited ? `inherited:${g.userId}` : g.id
            return (
              <div key={`${g.userId}-${g.weekStart}`} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{g.user.name}</p>
                      {g.inherited && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Recorrente</span>
                      )}
                      {!g.inherited && g.recurring && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">↺ Recorrente</span>
                      )}
                    </div>
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

                {editId === cardEditId ? (
                  <div className="flex flex-col gap-2">
                    <input type="number" min="1" value={editTarget}
                      onChange={(e) => setEditTarget(e.target.value)}
                      placeholder="Nova meta"
                      className={inputCls} />
                    <Toggle checked={editRecurring} onChange={setEditRecurring} label="Aplicar às próximas semanas" />
                    <div className="flex gap-2">
                      <button onClick={() => updateGoal(g)} disabled={editSaving}
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
                  <button onClick={() => startEdit(g)}
                    className="w-full py-2.5 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 font-medium text-sm">
                    Editar meta
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

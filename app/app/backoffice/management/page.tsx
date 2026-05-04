'use client'

import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Entity {
  id: string; cnpj: string; name: string; address: string
  phone?: string; notificationPhone?: string; weekDays: number; active: boolean
}
interface User {
  id: string; name: string; cpf: string; email: string
  role: string; entityId: string | null; active: boolean
}

type Tab = 'entities' | 'users'

const MAX_LOGO = 1_048_576

const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)})${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)})${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)})${d.slice(2, 7)}-${d.slice(7)}`
}
const btnPrimary = 'bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50'
const btnSecondary = 'bg-gray-100 text-gray-600 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-gray-200'

export default function ManagementPage() {
  const [tab, setTab] = useState<Tab>('entities')
  const [entities, setEntities] = useState<Entity[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [eForm, setEForm] = useState({ cnpj: '', name: '', address: '', phone: '', notificationPhone: '', logo: '', weekDays: 7 })
  const [eEditing, setEEditing] = useState<string | null>(null)
  const [eSaving, setESaving] = useState(false)
  const [eError, setEError] = useState('')

  const [uForm, setUForm] = useState({ name: '', cpf: '', email: '', phone: '', password: '', role: 'READER', entityId: '' })
  const [uEditing, setUEditing] = useState<string | null>(null)
  const [uSaving, setUSaving] = useState(false)
  const [uError, setUError] = useState('')

  const [exportDate, setExportDate] = useState(new Date().toISOString().slice(0, 10))

  function loadAll() {
    setLoading(true)
    Promise.all([
      fetch(`${API}/entities`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`${API}/users`, { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([e, u]) => { setEntities(e); setUsers(u) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAll() }, [])

  function handleLogo(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_LOGO) { setEError('Logotipo excede 1MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setEForm((f) => ({ ...f, logo: dataUrl.split(',')[1] }))
    }
    reader.readAsDataURL(file)
  }

  async function saveEntity(e: React.FormEvent) {
    e.preventDefault(); setEError(''); setESaving(true)
    try {
      const method = eEditing ? 'PUT' : 'POST'
      const url = eEditing ? `${API}/entities/${eEditing}` : `${API}/entities`
      const res = await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(eForm) })
      if (!res.ok) { const d = await res.json(); setEError(d.error ?? 'Erro'); return }
      setEForm({ cnpj: '', name: '', address: '', phone: '', notificationPhone: '', logo: '', weekDays: 7 })
      setEEditing(null); loadAll()
    } finally { setESaving(false) }
  }

  async function toggleEntity(id: string, active: boolean) {
    await fetch(`${API}/entities/${id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !active }) })
    loadAll()
  }

  async function saveUser(e: React.FormEvent) {
    e.preventDefault(); setUError(''); setUSaving(true)
    try {
      const method = uEditing ? 'PUT' : 'POST'
      const url = uEditing ? `${API}/users/${uEditing}` : `${API}/users`
      const body: any = { ...uForm }
      if (uEditing && !body.password) delete body.password
      const res = await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); setUError(d.error ?? 'Erro'); return }
      setUForm({ name: '', cpf: '', email: '', phone: '', password: '', role: 'READER', entityId: '' })
      setUEditing(null); loadAll()
    } finally { setUSaving(false) }
  }

  async function toggleUser(id: string, active: boolean) {
    await fetch(`${API}/users/${id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !active }) })
    loadAll()
  }

  function exportNF(date: string) {
    const off = -new Date().getTimezoneOffset()
    const sign = off >= 0 ? '+' : '-'
    const h = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')
    const m = String(Math.abs(off) % 60).padStart(2, '0')
    window.open(`${API}/campo/export?date=${date}&timezone=${encodeURIComponent(`${sign}${h}:${m}`)}`, '_blank')
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-gray-900">Gestão</h1>

      {/* Export */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs text-gray-500 font-medium mb-3">Baixar Cupons Fiscais</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="date" value={exportDate} onChange={(e) => setExportDate(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={() => exportNF(exportDate)} className={btnPrimary}>
            Exportar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['entities', 'users'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {t === 'entities' ? 'Entidades' : 'Usuários'}
          </button>
        ))}
      </div>

      {/* Entities tab */}
      {tab === 'entities' && (
        <div className="flex flex-col gap-4">
          <form onSubmit={saveEntity} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
            <h2 className="font-medium text-gray-800">{eEditing ? 'Editar Entidade' : 'Nova Entidade'}</h2>
            {eError && <p className="text-red-600 text-sm">{eError}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[['CNPJ', 'cnpj'], ['Nome', 'name'], ['Endereço', 'address'], ['Telefone', 'phone']].map(([label, field]) => (
                <div key={field}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input value={(eForm as any)[field]} onChange={(e) => setEForm((f) => ({ ...f, [field]: e.target.value }))} className={inputCls} />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-500 mb-1">WhatsApp (notificações)</label>
                <input
                  value={eForm.notificationPhone}
                  onChange={(e) => setEForm((f) => ({ ...f, notificationPhone: maskPhone(e.target.value) }))}
                  placeholder="(00)00000-0000"
                  inputMode="numeric"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dias por semana</label>
                <select value={eForm.weekDays} onChange={(e) => setEForm((f) => ({ ...f, weekDays: Number(e.target.value) }))} className={inputCls}>
                  <option value={5}>5 dias (Seg–Sex)</option>
                  <option value={6}>6 dias (Seg–Sáb)</option>
                  <option value={7}>7 dias (Seg–Dom)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Logotipo (máx. 1MB)</label>
                <input type="file" accept="image/*" onChange={(e) => handleLogo(e.target.files?.[0])} className="text-sm" />
                {eForm.logo && <p className="text-xs text-green-600 mt-1">Logo carregado</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={eSaving} className={btnPrimary}>
                {eSaving ? 'Salvando...' : eEditing ? 'Salvar' : 'Criar'}
              </button>
              {eEditing && (
                <button type="button" onClick={() => { setEEditing(null); setEForm({ cnpj: '', name: '', address: '', phone: '', notificationPhone: '', logo: '', weekDays: 7 }) }}
                  className={btnSecondary}>
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {loading ? <p className="text-sm text-gray-500">Carregando...</p> : (
            <div className="flex flex-col gap-3">
              {entities.map((en) => (
                <div key={en.id} className={`bg-white rounded-xl border border-gray-200 p-4 ${!en.active ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{en.name}</p>
                      <p className="text-xs font-mono text-gray-500 mt-0.5">{en.cnpj}</p>
                      {en.notificationPhone && <p className="text-xs text-gray-500 mt-0.5">WhatsApp: {en.notificationPhone}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{en.weekDays ?? 7} dias/semana</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${en.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {en.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEEditing(en.id); setEForm({ cnpj: en.cnpj, name: en.name, address: en.address, phone: en.phone ?? '', notificationPhone: en.notificationPhone ?? '', logo: '', weekDays: en.weekDays ?? 7 }) }}
                      className="flex-1 py-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 font-medium text-sm">
                      Editar
                    </button>
                    <button onClick={() => toggleEntity(en.id, en.active)}
                      className="flex-1 py-2.5 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 font-medium text-sm">
                      {en.active ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <div className="flex flex-col gap-4">
          <form onSubmit={saveUser} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
            <h2 className="font-medium text-gray-800">{uEditing ? 'Editar Usuário' : 'Novo Usuário'}</h2>
            {uError && <p className="text-red-600 text-sm">{uError}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[['Nome', 'name'], ['CPF', 'cpf'], ['E-mail', 'email'], ['Telefone', 'phone']].map(([label, field]) => (
                <div key={field}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input value={(uForm as any)[field]} onChange={(e) => setUForm((f) => ({ ...f, [field]: e.target.value }))} className={inputCls} />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Senha {uEditing && '(deixe vazio para manter)'}</label>
                <input type="password" value={uForm.password} onChange={(e) => setUForm((f) => ({ ...f, password: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nível de acesso</label>
                <select value={uForm.role} onChange={(e) => setUForm((f) => ({ ...f, role: e.target.value }))} className={inputCls}>
                  <option value="READER">Leitor (R)</option>
                  <option value="ENTITY_ADMIN">Admin de Entidade (EA)</option>
                  <option value="ADMIN">Admin do Sistema (A)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Entidade</label>
                <select value={uForm.entityId} onChange={(e) => setUForm((f) => ({ ...f, entityId: e.target.value }))} className={inputCls}>
                  <option value="">Nenhuma</option>
                  {entities.filter((e) => e.active).map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={uSaving} className={btnPrimary}>
                {uSaving ? 'Salvando...' : uEditing ? 'Salvar' : 'Criar'}
              </button>
              {uEditing && (
                <button type="button" onClick={() => { setUEditing(null); setUForm({ name: '', cpf: '', email: '', phone: '', password: '', role: 'READER', entityId: '' }) }}
                  className={btnSecondary}>
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {loading ? <p className="text-sm text-gray-500">Carregando...</p> : (
            <div className="flex flex-col gap-3">
              {users.map((u) => {
                const entity = entities.find((e) => e.id === u.entityId)
                return (
                  <div key={u.id} className={`bg-white rounded-xl border border-gray-200 p-4 ${!u.active ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                        {entity && <p className="text-xs text-gray-400 mt-0.5">{entity.name}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">{u.role}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${u.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {u.active ? 'Ativo' : 'Bloqueado'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setUEditing(u.id); setUForm({ name: u.name, cpf: u.cpf, email: u.email, phone: '', password: '', role: u.role, entityId: u.entityId ?? '' }) }}
                        className="flex-1 py-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 font-medium text-sm">
                        Editar
                      </button>
                      <button onClick={() => toggleUser(u.id, u.active)}
                        className="flex-1 py-2.5 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 font-medium text-sm">
                        {u.active ? 'Bloquear' : 'Desbloquear'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

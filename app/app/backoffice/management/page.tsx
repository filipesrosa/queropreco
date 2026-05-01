'use client'

import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Entity {
  id: string; cnpj: string; name: string; address: string
  phone?: string; notificationPhone?: string; active: boolean
}
interface User {
  id: string; name: string; cpf: string; email: string
  role: string; entityId: string | null; active: boolean
}

type Tab = 'entities' | 'users'

const MAX_LOGO = 1_048_576

export default function ManagementPage() {
  const [tab, setTab] = useState<Tab>('entities')
  const [entities, setEntities] = useState<Entity[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Entity form
  const [eForm, setEForm] = useState({ cnpj: '', name: '', address: '', phone: '', notificationPhone: '', logo: '' })
  const [eEditing, setEEditing] = useState<string | null>(null)
  const [eSaving, setESaving] = useState(false)
  const [eError, setEError] = useState('')

  // User form
  const [uForm, setUForm] = useState({ name: '', cpf: '', email: '', phone: '', password: '', role: 'READER', entityId: '' })
  const [uEditing, setUEditing] = useState<string | null>(null)
  const [uSaving, setUSaving] = useState(false)
  const [uError, setUError] = useState('')

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

  // Logo upload handler
  function handleLogo(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_LOGO) { setEError('Logotipo excede 1MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      const base64 = dataUrl.split(',')[1]
      setEForm((f) => ({ ...f, logo: base64 }))
    }
    reader.readAsDataURL(file)
  }

  async function saveEntity(e: React.FormEvent) {
    e.preventDefault(); setEError(''); setESaving(true)
    try {
      const method = eEditing ? 'PUT' : 'POST'
      const url = eEditing ? `${API}/entities/${eEditing}` : `${API}/entities`
      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eForm),
      })
      if (!res.ok) { const d = await res.json(); setEError(d.error ?? 'Erro'); return }
      setEForm({ cnpj: '', name: '', address: '', phone: '', notificationPhone: '', logo: '' })
      setEEditing(null); loadAll()
    } finally { setESaving(false) }
  }

  async function toggleEntity(id: string, active: boolean) {
    await fetch(`${API}/entities/${id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    loadAll()
  }

  async function saveUser(e: React.FormEvent) {
    e.preventDefault(); setUError(''); setUSaving(true)
    try {
      const method = uEditing ? 'PUT' : 'POST'
      const url = uEditing ? `${API}/users/${uEditing}` : `${API}/users`
      const body: any = { ...uForm }
      if (uEditing && !body.password) delete body.password
      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); setUError(d.error ?? 'Erro'); return }
      setUForm({ name: '', cpf: '', email: '', phone: '', password: '', role: 'READER', entityId: '' })
      setUEditing(null); loadAll()
    } finally { setUSaving(false) }
  }

  async function toggleUser(id: string, active: boolean) {
    await fetch(`${API}/users/${id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    loadAll()
  }

  async function exportNF(date: string) {
    const tz = (() => {
      const off = -new Date().getTimezoneOffset()
      const sign = off >= 0 ? '+' : '-'
      const h = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')
      const m = String(Math.abs(off) % 60).padStart(2, '0')
      return `${sign}${h}:${m}`
    })()
    const url = `${API}/campo/export?date=${date}&timezone=${encodeURIComponent(tz)}`
    window.open(url, '_blank')
  }

  const [exportDate, setExportDate] = useState(new Date().toISOString().slice(0, 10))

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-gray-900">Gestão</h1>

      {/* Export NF */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Baixar Cupons Fiscais</label>
          <input type="date" value={exportDate} onChange={(e) => setExportDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
        </div>
        <button onClick={() => exportNF(exportDate)}
          className="bg-gray-800 text-white rounded px-3 py-1.5 text-sm hover:bg-gray-900">
          Exportar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['entities', 'users'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
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
            <div className="grid grid-cols-2 gap-3">
              {[['CNPJ', 'cnpj'], ['Nome', 'name'], ['Endereço', 'address'], ['Telefone', 'phone'], ['WhatsApp (notificações)', 'notificationPhone']].map(([label, field]) => (
                <div key={field}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input value={(eForm as any)[field]} onChange={(e) => setEForm((f) => ({ ...f, [field]: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Logotipo (máx. 1MB)</label>
                <input type="file" accept="image/*" onChange={(e) => handleLogo(e.target.files?.[0])}
                  className="text-sm" />
                {eForm.logo && <p className="text-xs text-green-600 mt-1">Logo carregado</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={eSaving}
                className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50">
                {eSaving ? '...' : eEditing ? 'Salvar' : 'Criar'}
              </button>
              {eEditing && (
                <button type="button" onClick={() => { setEEditing(null); setEForm({ cnpj: '', name: '', address: '', phone: '', notificationPhone: '', logo: '' }) }}
                  className="text-sm text-gray-500 hover:text-gray-800">Cancelar</button>
              )}
            </div>
          </form>

          {loading ? <p className="text-sm text-gray-500">Carregando...</p> : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-2">Nome</th>
                    <th className="text-left px-4 py-2">CNPJ</th>
                    <th className="text-left px-4 py-2">WhatsApp</th>
                    <th className="text-center px-4 py-2">Status</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entities.map((en) => (
                    <tr key={en.id} className={en.active ? '' : 'opacity-50'}>
                      <td className="px-4 py-3 font-medium text-gray-900">{en.name}</td>
                      <td className="px-4 py-3 font-mono text-gray-600">{en.cnpj}</td>
                      <td className="px-4 py-3 text-gray-600">{en.notificationPhone ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${en.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {en.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setEEditing(en.id); setEForm({ cnpj: en.cnpj, name: en.name, address: en.address, phone: en.phone ?? '', notificationPhone: en.notificationPhone ?? '', logo: '' }) }}
                          className="text-xs text-blue-600 underline mr-3">Editar</button>
                        <button onClick={() => toggleEntity(en.id, en.active)}
                          className="text-xs text-gray-500 underline">
                          {en.active ? 'Desativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <div className="grid grid-cols-2 gap-3">
              {[['Nome', 'name'], ['CPF', 'cpf'], ['E-mail', 'email'], ['Telefone', 'phone']].map(([label, field]) => (
                <div key={field}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input value={(uForm as any)[field]} onChange={(e) => setUForm((f) => ({ ...f, [field]: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Senha {uEditing && '(deixe vazio para manter)'}</label>
                <input type="password" value={uForm.password} onChange={(e) => setUForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nível de acesso</label>
                <select value={uForm.role} onChange={(e) => setUForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                  <option value="READER">Leitor (R)</option>
                  <option value="ENTITY_ADMIN">Admin de Entidade (EA)</option>
                  <option value="ADMIN">Admin do Sistema (A)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Entidade</label>
                <select value={uForm.entityId} onChange={(e) => setUForm((f) => ({ ...f, entityId: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                  <option value="">Nenhuma</option>
                  {entities.filter((e) => e.active).map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={uSaving}
                className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50">
                {uSaving ? '...' : uEditing ? 'Salvar' : 'Criar'}
              </button>
              {uEditing && (
                <button type="button" onClick={() => { setUEditing(null); setUForm({ name: '', cpf: '', email: '', phone: '', password: '', role: 'READER', entityId: '' }) }}
                  className="text-sm text-gray-500 hover:text-gray-800">Cancelar</button>
              )}
            </div>
          </form>

          {loading ? <p className="text-sm text-gray-500">Carregando...</p> : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-2">Nome</th>
                    <th className="text-left px-4 py-2">E-mail</th>
                    <th className="text-left px-4 py-2">Acesso</th>
                    <th className="text-left px-4 py-2">Entidade</th>
                    <th className="text-center px-4 py-2">Status</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => {
                    const entity = entities.find((e) => e.id === u.entityId)
                    return (
                      <tr key={u.id} className={u.active ? '' : 'opacity-50'}>
                        <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                        <td className="px-4 py-3 text-gray-600">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{u.role}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{entity?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${u.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {u.active ? 'Ativo' : 'Bloqueado'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => {
                            setUEditing(u.id)
                            setUForm({ name: u.name, cpf: u.cpf, email: u.email, phone: '', password: '', role: u.role, entityId: u.entityId ?? '' })
                          }} className="text-xs text-blue-600 underline mr-3">Editar</button>
                          <button onClick={() => toggleUser(u.id, u.active)}
                            className="text-xs text-gray-500 underline">
                            {u.active ? 'Bloquear' : 'Desbloquear'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface UnlinkedGroup {
  normalizedDescription: string
  sampleDescription: string
  occurrences: number
  lastSeenAt: string
}

interface ProductMapping {
  id: string
  normalizedDescription: string
  createdAt: string
}

interface Product {
  id: string
  name: string
  mappingCount: number
  mappings: ProductMapping[]
  createdAt: string
}

type Tab = 'unlinked' | 'products'

type ActiveRow = {
  key: string
  mode: 'create' | 'link'
  value: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 30) return `${days}d atrás`
  return `${Math.floor(days / 30)}m atrás`
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mb-4">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />
    </div>
  )
}

export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>('unlinked')
  const [unlinked, setUnlinked] = useState<UnlinkedGroup[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeRow, setActiveRow] = useState<ActiveRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ key: string; message: string } | null>(null)

  // Search state
  const [unlinkedSearch, setUnlinkedSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [mappingSearch, setMappingSearch] = useState<Record<string, string>>({})

  // Product rename state
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameSaving, setRenameSaving] = useState(false)
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)

  async function loadAll() {
    setLoading(true)
    try {
      const [uRes, pRes] = await Promise.all([
        fetch(`${API}/products/unlinked-groups`, { credentials: 'include' }),
        fetch(`${API}/products`, { credentials: 'include' }),
      ])
      const [u, p] = await Promise.all([uRes.json(), pRes.json()])
      setUnlinked(u.data ?? [])
      setProducts(p ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  async function handleLink(normalizedDescription: string, productId: string) {
    setSaving(true)
    try {
      const res = await fetch(`${API}/products/link`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ normalizedDescription, productId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro')
      setUnlinked((prev) => prev.filter((g) => g.normalizedDescription !== normalizedDescription))
      setFeedback({ key: normalizedDescription, message: `${data.mappedCount} ${data.mappedCount === 1 ? 'item vinculado' : 'itens vinculados'}` })
      setActiveRow(null)
      setTimeout(() => setFeedback(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function handleCreate(normalizedDescription: string, name: string) {
    if (!name.trim()) return
    setSaving(true)
    try {
      const createRes = await fetch(`${API}/products`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const product = await createRes.json()
      if (!createRes.ok) throw new Error(product.error ?? 'Erro ao criar produto')
      await handleLink(normalizedDescription, product.id)
      await loadAll()
    } finally {
      setSaving(false)
    }
  }

  async function handleRename(id: string, name: string) {
    if (!name.trim()) return
    setRenameSaving(true)
    try {
      const res = await fetch(`${API}/products/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) throw new Error('Erro ao renomear')
      setRenamingId(null)
      await loadAll()
    } finally {
      setRenameSaving(false)
    }
  }

  async function handleRemoveMapping(normalizedDescription: string) {
    await fetch(`${API}/products/link/${encodeURIComponent(normalizedDescription)}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    await loadAll()
  }

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
        tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  )

  const filteredUnlinked = unlinkedSearch.trim()
    ? unlinked.filter((g) =>
        g.normalizedDescription.includes(unlinkedSearch.toUpperCase()) ||
        g.sampleDescription.toLowerCase().includes(unlinkedSearch.toLowerCase())
      )
    : unlinked

  const filteredProducts = productSearch.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : products

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Produtos</h1>

      <div className="flex gap-2 mb-6">
        {tabBtn('unlinked', `Não vinculados${unlinked.length > 0 ? ` (${unlinked.length})` : ''}`)}
        {tabBtn('products', `Produtos (${products.length})`)}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'unlinked' ? (
        <div>
          <SearchInput value={unlinkedSearch} onChange={setUnlinkedSearch} placeholder="Buscar descrição não vinculada..." />
          <div className="space-y-3">
            {filteredUnlinked.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">
                {unlinkedSearch ? 'Nenhum resultado.' : 'Todos os itens estão vinculados.'}
              </p>
            ) : (
              filteredUnlinked.map((group) => (
                <div key={group.normalizedDescription} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex-1 min-w-0 mb-3">
                    <p className="font-mono text-sm font-medium text-gray-900 break-all">{group.normalizedDescription}</p>
                    {group.sampleDescription !== group.normalizedDescription && (
                      <p className="text-xs text-gray-400 mt-0.5">{group.sampleDescription}</p>
                    )}
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-gray-500">{group.occurrences} {group.occurrences === 1 ? 'ocorrência' : 'ocorrências'}</span>
                      <span className="text-xs text-gray-400">última: {timeAgo(group.lastSeenAt)}</span>
                    </div>
                  </div>

                  {feedback?.key === group.normalizedDescription && (
                    <p className="mb-3 text-sm text-emerald-600 font-medium">{feedback.message}</p>
                  )}

                  {activeRow?.key === group.normalizedDescription ? (
                    <div className="pt-3 border-t border-gray-100">
                      {activeRow.mode === 'create' ? (
                        <div className="flex flex-col gap-2">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Nome legível do produto..."
                            value={activeRow.value}
                            onChange={(e) => setActiveRow({ ...activeRow, value: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCreate(group.normalizedDescription, activeRow.value)
                              if (e.key === 'Escape') setActiveRow(null)
                            }}
                            className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCreate(group.normalizedDescription, activeRow.value)}
                              disabled={saving || !activeRow.value.trim()}
                              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
                            >
                              {saving ? 'Salvando...' : 'Criar e vincular'}
                            </button>
                            <button
                              onClick={() => setActiveRow(null)}
                              className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-medium text-sm"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <select
                            value={activeRow.value}
                            onChange={(e) => setActiveRow({ ...activeRow, value: e.target.value })}
                            className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Selecionar produto...</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={() => activeRow.value && handleLink(group.normalizedDescription, activeRow.value)}
                              disabled={saving || !activeRow.value}
                              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
                            >
                              {saving ? 'Salvando...' : 'Vincular'}
                            </button>
                            <button
                              onClick={() => setActiveRow(null)}
                              className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-medium text-sm"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveRow({ key: group.normalizedDescription, mode: 'create', value: '' })}
                        className="flex-1 py-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 font-medium text-sm"
                      >
                        Criar produto
                      </button>
                      <button
                        onClick={() => setActiveRow({ key: group.normalizedDescription, mode: 'link', value: products[0]?.id ?? '' })}
                        className="flex-1 py-2.5 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 font-medium text-sm"
                      >
                        Vincular existente
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div>
          <SearchInput value={productSearch} onChange={setProductSearch} placeholder="Buscar produto..." />
          <div className="space-y-3">
            {filteredProducts.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">
                {productSearch ? 'Nenhum resultado.' : 'Nenhum produto criado ainda.'}
              </p>
            ) : (
              filteredProducts.map((product) => (
                <div key={product.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  {renamingId === product.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(product.id, renameValue)
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRename(product.id, renameValue)}
                          disabled={renameSaving || !renameValue.trim()}
                          className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
                        >
                          {renameSaving ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => setRenamingId(null)}
                          className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-medium text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {product.mappingCount} {product.mappingCount === 1 ? 'descrição mapeada' : 'descrições mapeadas'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => { setRenamingId(product.id); setRenameValue(product.name) }}
                          className="flex-1 py-2.5 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 font-medium text-sm"
                        >
                          Renomear
                        </button>
                        {product.mappingCount > 0 && (
                          <button
                            onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                            className="flex-1 py-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 font-medium text-sm"
                          >
                            {expandedProduct === product.id ? 'Ocultar descrições' : 'Ver descrições'}
                          </button>
                        )}
                      </div>

                      {expandedProduct === product.id && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <SearchInput
                            value={mappingSearch[product.id] ?? ''}
                            onChange={(v) => setMappingSearch((prev) => ({ ...prev, [product.id]: v }))}
                            placeholder="Buscar descrição mapeada..."
                          />
                          <ul className="space-y-2">
                            {product.mappings
                              .filter((m) => {
                                const q = mappingSearch[product.id]?.trim()
                                return !q || m.normalizedDescription.includes(q.toUpperCase())
                              })
                              .map((m) => (
                                <li key={m.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                                  <span className="font-mono text-xs text-gray-600 break-all flex-1">{m.normalizedDescription}</span>
                                  <button
                                    onClick={() => handleRemoveMapping(m.normalizedDescription)}
                                    className="shrink-0 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium text-xs"
                                  >
                                    Remover
                                  </button>
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

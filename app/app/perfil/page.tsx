'use client'

import { usePreferences, type Interest } from '../hooks/usePreferences'
import { LocationChip } from '../components/LocationChip'

const INTERESTS: { id: Interest; label: string; emoji: string; description: string }[] = [
  { id: 'cesta-basica', label: 'Cesta Básica', emoji: '🛒', description: 'Arroz, feijão, farinha, macarrão, sal, açúcar' },
  { id: 'vegano', label: 'Vegano', emoji: '🌱', description: 'Produtos sem origem animal' },
  { id: 'sem-lactose', label: 'Sem Lactose', emoji: '🥛', description: 'Produtos sem laticínios' },
  { id: 'ofertas', label: 'Ofertas', emoji: '🏷️', description: 'Maiores economias do dia' },
]

export default function PerfilPage() {
  const { preferences, setInterests, setLocation } = usePreferences()

  function toggle(id: Interest) {
    const current = preferences.interests
    if (current.includes(id)) {
      setInterests(current.filter((i) => i !== id))
    } else {
      setInterests([...current, id])
    }
  }

  return (
    <main className="min-h-screen bg-neutral">
      <header className="bg-white px-6 pt-10 pb-5 border-b border-ink/6">
        <h1 className="text-xl font-bold text-ink">Perfil</h1>
        <p className="text-sm text-ink/40 mt-1">Suas preferências salvas neste dispositivo</p>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Location */}
        <section className="bg-white rounded-2xl p-5 border border-ink/6 shadow-sm">
          <p className="text-sm font-semibold text-ink mb-3">Localização</p>
          <LocationChip />
          {preferences.location && (
            <button
              onClick={() => setLocation(null)}
              className="mt-3 text-xs text-ink/40 hover:text-ink/60 transition-colors"
            >
              Remover localização
            </button>
          )}
        </section>

        {/* Interests */}
        <section className="bg-white rounded-2xl p-5 border border-ink/6 shadow-sm">
          <p className="text-sm font-semibold text-ink mb-1">Interesses</p>
          <p className="text-xs text-ink/40 mb-4">Personaliza sua tela inicial</p>
          <div className="space-y-3">
            {INTERESTS.map((item) => {
              const active = preferences.interests.includes(item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className={`flex items-center gap-3 w-full rounded-xl p-3 border transition-all text-left ${
                    active ? 'border-brand/30 bg-brand-light' : 'border-ink/8 bg-neutral hover:border-ink/20'
                  }`}
                >
                  <span className="text-xl">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${active ? 'text-brand-dark' : 'text-ink'}`}>{item.label}</p>
                    <p className="text-xs text-ink/40">{item.description}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? 'border-brand bg-brand' : 'border-ink/20'}`}>
                    {active && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Login placeholder */}
        <section className="bg-white rounded-2xl p-5 border border-ink/6 shadow-sm opacity-60">
          <p className="text-sm font-semibold text-ink mb-1">Conta</p>
          <p className="text-xs text-ink/40 mb-3">Sincronize suas preferências entre dispositivos</p>
          <div className="flex items-center gap-2 text-xs text-ink/30 bg-neutral rounded-xl px-4 py-3">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Login com Google — em breve
          </div>
        </section>
      </div>
    </main>
  )
}

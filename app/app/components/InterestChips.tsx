'use client'

import { usePreferences, type Interest } from '../hooks/usePreferences'

const INTERESTS: { id: Interest; label: string; emoji: string }[] = [
  { id: 'cesta-basica', label: 'Cesta Básica', emoji: '🛒' },
  { id: 'vegano', label: 'Vegano', emoji: '🌱' },
  { id: 'sem-lactose', label: 'Sem Lactose', emoji: '🥛' },
  { id: 'ofertas', label: 'Ofertas', emoji: '🏷️' },
]

export function InterestChips() {
  const { preferences, setInterests } = usePreferences()

  function toggle(id: Interest) {
    const current = preferences.interests
    if (current.includes(id)) {
      setInterests(current.filter((i) => i !== id))
    } else {
      setInterests([...current, id])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {INTERESTS.map((item) => {
        const active = preferences.interests.includes(item.id)
        return (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all ${
              active
                ? 'bg-brand text-white shadow-sm shadow-brand/20'
                : 'bg-white text-ink/60 border border-ink/10 hover:border-brand/30'
            }`}
          >
            <span>{item.emoji}</span>
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

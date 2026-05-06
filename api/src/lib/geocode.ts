const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'QueroPreco/1.0 (filipesrosa@gmail.com)'

function normalizeAddress(address: string): string {
  return address
    .replace(/\bR\.\s*/gi, 'Rua ')
    .replace(/\bAV\.?\s+/gi, 'Avenida ')
    .replace(/\bPÇA\.?\s*/gi, 'Praça ')
    .replace(/\bJD\.?\s*/gi, 'Jardim ')
    .replace(/\bVL\.?\s*/gi, 'Vila ')
    .replace(/\bCJ\.?\s*/gi, 'Conjunto ')
    .replace(/MOGI[- ]?GUACU/gi, 'Mogi Guaçu')
    .replace(/MOGI[- ]?MIRIM/gi, 'Mogi Mirim')
}

async function nominatimSearch(q: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=br`
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) return null
    const data = await res.json() as Array<{ lat: string; lon: string }>
    if (!data.length) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  // Try 1: normalized address
  const normalized = normalizeAddress(address)
  const r1 = await nominatimSearch(normalized)
  if (r1) return r1

  // Try 2: street + number + city only (strip neighborhood) — 1s gap for Nominatim ToS
  const parts = address.split(',').map((s) => s.trim())
  if (parts.length >= 4) {
    await delay(1100)
    const short = normalizeAddress(`${parts[0]}, ${parts[1]}, ${parts[parts.length - 2]}, ${parts[parts.length - 1]}, Brasil`)
    const r2 = await nominatimSearch(short)
    if (r2) return r2
  }

  return null
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) return null
    const data = await res.json() as { address?: { city?: string; town?: string; municipality?: string; village?: string; suburb?: string; neighbourhood?: string; state?: string } }
    const a = data.address
    if (!a) return null
    const city = a.city ?? a.town ?? a.municipality ?? a.village
    return city ?? a.suburb ?? a.neighbourhood ?? a.state ?? null
  } catch {
    return null
  }
}

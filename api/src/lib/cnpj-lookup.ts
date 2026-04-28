const BRASILAPI_UA = 'Mozilla/5.0 (compatible; queropreco/1.0)'

export interface CnpjInfo {
  name: string
  address: string
}

export async function lookupCnpj(cnpj: string): Promise<CnpjInfo | null> {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return null

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      headers: { 'User-Agent': BRASILAPI_UA },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null

    const data = (await res.json()) as Record<string, string | undefined>
    const name = (data['nome_fantasia']?.trim() || data['razao_social']?.trim()) ?? ''
    if (!name) return null

    const parts = [data['logradouro'], data['numero'], data['bairro'], data['municipio'], data['uf']]
      .map(s => s?.trim())
      .filter(Boolean)

    return { name, address: parts.join(', ') }
  } catch {
    return null
  }
}

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface BrasilApiCnpj {
  razao_social?: string
  nome_fantasia?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string
}

async function lookupCnpj(cnpj: string): Promise<{ name: string; address: string } | null> {
  const digits = cnpj.replace(/\D/g, '')
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; queropreco-backfill/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as BrasilApiCnpj

    const name = data.nome_fantasia?.trim() || data.razao_social?.trim() || ''
    const parts = [data.logradouro, data.numero, data.bairro, data.municipio, data.uf]
      .map(s => s?.trim())
      .filter(Boolean)
    const address = parts.join(', ')

    return name ? { name, address } : null
  } catch {
    return null
  }
}

async function main() {
  const establishments = await prisma.establishment.findMany({
    where: { name: '' },
    select: { id: true, cnpj: true },
  })

  console.log(`Encontrados ${establishments.length} estabelecimentos sem nome`)

  let updated = 0
  let failed = 0

  for (const est of establishments) {
    const result = await lookupCnpj(est.cnpj)

    if (!result) {
      console.log(`  SKIP  ${est.cnpj} — API não retornou nome`)
      failed++
      continue
    }

    await prisma.establishment.update({
      where: { id: est.id },
      data: { name: result.name, address: result.address },
    })

    console.log(`  OK    ${est.cnpj} → ${result.name}`)
    updated++

    // Respeitar rate limit da BrasilAPI
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\nConcluído: ${updated} atualizados, ${failed} falhas`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

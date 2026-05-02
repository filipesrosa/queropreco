import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { normalize } from '../lib/normalize.js'

async function fetchItemRows(q: string) {
  return prisma.item.findMany({
    where: { description: { contains: q, mode: 'insensitive' } },
    include: {
      product: { select: { name: true } },
      bill: {
        include: {
          establishment: true,
          invoice: { select: { issuedAt: true } },
        },
      },
    },
  })
}

function rowDate(row: Awaited<ReturnType<typeof fetchItemRows>>[0]) {
  return row.bill.invoice?.issuedAt ?? row.bill.createdAt
}

export async function itemsRoutes(app: FastifyInstance) {
  // GET /items/search?q= — search items, grouped by normalized description
  app.get<{ Querystring: { q?: string } }>('/items/search', async (request, reply) => {
    const q = (request.query.q ?? '').trim()
    if (q.length < 2) return reply.send({ data: [] })

    const rows = await fetchItemRows(q)

    type EstEntry = { name: string; cnpj: string; lastPrice: number; lastSeenAt: string }
    type Group = {
      key: string
      description: string
      productName: string | null
      occurrences: number
      minPrice: number
      maxPrice: number
      lastSeenAt: string
      estMap: Map<string, EstEntry>
    }

    const groups = new Map<string, Group>()

    for (const item of rows) {
      const key = normalize(item.description)
      const price = Number(item.unitPrice)
      const seenAt = rowDate(item).toISOString()

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          description: item.description,
          productName: item.product?.name ?? null,
          occurrences: 0,
          minPrice: price,
          maxPrice: price,
          lastSeenAt: seenAt,
          estMap: new Map(),
        })
      }

      const g = groups.get(key)!
      g.occurrences++
      if (price < g.minPrice) g.minPrice = price
      if (price > g.maxPrice) g.maxPrice = price
      if (!g.productName && item.product?.name) g.productName = item.product.name
      if (seenAt > g.lastSeenAt) {
        g.lastSeenAt = seenAt
        g.description = item.description
      }

      const est = item.bill.establishment
      const prev = g.estMap.get(est.cnpj)
      if (!prev || seenAt > prev.lastSeenAt) {
        g.estMap.set(est.cnpj, { name: est.name, cnpj: est.cnpj, lastPrice: price, lastSeenAt: seenAt })
      }
    }

    const data = Array.from(groups.values())
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
      .map(({ estMap, ...g }) => ({
        ...g,
        establishments: Array.from(estMap.values()).sort((a, b) => a.lastPrice - b.lastPrice),
      }))

    return reply.send({ data })
  })

  // GET /items/detail?key= — full history for a specific normalized description
  app.get<{ Querystring: { key?: string } }>('/items/detail', async (request, reply) => {
    const key = (request.query.key ?? '').trim()
    if (!key) return reply.send({ data: null })

    // Use first significant word to narrow DB query, then filter in JS
    const searchTerm = key.split(' ')[0]
    const rows = await fetchItemRows(searchTerm)
    const filtered = rows.filter((r) => normalize(r.description) === key)

    const history = filtered
      .map((item) => ({
        id: item.id,
        description: item.description,
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
        unit: item.unit,
        establishment: {
          name: item.bill.establishment.name,
          cnpj: item.bill.establishment.cnpj,
          address: item.bill.establishment.address,
        },
        issuedAt: rowDate(item).toISOString(),
      }))
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))

    // Latest price per establishment, sorted cheapest first
    const estMap = new Map<string, typeof history[0]>()
    for (const record of history) {
      const prev = estMap.get(record.establishment.cnpj)
      if (!prev || record.issuedAt > prev.issuedAt) {
        estMap.set(record.establishment.cnpj, record)
      }
    }
    const byEstablishment = Array.from(estMap.values()).sort((a, b) => a.unitPrice - b.unitPrice)

    return reply.send({
      data: {
        key,
        description: filtered[0]?.description ?? key,
        productName: filtered[0]?.product?.name ?? null,
        history,
        byEstablishment,
      },
    })
  })
}

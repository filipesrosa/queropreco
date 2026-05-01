import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

function normalize(desc: string) {
  return desc.toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim()
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

export async function compareRoutes(app: FastifyInstance) {
  app.get('/compare', async (_request, reply) => {
    const rows = await prisma.item.findMany({
      include: {
        bill: {
          include: {
            establishment: true,
            invoice: { select: { issuedAt: true } },
          },
        },
      },
    })

    type PriceEntry = { price: number; issuedAt: string; stale: boolean }
    type EstItemEntry = { key: string; description: string; price: number; issuedAt: string; stale: boolean }
    type EstData = { cnpj: string; name: string; address: string; lastVisit: string; seenKeys: Set<string> }

    const productMap = new Map<string, { description: string; estPrices: Map<string, PriceEntry> }>()
    const estMap = new Map<string, EstData>()
    const estItemsMap = new Map<string, Map<string, EstItemEntry>>()

    for (const item of rows) {
      const key = normalize(item.description)
      const cnpj = item.bill.establishment.cnpj
      const price = Number(item.unitPrice)
      const issuedAt = (item.bill.invoice?.issuedAt ?? item.bill.createdAt).toISOString()
      const est = item.bill.establishment
      const stale = daysSince(issuedAt) > 60

      if (!estMap.has(cnpj)) {
        estMap.set(cnpj, { cnpj, name: est.name, address: est.address, lastVisit: issuedAt, seenKeys: new Set() })
      }
      const estEntry = estMap.get(cnpj)!
      if (issuedAt > estEntry.lastVisit) estEntry.lastVisit = issuedAt
      estEntry.seenKeys.add(key)

      if (!productMap.has(key)) {
        productMap.set(key, { description: item.description, estPrices: new Map() })
      }
      const product = productMap.get(key)!
      const prev = product.estPrices.get(cnpj)
      if (!prev || issuedAt > prev.issuedAt) {
        product.estPrices.set(cnpj, { price, issuedAt, stale })
      }

      if (!estItemsMap.has(cnpj)) estItemsMap.set(cnpj, new Map())
      const estItems = estItemsMap.get(cnpj)!
      const prevItem = estItems.get(key)
      if (!prevItem || issuedAt > prevItem.issuedAt) {
        estItems.set(key, { key, description: item.description, price, issuedAt, stale })
      }
    }

    // Only products seen in 2+ establishments
    const products = []
    for (const [key, product] of productMap) {
      if (product.estPrices.size < 2) continue

      const pricesArr = Array.from(product.estPrices.entries())
        .map(([cnpj, entry]) => ({ cnpj, ...entry }))
        .sort((a, b) => a.price - b.price)

      const bestPrice = pricesArr[0].price
      const worstPrice = pricesArr[pricesArr.length - 1].price

      products.push({
        key,
        description: product.description,
        bestPrice,
        bestCnpj: pricesArr[0].cnpj,
        maxSavings: worstPrice - bestPrice,
        prices: Object.fromEntries(pricesArr.map(({ cnpj, ...rest }) => [cnpj, rest])),
      })
    }

    products.sort((a, b) => b.maxSavings - a.maxSavings)

    // Price index: avg(myPrice / bestPrice) per establishment across cross-store products
    const indexAcc = new Map<string, { sum: number; count: number }>()
    for (const product of products) {
      for (const [cnpj, entry] of Object.entries(product.prices)) {
        if (!indexAcc.has(cnpj)) indexAcc.set(cnpj, { sum: 0, count: 0 })
        const acc = indexAcc.get(cnpj)!
        acc.sum += entry.price / product.bestPrice
        acc.count++
      }
    }

    const establishments = Array.from(estMap.values())
      .map(({ seenKeys, ...est }) => {
        const idx = indexAcc.get(est.cnpj)
        const priceIndex = idx && idx.count > 0 ? idx.sum / idx.count : null
        const items = Array.from(estItemsMap.get(est.cnpj)?.values() ?? [])
          .sort((a, b) => a.description.localeCompare(b.description, 'pt-BR'))
        return { ...est, itemCount: seenKeys.size, priceIndex, items }
      })
      .sort((a, b) => (a.priceIndex ?? 999) - (b.priceIndex ?? 999))

    return reply.send({ establishments, products, totalProducts: productMap.size })
  })
}

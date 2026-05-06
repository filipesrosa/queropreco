import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { normalize } from '../lib/normalize.js'

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

export async function homeRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { limit?: string } }>('/home', async (request, reply) => {
    const limit = Math.min(Math.max(parseInt(request.query.limit ?? '6'), 1), 20)

    const [totalEstablishments, totalBills] = await Promise.all([
      prisma.establishment.count({ where: { bills: { some: {} } } }),
      prisma.bill.count(),
    ])

    // Top savings: products seen in 2+ establishments, sorted by price gap
    const items = await prisma.item.findMany({
      include: {
        bill: {
          include: {
            establishment: { select: { cnpj: true, name: true } },
            invoice: { select: { issuedAt: true } },
          },
        },
      },
    })

    type PriceEntry = { price: number; issuedAt: string }
    const productMap = new Map<string, { description: string; estPrices: Map<string, PriceEntry> }>()

    for (const item of items) {
      const key = item.productId ?? normalize(item.description)
      const cnpj = item.bill.establishment.cnpj
      const price = Number(item.unitPrice)
      const issuedAt = (item.bill.invoice?.issuedAt ?? item.bill.createdAt).toISOString()

      if (!productMap.has(key)) {
        productMap.set(key, { description: item.description, estPrices: new Map() })
      }
      const product = productMap.get(key)!
      const prev = product.estPrices.get(cnpj)
      if (!prev || issuedAt > prev.issuedAt) {
        product.estPrices.set(cnpj, { price, issuedAt })
      }
    }

    const cnpjToName = new Map<string, string>()
    for (const item of items) {
      cnpjToName.set(item.bill.establishment.cnpj, item.bill.establishment.name)
    }

    const topSavings = []
    for (const [key, product] of productMap) {
      if (product.estPrices.size < 2) continue
      const pricesArr = Array.from(product.estPrices.entries())
        .map(([cnpj, entry]) => ({ cnpj, ...entry }))
        .sort((a, b) => a.price - b.price)
      const bestPrice = pricesArr[0].price
      const worstPrice = pricesArr[pricesArr.length - 1].price
      topSavings.push({
        key,
        description: product.description,
        bestPrice,
        bestEstablishment: cnpjToName.get(pricesArr[0].cnpj) ?? pricesArr[0].cnpj,
        maxSavings: worstPrice - bestPrice,
        pricesCount: pricesArr.length,
      })
    }
    topSavings.sort((a, b) => b.maxSavings - a.maxSavings)

    // Recent items: last N bills captured, use invoice.issuedAt as the date
    const recentBillItems = await prisma.item.findMany({
      take: limit * 3,
      orderBy: { createdAt: 'desc' },
      select: {
        description: true,
        unitPrice: true,
        createdAt: true,
        bill: {
          select: {
            createdAt: true,
            establishment: { select: { name: true } },
            invoice: { select: { issuedAt: true } },
          },
        },
      },
    })

    const recentItems = recentBillItems.map((i) => ({
      description: i.description,
      price: Number(i.unitPrice),
      establishmentName: i.bill.establishment.name,
      issuedAt: (i.bill.invoice?.issuedAt ?? i.bill.createdAt).toISOString(),
    }))

    return reply.send({
      stats: { totalProducts: productMap.size, totalEstablishments, totalBills },
      topSavings: topSavings.slice(0, limit),
      recentItems: recentItems.slice(0, limit),
    })
  })
}

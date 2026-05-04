import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { normalize } from '../lib/normalize.js'

export async function establishmentsRoutes(app: FastifyInstance) {
  // GET /establishments — list all establishments with at least one bill
  app.get('/establishments', async (_request, reply) => {
    const rows = await prisma.establishment.findMany({
      where: { bills: { some: {} } },
      include: {
        _count: { select: { bills: true } },
        bills: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { invoice: { select: { issuedAt: true } } },
        },
      },
      orderBy: { name: 'asc' },
    })

    const data = rows.map((e) => ({
      id: e.id,
      cnpj: e.cnpj,
      name: e.name,
      address: e.address,
      billCount: e._count.bills,
      lastSeenAt: (e.bills[0]?.invoice?.issuedAt ?? e.bills[0]?.createdAt ?? e.createdAt).toISOString(),
    }))

    return reply.send({ data })
  })

  // GET /establishments/:id/items — items from a specific establishment, grouped
  app.get<{ Params: { id: string } }>('/establishments/:id/items', async (request, reply) => {
    const { id } = request.params

    const establishment = await prisma.establishment.findUnique({ where: { id } })
    if (!establishment) return reply.status(404).send({ error: 'Estabelecimento não encontrado' })

    const items = await prisma.item.findMany({
      where: { bill: { establishmentId: id } },
      include: {
        product: { select: { id: true, name: true } },
        bill: {
          include: { invoice: { select: { issuedAt: true } } },
        },
      },
    })

    type Group = {
      key: string
      description: string
      productName: string | null
      latestPrice: number
      lastSeenAt: string
    }

    const groups = new Map<string, Group>()

    for (const item of items) {
      const key = item.productId ?? normalize(item.description)
      const isProductKeyed = !!item.productId
      const price = Number(item.unitPrice)
      const seenAt = (item.bill.invoice?.issuedAt ?? item.bill.createdAt).toISOString()

      const existing = groups.get(key)
      if (!existing || seenAt > existing.lastSeenAt) {
        groups.set(key, {
          key,
          description: isProductKeyed ? item.product!.name : item.description,
          productName: isProductKeyed ? null : (item.product?.name ?? null),
          latestPrice: price,
          lastSeenAt: seenAt,
        })
      }
    }

    const data = Array.from(groups.values())
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))

    return reply.send({
      establishment: {
        id: establishment.id,
        cnpj: establishment.cnpj,
        name: establishment.name,
        address: establishment.address,
      },
      data,
    })
  })
}

import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { normalize } from '../lib/normalize.js'
import { geocodeAddress } from '../lib/geocode.js'

export async function establishmentsRoutes(app: FastifyInstance) {
  // GET /establishments/nearby — establishments sorted by distance
  app.get<{ Querystring: { lat: string; lng: string; radiusKm?: string; limit?: string } }>(
    '/establishments/nearby',
    async (request, reply) => {
      const lat = parseFloat(request.query.lat)
      const lng = parseFloat(request.query.lng)
      const radiusKm = parseFloat(request.query.radiusKm ?? '10')
      const limit = Math.min(parseInt(request.query.limit ?? '20'), 50)

      if (isNaN(lat) || isNaN(lng)) {
        return reply.status(400).send({ error: 'lat e lng obrigatórios' })
      }

      type NearbyRow = {
        id: string
        name: string
        cnpj: string
        address: string
        latitude: number
        longitude: number
        distance_km: number
      }

      const rows = await prisma.$queryRaw<NearbyRow[]>`
        WITH distances AS (
          SELECT id, name, cnpj, address, latitude, longitude,
            (6371 * acos(
              LEAST(1.0,
                cos(radians(${lat})) * cos(radians(latitude))
                * cos(radians(longitude) - radians(${lng}))
                + sin(radians(${lat})) * sin(radians(latitude))
              )
            )) AS distance_km
          FROM establishments
          WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        )
        SELECT * FROM distances
        WHERE distance_km <= ${radiusKm}
        ORDER BY distance_km ASC
        LIMIT ${limit}
      `

      const data = rows.map((r) => ({
        id: r.id,
        name: r.name,
        cnpj: r.cnpj,
        address: r.address,
        latitude: r.latitude,
        longitude: r.longitude,
        distanceKm: Number(r.distance_km),
      }))

      return reply.send({ data })
    }
  )

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

import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { normalize } from '../lib/normalize.js'

export async function productsRoutes(app: FastifyInstance) {
  app.get('/products', { preHandler: app.requireRole(['ADMIN']) }, async (_request, reply) => {
    const products = await prisma.product.findMany({
      include: {
        _count: { select: { mappings: true } },
        mappings: { select: { id: true, normalizedDescription: true, createdAt: true }, orderBy: { normalizedDescription: 'asc' } },
      },
      orderBy: { name: 'asc' },
    })
    return reply.send(products.map((p) => ({
      id: p.id,
      name: p.name,
      mappingCount: p._count.mappings,
      mappings: p.mappings,
      createdAt: p.createdAt,
    })))
  })

  app.post<{ Body: { name: string } }>(
    '/products',
    { preHandler: app.requireRole(['ADMIN']) },
    async (request, reply) => {
      const { name } = request.body
      if (!name?.trim()) return reply.code(400).send({ error: 'name obrigatório' })
      const product = await prisma.product.create({ data: { name: name.trim() } })
      return reply.code(201).send(product)
    }
  )

  app.put<{ Params: { id: string }; Body: { name: string } }>(
    '/products/:id',
    { preHandler: app.requireRole(['ADMIN']) },
    async (request, reply) => {
      const { name } = request.body
      if (!name?.trim()) return reply.code(400).send({ error: 'name obrigatório' })
      try {
        const product = await prisma.product.update({
          where: { id: request.params.id },
          data: { name: name.trim() },
        })
        return reply.send(product)
      } catch {
        return reply.code(404).send({ error: 'Produto não encontrado' })
      }
    }
  )

  app.get<{ Querystring: { q?: string; page?: string; limit?: string } }>('/products/unlinked-groups', { preHandler: app.requireRole(['ADMIN']) }, async (request, reply) => {
    const q = request.query.q?.trim().toUpperCase() ?? ''
    const page = Math.max(1, parseInt(request.query.page ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '50', 10)))

    const items = await prisma.item.findMany({
      where: { productId: null },
      select: { description: true, createdAt: true },
    })

    type Group = { normalizedDescription: string; sampleDescription: string; occurrences: number; lastSeenAt: string }
    const groups = new Map<string, Group>()

    for (const item of items) {
      const key = normalize(item.description)
      const seenAt = item.createdAt.toISOString()
      const existing = groups.get(key)
      if (!existing) {
        groups.set(key, { normalizedDescription: key, sampleDescription: item.description, occurrences: 1, lastSeenAt: seenAt })
      } else {
        existing.occurrences++
        if (seenAt > existing.lastSeenAt) {
          existing.lastSeenAt = seenAt
          existing.sampleDescription = item.description
        }
      }
    }

    const sorted = Array.from(groups.values()).sort((a, b) => b.occurrences - a.occurrences)
    const filtered = q ? sorted.filter((g) => g.normalizedDescription.includes(q) || g.sampleDescription.toUpperCase().includes(q)) : sorted
    const total = filtered.length
    const data = filtered.slice((page - 1) * limit, page * limit)

    return reply.send({ data, total, page, totalPages: Math.ceil(total / limit) })
  })

  app.post<{ Body: { normalizedDescription: string; productId: string } }>(
    '/products/link',
    { preHandler: app.requireRole(['ADMIN']) },
    async (request, reply) => {
      const { normalizedDescription, productId } = request.body
      if (!normalizedDescription || !productId) {
        return reply.code(400).send({ error: 'normalizedDescription e productId obrigatórios' })
      }

      const result = await prisma.$transaction(async (tx) => {
        await tx.productMapping.upsert({
          where: { normalizedDescription },
          update: { productId },
          create: { normalizedDescription, productId },
        })

        const unlinked = await tx.item.findMany({
          where: { productId: null },
          select: { id: true, description: true },
        })
        const ids = unlinked
          .filter((i) => normalize(i.description) === normalizedDescription)
          .map((i) => i.id)

        if (ids.length > 0) {
          await tx.item.updateMany({ where: { id: { in: ids } }, data: { productId } })
        }

        return { mappedCount: ids.length }
      })

      return reply.send(result)
    }
  )

  app.delete<{ Params: { normalizedDescription: string } }>(
    '/products/link/:normalizedDescription',
    { preHandler: app.requireRole(['ADMIN']) },
    async (request, reply) => {
      const key = decodeURIComponent(request.params.normalizedDescription)
      try {
        await prisma.productMapping.delete({ where: { normalizedDescription: key } })
        return reply.send({ deleted: true })
      } catch {
        return reply.code(404).send({ error: 'Mapeamento não encontrado' })
      }
    }
  )
}

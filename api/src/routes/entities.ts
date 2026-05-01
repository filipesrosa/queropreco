import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

const LOGO_MAX_BYTES = 1_048_576 // 1 MB

export async function entitiesRoutes(app: FastifyInstance) {
  const adminOnly = { preHandler: app.requireRole(['ADMIN']) }

  app.get('/entities', adminOnly, async () => {
    return prisma.entity.findMany({ orderBy: { name: 'asc' } })
  })

  app.get('/entities/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    const entity = await prisma.entity.findUnique({ where: { id } })
    if (!entity) return reply.status(404).send({ error: 'Not found' })
    return entity
  })

  app.post('/entities', adminOnly, async (request, reply) => {
    const body = request.body as {
      cnpj: string
      name: string
      address: string
      phone?: string
      logo?: string
      notificationPhone?: string
    }

    if (!body.cnpj || !body.name || !body.address) {
      return reply.status(400).send({ error: 'cnpj, name and address are required' })
    }

    if (body.logo && Buffer.byteLength(body.logo, 'base64') > LOGO_MAX_BYTES) {
      return reply.status(400).send({ error: 'Logo exceeds 1MB' })
    }

    const entity = await prisma.entity.create({
      data: {
        cnpj: body.cnpj,
        name: body.name,
        address: body.address,
        phone: body.phone,
        logo: body.logo,
        notificationPhone: body.notificationPhone,
      },
    })
    return reply.status(201).send(entity)
  })

  app.put('/entities/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as {
      cnpj?: string
      name?: string
      address?: string
      phone?: string
      logo?: string
      notificationPhone?: string
      active?: boolean
    }

    if (body.logo && Buffer.byteLength(body.logo, 'base64') > LOGO_MAX_BYTES) {
      return reply.status(400).send({ error: 'Logo exceeds 1MB' })
    }

    const entity = await prisma.entity.update({
      where: { id },
      data: body,
    })
    return entity
  })

  app.delete('/entities/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.entity.update({ where: { id }, data: { active: false } })
    return reply.status(204).send()
  })
}

import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import type { JWTUser } from '../lib/auth.js'

function uniqueError(e: unknown): string | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    const fields = (e.meta?.target as string[])?.join(', ') ?? 'campo'
    return `Já existe um usuário com este ${fields}`
  }
  return null
}

export async function usersRoutes(app: FastifyInstance) {
  app.get('/users', { preHandler: app.requireRole(['ADMIN', 'ENTITY_ADMIN']) }, async (request) => {
    const me = request.user as JWTUser
    const where = me.role === 'ADMIN' ? {} : { entityId: me.entityId }
    return prisma.user.findMany({
      where,
      select: { id: true, name: true, cpf: true, phone: true, email: true, role: true, entityId: true, active: true, createdAt: true },
      orderBy: { name: 'asc' },
    })
  })

  app.get('/users/:id', { preHandler: app.requireRole(['ADMIN', 'ENTITY_ADMIN']) }, async (request, reply) => {
    const me = request.user as JWTUser
    const { id } = request.params as { id: string }
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, cpf: true, phone: true, email: true, role: true, entityId: true, active: true, createdAt: true },
    })
    if (!user) return reply.status(404).send({ error: 'Not found' })
    if (me.role === 'ENTITY_ADMIN' && user.entityId !== me.entityId) {
      return reply.status(403).send({ error: 'Forbidden' })
    }
    return user
  })

  app.post('/users', { preHandler: app.requireRole(['ADMIN', 'ENTITY_ADMIN']) }, async (request, reply) => {
    const me = request.user as JWTUser
    const body = request.body as {
      name: string
      cpf: string
      phone?: string
      email: string
      password: string
      role: string
      entityId?: string
    }

    if (!body.name || !body.cpf || !body.email || !body.password || !body.role) {
      return reply.status(400).send({ error: 'name, cpf, email, password and role are required' })
    }

    // EA can only create READER or ENTITY_ADMIN for their own entity
    if (me.role === 'ENTITY_ADMIN') {
      if (!['READER', 'ENTITY_ADMIN'].includes(body.role)) {
        return reply.status(403).send({ error: 'Cannot assign role above ENTITY_ADMIN' })
      }
      body.entityId = me.entityId ?? undefined
    }

    const hashed = await bcrypt.hash(body.password, 10)
    try {
      const user = await prisma.user.create({
        data: {
          name: body.name,
          cpf: body.cpf,
          phone: body.phone,
          email: body.email,
          password: hashed,
          role: body.role as any,
          entityId: body.entityId,
        },
        select: { id: true, name: true, cpf: true, phone: true, email: true, role: true, entityId: true, active: true, createdAt: true },
      })
      return reply.status(201).send(user)
    } catch (e) {
      const msg = uniqueError(e)
      if (msg) return reply.status(409).send({ error: msg })
      throw e
    }
  })

  app.put('/users/:id', { preHandler: app.requireRole(['ADMIN', 'ENTITY_ADMIN']) }, async (request, reply) => {
    const me = request.user as JWTUser
    const { id } = request.params as { id: string }
    const body = request.body as {
      name?: string
      phone?: string
      role?: string
      active?: boolean
      password?: string
      entityId?: string
    }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Not found' })
    if (me.role === 'ENTITY_ADMIN' && existing.entityId !== me.entityId) {
      return reply.status(403).send({ error: 'Forbidden' })
    }
    if (me.role === 'ENTITY_ADMIN' && body.role && !['READER', 'ENTITY_ADMIN'].includes(body.role)) {
      return reply.status(403).send({ error: 'Cannot assign role above ENTITY_ADMIN' })
    }

    const data: any = { name: body.name, phone: body.phone, active: body.active }
    if (body.role) data.role = body.role
    if (me.role === 'ADMIN' && body.entityId !== undefined) data.entityId = body.entityId
    if (body.password) data.password = await bcrypt.hash(body.password, 10)

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, cpf: true, phone: true, email: true, role: true, entityId: true, active: true, createdAt: true },
    })
    return user
  })

  app.delete('/users/:id', { preHandler: app.requireRole(['ADMIN']) }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.user.update({ where: { id }, data: { active: false } })
    return reply.status(204).send()
  })
}

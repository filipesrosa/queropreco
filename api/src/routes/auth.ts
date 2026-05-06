import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string }

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.active) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      entityId: user.entityId,
    }

    const token = app.jwt.sign(payload, { expiresIn: '8h' })

    const cookieDomain = process.env.COOKIE_DOMAIN ?? undefined
    const cookieOpts = { path: '/', maxAge: 8 * 60 * 60, sameSite: 'lax' as const, domain: cookieDomain }

    reply
      .setCookie('qp_token', token, { ...cookieOpts, httpOnly: true })
      .setCookie('qp_user', JSON.stringify({ id: user.id, name: user.name, role: user.role, entityId: user.entityId }), {
        ...cookieOpts,
        httpOnly: false,
      })

    return { user: payload }
  })

  app.get('/auth/me', { preHandler: app.verifyJwt }, async (request, reply) => {
    return { user: request.user }
  })

  app.post('/auth/change-password', { preHandler: app.verifyJwt }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body as {
      currentPassword: string
      newPassword: string
    }

    if (!currentPassword || !newPassword) {
      return reply.status(400).send({ error: 'currentPassword e newPassword são obrigatórios' })
    }
    if (newPassword.length < 8) {
      return reply.status(400).send({ error: 'Nova senha deve ter no mínimo 8 caracteres' })
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } })
    if (!user || !user.active) {
      return reply.status(401).send({ error: 'Usuário não encontrado' })
    }

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) {
      return reply.status(401).send({ error: 'Senha atual incorreta' })
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

    return { ok: true }
  })

  app.post('/auth/logout', async (_request, reply) => {
    const cookieDomain = process.env.COOKIE_DOMAIN ?? undefined
    reply
      .clearCookie('qp_token', { path: '/', domain: cookieDomain })
      .clearCookie('qp_user', { path: '/', domain: cookieDomain })
    return { ok: true }
  })
}

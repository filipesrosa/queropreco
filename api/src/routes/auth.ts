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

  app.post('/auth/logout', async (_request, reply) => {
    const cookieDomain = process.env.COOKIE_DOMAIN ?? undefined
    reply
      .clearCookie('qp_token', { path: '/', domain: cookieDomain })
      .clearCookie('qp_user', { path: '/', domain: cookieDomain })
    return { ok: true }
  })
}

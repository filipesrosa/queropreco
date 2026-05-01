import fp from 'fastify-plugin'
import fjwt from '@fastify/jwt'
import fcookie from '@fastify/cookie'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

export interface JWTUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'ENTITY_ADMIN' | 'READER'
  entityId: string | null
}

declare module 'fastify' {
  interface FastifyInstance {
    verifyJwt: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRole: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTUser
    user: JWTUser
  }
}

async function authPlugin(app: FastifyInstance) {
  await app.register(fcookie)
  await app.register(fjwt, {
    secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    cookie: { cookieName: 'qp_token', signed: false },
  })

  app.decorate('verifyJwt', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
  })

  app.decorate('requireRole', function (roles: string[]) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify()
        if (!roles.includes(request.user.role)) {
          return reply.status(403).send({ error: 'Forbidden' })
        }
      } catch {
        return reply.status(401).send({ error: 'Unauthorized' })
      }
    }
  })
}

export default fp(authPlugin)

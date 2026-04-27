import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

export async function campoRoutes(app: FastifyInstance) {
  app.post<{ Body: { value: string; nome?: string; cpf?: string } }>('/campo', async (request, reply) => {
    const { value, nome, cpf } = request.body

    if (typeof value !== 'string' || value.trim() === '') {
      return reply.status(400).send({ error: 'value is required' })
    }

    let decoded = value.trim()
    try { decoded = decodeURIComponent(decoded) } catch { /* keep original if malformed */ }
    if (/^httpsÇ|^httpÇ/.test(decoded)) {
      decoded = decoded
        .replace(/Ç/g, ':')
        .replace(/;/g, '/')
        .replace(/}/g, '|')
        .replace(/:([a-zA-Z])/, '?$1')
    }

    try {
      const record = await prisma.randomValue.create({
        data: {
          value: decoded,
          nome: nome?.trim() || null,
          cpf: cpf?.trim() || null,
        },
      })

      return reply.status(201).send({ data: record })
    } catch (error) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to store value' })
    }
  })
}

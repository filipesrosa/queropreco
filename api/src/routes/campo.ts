import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

export async function campoRoutes(app: FastifyInstance) {
  app.post<{ Body: { value: string } }>('/campo', async (request, reply) => {
    const { value } = request.body

    if (typeof value !== 'string' || value.trim() === '') {
      return reply.status(400).send({ error: 'value is required' })
    }

    try {
      const record = await prisma.randomValue.create({ data: { value } })
      return reply.status(201).send({ data: record })
    } catch (error) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to store value' })
    }
  })
}

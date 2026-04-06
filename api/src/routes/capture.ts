import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { fetchNFCe } from '../lib/nfce-parser.js'
import { upsertBill } from '../lib/bill-upsert.js'

export async function captureRoutes(app: FastifyInstance) {
  app.post<{ Body: { url: string } }>('/bills/capture', async (request, reply) => {
    const { url } = request.body

    if (!url || typeof url !== 'string') {
      return reply.status(400).send({ error: 'url is required' })
    }

    try {
      new URL(url) // validate URL format
    } catch {
      return reply.status(400).send({ error: 'Invalid URL format' })
    }

    try {
      const receipt = await fetchNFCe(url)
      const bill = await prisma.$transaction((tx) => upsertBill(tx, receipt))
      return reply.status(201).send({ data: bill, receipt })
    } catch (error) {
      app.log.error(error)
      const message = error instanceof Error ? error.message : 'Failed to capture bill'
      return reply.status(502).send({ error: message })
    }
  })
}

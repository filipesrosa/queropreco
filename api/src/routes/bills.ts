import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { upsertBill } from '../lib/bill-upsert.js'
import { NFCeReceipt } from '../types/nfce.js'

export async function billsRoutes(app: FastifyInstance) {
  // POST /bills - insert or update a bill (upsert by invoice.accessKey)
  app.post<{ Body: NFCeReceipt }>('/bills', async (request, reply) => {
    const receipt = request.body

    try {
      const bill = await prisma.$transaction((tx) => upsertBill(tx, receipt))
      return reply.status(200).send({ data: bill })
    } catch (error) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to save bill' })
    }
  })

  // GET /bills - list all bills
  app.get('/bills', async (_request, reply) => {
    const bills = await prisma.bill.findMany({
      include: { invoice: true, payment: true, taxes: true, items: true, establishment: true },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send({ data: bills })
  })

  // GET /bills/:id - get a single bill
  app.get<{ Params: { id: string } }>('/bills/:id', async (request, reply) => {
    const { id } = request.params

    const bill = await prisma.bill.findUnique({
      where: { id },
      include: { invoice: true, payment: true, taxes: true, items: true, establishment: true },
    })

    if (!bill) return reply.status(404).send({ error: 'Bill not found' })

    return reply.send({ data: bill })
  })
}

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

  // GET /bills - list bills with optional date filter and pagination
  app.get<{
    Querystring: { from?: string; to?: string; createdFrom?: string; createdTo?: string; page?: string; limit?: string }
  }>('/bills', async (request, reply) => {
    const { from, to, createdFrom, createdTo, page = '1', limit = '10' } = request.query

    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10))
    const skip = (pageNum - 1) * limitNum

    const issuedAtFilter: { gte?: Date; lte?: Date } = {}
    if (from) issuedAtFilter.gte = new Date(from)
    if (to) issuedAtFilter.lte = new Date(to)

    const createdAtFilter: { gte?: Date; lte?: Date } = {}
    if (createdFrom) createdAtFilter.gte = new Date(createdFrom)
    if (createdTo) createdAtFilter.lte = new Date(createdTo)

    const where = {
      ...(Object.keys(issuedAtFilter).length > 0 ? { invoice: { issuedAt: issuedAtFilter } } : {}),
      ...(Object.keys(createdAtFilter).length > 0 ? { createdAt: createdAtFilter } : {}),
    }

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        include: { invoice: true, payment: true, establishment: true },
        orderBy: { invoice: { issuedAt: 'desc' } },
        skip,
        take: limitNum,
      }),
      prisma.bill.count({ where }),
    ])

    return reply.send({
      data: bills,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  })

  // GET /bills/:id - get a single bill with all relations
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

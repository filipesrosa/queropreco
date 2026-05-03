import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { fetchNFCe } from '../lib/nfce-parser.js'
import { fetchNFCeViaPlaywright, extractAccessKey } from '../lib/playwright-nfce.js'
import { upsertBill } from '../lib/bill-upsert.js'
import { lookupCnpj } from '../lib/cnpj-lookup.js'

// Parses "2026-04-25" + timezone offset like "-03:00" into UTC start/end boundaries
function dayBoundsUTC(dateStr: string, tzOffset: string): { start: Date; end: Date } {
  // tzOffset format: "+HH:MM" or "-HH:MM"
  const match = tzOffset.match(/^([+-])(\d{2}):(\d{2})$/)
  if (!match) throw new Error('Invalid timezone offset. Use format like -03:00 or +05:30')

  const sign = match[1] === '+' ? 1 : -1
  const offsetMinutes = sign * (parseInt(match[2]) * 60 + parseInt(match[3]))

  // Start of day in local time = dateStr 00:00:00 → subtract offset to get UTC
  const start = new Date(`${dateStr}T00:00:00.000Z`)
  start.setUTCMinutes(start.getUTCMinutes() - offsetMinutes)

  // End of day in local time = dateStr 23:59:59.999 → subtract offset to get UTC
  const end = new Date(`${dateStr}T23:59:59.999Z`)
  end.setUTCMinutes(end.getUTCMinutes() - offsetMinutes)

  return { start, end }
}

export async function randomValuesRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { date?: string; timezone?: string }
  }>('/campo/count', async (request, reply) => {
    const { date, timezone = '-03:00' } = request.query

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return reply.status(400).send({ error: 'date is required in format YYYY-MM-DD' })
    }

    try {
      const { start, end } = dayBoundsUTC(date, timezone)

      const count = await prisma.randomValue.count({
        where: {
          createdAt: { gte: start, lte: end },
        },
      })

      return reply.send({ date, timezone, count, start, end })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal error'
      return reply.status(400).send({ error: message })
    }
  })

  app.get<{ Querystring: { date?: string; timezone?: string } }>(
    '/campo/export',
    async (request, reply) => {
      const { date, timezone = '-03:00' } = request.query

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return reply.status(400).send({ error: 'date is required in format YYYY-MM-DD' })
      }

      try {
        const { start, end } = dayBoundsUTC(date, timezone)

        const records = await prisma.randomValue.findMany({
          where: { createdAt: { gte: start, lte: end } },
          select: { value: true },
        })

        const year = String(new Date().getFullYear()).slice(-2)
        const keyRegex = new RegExp(`(?<!\\d)(35${year}\\d{40})(?!\\d)`)

        const chaves = records
          .map(r => r.value.match(keyRegex)?.[1])
          .filter((k): k is string => k !== undefined)

        reply
          .header('Content-Type', 'text/plain; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="cupons-${date}.txt"`)
          .send(chaves.join('\n'))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal error'
        return reply.status(400).send({ error: message })
      }
    }
  )

  app.get<{ Querystring: { date?: string; timezone?: string } }>(
    '/campo/invalid',
    async (request, reply) => {
      const { date, timezone = '-03:00' } = request.query

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return reply.status(400).send({ error: 'date is required in format YYYY-MM-DD' })
      }

      try {
        const { start, end } = dayBoundsUTC(date, timezone)
        const year = String(new Date().getFullYear()).slice(-2)
        const keyRegex = new RegExp(`(?<!\\d)(35${year}\\d{40})(?!\\d)`)

        const records = await prisma.randomValue.findMany({
          where: { createdAt: { gte: start, lte: end } },
          select: { id: true, value: true, nome: true, cpf: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        })

        const invalid = records.filter(r => !keyRegex.test(r.value))
        return reply.send({ date, count: invalid.length, records: invalid })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal error'
        return reply.status(400).send({ error: message })
      }
    }
  )

  app.get('/campo/pending', async (_request, reply) => {
    const count = await prisma.randomValue.count({
      where: { processedAt: null },
    })
    return reply.send({ count })
  })

  app.post('/campo/process', async (request, reply) => {
    const pending = await prisma.randomValue.findMany({
      where: { processedAt: null },
      select: { id: true, value: true },
    })

    reply.raw.writeHead(200, {
      'Access-Control-Allow-Origin': (reply.getHeader('access-control-allow-origin') ?? '*') as string,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    function send(event: string, data: unknown): boolean {
      try {
        return reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      } catch {
        return false
      }
    }

    send('start', { total: pending.length })

    let processed = 0
    let errors = 0
    let viaCaptcha = 0

    try {
      for (const record of pending) {
        if (request.raw.destroyed) break

        try {
          let usedCaptcha = false
          let receipt = await fetchNFCe(record.value).catch(async () => {
            const key = extractAccessKey(record.value)
            if (!key) throw new Error('Cannot extract access key for Playwright fallback')
            usedCaptcha = true
            return fetchNFCeViaPlaywright(key)
          })
          if (usedCaptcha) viaCaptcha++
          if (!receipt.establishment.name && receipt.establishment.cnpj) {
            const info = await lookupCnpj(receipt.establishment.cnpj)
            if (info) receipt = { ...receipt, establishment: { ...receipt.establishment, ...info } }
          }
          await prisma.$transaction(async (tx) => {
            await upsertBill(tx, receipt)
            await tx.randomValue.update({
              where: { id: record.id },
              data: { processedAt: new Date() },
            })
          })
          processed++
          if (!send('progress', { id: record.id, status: 'ok', processed, errors, viaCaptcha, remaining: pending.length - processed - errors })) break
        } catch (err) {
          errors++
          app.log.warn({ recordId: record.id, err }, 'Failed to process record')
          if (!send('progress', { id: record.id, status: 'error', message: err instanceof Error ? err.message : 'Unknown error', processed, errors, viaCaptcha, remaining: pending.length - processed - errors })) break
        }
      }

      send('done', { processed, errors, viaCaptcha, total: pending.length })
    } finally {
      reply.raw.end()
    }
  })
}

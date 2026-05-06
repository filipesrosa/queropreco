import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { fetchNFCe, decodeAccessKey } from '../lib/nfce-parser.js'
import { upsertBill } from '../lib/bill-upsert.js'
import { enrichEstablishment } from '../lib/enrich.js'
import { geocodeAddress } from '../lib/geocode.js'
import type { NFCeReceipt } from '../types/nfce.js'

function detectDevice(ua: string): 'mobile' | 'desktop' {
  return /mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua) ? 'mobile' : 'desktop'
}

async function recordAnonymousReading(accessKey: string, userAgent: string) {
  if (!accessKey) return
  const digits = accessKey.replace(/\D/g, '')
  if (digits.length !== 44) return
  const device = detectDevice(userAgent)
  await prisma.userReading.create({ data: { accessKey: digits, device } })
}

async function maybeGeocodeEstablishment(establishmentId: string, address: string) {
  if (!address) return
  const est = await prisma.establishment.findUnique({ where: { id: establishmentId }, select: { latitude: true } })
  if (est?.latitude != null) return
  const coords = await geocodeAddress(address)
  if (!coords) return
  await prisma.establishment.update({ where: { id: establishmentId }, data: { latitude: coords.lat, longitude: coords.lng } })
}


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
      const receipt = await enrichEstablishment(await fetchNFCe(url))
      const bill = await prisma.$transaction((tx) => upsertBill(tx, receipt))
      setImmediate(() => maybeGeocodeEstablishment(bill.establishmentId, receipt.establishment.address).catch(() => {}))
      setImmediate(() => recordAnonymousReading(receipt.invoice?.accessKey ?? '', request.headers['user-agent'] ?? '').catch(() => {}))
      return reply.status(201).send({ data: bill, receipt })
    } catch (error) {
      app.log.error(error)
      const message = error instanceof Error ? error.message : 'Failed to capture bill'
      return reply.status(502).send({ error: message })
    }
  })

  const VALID_NFP_STATUSES = ['donated', 'already_exists', 'expired', 'error'] as const
  type NfpStatus = typeof VALID_NFP_STATUSES[number]

  app.post<{ Params: { accessKey: string }; Body: { nfpStatus?: string } }>('/bills/nfp-update/:accessKey', async (request, reply) => {
    const { accessKey } = request.params
    const digits = accessKey.replace(/\D/g, '')
    if (digits.length !== 44) {
      return reply.status(400).send({ error: 'accessKey must be 44 digits' })
    }

    const nfpStatus: NfpStatus = VALID_NFP_STATUSES.includes(request.body?.nfpStatus as NfpStatus)
      ? (request.body.nfpStatus as NfpStatus)
      : 'error'

    const result = await prisma.userReading.updateMany({
      where: { accessKey: digits, nfpDonatedAt: null },
      data: { nfpDonatedAt: new Date(), nfpStatus },
    })

    if (result.count === 0) {
      return reply.status(404).send({ error: 'No pending readings found for this accessKey' })
    }

    return reply.status(200).send({ updated: result.count })
  })

  app.post<{ Body: { accessKey: string } }>('/bills/barcode', async (request, reply) => {
    const { accessKey } = request.body

    if (!accessKey || typeof accessKey !== 'string') {
      return reply.status(400).send({ error: 'accessKey is required' })
    }

    const digits = accessKey.replace(/\D/g, '')
    if (digits.length !== 44) {
      return reply.status(400).send({ error: 'accessKey must be 44 digits' })
    }

    try {
      const kd = decodeAccessKey(digits)
      const now = new Date().toISOString()

      const receipt: NFCeReceipt = {
        establishment: {
          name: '',
          cnpj: kd.cnpj,
          address: '',
          website: '',
        },
        invoice: {
          number: kd.invoiceNumber,
          series: kd.series,
          issuedAt: kd.issuedAt ?? now,
          capturedAt: now,
          accessKey: kd.accessKey,
          authorizationProtocol: '',
          environment: 'Produção',
          xmlVersion: '4.00',
          xsltVersion: '2.05',
          type: 'EMISSÃO NORMAL',
          via: 'Consumidor',
          consumer: 'Não identificado',
          operator: '',
        },
        payment: {
          totalItems: 0,
          totalAmount: 0,
          amountPaid: 0,
          change: 0,
          method: 'Não especificado',
        },
        taxes: {
          totalTaxes: 0,
          taxPercentage: 0,
          taxSource: 'IBPT',
          legalBasis: 'Lei Federal 12.741/2012',
        },
        items: [],
      }

      const enriched = await enrichEstablishment(receipt)
      const bill = await prisma.$transaction((tx) => upsertBill(tx, enriched))
      setImmediate(() => maybeGeocodeEstablishment(bill.establishmentId, enriched.establishment.address).catch(() => {}))
      setImmediate(() => recordAnonymousReading(digits, request.headers['user-agent'] ?? '').catch(() => {}))
      return reply.status(201).send({ data: bill, receipt: enriched })
    } catch (error) {
      app.log.error(error)
      const message = error instanceof Error ? error.message : 'Failed to capture bill'
      return reply.status(502).send({ error: message })
    }
  })
}

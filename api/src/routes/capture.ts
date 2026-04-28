import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { fetchNFCe, decodeAccessKey, buildSefazConsultaUrl } from '../lib/nfce-parser.js'
import { upsertBill } from '../lib/bill-upsert.js'
import { lookupCnpj } from '../lib/cnpj-lookup.js'
import type { NFCeReceipt } from '../types/nfce.js'

async function enrichEstablishment(receipt: NFCeReceipt): Promise<NFCeReceipt> {
  if (receipt.establishment.name || !receipt.establishment.cnpj) return receipt
  const info = await lookupCnpj(receipt.establishment.cnpj)
  if (!info) return receipt
  return { ...receipt, establishment: { ...receipt.establishment, ...info } }
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
      return reply.status(201).send({ data: bill, receipt })
    } catch (error) {
      app.log.error(error)
      const message = error instanceof Error ? error.message : 'Failed to capture bill'
      return reply.status(502).send({ error: message })
    }
  })

  app.get<{ Params: { accesskey: string } }>('/accesskey/:accesskey', async (request, reply) => {
    const { accesskey } = request.params
    const digits = accesskey.replace(/\D/g, '')
    if (digits.length !== 44) {
      return reply.status(400).send({ error: 'accessKey must be 44 digits' })
    }

    try {
      const sefazUrl = buildSefazConsultaUrl(digits)
      if (sefazUrl) {
        try {
          const receipt = await enrichEstablishment(await fetchNFCe(sefazUrl))
          const bill = await prisma.$transaction((tx) => upsertBill(tx, receipt))
          return reply.status(201).send({ data: bill, receipt })
        } catch (fetchErr) {
          app.log.warn({ fetchErr }, 'SEFAZ fetch failed, falling back to key decode')
        }
      }

      const kd = decodeAccessKey(digits)
      const now = new Date().toISOString()
      const receipt: NFCeReceipt = {
        establishment: { name: '', cnpj: kd.cnpj, address: '', website: '' },
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
        payment: { totalItems: 0, totalAmount: 0, amountPaid: 0, change: 0, method: 'Não especificado' },
        taxes: { totalTaxes: 0, taxPercentage: 0, taxSource: 'IBPT', legalBasis: 'Lei Federal 12.741/2012' },
        items: [],
      }
      const enriched = await enrichEstablishment(receipt)
      const bill = await prisma.$transaction((tx) => upsertBill(tx, enriched))
      return reply.status(201).send({ data: bill, receipt: enriched })
    } catch (error) {
      app.log.error(error)
      const message = error instanceof Error ? error.message : 'Failed to capture bill'
      return reply.status(502).send({ error: message })
    }
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
      return reply.status(201).send({ data: bill, receipt: enriched })
    } catch (error) {
      app.log.error(error)
      const message = error instanceof Error ? error.message : 'Failed to capture bill'
      return reply.status(502).send({ error: message })
    }
  })
}

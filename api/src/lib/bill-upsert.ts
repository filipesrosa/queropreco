import { PrismaClient } from '@prisma/client'
import { NFCeReceipt } from '../types/nfce.js'
import { normalize } from './normalize.js'

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

async function resolveProductIds(tx: TxClient, items: NFCeReceipt['items']): Promise<Map<string, string>> {
  const keys = items.map((i) => normalize(i.description))
  const mappings = await tx.productMapping.findMany({
    where: { normalizedDescription: { in: keys } },
    select: { normalizedDescription: true, productId: true },
  })
  return new Map(mappings.map((m) => [m.normalizedDescription, m.productId]))
}

export async function upsertBill(tx: TxClient, receipt: NFCeReceipt) {
  const establishment = await tx.establishment.upsert({
    where: { cnpj: receipt.establishment.cnpj },
    create: {
      name: receipt.establishment.name,
      cnpj: receipt.establishment.cnpj,
      address: receipt.establishment.address,
      website: receipt.establishment.website,
    },
    update: {
      name: receipt.establishment.name,
      address: receipt.establishment.address,
      website: receipt.establishment.website,
    },
  })

  const existingInvoice = await tx.invoice.findUnique({
    where: { accessKey: receipt.invoice.accessKey },
    select: { billId: true },
  })

  if (existingInvoice) {
    const billId = existingInvoice.billId

    await tx.invoice.update({
      where: { accessKey: receipt.invoice.accessKey },
      data: {
        number: receipt.invoice.number,
        series: receipt.invoice.series,
        issuedAt: new Date(receipt.invoice.issuedAt),
        capturedAt: new Date(receipt.invoice.capturedAt),
        authorizationProtocol: receipt.invoice.authorizationProtocol,
        environment: receipt.invoice.environment,
        xmlVersion: receipt.invoice.xmlVersion,
        xsltVersion: receipt.invoice.xsltVersion,
        type: receipt.invoice.type,
        via: receipt.invoice.via,
        consumer: receipt.invoice.consumer,
        operator: receipt.invoice.operator,
      },
    })

    await tx.payment.update({
      where: { billId },
      data: {
        totalItems: receipt.payment.totalItems,
        totalAmount: receipt.payment.totalAmount,
        amountPaid: receipt.payment.amountPaid,
        change: receipt.payment.change,
        method: receipt.payment.method,
      },
    })

    await tx.taxes.update({
      where: { billId },
      data: {
        totalTaxes: receipt.taxes.totalTaxes,
        taxPercentage: Math.min(receipt.taxes.taxPercentage, 999.99),
        taxSource: receipt.taxes.taxSource,
        legalBasis: receipt.taxes.legalBasis,
      },
    })

    if (receipt.items.length > 0) {
      const productMap = await resolveProductIds(tx, receipt.items)
      await tx.item.deleteMany({ where: { billId } })
      await tx.item.createMany({
        data: receipt.items.map((item) => ({
          billId,
          code: item.code,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          productId: productMap.get(normalize(item.description)) ?? null,
        })),
      })
    }

    return tx.bill.update({
      where: { id: billId },
      data: { notes: receipt.notes, establishmentId: establishment.id },
      include: { invoice: true, payment: true, taxes: true, items: true, establishment: true },
    })
  }

  return tx.bill.create({
    data: {
      notes: receipt.notes,
      establishment: { connect: { id: establishment.id } },
      invoice: {
        create: {
          number: receipt.invoice.number,
          series: receipt.invoice.series,
          issuedAt: new Date(receipt.invoice.issuedAt),
          capturedAt: new Date(receipt.invoice.capturedAt),
          accessKey: receipt.invoice.accessKey,
          authorizationProtocol: receipt.invoice.authorizationProtocol,
          environment: receipt.invoice.environment,
          xmlVersion: receipt.invoice.xmlVersion,
          xsltVersion: receipt.invoice.xsltVersion,
          type: receipt.invoice.type,
          via: receipt.invoice.via,
          consumer: receipt.invoice.consumer,
          operator: receipt.invoice.operator,
        },
      },
      payment: {
        create: {
          totalItems: receipt.payment.totalItems,
          totalAmount: receipt.payment.totalAmount,
          amountPaid: receipt.payment.amountPaid,
          change: receipt.payment.change,
          method: receipt.payment.method,
        },
      },
      taxes: {
        create: {
          totalTaxes: receipt.taxes.totalTaxes,
          taxPercentage: receipt.taxes.taxPercentage,
          taxSource: receipt.taxes.taxSource,
          legalBasis: receipt.taxes.legalBasis,
        },
      },
      items: {
        createMany: {
          data: await resolveProductIds(tx, receipt.items).then((productMap) =>
            receipt.items.map((item) => ({
              code: item.code,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              productId: productMap.get(normalize(item.description)) ?? null,
            }))
          ),
        },
      },
    },
    include: { invoice: true, payment: true, taxes: true, items: true, establishment: true },
  })
}

import { lookupCnpj } from './cnpj-lookup.js'
import type { NFCeReceipt } from '../types/nfce.js'

export async function enrichEstablishment(receipt: NFCeReceipt): Promise<NFCeReceipt> {
  if (receipt.establishment.name || !receipt.establishment.cnpj) return receipt
  const info = await lookupCnpj(receipt.establishment.cnpj)
  if (!info) return receipt
  return { ...receipt, establishment: { ...receipt.establishment, ...info } }
}

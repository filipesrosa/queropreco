import * as cheerio from 'cheerio'
import type { NFCeReceipt, Establishment, Invoice, Payment, Taxes, Item } from '../types/nfce.js'

// ── Helpers ────────────────────────────────────────────────────────────────────

const parseBRNumber = (s: string) =>
  parseFloat(s.trim().replace(/[R$\s.]/g, '').replace(',', '.')) || 0

function parseDate(s: string): string | null {
  if (!s) return null
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})(?:[T\s]+(\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (m) {
    const [, d, mo, y, h = '00', mi = '00', se = '00'] = m
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${se}`).toISOString()
  }
  return null
}

// ── Access key decoder ─────────────────────────────────────────────────────────
// key structure (44 digits): cUF(2) AAMM(4) CNPJ(14) mod(2) serie(3) nNF(9) tpEmis(1) cNF(8) cDV(1)

interface KeyData {
  accessKey: string
  cnpj: string
  series: string
  invoiceNumber: string
  issuedAt: string | null
}

function decodeAccessKey(raw: string): KeyData {
  const ak = raw.replace(/\D/g, '').substring(0, 44)
  const aamm    = ak.substring(2, 6)
  const cnpjRaw = ak.substring(6, 20)
  const serie   = ak.substring(22, 25)
  const nNF     = ak.substring(25, 34)

  const year  = `20${aamm.substring(0, 2)}`
  const month = aamm.substring(2, 4)

  const cnpj = `${cnpjRaw.substring(0,2)}.${cnpjRaw.substring(2,5)}.${cnpjRaw.substring(5,8)}/${cnpjRaw.substring(8,12)}-${cnpjRaw.substring(12,14)}`

  return {
    accessKey: ak.replace(/(.{4})/g, '$1 ').trim(),
    cnpj,
    series: String(parseInt(serie, 10)),
    invoiceNumber: String(parseInt(nNF, 10)),
    issuedAt: year && month ? new Date(`${year}-${month}-01T00:00:00`).toISOString() : null,
  }
}

function extractFromUrl(url: string): KeyData | null {
  try {
    const p = new URL(url).searchParams.get('p')
    if (!p) return null
    const ak = p.split('|')[0].replace(/\D/g, '')
    return ak.length === 44 ? decodeAccessKey(ak) : null
  } catch { return null }
}

// ── Fetch ──────────────────────────────────────────────────────────────────────

export async function fetchNFCe(url: string): Promise<NFCeReceipt> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      Connection: 'keep-alive',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return parseNFCeHtml(await res.text(), url)
}

// ── Parser ─────────────────────────────────────────────────────────────────────

export function parseNFCeHtml(html: string, sourceUrl: string): NFCeReceipt {
  const $ = cheerio.load(html)
  const now = new Date().toISOString()
  const urlData = extractFromUrl(sourceUrl)

  // ── Establishment ──────────────────────────────────────────────────────────
  const name = $('#u20.txtTopo, .txtTopo').first().text().trim()

  // CNPJ: first .text div inside .txtCenter (text like "CNPJ: 50.582.170/0004-42")
  const cnpjRaw = $('.txtCenter .text').eq(0).text()
  const cnpj =
    cnpjRaw.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)?.[0] ||
    urlData?.cnpj ||
    $('body').text().match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)?.[0] || ''

  // Address: second .text div — clean duplicate tokens, keep street + UF
  const addrRaw = $('.txtCenter .text').eq(1).text()
  const addrParts = addrRaw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
  const addrUnique = [...new Set(addrParts)]
  const address = addrUnique.filter(p => p !== '0' && p.length > 1).join(', ')

  const establishment: Establishment = {
    name,
    cnpj,
    address,
    website: (() => { try { return new URL(sourceUrl).origin } catch { return sourceUrl } })(),
  }

  // ── Items ──────────────────────────────────────────────────────────────────
  // SP SEFAZ format: tr[id^="Item + "] with 2 cells, data as spans in first cell
  const items: Item[] = []

  $('table#tabResult tr[id^="Item"]').each((_, row) => {
    const firstTd = $(row).find('td').eq(0)
    const lastTd  = $(row).find('td').last()

    const description = firstTd.find('span.txtTit').text().trim()
    if (!description) return

    const codRaw  = firstTd.find('span.RCod').text()
    const code    = codRaw.match(/\d+/)?.[0] ?? ''

    const qtdText = firstTd.find('span.Rqtd').text()
    const quantity = parseBRNumber(qtdText.replace(/Qtde\.:?/i, ''))

    const unText = firstTd.find('span.RUN').text()
    const unit   = unText.replace(/UN:\s*/i, '').trim() || 'UN'

    const vlText   = firstTd.find('span.RvlUnit').text()
    const unitPrice = parseBRNumber(vlText.replace(/Vl\.\s*Unit\.:?/i, ''))

    const totalPrice = parseBRNumber(lastTd.find('span.valor').text())

    items.push({ code, description, quantity, unit, unitPrice, totalPrice })
  })

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalAmount   = parseBRNumber($('#totalNota .totalNumb.txtMax').text())
  const totalTaxes    = parseBRNumber($('#totalNota .totalNumb.txtObs').text())

  // ── Invoice info ────────────────────────────────────────────────────────────
  // All in first li under #infos: "Número: 34203 Série: 37 Emissão: 04/04/2026 14:22:04"
  const infoText  = $('#infos li').first().text()

  const numberMatch   = infoText.match(/N[úu]mero:\s*(\d+)/i)
  const seriesMatch   = infoText.match(/S[ée]rie:\s*(\d+)/i)
  const emissaoMatch  = infoText.match(/Emiss[ãa]o:\s*([\d\/]+ [\d:]+)/i)
  const protocolMatch = infoText.match(/Protocolo[^:]*:\s*(\d+)/i)
  const viaMatch      = infoText.match(/Via\s+(\w[^<\n,]+)/i)
  const xmlMatch      = infoText.match(/Vers[ãa]o XML:\s*([\d.]+)/i)
  const xsltMatch     = infoText.match(/Vers[ãa]o XSLT:\s*([\d.]+)/i)
  const ambMatch      = infoText.match(/Ambiente de\s+(\w+)/i)

  // Access key: span.chave is the most precise selector
  const akFromHtml = $('span.chave').text().replace(/\D/g, '')
  const accessKey  = urlData?.accessKey
    ?? (akFromHtml.length === 44 ? akFromHtml.replace(/(.{4})/g, '$1 ').trim() : null)
    ?? ''

  // ── Notes & operator ───────────────────────────────────────────────────────
  // Last collapsible section contains: "... Operador : 001 - SG. P/ TROCA ..."
  const obsText  = $('div[data-role="collapsible"]').last().find('li').text()
  const opMatch  = obsText.match(/Operador\s*:\s*([^.]+)/i)
  const operator = opMatch ? opMatch[1].trim() : ''

  // Notes: everything after the last "." before noteworthy content
  const notesMatch = obsText.match(/\.\s*(P\/.*)/i)
  const notes = notesMatch ? notesMatch[1].trim() : undefined

  const invoice: Invoice = {
    number:                numberMatch?.[1]   ?? urlData?.invoiceNumber ?? '0',
    series:                seriesMatch?.[1]   ?? urlData?.series        ?? '0',
    issuedAt:              parseDate(emissaoMatch?.[1] ?? '') ?? urlData?.issuedAt ?? now,
    capturedAt:            now,
    accessKey,
    authorizationProtocol: protocolMatch?.[1] ?? '',
    environment:           ambMatch ? `${ambMatch[1].charAt(0).toUpperCase()}${ambMatch[1].slice(1)}` : 'Produção',
    xmlVersion:            xmlMatch?.[1]       ?? '4.00',
    xsltVersion:           xsltMatch?.[1]      ?? '2.05',
    type:                  'EMISSÃO NORMAL',
    via:                   viaMatch?.[1]?.trim() ?? 'Consumidor',
    consumer:              'Não identificado',
    operator,
  }

  const payment: Payment = {
    totalItems: items.length,
    totalAmount,
    amountPaid: totalAmount,
    change: 0,
    method: 'Não especificado',
  }

  const taxes: Taxes = {
    totalTaxes,
    taxPercentage: totalAmount > 0 ? Math.round((totalTaxes / totalAmount) * 10000) / 100 : 0,
    taxSource: 'IBPT',
    legalBasis: 'Lei Federal 12.741/2012',
  }

  return { establishment, invoice, payment, taxes, items, notes }
}

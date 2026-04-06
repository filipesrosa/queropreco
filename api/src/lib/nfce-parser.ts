import * as cheerio from 'cheerio'
import type { NFCeReceipt, Establishment, Invoice, Payment, Taxes, Item } from '../types/nfce.js'

const parseBRNumber = (s: string) =>
  parseFloat(s.trim().replace(/[R$\s.]/g, '').replace(',', '.')) || 0

function sel($: cheerio.CheerioAPI, selectors: string[]): string {
  for (const s of selectors) {
    const t = $(s).first().text().trim()
    if (t) return t
  }
  return ''
}

function parseDate(s: string): string | null {
  if (!s) return null
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})(?:[T\s]+(\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (m) {
    const [, d, mo, y, h = '00', mi = '00', se = '00'] = m
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${se}`).toISOString()
  }
  return null
}

export async function fetchNFCe(url: string): Promise<NFCeReceipt> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

  const html = await res.text()
  return parseNFCeHtml(html, url)
}

export function parseNFCeHtml(html: string, sourceUrl: string): NFCeReceipt {
  const $ = cheerio.load(html)
  const now = new Date().toISOString()

  // ── Establishment ──────────────────────────────────────────────────────────
  const rawName = sel($, [
    '.txtTopo', '#nomeEmitente', '.razaoSocial',
    'h4', '.col-xs-12.txtCenter h4', '#empresa',
  ])

  const rawCnpj =
    sel($, ['#CNPJEmitente', '.cnpj', 'span[class*="cnpj"]']) ||
    ($('body').text().match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)?.[0] ?? '')

  const establishment: Establishment = {
    name: rawName,
    cnpj: rawCnpj,
    address: sel($, ['#enderecoEmitente', '.endereco', '#logradouroEmitente', '.end-emit']),
    website: (() => { try { return new URL(sourceUrl).origin } catch { return sourceUrl } })(),
  }

  // ── Items ──────────────────────────────────────────────────────────────────
  const items: Item[] = []

  // Strategy 1 — table#tabResult (common SEFAZ SP format)
  $('table#tabResult tbody tr, table#tabResult tr.item').each((_, row) => {
    const tds = $(row).find('td')
    if (tds.length < 5) return
    const description = $(tds[1]).text().trim()
    if (!description) return
    const quantity = parseBRNumber($(tds[2]).text())
    const unit = $(tds[3]).text().trim() || 'UN'
    const unitPrice = parseBRNumber($(tds[4]).text())
    const totalPrice = tds.length >= 6 ? parseBRNumber($(tds[5]).text()) : quantity * unitPrice
    items.push({ code: $(tds[0]).text().trim(), description, quantity, unit, unitPrice, totalPrice })
  })

  // Strategy 2 — lines with class containing "item" (some retailer formats)
  if (items.length === 0) {
    $('.item, .produto, [class*="item-row"]').each((_, el) => {
      const desc = sel($, ['.xProd', '.descricao', '.nome']).trim()
      const qty = parseBRNumber($(el).find('.qCom, .qtd, .quantidade').text())
      const unit = $(el).find('.uCom, .un, .unidade').text().trim() || 'UN'
      const uPrice = parseBRNumber($(el).find('.vUnCom, .preco-unitario').text())
      const tPrice = parseBRNumber($(el).find('.vProd, .preco-total').text()) || qty * uPrice
      const code = $(el).find('.cProd, .codigo').text().trim()
      if (desc) items.push({ code, description: desc, quantity: qty, unit, unitPrice: uPrice, totalPrice: tPrice })
    })
  }

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalAmount = parseBRNumber(
    sel($, ['#valorTotalNota', '.totalNota', '#vNF', '.total-nota', 'span[class*="total"]'])
  )

  const totalTaxes = parseBRNumber(
    sel($, ['#valorTotalImposto', '.totalImpostos', '#vTotTrib', '.impostos'])
  )

  // ── Access Key ──────────────────────────────────────────────────────────────
  const akRaw = sel($, ['#chaveAcesso', '.chave-acesso', 'span[class*="chave"]', '#chave'])
  const akClean = akRaw.replace(/\D/g, '').substring(0, 44)
  const accessKey = akClean.length === 44
    ? akClean.replace(/(.{4})/g, '$1 ').trim()
    : Date.now().toString().padEnd(44, '0').replace(/(.{4})/g, '$1 ').trim()

  // ── Invoice ──────────────────────────────────────────────────────────────────
  const issuedAtRaw = sel($, ['#dataEmissao', '.data-emissao', '#dhEmi', '.emissao'])
  const invoice: Invoice = {
    number: sel($, ['#numeroNF', '#nNF', '.numero-nf', 'span[class*="numero"]']) || '0',
    series: sel($, ['#serieNF', '#serie', '.serie-nf']) || '0',
    issuedAt: parseDate(issuedAtRaw) ?? now,
    capturedAt: now,
    accessKey,
    authorizationProtocol: sel($, ['#nProt', '.protocolo', '#protocolo']),
    environment: 'Produção',
    xmlVersion: '4.00',
    xsltVersion: '2.05',
    type: 'EMISSÃO NORMAL',
    via: 'Consumidor',
    consumer: 'Não identificado',
    operator: sel($, ['#operador', '.operador']),
  }

  const payment: Payment = {
    totalItems: items.length,
    totalAmount,
    amountPaid: totalAmount,
    change: 0,
    method: sel($, ['#formaPagamento', '.forma-pagamento', '.pagamento']) || 'Não especificado',
  }

  const taxes: Taxes = {
    totalTaxes,
    taxPercentage:
      totalAmount > 0 ? Math.round((totalTaxes / totalAmount) * 10000) / 100 : 0,
    taxSource: 'IBPT',
    legalBasis: 'Lei Federal 12.741/2012',
  }

  const notes = sel($, ['.observacao', '#observacoes', '.obs', '#txtComplemento'])

  return { establishment, invoice, payment, taxes, items, notes: notes || undefined }
}

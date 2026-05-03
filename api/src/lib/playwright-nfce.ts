import { chromium } from 'playwright'
import { createWorker, PSM } from 'tesseract.js'
import { Jimp } from 'jimp'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFileSync, unlinkSync } from 'fs'
import type { NFCeReceipt } from '../types/nfce.js'

const URL_CONSULTA = 'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaPublica.aspx'
const MAX_CAPTCHA_ATTEMPTS = 5
const TIMEOUT_MS = 30000

const INIT_SCRIPT = `
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  window.chrome = { runtime: {} };
`

// ── Captcha ────────────────────────────────────────────────────────────────────

async function solveCaptcha(imageBuffer: Buffer): Promise<string> {
  const tmpIn = join(tmpdir(), `cap_in_${Date.now()}.png`)
  const tmpOut = join(tmpdir(), `cap_out_${Date.now()}.png`)

  writeFileSync(tmpIn, imageBuffer)

  try {
    const image = await Jimp.read(tmpIn)
    image.greyscale().contrast(0.8).normalize()
    await image.write(tmpOut as `${string}.${string}`)
  } finally {
    unlinkSync(tmpIn)
  }

  const worker = await createWorker('eng', 1, {
    langPath: '/app/tessdata',
    logger: () => {},
  })
  await worker.setParameters({
    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    tessedit_pageseg_mode: PSM.SINGLE_WORD,
  })

  let text = ''
  try {
    const { data } = await worker.recognize(tmpOut)
    text = data.text.trim().replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')
  } finally {
    await worker.terminate()
    try { unlinkSync(tmpOut) } catch { /* ignore */ }
  }

  return text
}

// ── DOM parser (runs inside Playwright page) ───────────────────────────────────

const DOM_PARSER = `() => {
  function txt(selector) {
    const el = document.querySelector(selector);
    return el ? el.textContent.trim() : null;
  }
  function cleanNum(text) {
    if (!text) return null;
    const clean = text.replace(/[^\\d,]/g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? null : val;
  }

  const nomeEl = document.querySelector('#u20, .txtTopo');
  const nome = nomeEl ? nomeEl.textContent.trim() : null;

  const textDivs = Array.from(document.querySelectorAll('.txtCenter > .text'));
  let cnpj = null, endereco = null;
  textDivs.forEach(div => {
    const t = div.textContent.trim();
    if (t.includes('CNPJ')) cnpj = t.replace(/CNPJ\\s*:/i, '').trim();
    else if (!endereco) endereco = t.replace(/\\s*,\\s*,\\s*/g, ', ').replace(/\\s{2,}/g, ' ').trim();
  });

  const itens = [];
  document.querySelectorAll('#tabResult tbody tr').forEach(row => {
    const nomeProd = row.querySelector('.txtTit');
    if (!nomeProd) return;
    const codEl = row.querySelector('.RCod');
    const qtdEl = row.querySelector('.Rqtd');
    const unEl = row.querySelector('.RUN');
    const vlUnitEl = row.querySelector('.RvlUnit');
    const vlTotalEl = row.querySelector('td.noWrap span.valor, span.valor');
    itens.push({
      codigo: codEl ? codEl.textContent.replace(/[()]/g, '').replace(/Código\\s*:/i, '').trim() : null,
      descricao: nomeProd.textContent.trim(),
      quantidade: cleanNum(qtdEl ? qtdEl.textContent.replace(/Qtde\\.\\s*:/i, '') : null),
      unidade: unEl ? unEl.textContent.replace(/UN\\s*:/i, '').trim() : null,
      valorUnitario: cleanNum(vlUnitEl ? vlUnitEl.textContent.replace(/Vl\\.\\s*Unit\\.\\s*:/i, '').replace(/ /g, '') : null),
      valorTotal: cleanNum(vlTotalEl ? vlTotalEl.textContent : null),
    });
  });

  let qtdItens = null, valorTotal = null;
  const formasPagamento = [];
  const totalNotaEl = document.querySelector('#totalNota');
  if (totalNotaEl) {
    const vlTotalEl = totalNotaEl.querySelector('.totalNumb.txtMax');
    valorTotal = vlTotalEl ? cleanNum(vlTotalEl.textContent) : null;
    totalNotaEl.querySelectorAll('#linhaTotal').forEach(linha => {
      const lbl = linha.querySelector('label.tx');
      const val = linha.querySelector('.totalNumb');
      if (lbl && val && lbl.textContent.trim() !== 'Troco')
        formasPagamento.push({ forma: lbl.textContent.trim(), valor: cleanNum(val.textContent) });
    });
    const firstLinha = totalNotaEl.querySelector('#linhaTotal .totalNumb');
    qtdItens = firstLinha && !totalNotaEl.querySelector('.totalNumb.txtMax')?.isSameNode(firstLinha)
      ? parseInt(firstLinha.textContent.trim(), 10) : itens.length;
  }

  let numeroNota = null, serie = null, dataEmissao = null, protocolo = null;
  document.querySelectorAll('ul[data-role="listview"] li').forEach(li => {
    const t = li.textContent;
    const numMatch = t.match(/Número\\s*:\\s*(\\d+)/i);
    const serieMatch = t.match(/Série\\s*:\\s*(\\d+)/i);
    const emissaoMatch = t.match(/Emissão\\s*:\\s*([\\d\\/\\s:]+)/i);
    const protMatch = t.match(/Protocolo de Autorização\\s*:\\s*([\\d\\s]+)/i);
    if (numMatch) numeroNota = numMatch[1];
    if (serieMatch) serie = serieMatch[1];
    if (emissaoMatch) dataEmissao = emissaoMatch[1].trim();
    if (protMatch) protocolo = protMatch[1].trim().split(/\\s+/)[0];
  });

  const chaveEl = document.querySelector('span.chave');
  return {
    emitente: { nome, cnpj, endereco },
    itens,
    totais: { qtdItens: qtdItens || itens.length, valorTotal },
    formasPagamento,
    nfce: { numeroNota, serie, dataEmissao, protocolo },
    chaveFormatada: chaveEl ? chaveEl.textContent.trim() : null,
  };
}`

// ── Adapter: seeker format → NFCeReceipt ──────────────────────────────────────

function parseBrDate(str: string | null): string {
  if (!str) return new Date().toISOString()
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (!m) return new Date().toISOString()
  const [, d, mo, y, h = '00', mi = '00', se = '00'] = m
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${se}`).toISOString()
}

function cleanCnpj(raw: string | null): string {
  return raw ? raw.replace(/[^\d]/g, '') : ''
}

function seekerToReceipt(data: Record<string, unknown>, accessKey: string): NFCeReceipt {
  const now = new Date().toISOString()
  const nfce = (data.nfce ?? {}) as Record<string, string | null>
  const emitente = (data.emitente ?? {}) as Record<string, string | null>
  const totais = (data.totais ?? {}) as Record<string, number | null>
  const pagamentos = (data.formasPagamento ?? []) as Array<{ forma: string; valor: number }>
  const itens = (data.itens ?? []) as Array<Record<string, unknown>>

  const totalAmount = totais.valorTotal ?? 0
  const amountPaid = pagamentos.reduce((s, p) => s + (p.valor ?? 0), 0)

  return {
    establishment: {
      name: (emitente.nome ?? '') as string,
      cnpj: cleanCnpj(emitente.cnpj as string | null),
      address: (emitente.endereco ?? '') as string,
      website: '',
    },
    invoice: {
      number: (nfce.numeroNota ?? '') as string,
      series: (nfce.serie ?? '') as string,
      issuedAt: parseBrDate(nfce.dataEmissao as string | null),
      capturedAt: now,
      accessKey: accessKey.replace(/(.{4})/g, '$1 ').trim(),
      authorizationProtocol: (nfce.protocolo ?? '') as string,
      environment: 'Produção',
      xmlVersion: '4.00',
      xsltVersion: '2.05',
      type: 'EMISSÃO NORMAL',
      via: 'Consumidor',
      consumer: 'Não identificado',
      operator: '',
    },
    payment: {
      totalItems: (totais.qtdItens ?? itens.length) as number,
      totalAmount,
      amountPaid: amountPaid || totalAmount,
      change: Math.max(0, amountPaid - totalAmount),
      method: pagamentos.map(p => p.forma).join(', ') || 'Não especificado',
    },
    taxes: {
      totalTaxes: 0,
      taxPercentage: 0,
      taxSource: 'IBPT',
      legalBasis: 'Lei Federal 12.741/2012',
    },
    items: itens.map(item => ({
      code: (item.codigo ?? '') as string,
      description: (item.descricao ?? '') as string,
      quantity: (item.quantidade ?? 1) as number,
      unit: (item.unidade ?? 'UN') as string,
      unitPrice: (item.valorUnitario ?? 0) as number,
      totalPrice: (item.valorTotal ?? 0) as number,
    })),
    notes: '',
  }
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function fetchNFCeViaPlaywright(accessKey: string): Promise<NFCeReceipt> {
  const key = accessKey.replace(/\D/g, '').substring(0, 44)
  if (key.length !== 44) throw new Error(`Invalid access key length: ${key.length}`)

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  })

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  })
  await context.addInitScript(INIT_SCRIPT)
  const page = await context.newPage()

  try {
    await page.goto(URL_CONSULTA, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS })
    await page.waitForSelector('#Conteudo_txtChaveAcesso', { timeout: TIMEOUT_MS })
    await page.fill('#Conteudo_txtChaveAcesso', key)
    await page.press('#Conteudo_txtChaveAcesso', 'Tab')
    await page.waitForTimeout(800)

    let captchaOk = false

    for (let attempt = 1; attempt <= MAX_CAPTCHA_ATTEMPTS; attempt++) {
      await page.waitForSelector('#ImageRand', { timeout: TIMEOUT_MS, state: 'attached' })
      const imageBuffer = await page.locator('#ImageRand').screenshot()
      const captchaText = await solveCaptcha(imageBuffer as Buffer)

      if (!captchaText || captchaText.length < 4) {
        await page.goto(URL_CONSULTA, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS })
        await page.fill('#Conteudo_txtChaveAcesso', key)
        await page.press('#Conteudo_txtChaveAcesso', 'Tab')
        await page.waitForTimeout(800)
        continue
      }

      await page.fill('#txCodigo', captchaText)
      await page.click('#Conteudo_btnConsultaResumida')

      const estado = await page.waitForFunction(() => {
        const dialogVisivel = Array.from(document.querySelectorAll('[role="dialog"]')).some(
          d => (d as HTMLElement).style.display !== 'none'
        )
        const temResultado = !!(
          document.querySelector('#u20') ||
          document.querySelector('.txtTopo') ||
          document.querySelector('#tabResult')
        )
        return (dialogVisivel || temResultado) ? { dialogVisivel, temResultado } : null
      }, { timeout: TIMEOUT_MS }).catch(() => null)

      if (!estado) {
        const btn = page.locator('.captchaGerarNovaImagem')
        if (await btn.isVisible().catch(() => false)) {
          await btn.click()
        } else {
          await page.evaluate(() => {
            const img = document.querySelector('#ImageRand')
            if (img) (img as HTMLElement).click()
          })
        }
        await page.waitForTimeout(800)
        await page.fill('#Conteudo_txtChaveAcesso', key)
        continue
      }

      const { dialogVisivel, temResultado } = await estado.jsonValue() as { dialogVisivel: boolean; temResultado: boolean }

      if (dialogVisivel && !temResultado) {
        const okBtn = page.locator('.ui-dialog:not([style*="display: none"]) button').first()
        if (await okBtn.isVisible().catch(() => false)) await okBtn.click({ force: true })
        await page.waitForTimeout(600)
        const btn = page.locator('.captchaGerarNovaImagem')
        if (await btn.isVisible().catch(() => false)) {
          await btn.click()
        } else {
          await page.evaluate(() => {
            const img = document.querySelector('#ImageRand')
            if (img) (img as HTMLElement).click()
          })
        }
        await page.waitForTimeout(800)
        await page.fill('#Conteudo_txtChaveAcesso', key)
        continue
      }

      captchaOk = true
      break
    }

    if (!captchaOk) throw new Error(`Captcha não resolvido após ${MAX_CAPTCHA_ATTEMPTS} tentativas`)

    await page.waitForLoadState('networkidle')
    const data = await page.evaluate(new Function(`return (${DOM_PARSER})()`) as () => unknown) as Record<string, unknown>
    return seekerToReceipt(data, key)
  } finally {
    await browser.close()
  }
}

export function extractAccessKey(urlOrValue: string): string | null {
  const match = urlOrValue.match(/[0-9]{44}/)
  return match ? match[0] : null
}

/**
 * Cliente SOAP para o webservice ArquivoCF da Nota Fiscal Paulista (SEFAZ/SP).
 * Manual: "Envio de Arquivo de Cupons Fiscais via Webservice" v1.2 – 17/09/2008
 *
 * Endpoint: https://www.nfp.fazenda.sp.gov.br/ws/arquivocf.asmx
 * Protocolo: SOAP 1.2 sobre SSL
 * Namespace: https://www.nfp.sp.gov.br/ws
 */

const ENDPOINT = 'https://www.nfp.fazenda.sp.gov.br/ws/arquivocf.asmx'
const NS = 'https://www.nfp.sp.gov.br/ws'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Perfil do usuário: 1 = contribuinte, 2 = contabilista, 3 = consumidor (só teste) */
export type CategoriaUsuario = 1 | 2 | 3

export interface NfpCredentials {
  usuario: string
  senha: string
  cnpj: string
  categoriaUsuario: CategoriaUsuario
}

export interface EnvioParams {
  nomeArquivo: string
  conteudoArquivo: string
  /** true = processamento normal (produção); false = simples validação */
  envioNormal: boolean
  observacoes?: string
}

/** Resultado de Enviar / Retificar */
export interface EnvioResult {
  sucesso: boolean
  /** Presente em caso de sucesso */
  dataHora?: string
  numeroLote?: string
  situacaoCodigo?: string
  situacaoDescricao?: string
  /** Presente em caso de erro */
  codigoErro?: string
  descricaoErro?: string
  raw: string
}

/** Resultado de Consultar */
export interface ConsultaResult {
  sucesso: boolean
  protocolo?: string
  statusCodigo?: string
  statusDescricao?: string
  alertasCount?: string
  cnpjEmpresa?: string
  razaoSocial?: string
  responsavel?: string
  tipoProcessamento?: string
  nomeArquivo?: string
  tamanhoArquivo?: string
  hashArquivo?: string
  observacoes?: string
  dataRecebimento?: string
  dataProcessamento?: string
  tempoProcessamento?: string
  dataReferencia?: string
  numeroCFs?: string
  valorProcessado?: string
  errosAlertas?: string[]
  mensagemErro?: string
  raw: string
}

// ---------------------------------------------------------------------------
// XML helpers
// ---------------------------------------------------------------------------

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
}

function buildEnvelope(creds: NfpCredentials, bodyContent: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Header>
    <Autenticacao
      Usuario="${escapeXml(creds.usuario)}"
      Senha="${escapeXml(creds.senha)}"
      CNPJ="${escapeXml(creds.cnpj)}"
      CategoriaUsuario="${creds.categoriaUsuario}"
      xmlns="${NS}" />
  </soap12:Header>
  <soap12:Body>
    ${bodyContent}
  </soap12:Body>
</soap12:Envelope>`
}

async function soapPost(envelope: string): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
    body: envelope,
  })

  const text = await res.text()

  if (!res.ok) {
    // SOAP faults also retornam HTTP 500; extraímos a mensagem se possível
    const faultMatch = text.match(/<(?:soap12?:)?(?:faultstring|Text)>([^<]+)<\//)
    throw new Error(faultMatch ? faultMatch[1] : `HTTP ${res.status}: ${res.statusText}`)
  }

  return text
}

function extractResult(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`)
  const m = xml.match(re)
  if (!m) throw new Error(`Tag <${tag}> não encontrada na resposta SOAP`)
  // Desfaz escape de entidades XML que o servidor possa ter aplicado
  return m[1]
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
}

// ---------------------------------------------------------------------------
// Response parsers
// ---------------------------------------------------------------------------

/**
 * Sucesso: "21/12/2007 10:25:06|0000878|103|Lote recebido com sucesso."
 * Erro:    "204|Senha não confere"
 */
export function parseEnvioResult(raw: string): EnvioResult {
  const parts = raw.split('|')

  // Data/hora no primeiro campo → sucesso
  if (parts.length >= 4 && /^\d{2}\/\d{2}\/\d{4}/.test(parts[0])) {
    return {
      sucesso: true,
      dataHora: parts[0],
      numeroLote: parts[1],
      situacaoCodigo: parts[2],
      situacaoDescricao: parts.slice(3).join('|').trim(),
      raw,
    }
  }

  return {
    sucesso: false,
    codigoErro: parts[0],
    descricaoErro: parts.slice(1).join('|').trim(),
    raw,
  }
}

/**
 * Sucesso: linha principal com 18 campos separados por "|", seguida de
 *          linhas de alertas/erros opcionais.
 *
 * Campos (índice):
 *   0  protocolo          8  nomeArquivo         15 dataReferencia
 *   1  statusCodigo       9  tamanhoArquivo       16 numeroCFs
 *   2  statusDescricao    10 hashArquivo          17 valorProcessado
 *   3  alertasCount       11 observacoes
 *   4  cnpjEmpresa        12 dataRecebimento
 *   5  razaoSocial        13 dataProcessamento
 *   6  responsavel        14 tempoProcessamento
 *   7  tipoProcessamento
 *
 * Erro: "Arquivo de lote não localizado."
 */
export function parseConsultaResult(raw: string): ConsultaResult {
  const trimmed = raw.trim()

  if (!trimmed || trimmed === 'Arquivo de lote não localizado.') {
    return { sucesso: false, mensagemErro: trimmed || 'Resposta vazia', raw }
  }

  const lines = trimmed.split('\n')
  const parts = lines[0].split('|')

  if (parts.length < 2) {
    return { sucesso: false, mensagemErro: trimmed, raw }
  }

  const errosAlertas = lines
    .slice(1)
    .map((l) => l.trim())
    .filter(Boolean)

  return {
    sucesso: true,
    protocolo: parts[0],
    statusCodigo: parts[1],
    statusDescricao: parts[2],
    alertasCount: parts[3],
    cnpjEmpresa: parts[4],
    razaoSocial: parts[5],
    responsavel: parts[6],
    tipoProcessamento: parts[7],
    nomeArquivo: parts[8],
    tamanhoArquivo: parts[9],
    hashArquivo: parts[10],
    observacoes: parts[11],
    dataRecebimento: parts[12],
    dataProcessamento: parts[13],
    tempoProcessamento: parts[14],
    dataReferencia: parts[15],
    numeroCFs: parts[16],
    valorProcessado: parts[17],
    errosAlertas: errosAlertas.length > 0 ? errosAlertas : undefined,
    raw,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Envia arquivo de cupons fiscais para validação ou processamento. */
export async function enviar(creds: NfpCredentials, params: EnvioParams): Promise<EnvioResult> {
  const body = `<Enviar xmlns="${NS}">
      <NomeArquivo>${escapeXml(params.nomeArquivo)}</NomeArquivo>
      <ConteudoArquivo>${escapeXml(params.conteudoArquivo)}</ConteudoArquivo>
      <EnvioNormal>${params.envioNormal}</EnvioNormal>
      <Observacoes>${escapeXml(params.observacoes ?? '')}</Observacoes>
    </Enviar>`

  const xml = await soapPost(buildEnvelope(creds, body))
  return parseEnvioResult(extractResult(xml, 'EnviarResult'))
}

/** Retifica arquivo de cupons fiscais já enviado. */
export async function retificar(creds: NfpCredentials, params: EnvioParams): Promise<EnvioResult> {
  const body = `<Retificar xmlns="${NS}">
      <NomeArquivo>${escapeXml(params.nomeArquivo)}</NomeArquivo>
      <ConteudoArquivo>${escapeXml(params.conteudoArquivo)}</ConteudoArquivo>
      <EnvioNormal>${params.envioNormal}</EnvioNormal>
      <Observacoes>${escapeXml(params.observacoes ?? '')}</Observacoes>
    </Retificar>`

  const xml = await soapPost(buildEnvelope(creds, body))
  return parseEnvioResult(extractResult(xml, 'RetificarResult'))
}

/** Consulta o resultado do processamento de um lote pelo número de protocolo. */
export async function consultar(creds: NfpCredentials, protocolo: string): Promise<ConsultaResult> {
  const body = `<Consultar xmlns="${NS}">
      <Protocolo>${escapeXml(protocolo)}</Protocolo>
    </Consultar>`

  const xml = await soapPost(buildEnvelope(creds, body))
  return parseConsultaResult(extractResult(xml, 'ConsultarResult'))
}

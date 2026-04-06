import { FastifyInstance } from 'fastify'
import * as nfpSoap from '../lib/nfp-soap.js'
import type { NfpCredentials, EnvioParams } from '../lib/nfp-soap.js'

/**
 * Resolve credenciais NFP priorizando o body da requisição,
 * com fallback para variáveis de ambiente (NFP_USUARIO, NFP_SENHA,
 * NFP_CNPJ, NFP_CATEGORIA).
 */
function resolveCredentials(body: Record<string, unknown>): NfpCredentials | null {
  const usuario = String(body.usuario ?? process.env.NFP_USUARIO ?? '')
  const senha   = String(body.senha   ?? process.env.NFP_SENHA   ?? '')
  const cnpj    = String(body.cnpj    ?? process.env.NFP_CNPJ    ?? '')
  const cat     = Number(body.categoriaUsuario ?? process.env.NFP_CATEGORIA ?? 1)

  if (!usuario || !senha || !cnpj) return null

  return { usuario, senha, cnpj, categoriaUsuario: cat as 1 | 2 | 3 }
}

function resolveEnvioParams(body: Record<string, unknown>): EnvioParams | null {
  const nomeArquivo    = String(body.nomeArquivo    ?? '')
  const conteudoArquivo = String(body.conteudoArquivo ?? '')

  if (!nomeArquivo || !conteudoArquivo) return null

  return {
    nomeArquivo,
    conteudoArquivo,
    envioNormal:  Boolean(body.envioNormal ?? false),
    observacoes:  body.observacoes ? String(body.observacoes) : undefined,
  }
}

// ---------------------------------------------------------------------------

export async function nfpRoutes(app: FastifyInstance) {
  /**
   * POST /nfp/enviar
   *
   * Body:
   *   usuario?          – sobrescreve NFP_USUARIO
   *   senha?            – sobrescreve NFP_SENHA
   *   cnpj?             – sobrescreve NFP_CNPJ
   *   categoriaUsuario? – 1 (contribuinte) | 2 (contabilista) | 3 (consumidor/teste)
   *   nomeArquivo       – nome do arquivo ECF
   *   conteudoArquivo   – conteúdo completo do arquivo ECF (texto)
   *   envioNormal?      – true = produção, false = validação (padrão: false)
   *   observacoes?      – texto livre
   */
  app.post('/nfp/enviar', async (request, reply) => {
    const body = request.body as Record<string, unknown>

    const creds = resolveCredentials(body)
    if (!creds) {
      return reply.status(400).send({ error: 'usuario, senha e cnpj são obrigatórios (body ou variáveis de ambiente NFP_*)' })
    }

    const params = resolveEnvioParams(body)
    if (!params) {
      return reply.status(400).send({ error: 'nomeArquivo e conteudoArquivo são obrigatórios' })
    }

    try {
      const result = await nfpSoap.enviar(creds, params)
      return reply.status(result.sucesso ? 200 : 502).send({ data: result })
    } catch (error) {
      app.log.error(error)
      return reply.status(502).send({ error: error instanceof Error ? error.message : 'Falha ao enviar arquivo' })
    }
  })

  /**
   * POST /nfp/retificar
   *
   * Mesmos campos de /nfp/enviar. Usado para retificar um arquivo já enviado.
   */
  app.post('/nfp/retificar', async (request, reply) => {
    const body = request.body as Record<string, unknown>

    const creds = resolveCredentials(body)
    if (!creds) {
      return reply.status(400).send({ error: 'usuario, senha e cnpj são obrigatórios (body ou variáveis de ambiente NFP_*)' })
    }

    const params = resolveEnvioParams(body)
    if (!params) {
      return reply.status(400).send({ error: 'nomeArquivo e conteudoArquivo são obrigatórios' })
    }

    try {
      const result = await nfpSoap.retificar(creds, params)
      return reply.status(result.sucesso ? 200 : 502).send({ data: result })
    } catch (error) {
      app.log.error(error)
      return reply.status(502).send({ error: error instanceof Error ? error.message : 'Falha ao retificar arquivo' })
    }
  })

  /**
   * POST /nfp/consultar
   *
   * Body:
   *   protocolo   – número do protocolo retornado pelo envio
   *   usuario?    – sobrescreve NFP_USUARIO
   *   senha?      – sobrescreve NFP_SENHA
   *   cnpj?       – sobrescreve NFP_CNPJ
   *   categoriaUsuario?
   */
  app.post('/nfp/consultar', async (request, reply) => {
    const body = request.body as Record<string, unknown>

    const creds = resolveCredentials(body)
    if (!creds) {
      return reply.status(400).send({ error: 'usuario, senha e cnpj são obrigatórios (body ou variáveis de ambiente NFP_*)' })
    }

    const protocolo = String(body.protocolo ?? '')
    if (!protocolo) {
      return reply.status(400).send({ error: 'protocolo é obrigatório' })
    }

    try {
      const result = await nfpSoap.consultar(creds, protocolo)
      return reply.status(result.sucesso ? 200 : 404).send({ data: result })
    } catch (error) {
      app.log.error(error)
      return reply.status(502).send({ error: error instanceof Error ? error.message : 'Falha ao consultar protocolo' })
    }
  })
}

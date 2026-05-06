import type { FastifyInstance } from 'fastify'
import { notifyEmitter } from '../lib/pg-notify.js'

export async function streamsRoutes(app: FastifyInstance) {
  // GET /backoffice/readings/stream — JWT required
  app.get('/backoffice/readings/stream', { preHandler: app.verifyJwt }, async (request, reply) => {
    reply.hijack()
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': request.headers.origin ?? '*',
      'Access-Control-Allow-Credentials': 'true',
    })
    reply.raw.write(': connected\n\n')

    const send = (payload: string) => reply.raw.write(`data: ${payload}\n\n`)
    notifyEmitter.on('reading_created', send)

    const ping = setInterval(() => reply.raw.write(': ping\n\n'), 30000)

    request.raw.on('close', () => {
      notifyEmitter.off('reading_created', send)
      clearInterval(ping)
    })
  })

  // GET /backoffice/donations/stream — JWT required
  app.get('/backoffice/donations/stream', { preHandler: app.verifyJwt }, async (request, reply) => {

    reply.hijack()
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': request.headers.origin ?? '*',
      'Access-Control-Allow-Credentials': 'true',
    })
    reply.raw.write(': connected\n\n')

    const send = (payload: string) => reply.raw.write(`data: ${payload}\n\n`)
    notifyEmitter.on('donation_updated', send)

    const ping = setInterval(() => reply.raw.write(': ping\n\n'), 30000)

    request.raw.on('close', () => {
      notifyEmitter.off('donation_updated', send)
      clearInterval(ping)
    })
  })
}

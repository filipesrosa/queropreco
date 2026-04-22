import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { sendWhatsAppMessage } from '../lib/zapnit.js'

const WHATSAPP_DESTINATION = '5519989010326'

export async function campoRoutes(app: FastifyInstance) {
  app.post<{ Body: { value: string } }>('/campo', async (request, reply) => {
    const { value } = request.body

    if (typeof value !== 'string' || value.trim() === '') {
      return reply.status(400).send({ error: 'value is required' })
    }

    try {
      const record = await prisma.randomValue.create({ data: { value } })

      sendWhatsAppMessage(WHATSAPP_DESTINATION, `A new value has been read in queropreco:\n\n${value}`).catch((err) => {
        app.log.error({ err }, 'Failed to send WhatsApp message')
      })

      return reply.status(201).send({ data: record })
    } catch (error) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to store value' })
    }
  })
}

import Fastify from 'fastify'
import cors from '@fastify/cors'
import { billsRoutes } from './routes/bills.js'
import { captureRoutes } from './routes/capture.js'
import { nfpRoutes } from './routes/nfp.js'

const app = Fastify({
  logger: {
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

async function bootstrap() {
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? '*',
  })

  await app.register(captureRoutes)
  await app.register(billsRoutes)
  await app.register(nfpRoutes)

  const port = Number(process.env.PORT ?? 3001)
  const host = process.env.HOST ?? '0.0.0.0'

  await app.listen({ port, host })
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})

import Fastify from 'fastify'
import cors from '@fastify/cors'
import { billsRoutes } from './routes/bills.js'
import { captureRoutes } from './routes/capture.js'
import { nfpRoutes } from './routes/nfp.js'
import { itemsRoutes } from './routes/items.js'
import { campoRoutes } from './routes/campo.js'
import { randomValuesRoutes } from './routes/random-values.js'
import { compareRoutes } from './routes/compare.js'
import { prisma } from './lib/prisma.js'
import authPlugin from './lib/auth.js'
import { authRoutes } from './routes/auth.js'
import { entitiesRoutes } from './routes/entities.js'
import { usersRoutes } from './routes/users.js'
import { backofficeRoutes } from './routes/backoffice.js'
import { productsRoutes } from './routes/products.js'

const app = Fastify({
  logger: {
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

async function enrichGeo(logId: string, ip: string | null) {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country,status`)
    const data = await res.json() as { status: string; city?: string; regionName?: string; country?: string }
    if (data.status !== 'success') return
    await prisma.requestLog.update({
      where: { id: logId },
      data: { city: data.city, region: data.regionName, country: data.country, geoFetched: true },
    })
  } catch {}
}

async function bootstrap() {
  const corsOrigin = process.env.CORS_ORIGIN ?? '*'
  await app.register(cors, {
    // `true` reflects the request Origin header — required when credentials: true
    // (browsers reject `Access-Control-Allow-Origin: *` with credentialed requests)
    origin: corsOrigin === '*' ? true : corsOrigin,
    credentials: true,
  })

  await app.register(authPlugin)
  await app.register(authRoutes)
  await app.register(entitiesRoutes)
  await app.register(usersRoutes)
  await app.register(backofficeRoutes)
  await app.register(productsRoutes)

  app.addHook('onRequest', async (request) => {
    const sessionId = request.headers['x-session-id'] as string | undefined
    if (!sessionId) return

    const ip =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      request.ip

    prisma.requestLog.create({
      data: {
        sessionId,
        ipAddress: ip,
        userAgent: request.headers['user-agent'] ?? null,
        path: request.url,
        method: request.method,
      },
    })
      .then((log) => enrichGeo(log.id, ip))
      .catch(() => {})
  })

  await app.register(captureRoutes)
  await app.register(billsRoutes)
  await app.register(nfpRoutes)
  await app.register(itemsRoutes)
  await app.register(campoRoutes)
  await app.register(randomValuesRoutes)
  await app.register(compareRoutes)

  const port = Number(process.env.PORT ?? 3001)
  const host = process.env.HOST ?? '0.0.0.0'

  await app.listen({ port, host })
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})

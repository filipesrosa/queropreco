import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { sendWhatsAppMessage } from '../lib/zapnit.js'
import type { JWTUser } from '../lib/auth.js'

function currentWeekStart(): Date {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff))
  return monday
}

function parseWeekStart(raw: string): Date {
  const d = new Date(raw)
  // Snap to Monday 00:00 UTC
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff))
}

function dayBounds(dateStr: string, timezone = '-03:00'): { gte: Date; lt: Date } {
  const offsetMatch = timezone.match(/([+-])(\d{2}):(\d{2})/)
  const offsetMinutes = offsetMatch
    ? (offsetMatch[1] === '+' ? 1 : -1) * (parseInt(offsetMatch[2]) * 60 + parseInt(offsetMatch[3]))
    : -180
  const localMidnight = new Date(`${dateStr}T00:00:00.000Z`)
  const utcMidnight = new Date(localMidnight.getTime() - offsetMinutes * 60_000)
  return { gte: utcMidnight, lt: new Date(utcMidnight.getTime() + 86_400_000) }
}

async function triggerGoalNotification(userId: string, entityId: string) {
  try {
    const weekStart = currentWeekStart()
    const goal = await prisma.readingGoal.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
      include: { entity: true, user: true },
    })
    if (!goal || goal.notifiedAt || !goal.entity.notificationPhone) return

    const weekEnd = new Date(weekStart.getTime() + goal.entity.weekDays * 86_400_000)
    const count = await prisma.userReading.count({
      where: { userId, entityId, createdAt: { gte: weekStart, lt: weekEnd } },
    })
    if (count < goal.target) return

    await sendWhatsAppMessage(
      goal.entity.notificationPhone,
      `${goal.user.name} (CPF: ${goal.user.cpf}) atingiu a meta de leituras desta semana! 🎉`,
    )
    await prisma.readingGoal.update({ where: { id: goal.id }, data: { notifiedAt: new Date() } })
  } catch {
    // notification failures are non-fatal
  }
}

export async function backofficeRoutes(app: FastifyInstance) {
  // ── POST /backoffice/readings ─────────────────────────────────────────────

  app.post('/backoffice/readings', async (request, reply) => {
    const body = request.body as {
      accessKey: string
      readerName?: string
      readerCpf?: string
      entityId?: string
    }

    if (!body.accessKey || !/^\d{44}$/.test(body.accessKey)) {
      return reply.status(400).send({ error: 'accessKey must be exactly 44 digits' })
    }

    let userId: string | null = null
    let readerName: string | null = body.readerName ?? null
    let readerCpf: string | null = body.readerCpf ?? null
    let entityId: string | null = body.entityId ?? null

    // If authenticated, override with JWT data
    try {
      await request.jwtVerify()
      const me = request.user as JWTUser
      userId = me.id
      entityId = me.entityId
      if (!readerName || !readerCpf) {
        const user = await prisma.user.findUnique({ where: { id: me.id } })
        if (user) {
          readerName = user.name
          readerCpf = user.cpf
        }
      }
    } catch {
      // unauthenticated — use body values
    }

    if (userId) {
      const existing = await prisma.userReading.findFirst({
        where: { userId, accessKey: body.accessKey },
        select: { id: true },
      })
      if (existing) {
        return reply.status(409).send({ error: 'Cupom já registrado por você' })
      }
    }

    const reading = await prisma.userReading.create({
      data: {
        userId,
        readerName,
        readerCpf,
        accessKey: body.accessKey,
        entityId,
      },
    })

    // Fire-and-forget goal notification for authenticated readers with entity
    if (userId && entityId) {
      triggerGoalNotification(userId, entityId)
    }

    return reply.status(201).send(reading)
  })

  // ── GET /backoffice/readings/count ────────────────────────────────────────

  app.get('/backoffice/readings/count', { preHandler: app.verifyJwt }, async (request) => {
    const me = request.user as JWTUser
    const { date = new Date().toISOString().slice(0, 10), timezone = '-03:00', entityId } =
      request.query as { date?: string; timezone?: string; entityId?: string }

    const bounds = dayBounds(date, timezone)
    const baseWhere = { createdAt: bounds }

    if (me.role === 'READER') {
      const count = await prisma.userReading.count({
        where: { ...baseWhere, userId: me.id },
      })
      return { count, date, userId: me.id }
    }

    if (me.role === 'ENTITY_ADMIN') {
      const count = await prisma.userReading.count({
        where: { ...baseWhere, entityId: me.entityId },
      })
      return { count, date, entityId: me.entityId }
    }

    // ADMIN
    const where = entityId ? { ...baseWhere, entityId } : baseWhere
    const count = await prisma.userReading.count({ where })
    return { count, date, entityId: entityId ?? null }
  })

  // ── GET /backoffice/readings/today ───────────────────────────────────────

  app.get('/backoffice/readings/today', { preHandler: app.verifyJwt }, async (request) => {
    const me = request.user as JWTUser
    const { date = new Date().toISOString().slice(0, 10), timezone = '-03:00', entityId } =
      request.query as { date?: string; timezone?: string; entityId?: string }

    const bounds = dayBounds(date, timezone)

    let where: any = { createdAt: bounds }
    if (me.role === 'READER') {
      where.userId = me.id
    } else if (me.role === 'ENTITY_ADMIN') {
      where.entityId = me.entityId
    } else if (entityId) {
      where.entityId = entityId
    }

    const readings = await prisma.userReading.findMany({
      where,
      select: { id: true, accessKey: true, readerName: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    return readings
  })

  // ── GET /backoffice/readings/anonymous ────────────────────────────────────

  app.get('/backoffice/readings/anonymous', {
    preHandler: app.requireRole(['ADMIN', 'ENTITY_ADMIN']),
  }, async (request) => {
    const me = request.user as JWTUser
    const { entityId: qEntityId, from, to } =
      request.query as { entityId?: string; from?: string; to?: string }

    const resolvedEntityId = me.role === 'ENTITY_ADMIN' ? me.entityId : qEntityId

    const dateFilter: any = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to)

    const where: any = { userId: null }
    if (resolvedEntityId) where.entityId = resolvedEntityId
    if (from || to) where.createdAt = dateFilter

    const readings = await prisma.userReading.findMany({
      where,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    // Aggregate by date
    const byDate: Record<string, number> = {}
    for (const r of readings) {
      const d = r.createdAt.toISOString().slice(0, 10)
      byDate[d] = (byDate[d] ?? 0) + 1
    }

    return {
      count: readings.length,
      entityId: resolvedEntityId ?? null,
      dates: Object.entries(byDate).map(([date, count]) => ({ date, count })),
    }
  })

  // ── GET /backoffice/reports/readers ───────────────────────────────────────

  app.get('/backoffice/reports/readers', {
    preHandler: app.requireRole(['ADMIN', 'ENTITY_ADMIN']),
  }, async (request) => {
    const me = request.user as JWTUser
    const { entityId: qEntityId, from, to } =
      request.query as { entityId?: string; from?: string; to?: string }

    const resolvedEntityId = me.role === 'ENTITY_ADMIN' ? me.entityId : qEntityId

    const dateFilter: any = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to)

    const where: any = {
      readerName: { not: null },
      readerCpf: { not: null },
      entityId: { not: null },
    }
    if (resolvedEntityId) where.entityId = resolvedEntityId
    if (from || to) where.createdAt = dateFilter

    const readings = await prisma.userReading.findMany({
      where,
      select: { userId: true, readerName: true, readerCpf: true, createdAt: true },
    })

    // Group by readerCpf
    const map = new Map<string, { readerName: string; readerCpf: string; userId: string | null; count: number }>()
    for (const r of readings) {
      const key = r.readerCpf!
      if (!map.has(key)) {
        map.set(key, { readerName: r.readerName!, readerCpf: r.readerCpf!, userId: r.userId, count: 0 })
      }
      map.get(key)!.count++
    }

    const weekStart = currentWeekStart()
    const goals = resolvedEntityId
      ? await prisma.readingGoal.findMany({
          where: { entityId: resolvedEntityId, weekStart },
        })
      : []

    const goalMap = new Map(goals.map((g) => [g.userId, g.target]))

    const result = Array.from(map.values()).map((r) => {
      const target = r.userId ? goalMap.get(r.userId) : undefined
      return {
        ...r,
        goal: target ?? null,
        goalPercent: target ? Math.round((r.count / target) * 100) : null,
      }
    })

    return result.sort((a, b) => b.count - a.count)
  })

  // ── POST /backoffice/goals ────────────────────────────────────────────────

  app.post('/backoffice/goals', {
    preHandler: app.requireRole(['ADMIN', 'ENTITY_ADMIN']),
  }, async (request, reply) => {
    const me = request.user as JWTUser
    const body = request.body as { userId: string; weekStart: string; target: number; recurring?: boolean }

    if (!body.userId || !body.weekStart || !body.target) {
      return reply.status(400).send({ error: 'userId, weekStart and target are required' })
    }

    const targetUser = await prisma.user.findUnique({ where: { id: body.userId } })
    if (!targetUser) return reply.status(404).send({ error: 'User not found' })
    if (me.role === 'ENTITY_ADMIN' && targetUser.entityId !== me.entityId) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    const weekStart = parseWeekStart(body.weekStart)
    const entityId = targetUser.entityId!
    const recurring = body.recurring ?? false

    const goal = await prisma.readingGoal.upsert({
      where: { userId_weekStart: { userId: body.userId, weekStart } },
      update: { target: body.target, recurring, createdBy: me.id },
      create: { userId: body.userId, entityId, weekStart, target: body.target, recurring, createdBy: me.id },
    })
    return reply.status(201).send(goal)
  })

  // ── GET /backoffice/goals ─────────────────────────────────────────────────

  app.get('/backoffice/goals', {
    preHandler: app.requireRole(['ADMIN', 'ENTITY_ADMIN']),
  }, async (request) => {
    const me = request.user as JWTUser
    const { entityId: qEntityId, weekStart: qWeekStart } =
      request.query as { entityId?: string; weekStart?: string }

    const resolvedEntityId = me.role === 'ENTITY_ADMIN' ? me.entityId : qEntityId
    const weekStart = qWeekStart ? parseWeekStart(qWeekStart) : currentWeekStart()

    const where: any = { weekStart }
    if (resolvedEntityId) where.entityId = resolvedEntityId

    const goals = await prisma.readingGoal.findMany({
      where,
      include: {
        user: { select: { name: true, cpf: true } },
        entity: { select: { weekDays: true } },
      },
    })

    const withProgress = await Promise.all(
      goals.map(async (g) => {
        const weekEnd = new Date(weekStart.getTime() + g.entity.weekDays * 86_400_000)
        const count = await prisma.userReading.count({
          where: { userId: g.userId, entityId: g.entityId, createdAt: { gte: weekStart, lt: weekEnd } },
        })
        return { ...g, current: count, goalPercent: Math.round((count / g.target) * 100), inherited: false }
      }),
    )

    // For readers in the entity without an explicit goal, fall back to latest recurring
    if (!resolvedEntityId) return withProgress

    const explicitUserIds = new Set(goals.map((g) => g.userId))
    const readersWithoutGoal = await prisma.user.findMany({
      where: { entityId: resolvedEntityId, role: 'READER', active: true, id: { notIn: [...explicitUserIds] } },
      select: { id: true, name: true, cpf: true },
    })

    const entityWeekDays = goals[0]?.entity.weekDays
      ?? (await prisma.entity.findUnique({ where: { id: resolvedEntityId }, select: { weekDays: true } }))?.weekDays
      ?? 7
    const weekEnd = new Date(weekStart.getTime() + entityWeekDays * 86_400_000)

    const inherited = (await Promise.all(
      readersWithoutGoal.map(async (r) => {
        const recurring = await prisma.readingGoal.findFirst({
          where: { userId: r.id, recurring: true, weekStart: { lt: weekStart } },
          orderBy: { weekStart: 'desc' },
        })
        if (!recurring) return null
        const count = await prisma.userReading.count({
          where: { userId: r.id, entityId: resolvedEntityId, createdAt: { gte: weekStart, lt: weekEnd } },
        })
        return {
          ...recurring,
          weekStart,
          user: { name: r.name, cpf: r.cpf },
          entity: { weekDays: entityWeekDays },
          current: count,
          goalPercent: Math.round((count / recurring.target) * 100),
          inherited: true,
        }
      }),
    )).filter(Boolean)

    return [...withProgress, ...inherited]
  })

  // ── PUT /backoffice/goals/:id ─────────────────────────────────────────────

  app.put('/backoffice/goals/:id', {
    preHandler: app.requireRole(['ADMIN', 'ENTITY_ADMIN']),
  }, async (request, reply) => {
    const me = request.user as JWTUser
    const { id } = request.params as { id: string }
    const { target, recurring } = request.body as { target: number; recurring?: boolean }

    const goal = await prisma.readingGoal.findUnique({
      where: { id },
      include: { entity: { select: { weekDays: true } } },
    })
    if (!goal) return reply.status(404).send({ error: 'Not found' })
    if (me.role === 'ENTITY_ADMIN' && goal.entityId !== me.entityId) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    const weekStart = goal.weekStart
    const weekEnd = new Date(weekStart.getTime() + goal.entity.weekDays * 86_400_000)
    const currentCount = await prisma.userReading.count({
      where: { userId: goal.userId, entityId: goal.entityId, createdAt: { gte: weekStart, lt: weekEnd } },
    })

    const notifiedAt = goal.notifiedAt && target > currentCount ? null : goal.notifiedAt

    const updated = await prisma.readingGoal.update({
      where: { id },
      data: { target, notifiedAt, ...(recurring !== undefined ? { recurring } : {}) },
    })
    return updated
  })

  // ── GET /backoffice/my-goal ───────────────────────────────────────────────

  app.get('/backoffice/my-goal', { preHandler: app.verifyJwt }, async (request) => {
    const me = request.user as JWTUser
    const weekStart = currentWeekStart()

    const entity = me.entityId
      ? await prisma.entity.findUnique({ where: { id: me.entityId }, select: { weekDays: true } })
      : null
    const weekEnd = new Date(weekStart.getTime() + (entity?.weekDays ?? 7) * 86_400_000)

    let goal = await prisma.readingGoal.findUnique({
      where: { userId_weekStart: { userId: me.id, weekStart } },
    })

    if (!goal) {
      goal = await prisma.readingGoal.findFirst({
        where: { userId: me.id, recurring: true, weekStart: { lt: weekStart } },
        orderBy: { weekStart: 'desc' },
      })
    }

    const count = await prisma.userReading.count({
      where: { userId: me.id, createdAt: { gte: weekStart, lt: weekEnd } },
    })

    return {
      target: goal?.target ?? null,
      current: count,
      goalPercent: goal ? Math.round((count / goal.target) * 100) : null,
      weekStart: weekStart.toISOString().slice(0, 10),
    }
  })

  // ── GET /backoffice/entity-config ─────────────────────────────────────────

  app.get('/backoffice/entity-config', {
    preHandler: app.requireRole(['ADMIN', 'ENTITY_ADMIN']),
  }, async (request, reply) => {
    const me = request.user as JWTUser
    const { entityId: qEntityId } = request.query as { entityId?: string }
    const resolvedId = me.role === 'ENTITY_ADMIN' ? me.entityId! : qEntityId
    if (!resolvedId) return reply.status(400).send({ error: 'entityId required' })

    const entity = await prisma.entity.findUnique({ where: { id: resolvedId }, select: { weekDays: true } })
    if (!entity) return reply.status(404).send({ error: 'Not found' })
    return entity
  })

  // ── PUT /backoffice/entity-config ─────────────────────────────────────────

  app.put('/backoffice/entity-config', {
    preHandler: app.requireRole(['ADMIN', 'ENTITY_ADMIN']),
  }, async (request, reply) => {
    const me = request.user as JWTUser
    const body = request.body as { weekDays: number; entityId?: string }
    const resolvedId = me.role === 'ENTITY_ADMIN' ? me.entityId! : body.entityId
    if (!resolvedId) return reply.status(400).send({ error: 'entityId required' })

    const weekDays = Number(body.weekDays)
    if (![5, 6, 7].includes(weekDays)) {
      return reply.status(400).send({ error: 'weekDays must be 5, 6 or 7' })
    }

    const entity = await prisma.entity.update({ where: { id: resolvedId }, data: { weekDays } })
    return { weekDays: entity.weekDays }
  })
}

import { Queue, Worker, type Job } from 'bullmq'
import IORedis from 'ioredis'
import { prisma } from './prisma.js'
import { buildSefazConsultaUrl, fetchNFCe } from './nfce-parser.js'
import { enrichEstablishment } from './enrich.js'
import { upsertBill } from './bill-upsert.js'

export interface ScrapingJobData {
  readingId: string
  accessKey: string
}

const QUEUE_NAME = 'nfce-scraping'
const MAX_ATTEMPTS = 3

let connection: IORedis
let queue: Queue<ScrapingJobData>

function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    })
  }
  return connection
}

export function getQueue(): Queue<ScrapingJobData> {
  if (!queue) queue = new Queue(QUEUE_NAME, { connection: getConnection() })
  return queue
}

export async function addScrapingJob(readingId: string, accessKey: string): Promise<void> {
  await getQueue().add(
    'scrape',
    { readingId, accessKey },
    {
      attempts: MAX_ATTEMPTS,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  )
}

async function processJob(job: Job<ScrapingJobData>): Promise<void> {
  const { readingId, accessKey } = job.data

  const url = buildSefazConsultaUrl(accessKey)
  if (!url) {
    await prisma.userReading.update({
      where: { id: readingId },
      data: { scrapeStatus: 'failed', scrapeError: 'Unsupported state code in accessKey' },
    })
    return
  }

  await prisma.userReading.update({
    where: { id: readingId },
    data: { scrapeStatus: 'processing', scrapeAttempts: { increment: 1 }, scrapeError: null },
  })

  let receipt = await fetchNFCe(url)
  receipt = await enrichEstablishment(receipt)
  await prisma.$transaction(tx => upsertBill(tx, receipt))

  await prisma.userReading.update({
    where: { id: readingId },
    data: { scrapeStatus: 'done', scrapedAt: new Date(), scrapeError: null },
  })
}

export function startScrapingWorker(): Worker<ScrapingJobData> {
  const worker = new Worker<ScrapingJobData>(QUEUE_NAME, processJob, {
    connection: getConnection(),
    concurrency: 3,
  })

  worker.on('failed', async (job, err) => {
    if (!job) return
    const isLastAttempt = job.attemptsMade >= MAX_ATTEMPTS
    if (isLastAttempt) {
      await prisma.userReading.update({
        where: { id: job.data.readingId },
        data: { scrapeStatus: 'failed', scrapeError: err.message },
      }).catch(() => {})
    }
  })

  return worker
}

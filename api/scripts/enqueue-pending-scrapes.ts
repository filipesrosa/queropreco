import { PrismaClient } from '@prisma/client'
import { addScrapingJob } from './dist/lib/scraping-queue.js'

const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.userReading.findMany({
    where: { scrapeStatus: 'pending' },
    select: { id: true, accessKey: true },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`Enqueuing ${rows.length} pending readings...`)

  for (const row of rows) {
    await addScrapingJob(row.id, row.accessKey)
  }

  console.log('Done.')
  await prisma.$disconnect()
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })

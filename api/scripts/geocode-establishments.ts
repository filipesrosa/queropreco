import { PrismaClient } from '@prisma/client'
import { geocodeAddress } from '../src/lib/geocode.js'

const prisma = new PrismaClient()

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const rows = await prisma.establishment.findMany({
    where: { latitude: null },
    select: { id: true, name: true, address: true },
  })

  console.log(`Found ${rows.length} establishments to geocode`)

  for (let i = 0; i < rows.length; i++) {
    const est = rows[i]
    process.stdout.write(`[${i + 1}/${rows.length}] ${est.name} ... `)

    const coords = await geocodeAddress(est.address)
    if (coords) {
      await prisma.establishment.update({
        where: { id: est.id },
        data: { latitude: coords.lat, longitude: coords.lng },
      })
      console.log(`${coords.lat}, ${coords.lng}`)
    } else {
      console.log('NOT FOUND')
    }

    // Nominatim ToS: max 1 req/sec, 2s to be safe and avoid 429s
    await sleep(2000)
  }

  console.log('Done.')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

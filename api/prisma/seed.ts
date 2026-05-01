import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashed = await bcrypt.hash('9U7UWh%Ut6%Jy8EG6#@2', 10)
  await prisma.user.upsert({
    where: { email: 'filipesrosa@gmail.com' },
    update: {},
    create: {
      name: 'Filipe Rosa',
      cpf: '38319511879',
      email: 'filipesrosa@gmail.com',
      password: hashed,
      role: 'ADMIN',
      active: true,
    },
  })
  console.log('Seeded: filipesrosa@gmail.com (ADMIN)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

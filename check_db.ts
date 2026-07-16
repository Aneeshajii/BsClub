import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const registrations = await prisma.registration.findMany({ take: 5, orderBy: { id: 'desc' } });
  console.log('Recent Registrations:', registrations);
}

main().catch(console.error).finally(() => prisma.$disconnect());

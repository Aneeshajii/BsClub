const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.registration.findFirst({ orderBy: { id: 'desc' } })
  .then(console.log)
  .catch(console.error)
  .finally(() => prisma.$disconnect());

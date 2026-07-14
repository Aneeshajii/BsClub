import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const regs = await prisma.registration.findMany({ select: { name: true, gender: true, venue: true } });
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  console.log("Settings:", settings);
  console.log("Registrations:", regs);
}
main().catch(console.error).finally(() => prisma.$disconnect());

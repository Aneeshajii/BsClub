import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.settings.update({
    where: { id: 1 },
    data: {
      venue1Name: 'Khel Academy, Kazhakuttom (10:00 to 12:00)',
      venue2Name: 'Falcon Academy (10:30 to 12:30)'
    }
  });
  console.log("Fixed!");
}
main().catch(console.error).finally(() => prisma.$disconnect());

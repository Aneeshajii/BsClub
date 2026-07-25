import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const allRegistrations = await prisma.registration.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, registrationId: true }
  });
  
  console.log('Total Count:', allRegistrations.length);
  if (allRegistrations.length > 0) {
    console.log('First ID:', allRegistrations[0].id);
    console.log('Last ID:', allRegistrations[allRegistrations.length - 1].id);
    console.log('First Reg ID:', allRegistrations[0].registrationId);
    console.log('Last Reg ID:', allRegistrations[allRegistrations.length - 1].registrationId);
    
    // Check for gaps
    const ids = allRegistrations.map(r => r.id);
    let gaps = 0;
    for(let i = 1; i < ids.length; i++) {
        if(ids[i] - ids[i-1] > 1) {
            gaps += (ids[i] - ids[i-1] - 1);
        }
    }
    console.log('Missing IDs (gaps):', gaps);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

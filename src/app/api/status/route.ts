import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: 1 }
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: 1, maxMale: 29, maxFemale: 29, registrationOpen: true }
      });
    }

    const maleCount = await prisma.registration.count({
      where: { gender: 'Male' }
    });

    const femaleCount = await prisma.registration.count({
      where: { gender: 'Female' }
    });

    const isMaleFull = maleCount >= settings.maxMale;
    const isFemaleFull = femaleCount >= settings.maxFemale;
    const isRegistrationFull = isMaleFull && isFemaleFull;
    const isOpen = settings.registrationOpen && !isRegistrationFull;

    return NextResponse.json({
      settings,
      counts: {
        male: maleCount,
        female: femaleCount,
        total: maleCount + femaleCount
      },
      status: {
        isMaleFull,
        isFemaleFull,
        isRegistrationFull,
        isOpen
      }
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}

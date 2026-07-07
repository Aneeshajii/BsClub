import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: 1 }
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: 1, maxMale: 29, maxFemale: 29, registrationOpen: true, qrCodeImageUrl: '', announcementTitle: '', announcementMessage: '', announcementEnabled: false }
      });
    }

    const maleCount = await prisma.registration.count({
      where: { gender: 'Male' }
    });

    const femaleCount = await prisma.registration.count({
      where: { gender: 'Female' }
    });

    const maxMale = settings.maxMale ?? 29;
    const maxFemale = settings.maxFemale ?? 29;
    const registrationOpen = settings.registrationOpen ?? true;
    const isMaleFull = maleCount >= maxMale;
    const isFemaleFull = femaleCount >= maxFemale;
    const isRegistrationFull = isMaleFull && isFemaleFull;
    const isOpen = registrationOpen && !isRegistrationFull;

    return NextResponse.json({
      settings: {
        ...settings,
        maxMale,
        maxFemale,
        registrationOpen,
        qrCodeImageUrl: settings.qrCodeImageUrl || ''
      },
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
    return NextResponse.json({
      settings: { id: 1, maxMale: 29, maxFemale: 29, registrationOpen: true, qrCodeImageUrl: '', announcementTitle: '', announcementMessage: '', announcementEnabled: false },
      counts: { male: 0, female: 0, total: 0 },
      status: { isMaleFull: false, isFemaleFull: false, isRegistrationFull: false, isOpen: true }
    });
  }
}

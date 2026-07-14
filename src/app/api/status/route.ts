import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: 1 }
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: 1, maxMale: 29, maxFemale: 29, registrationOpen: true, qrCodeImageUrl: '', announcementTitle: '', announcementMessage: '', announcementEnabled: false, registrationMode: 'GENDER', venue1Name: 'Khel Academy, Kazhakuttom (10:00 to 12:00)', venue1Max: 29, venue2Name: 'Falcon Academy (10:30 to 12:30)', venue2Max: 29 }
      });
    }

    const maleCount = await prisma.registration.count({ where: { gender: 'Male' } });
    const femaleCount = await prisma.registration.count({ where: { gender: 'Female' } });
    const venue1Count = await prisma.registration.count({ where: { venue: settings.venue1Name } });
    const venue2Count = await prisma.registration.count({ where: { venue: settings.venue2Name } });

    const maxMale = settings.maxMale ?? 29;
    const maxFemale = settings.maxFemale ?? 29;
    const venue1Max = settings.venue1Max ?? 29;
    const venue2Max = settings.venue2Max ?? 29;
    const registrationOpen = settings.registrationOpen ?? true;
    
    const isMaleFull = maleCount >= maxMale;
    const isFemaleFull = femaleCount >= maxFemale;
    const isVenue1Full = venue1Count >= venue1Max;
    const isVenue2Full = venue2Count >= venue2Max;

    const isRegistrationFull = settings.registrationMode === 'GENDER' 
        ? (isMaleFull && isFemaleFull) 
        : (isVenue1Full && isVenue2Full);
        
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
        venue1: venue1Count,
        venue2: venue2Count,
        total: maleCount + femaleCount + venue1Count + venue2Count
      },
      status: {
        isMaleFull,
        isFemaleFull,
        isVenue1Full,
        isVenue2Full,
        isRegistrationFull,
        isOpen
      }
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    return NextResponse.json({
      settings: { id: 1, maxMale: 29, maxFemale: 29, registrationOpen: true, qrCodeImageUrl: '', announcementTitle: '', announcementMessage: '', announcementEnabled: false, registrationMode: 'GENDER', venue1Name: 'Khel Academy, Kazhakuttom (10:00 to 12:00)', venue1Max: 29, venue2Name: 'Falcon Academy (10:30 to 12:30)', venue2Max: 29 },
      counts: { male: 0, female: 0, venue1: 0, venue2: 0, total: 0 },
      status: { isMaleFull: false, isFemaleFull: false, isVenue1Full: false, isVenue2Full: false, isRegistrationFull: false, isOpen: true }
    });
  }
}

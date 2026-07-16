import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: 1 }
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: 1, maxMale: 29, maxFemale: 29, registrationOpen: true, qrCodeImageUrl: '', announcementTitle: '', announcementMessage: '', announcementEnabled: false, registrationMode: 'GENDER', venue1Name: 'Khel Academy, Kazhakuttom (10:00 to 12:00)', venue1MaxMale: 15, venue1MaxFemale: 15, venue2Name: 'Falcon Academy (10:30 to 12:30)', venue2MaxMale: 15, venue2MaxFemale: 15 }
      });
    }

    const maleCount = await prisma.registration.count({ where: { gender: 'Male' } });
    const femaleCount = await prisma.registration.count({ where: { gender: 'Female' } });
    const venue1MaleCount = await prisma.registration.count({ where: { venue: settings.venue1Name, gender: 'Male' } });
    const venue1FemaleCount = await prisma.registration.count({ where: { venue: settings.venue1Name, gender: 'Female' } });
    const venue2MaleCount = await prisma.registration.count({ where: { venue: settings.venue2Name, gender: 'Male' } });
    const venue2FemaleCount = await prisma.registration.count({ where: { venue: settings.venue2Name, gender: 'Female' } });
    const totalCount = await prisma.registration.count();

    const maxMale = settings.maxMale ?? 29;
    const maxFemale = settings.maxFemale ?? 29;
    
    let isVenue1MaleFull = false;
    let isVenue1FemaleFull = false;
    let isVenue2MaleFull = false;
    let isVenue2FemaleFull = false;

    if (settings.registrationMode === 'VENUE_AND_GENDER') {
      isVenue1MaleFull = venue1MaleCount >= (settings.venue1MaxMale ?? 15);
      isVenue1FemaleFull = venue1FemaleCount >= (settings.venue1MaxFemale ?? 15);
      isVenue2MaleFull = venue2MaleCount >= (settings.venue2MaxMale ?? 15);
      isVenue2FemaleFull = venue2FemaleCount >= (settings.venue2MaxFemale ?? 15);
    }

    const registrationOpen = settings.registrationOpen ?? true;
    
    const isMaleFull = maleCount >= maxMale;
    const isFemaleFull = femaleCount >= maxFemale;

    const isRegistrationFull = settings.registrationMode === 'GENDER' 
        ? (isMaleFull && isFemaleFull) 
        : (isVenue1MaleFull && isVenue1FemaleFull && isVenue2MaleFull && isVenue2FemaleFull);
        
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
        venue1Male: venue1MaleCount,
        venue1Female: venue1FemaleCount,
        venue2Male: venue2MaleCount,
        venue2Female: venue2FemaleCount,
        total: totalCount
      },
      status: {
        isMaleFull,
        isFemaleFull,
        isVenue1MaleFull,
        isVenue1FemaleFull,
        isVenue2MaleFull,
        isVenue2FemaleFull,
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

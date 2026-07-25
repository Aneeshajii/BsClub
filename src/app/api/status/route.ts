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
        data: { id: 1, maxMale: 29, maxFemale: 29, registrationOpen: true, qrCodeImageUrl: '', announcementTitle: '', announcementMessage: '', announcementEnabled: false, registrationMode: 'GENDER', venue1Name: 'Khel Academy, Kazhakuttom (10:00 to 12:00)', venue1MaxMale: 15, venue1MaxFemale: 15, venue2Name: 'Falcon Academy (10:30 to 12:30)', venue2MaxMale: 15, venue2MaxFemale: 15, mensDoublesMax: 15, womensDoublesMax: 15, mixedDoublesMax: 15 }
      });
    }

    const maleCount = await prisma.registration.count({ where: { gender: 'Male' } });
    const femaleCount = await prisma.registration.count({ where: { gender: 'Female' } });
    const venue1MaleCount = await prisma.registration.count({ where: { venue: settings.venue1Name, gender: 'Male' } });
    const venue1FemaleCount = await prisma.registration.count({ where: { venue: settings.venue1Name, gender: 'Female' } });
    const venue2MaleCount = await prisma.registration.count({ where: { venue: settings.venue2Name, gender: 'Male' } });
    const venue2FemaleCount = await prisma.registration.count({ where: { venue: settings.venue2Name, gender: 'Female' } });
    
    // Tournament counts
    const mensDoublesCount = await prisma.registration.count({ where: { tournamentCategory: "Men's Doubles" } });
    const womensDoublesCount = await prisma.registration.count({ where: { tournamentCategory: "Women's Doubles" } });
    const mixedDoublesCount = await prisma.registration.count({ 
      where: { 
        OR: [
          { tournamentCategory: "Mixed Doubles" },
          { playingMixedDoubles: true }
        ]
      } 
    });

    const totalCount = await prisma.registration.count();

    const maxMale = settings.maxMale ?? 29;
    const maxFemale = settings.maxFemale ?? 29;
    
    let isVenue1MaleFull = false;
    let isVenue1FemaleFull = false;
    let isVenue2MaleFull = false;
    let isVenue2FemaleFull = false;
    let isMensDoublesFull = false;
    let isWomensDoublesFull = false;
    let isMixedDoublesFull = false;

    if (settings.registrationMode === 'VENUE_AND_GENDER') {
      isVenue1MaleFull = venue1MaleCount >= (settings.venue1MaxMale ?? 15);
      isVenue1FemaleFull = venue1FemaleCount >= (settings.venue1MaxFemale ?? 15);
      isVenue2MaleFull = venue2MaleCount >= (settings.venue2MaxMale ?? 15);
      isVenue2FemaleFull = venue2FemaleCount >= (settings.venue2MaxFemale ?? 15);
    } else if (settings.registrationMode === 'TOURNAMENT') {
      isMensDoublesFull = mensDoublesCount >= (settings.mensDoublesMax ?? 15);
      isWomensDoublesFull = womensDoublesCount >= (settings.womensDoublesMax ?? 15);
      isMixedDoublesFull = mixedDoublesCount >= (settings.mixedDoublesMax ?? 15);
    }

    const registrationOpen = settings.registrationOpen ?? true;
    
    const isMaleFull = maleCount >= maxMale;
    const isFemaleFull = femaleCount >= maxFemale;

    const isRegistrationFull = settings.registrationMode === 'GENDER' 
        ? (isMaleFull && isFemaleFull) 
        : settings.registrationMode === 'VENUE_AND_GENDER' 
          ? (isVenue1MaleFull && isVenue1FemaleFull && isVenue2MaleFull && isVenue2FemaleFull)
          : (isMensDoublesFull && isWomensDoublesFull && isMixedDoublesFull);
        
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
        mensDoubles: mensDoublesCount,
        womensDoubles: womensDoublesCount,
        mixedDoubles: mixedDoublesCount,
        total: totalCount
      },
      status: {
        isMaleFull,
        isFemaleFull,
        isVenue1MaleFull,
        isVenue1FemaleFull,
        isVenue2MaleFull,
        isVenue2FemaleFull,
        isMensDoublesFull,
        isWomensDoublesFull,
        isMixedDoublesFull,
        isRegistrationFull,
        isOpen
      }
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    return NextResponse.json({
      settings: { id: 1, maxMale: 29, maxFemale: 29, registrationOpen: true, qrCodeImageUrl: '', announcementTitle: '', announcementMessage: '', announcementEnabled: false, registrationMode: 'GENDER', venue1Name: 'Khel Academy, Kazhakuttom (10:00 to 12:00)', venue1MaxMale: 15, venue1MaxFemale: 15, venue2Name: 'Falcon Academy (10:30 to 12:30)', venue2MaxMale: 15, venue2MaxFemale: 15, mensDoublesMax: 15, womensDoublesMax: 15, mixedDoublesMax: 15 },
      counts: { male: 0, female: 0, venue1Male: 0, venue1Female: 0, venue2Male: 0, venue2Female: 0, mensDoubles: 0, womensDoubles: 0, mixedDoubles: 0, total: 0 },
      status: { isMaleFull: false, isFemaleFull: false, isVenue1MaleFull: false, isVenue1FemaleFull: false, isVenue2MaleFull: false, isVenue2FemaleFull: false, isMensDoublesFull: false, isWomensDoublesFull: false, isMixedDoublesFull: false, isRegistrationFull: false, isOpen: true }
    });
  }
}

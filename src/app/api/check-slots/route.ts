import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gender = searchParams.get('gender');
    const venue = searchParams.get('venue');

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings || !settings.registrationOpen) {
      return NextResponse.json({ available: false, message: 'Registration is closed' });
    }

    if (settings.registrationMode === 'GENDER') {
      if (!gender || (gender !== 'Male' && gender !== 'Female')) {
        return NextResponse.json({ error: 'Invalid gender' }, { status: 400 });
      }
      const count = await prisma.registration.count({ where: { gender } });
      const max = gender === 'Male' ? settings.maxMale : settings.maxFemale;
      if (count >= max) {
        return NextResponse.json({ available: false, message: 'Full' });
      }
    } else if (settings.registrationMode === 'VENUE_AND_GENDER') {
      if (!venue || (venue !== settings.venue1Name && venue !== settings.venue2Name)) {
        return NextResponse.json({ error: 'Invalid venue' }, { status: 400 });
      }
      if (!gender || (gender !== 'Male' && gender !== 'Female')) {
        return NextResponse.json({ error: 'Invalid gender' }, { status: 400 });
      }
      const count = await prisma.registration.count({ where: { venue, gender } });
      let max = 15;
      if (venue === settings.venue1Name) {
        max = gender === 'Male' ? settings.venue1MaxMale : settings.venue1MaxFemale;
      } else {
        max = gender === 'Male' ? settings.venue2MaxMale : settings.venue2MaxFemale;
      }
      if (count >= max) {
        return NextResponse.json({ available: false, message: 'Full' });
      }
    }

    return NextResponse.json({ available: true });

  } catch (error) {
    console.error('Check slots error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

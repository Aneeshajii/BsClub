import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gender = searchParams.get('gender');

    if (!gender || (gender !== 'Male' && gender !== 'Female')) {
      return NextResponse.json({ error: 'Invalid gender' }, { status: 400 });
    }

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings || !settings.registrationOpen) {
      return NextResponse.json({ available: false, message: 'Registration is closed' });
    }

    const count = await prisma.registration.count({ where: { gender } });
    const max = gender === 'Male' ? settings.maxMale : settings.maxFemale;

    if (count >= max) {
      return NextResponse.json({ available: false, message: 'Full' });
    }

    return NextResponse.json({ available: true });

  } catch (error) {
    console.error('Check slots error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

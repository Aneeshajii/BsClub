import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function isAuthenticated(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const expectedPassword = process.env.ADMIN_PASSWORD || 'bsclub2026';
  return authHeader === `Bearer ${expectedPassword}`;
}

export async function PUT(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { maxMale, maxFemale, registrationOpen } = body;

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        maxMale: typeof maxMale === 'number' ? maxMale : undefined,
        maxFemale: typeof maxFemale === 'number' ? maxFemale : undefined,
        registrationOpen: typeof registrationOpen === 'boolean' ? registrationOpen : undefined
      },
      create: {
        id: 1,
        maxMale: typeof maxMale === 'number' ? maxMale : 29,
        maxFemale: typeof maxFemale === 'number' ? maxFemale : 29,
        registrationOpen: typeof registrationOpen === 'boolean' ? registrationOpen : true
      }
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

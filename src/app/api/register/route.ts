import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { upload } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const gender = formData.get('gender') as string;
    const venue = formData.get('venue') as string;
    const ageValue = formData.get('age');
    const age = typeof ageValue === 'string' ? Number(ageValue) : undefined;
    const registeredBefore = formData.get('registeredBefore') as string;
    const level = formData.get('level') as string;
    const screenshot = formData.get('screenshot') as File;

    if (!name || !phone || (!gender && !venue) || !registeredBefore || !level || !screenshot) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // 1. Fast-fail check before doing any expensive uploads
    const existing = await prisma.registration.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json({ error: 'This phone number has already been registered.' }, { status: 400 });
    }

    // 2. Save the file to configured storage (S3 or Local) OUTSIDE the transaction
    // This prevents exhausting the database connection pool while waiting for network I/O
    const bytes = await screenshot.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Sanitize the filename to absolutely guarantee no weird characters break Vercel Blob
    const mimeExt = screenshot.type ? screenshot.type.split('/')[1] : 'jpg';
    const safeExt = mimeExt.replace(/[^a-zA-Z0-9]/g, '');
    const filename = `reg-${Date.now()}-${Math.random().toString(36).substring(7)}.${safeExt || 'jpg'}`;

    const fileUrl = await upload(buffer, filename, screenshot.type || 'image/jpeg');

    // 3. Start database transaction for registration limits and final insert
    const result = await prisma.$transaction(async (tx) => {
      // Lock the Settings row to serialize concurrent transactions and prevent seat race conditions
      const settingsRaw = await tx.$queryRaw<any[]>`SELECT id, "maxMale", "maxFemale", "registrationOpen", "registrationMode", "venue1Name", "venue1Max", "venue2Name", "venue2Max" FROM "Settings" WHERE id = 1 FOR UPDATE`;
      let settings = settingsRaw?.[0];
      
      if (!settings) {
        settings = await tx.settings.create({
          data: { id: 1, maxMale: 29, maxFemale: 29, registrationOpen: true }
        });
      }

      if (!settings.registrationOpen) {
        throw new Error('Registration is completely closed.');
      }

      if (settings.registrationMode === 'GENDER') {
        if (!gender || (gender !== 'Male' && gender !== 'Female')) {
          throw new Error('Invalid gender');
        }
        const maleCount = await tx.registration.count({ where: { gender: 'Male' } });
        const femaleCount = await tx.registration.count({ where: { gender: 'Female' } });

        if (gender === 'Male' && maleCount >= settings.maxMale) {
          throw new Error('Male registrations are full.');
        }
        if (gender === 'Female' && femaleCount >= settings.maxFemale) {
          throw new Error('Female registrations are full.');
        }
      } else {
        if (!venue || (venue !== settings.venue1Name && venue !== settings.venue2Name)) {
          throw new Error('Invalid venue selection');
        }
        const venue1Count = await tx.registration.count({ where: { venue: settings.venue1Name } });
        const venue2Count = await tx.registration.count({ where: { venue: settings.venue2Name } });

        if (venue === settings.venue1Name && venue1Count >= settings.venue1Max) {
          throw new Error(`${settings.venue1Name} registrations are full.`);
        }
        if (venue === settings.venue2Name && venue2Count >= settings.venue2Max) {
          throw new Error(`${settings.venue2Name} registrations are full.`);
        }
      }

      // Final check for phone just in case it was inserted during the upload gap
      const concurrentExisting = await tx.registration.findUnique({ where: { phone } });
      if (concurrentExisting) {
        throw new Error('This phone number has already been registered.');
      }

      // 4. Create the registration record
      const tempId = `TEMP-${Date.now()}-${Math.random()}`;
      
      const registration = await tx.registration.create({
        data: {
          name,
          phone,
          gender: settings.registrationMode === 'GENDER' ? gender : null,
          venue: settings.registrationMode === 'VENUE' ? venue : null,
          registeredBefore,
          level,
          age: typeof age === 'number' && !Number.isNaN(age) ? age : undefined,
          paymentScreenshotUrl: fileUrl,
          registrationId: tempId
        }
      });

      // Format ID: BSC0001
      const formattedId = `BSC${registration.id.toString().padStart(4, '0')}`;
      
      const updatedRegistration = await tx.registration.update({
        where: { id: registration.id },
        data: { registrationId: formattedId }
      });

      return updatedRegistration;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });

  } catch (error: any) {
    console.error('Registration error:', error);
    // Determine if it's a known error from our transaction
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}

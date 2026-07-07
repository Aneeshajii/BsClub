import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const gender = formData.get('gender') as string;
    const ageValue = formData.get('age');
    const age = typeof ageValue === 'string' ? Number(ageValue) : undefined;
    const screenshot = formData.get('screenshot') as File;

    if (!name || !phone || !gender || !screenshot) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (gender !== 'Male' && gender !== 'Female') {
      return NextResponse.json({ error: 'Invalid gender' }, { status: 400 });
    }

    // Wrap in a transaction to prevent race conditions for the exact seat limits
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch settings and current counts
      let settings = await tx.settings.findUnique({ where: { id: 1 } });
      if (!settings) {
        settings = await tx.settings.create({
          data: { id: 1, maxMale: 29, maxFemale: 29, registrationOpen: true }
        });
      }

      if (!settings.registrationOpen) {
        throw new Error('Registration is completely closed.');
      }

      const maleCount = await tx.registration.count({ where: { gender: 'Male' } });
      const femaleCount = await tx.registration.count({ where: { gender: 'Female' } });

      if (gender === 'Male' && maleCount >= settings.maxMale) {
        throw new Error('Male registrations are full.');
      }
      if (gender === 'Female' && femaleCount >= settings.maxFemale) {
        throw new Error('Female registrations are full.');
      }

      // 2. Check duplicate phone
      const existing = await tx.registration.findUnique({ where: { phone } });
      if (existing) {
        throw new Error('This phone number has already been registered.');
      }

      // 3. Save the file
      const bytes = await screenshot.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const ext = path.extname(screenshot.name) || '.jpg';
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
      const filepath = path.join(process.cwd(), 'public', 'uploads', filename);
      
      await writeFile(filepath, buffer);
      
      const fileUrl = `/uploads/${filename}`;

      // 4. Create the registration record
      // We will generate a temp ID first, then update it to BSC000X
      const tempId = `TEMP-${Date.now()}-${Math.random()}`;
      
      const registration = await tx.registration.create({
        data: {
          name,
          phone,
          gender,
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

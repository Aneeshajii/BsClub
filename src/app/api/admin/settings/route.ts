import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

function isAuthenticated(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const expectedPassword = process.env.ADMIN_PASSWORD || 'bsclub2026';
  return authHeader === `Bearer ${expectedPassword}`;
}

async function saveUploadedFile(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = path.extname(file.name) || '.png';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadDir, { recursive: true });
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);
  return `/uploads/${filename}`;
}

export async function PUT(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let maxMale: number | undefined;
    let maxFemale: number | undefined;
    let registrationOpen: boolean | undefined;
    let qrCodeImageUrl: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const maxMaleValue = formData.get('maxMale');
      const maxFemaleValue = formData.get('maxFemale');
      const registrationOpenValue = formData.get('registrationOpen');
      const qrCodeImage = formData.get('qrCodeImage');

      maxMale = typeof maxMaleValue === 'string' ? Number(maxMaleValue) : undefined;
      maxFemale = typeof maxFemaleValue === 'string' ? Number(maxFemaleValue) : undefined;
      registrationOpen = typeof registrationOpenValue === 'string' ? registrationOpenValue === 'true' : undefined;

      if (qrCodeImage instanceof File && qrCodeImage.size > 0) {
        qrCodeImageUrl = await saveUploadedFile(qrCodeImage);
      }
    } else {
      const rawBody = await req.text();
      if (rawBody) {
        try {
          const body = JSON.parse(rawBody);
          maxMale = typeof body.maxMale === 'number' ? body.maxMale : undefined;
          maxFemale = typeof body.maxFemale === 'number' ? body.maxFemale : undefined;
          registrationOpen = typeof body.registrationOpen === 'boolean' ? body.registrationOpen : undefined;
          qrCodeImageUrl = typeof body.qrCodeImageUrl === 'string' ? body.qrCodeImageUrl : undefined;
        } catch {
          const params = new URLSearchParams(rawBody);
          maxMale = params.has('maxMale') ? Number(params.get('maxMale') ?? '') : undefined;
          maxFemale = params.has('maxFemale') ? Number(params.get('maxFemale') ?? '') : undefined;
          registrationOpen = params.has('registrationOpen') ? params.get('registrationOpen') === 'true' : undefined;
          qrCodeImageUrl = params.get('qrCodeImageUrl') || undefined;
        }
      }
    }

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        maxMale: typeof maxMale === 'number' ? maxMale : undefined,
        maxFemale: typeof maxFemale === 'number' ? maxFemale : undefined,
        registrationOpen: typeof registrationOpen === 'boolean' ? registrationOpen : undefined,
        qrCodeImageUrl: typeof qrCodeImageUrl === 'string' ? qrCodeImageUrl : undefined
      },
      create: {
        id: 1,
        maxMale: typeof maxMale === 'number' ? maxMale : 29,
        maxFemale: typeof maxFemale === 'number' ? maxFemale : 29,
        registrationOpen: typeof registrationOpen === 'boolean' ? registrationOpen : true,
        qrCodeImageUrl: typeof qrCodeImageUrl === 'string' ? qrCodeImageUrl : ''
      }
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

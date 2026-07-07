import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import path from 'path';
import { upload } from '@/lib/storage';

function isAuthenticated(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const expectedPassword = process.env.ADMIN_PASSWORD || 'bsclub2026';
  return authHeader === `Bearer ${expectedPassword}`;
}

async function saveUploadedFile(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = path.extname(file.name) || '.png';
  const filename = `qr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  return upload(buffer, filename, file.type || 'image/png');
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
    let announcementTitle: string | undefined;
    let announcementMessage: string | undefined;
    let announcementEnabled: boolean | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const maxMaleValue = formData.get('maxMale');
      const maxFemaleValue = formData.get('maxFemale');
      const registrationOpenValue = formData.get('registrationOpen');
      const qrCodeImage = formData.get('qrCodeImage');
      const annTitleVal = formData.get('announcementTitle');
      const annMessageVal = formData.get('announcementMessage');
      const annEnabledVal = formData.get('announcementEnabled');

      maxMale = typeof maxMaleValue === 'string' ? Number(maxMaleValue) : undefined;
      maxFemale = typeof maxFemaleValue === 'string' ? Number(maxFemaleValue) : undefined;
      registrationOpen = typeof registrationOpenValue === 'string' ? registrationOpenValue === 'true' : undefined;
      announcementTitle = typeof annTitleVal === 'string' ? annTitleVal : undefined;
      announcementMessage = typeof annMessageVal === 'string' ? annMessageVal : undefined;
      announcementEnabled = typeof annEnabledVal === 'string' ? annEnabledVal === 'true' : undefined;

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
          announcementTitle = typeof body.announcementTitle === 'string' ? body.announcementTitle : undefined;
          announcementMessage = typeof body.announcementMessage === 'string' ? body.announcementMessage : undefined;
          announcementEnabled = typeof body.announcementEnabled === 'boolean' ? body.announcementEnabled : undefined;
        } catch {
          const params = new URLSearchParams(rawBody);
          maxMale = params.has('maxMale') ? Number(params.get('maxMale') ?? '') : undefined;
          maxFemale = params.has('maxFemale') ? Number(params.get('maxFemale') ?? '') : undefined;
          registrationOpen = params.has('registrationOpen') ? params.get('registrationOpen') === 'true' : undefined;
          qrCodeImageUrl = params.get('qrCodeImageUrl') || undefined;
          announcementTitle = params.get('announcementTitle') || undefined;
          announcementMessage = params.get('announcementMessage') || undefined;
          announcementEnabled = params.has('announcementEnabled') ? params.get('announcementEnabled') === 'true' : undefined;
        }
      }
    }

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        maxMale: typeof maxMale === 'number' ? maxMale : undefined,
        maxFemale: typeof maxFemale === 'number' ? maxFemale : undefined,
        registrationOpen: typeof registrationOpen === 'boolean' ? registrationOpen : undefined,
        qrCodeImageUrl: typeof qrCodeImageUrl === 'string' ? qrCodeImageUrl : undefined,
        announcementTitle: typeof announcementTitle === 'string' ? announcementTitle : undefined,
        announcementMessage: typeof announcementMessage === 'string' ? announcementMessage : undefined,
        announcementEnabled: typeof announcementEnabled === 'boolean' ? announcementEnabled : undefined
      },
      create: {
        id: 1,
        maxMale: typeof maxMale === 'number' ? maxMale : 29,
        maxFemale: typeof maxFemale === 'number' ? maxFemale : 29,
        registrationOpen: typeof registrationOpen === 'boolean' ? registrationOpen : true,
        qrCodeImageUrl: typeof qrCodeImageUrl === 'string' ? qrCodeImageUrl : '',
        announcementTitle: typeof announcementTitle === 'string' ? announcementTitle : '',
        announcementMessage: typeof announcementMessage === 'string' ? announcementMessage : '',
        announcementEnabled: typeof announcementEnabled === 'boolean' ? announcementEnabled : false
      }
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

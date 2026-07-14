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
    let registrationMode: string | undefined;
    let venue1Name: string | undefined;
    let venue1MaxMale: number | undefined;
    let venue1MaxFemale: number | undefined;
    let venue2Name: string | undefined;
    let venue2MaxMale: number | undefined;
    let venue2MaxFemale: number | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const maxMaleValue = formData.get('maxMale');
      const maxFemaleValue = formData.get('maxFemale');
      const registrationOpenValue = formData.get('registrationOpen');
      const qrCodeImage = formData.get('qrCodeImage');
      const annTitleVal = formData.get('announcementTitle');
      const annMessageVal = formData.get('announcementMessage');
      const annEnabledVal = formData.get('announcementEnabled');
      const regModeVal = formData.get('registrationMode');
      const v1NameVal = formData.get('venue1Name');
      const venue1MaxMaleVal = Number(formData.get('venue1MaxMale'));
      const venue1MaxFemaleVal = Number(formData.get('venue1MaxFemale'));
      const v2NameVal = formData.get('venue2Name') as string;
      const venue2MaxMaleVal = Number(formData.get('venue2MaxMale'));
      const venue2MaxFemaleVal = Number(formData.get('venue2MaxFemale'));

      maxMale = typeof maxMaleValue === 'string' ? Number(maxMaleValue) : undefined;
      maxFemale = typeof maxFemaleValue === 'string' ? Number(maxFemaleValue) : undefined;
      registrationOpen = typeof registrationOpenValue === 'string' ? registrationOpenValue === 'true' : undefined;
      announcementTitle = typeof annTitleVal === 'string' ? annTitleVal : undefined;
      announcementMessage = typeof annMessageVal === 'string' ? annMessageVal : undefined;
      announcementEnabled = typeof annEnabledVal === 'string' ? annEnabledVal === 'true' : undefined;
      registrationMode = typeof regModeVal === 'string' ? regModeVal : undefined;
      venue1Name = typeof v1NameVal === 'string' ? v1NameVal : undefined;
      venue1MaxMale = !isNaN(venue1MaxMaleVal) ? venue1MaxMaleVal : undefined;
      venue1MaxFemale = !isNaN(venue1MaxFemaleVal) ? venue1MaxFemaleVal : undefined;
      venue2Name = v2NameVal || undefined;
      venue2MaxMale = !isNaN(venue2MaxMaleVal) ? venue2MaxMaleVal : undefined;
      venue2MaxFemale = !isNaN(venue2MaxFemaleVal) ? venue2MaxFemaleVal : undefined;

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
          registrationMode = typeof body.registrationMode === 'string' ? body.registrationMode : undefined;
          venue1Name = typeof body.venue1Name === 'string' ? body.venue1Name : undefined;
          venue1MaxMale = typeof body.venue1MaxMale === 'number' ? body.venue1MaxMale : undefined;
          venue1MaxFemale = typeof body.venue1MaxFemale === 'number' ? body.venue1MaxFemale : undefined;
          venue2Name = typeof body.venue2Name === 'string' ? body.venue2Name : undefined;
          venue2MaxMale = typeof body.venue2MaxMale === 'number' ? body.venue2MaxMale : undefined;
          venue2MaxFemale = typeof body.venue2MaxFemale === 'number' ? body.venue2MaxFemale : undefined;
        } catch {
          const params = new URLSearchParams(rawBody);
          maxMale = params.has('maxMale') ? Number(params.get('maxMale') ?? '') : undefined;
          maxFemale = params.has('maxFemale') ? Number(params.get('maxFemale') ?? '') : undefined;
          registrationOpen = params.has('registrationOpen') ? params.get('registrationOpen') === 'true' : undefined;
          qrCodeImageUrl = params.get('qrCodeImageUrl') || undefined;
          announcementTitle = params.get('announcementTitle') || undefined;
          announcementMessage = params.get('announcementMessage') || undefined;
          announcementEnabled = params.has('announcementEnabled') ? params.get('announcementEnabled') === 'true' : undefined;
          registrationMode = params.get('registrationMode') || undefined;
          venue1Name = params.get('venue1Name') || undefined;
          venue1MaxMale = params.has('venue1MaxMale') ? Number(params.get('venue1MaxMale')) : undefined;
          venue1MaxFemale = params.has('venue1MaxFemale') ? Number(params.get('venue1MaxFemale')) : undefined;
          venue2Name = params.get('venue2Name') || undefined;
          venue2MaxMale = params.has('venue2MaxMale') ? Number(params.get('venue2MaxMale')) : undefined;
          venue2MaxFemale = params.has('venue2MaxFemale') ? Number(params.get('venue2MaxFemale')) : undefined;
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
        announcementEnabled: typeof announcementEnabled === 'boolean' ? announcementEnabled : undefined,
        registrationMode: typeof registrationMode === 'string' ? registrationMode : undefined,
        venue1Name: typeof venue1Name === 'string' ? venue1Name : undefined,
        venue1MaxMale: !isNaN(venue1MaxMale as number) ? venue1MaxMale : undefined,
        venue1MaxFemale: !isNaN(venue1MaxFemale as number) ? venue1MaxFemale : undefined,
        venue2Name: venue2Name || undefined,
        venue2MaxMale: !isNaN(venue2MaxMale as number) ? venue2MaxMale : undefined,
        venue2MaxFemale: !isNaN(venue2MaxFemale as number) ? venue2MaxFemale : undefined
      },
      create: {
        id: 1,
        maxMale: typeof maxMale === 'number' ? maxMale : 29,
        maxFemale: typeof maxFemale === 'number' ? maxFemale : 29,
        registrationOpen: typeof registrationOpen === 'boolean' ? registrationOpen : true,
        qrCodeImageUrl: typeof qrCodeImageUrl === 'string' ? qrCodeImageUrl : '',
        announcementTitle: typeof announcementTitle === 'string' ? announcementTitle : '',
        announcementMessage: typeof announcementMessage === 'string' ? announcementMessage : '',
        announcementEnabled: typeof announcementEnabled === 'boolean' ? announcementEnabled : false,
        registrationMode: typeof registrationMode === 'string' ? registrationMode : 'GENDER',
        venue1Name: typeof venue1Name === 'string' ? venue1Name : 'Khel Academy, Kazhakuttom (10:00 to 12:00)',
        venue1MaxMale: typeof venue1MaxMale === 'number' ? venue1MaxMale : 15,
        venue1MaxFemale: typeof venue1MaxFemale === 'number' ? venue1MaxFemale : 15,
        venue2Name: typeof venue2Name === 'string' ? venue2Name : 'Falcon Academy (10:30 to 12:30)',
        venue2MaxMale: typeof venue2MaxMale === 'number' ? venue2MaxMale : 15,
        venue2MaxFemale: typeof venue2MaxFemale === 'number' ? venue2MaxFemale : 15
      }
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

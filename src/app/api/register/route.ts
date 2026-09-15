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
    const email = formData.get('email') as string;
    const registeredBefore = formData.get('registeredBefore') as string;
    const level = formData.get('level') as string;
    const screenshot = formData.get('screenshot') as File;
    
    // Tournament Fields
    const tournamentCategory = formData.get('tournamentCategory') as string;
    const partnerName = formData.get('partnerName') as string;
    const partnerEmail = formData.get('partnerEmail') as string;
    const partnerLevel = formData.get('partnerLevel') as string;
    const userPhoto = formData.get('userPhoto') as File | null;
    const partnerPhoto = formData.get('partnerPhoto') as File | null;
    
    const playingMixedDoubles = formData.get('playingMixedDoubles') === 'true';
    const mixedPartnerName = formData.get('mixedPartnerName') as string | null;
    const mixedPartnerEmail = formData.get('mixedPartnerEmail') as string | null;
    const mixedPartnerLevel = formData.get('mixedPartnerLevel') as string | null;
    const mixedPartnerPhoto = formData.get('mixedPartnerPhoto') as File | null;
    if (!name || !phone || !screenshot) {
      return NextResponse.json({ error: 'Name, phone, and payment screenshot are required' }, { status: 400 });
    }


    // 2. Save files to configured storage (S3 or Local) OUTSIDE the transaction
    const uploadFile = async (file: File, prefix: string) => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const mimeExt = file.type ? file.type.split('/')[1] : 'jpg';
      const safeExt = mimeExt.replace(/[^a-zA-Z0-9]/g, '');
      const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}.${safeExt || 'jpg'}`;
      return upload(buffer, filename, file.type || 'image/jpeg');
    };

    const fileUrl = await uploadFile(screenshot, 'reg');
    let userPhotoUrl = null;
    let partnerPhotoUrl = null;
    let mixedPartnerPhotoUrl = null;

    if (userPhoto && userPhoto.size > 0) {
      userPhotoUrl = await uploadFile(userPhoto, 'uimg');
    }
    if (partnerPhoto && partnerPhoto.size > 0) {
      partnerPhotoUrl = await uploadFile(partnerPhoto, 'pimg');
    }
    if (mixedPartnerPhoto && mixedPartnerPhoto.size > 0) {
      mixedPartnerPhotoUrl = await uploadFile(mixedPartnerPhoto, 'mimg');
    }

    // 3. Start database transaction for registration limits and final insert
    const result = await prisma.$transaction(async (tx) => {
      // Lock the Settings row to serialize concurrent transactions and prevent seat race conditions
      const settingsRaw = await tx.$queryRaw<any[]>`SELECT id, "maxMale", "maxFemale", "registrationOpen", "registrationMode", "venue1Name", "venue1MaxMale", "venue1MaxFemale", "venue2Name", "venue2MaxMale", "venue2MaxFemale" FROM "Settings" WHERE id = 1 FOR UPDATE`;
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
      } else if (settings.registrationMode === 'VENUE_AND_GENDER') {
        if (!venue || (venue !== settings.venue1Name && venue !== settings.venue2Name)) {
          throw new Error('Invalid venue selection');
        }
        if (!gender || (gender !== 'Male' && gender !== 'Female')) {
          throw new Error('Invalid gender selection');
        }
        const venueCount = await tx.registration.count({ where: { venue, gender } });
        let max = 15;
        if (venue === settings.venue1Name) {
          max = gender === 'Male' ? settings.venue1MaxMale : settings.venue1MaxFemale;
        } else {
          max = gender === 'Male' ? settings.venue2MaxMale : settings.venue2MaxFemale;
        }

        if (venueCount >= max) {
          throw new Error(`${venue} (${gender}) registrations are full.`);
        }
      } else if (settings.registrationMode === 'TOURNAMENT') {
        if (!tournamentCategory || !["Men's Doubles", "Women's Doubles", "Mixed Doubles"].includes(tournamentCategory)) {
          throw new Error('Invalid tournament category');
        }
        
        let tournamentCount = 0;
        if (tournamentCategory === "Mixed Doubles") {
          tournamentCount = await tx.registration.count({ 
            where: { OR: [{ tournamentCategory: "Mixed Doubles" }, { playingMixedDoubles: true }] } 
          });
        } else {
          tournamentCount = await tx.registration.count({ where: { tournamentCategory } });
        }

        let max = 15;
        if (tournamentCategory === "Men's Doubles") max = settings.mensDoublesMax;
        else if (tournamentCategory === "Women's Doubles") max = settings.womensDoublesMax;
        else if (tournamentCategory === "Mixed Doubles") max = settings.mixedDoublesMax;

        if (tournamentCount >= max) {
          throw new Error(`${tournamentCategory} registrations are full.`);
        }

        if (playingMixedDoubles) {
          const mixedCount = await tx.registration.count({ 
            where: { 
              OR: [
                { tournamentCategory: "Mixed Doubles" },
                { playingMixedDoubles: true }
              ]
            } 
          });
          if (mixedCount >= settings.mixedDoublesMax) {
            throw new Error(`Mixed Doubles registrations are full.`);
          }
        }
      }


      // 4. Create the registration record
      const tempId = `TEMP-${Date.now()}-${Math.random()}`;
      
      const registration = await tx.registration.create({
        data: {
          name,
          phone,
          gender: settings.registrationMode !== 'TOURNAMENT' ? (gender || null) : null,
          venue: settings.registrationMode === 'VENUE_AND_GENDER' ? venue : null,
          registeredBefore: registeredBefore || null,
          level: level || null,
          email: email || null,
          partnerName: partnerName || null,
          partnerEmail: partnerEmail || null,
          partnerLevel: partnerLevel || null,
          userPhotoUrl: userPhotoUrl || null,
          partnerPhotoUrl: partnerPhotoUrl || null,
          tournamentCategory: settings.registrationMode === 'TOURNAMENT' ? tournamentCategory : null,
          playingMixedDoubles: settings.registrationMode === 'TOURNAMENT' ? playingMixedDoubles : false,
          mixedPartnerName: mixedPartnerName || null,
          mixedPartnerEmail: mixedPartnerEmail || null,
          mixedPartnerLevel: mixedPartnerLevel || null,
          mixedPartnerPhotoUrl: mixedPartnerPhotoUrl || null,
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

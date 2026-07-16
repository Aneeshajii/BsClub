import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Basic security: check for a simple admin password header or cookie.
// In a real app, use next-auth or similar, but for this simple setup,
// we'll rely on an Authorization header.
function isAuthenticated(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const expectedPassword = process.env.ADMIN_PASSWORD || 'bsclub2026';
  if (authHeader === `Bearer ${expectedPassword}`) {
    return true;
  }
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const gender = url.searchParams.get('gender');
    
    const whereClause = gender ? { gender } : {};

    const registrations = await prisma.registration.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(registrations ?? []);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json([]);
  }
}

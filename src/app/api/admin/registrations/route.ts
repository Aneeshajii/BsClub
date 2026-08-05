import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function isAuthenticated(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const expectedPassword = process.env.ADMIN_PASSWORD || 'bsclub2026';
  if (authHeader === `Bearer ${expectedPassword}`) {
    return true;
  }
  return false;
}

function getWhereClause(mode: string | null) {
  if (mode === 'TOURNAMENT') {
    return { tournamentCategory: { not: null } };
  } else if (mode === 'VENUE_AND_GENDER') {
    return { venue: { not: null } };
  } else if (mode === 'GENDER') {
    return { venue: null, tournamentCategory: null };
  }
  return {}; // fallback to all if mode not provided
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode');
    
    const whereClause = getWhereClause(mode);

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

export async function DELETE(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode');
    
    if (!mode) {
      return NextResponse.json({ error: 'Mode parameter is required for bulk deletion' }, { status: 400 });
    }
    
    const whereClause = getWhereClause(mode);

    const result = await prisma.registration.deleteMany({
      where: whereClause
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Error deleting registrations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// src/app/api/hms/management-token/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { generateManagementToken } from '@/app/actions/training';

export async function GET() {
  try {
    // Optional: Add authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await generateManagementToken();
    return NextResponse.json({ token });
  } catch (error: any) {
    console.error('Error generating management token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate token' },
      { status: 500 }
    );
  }
}
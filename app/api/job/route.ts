import { authOptions } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { AIJob, AImodel } from '@/models/aiModel';
import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const searchParams = req.nextUrl.searchParams
  const projectId = searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
  }

  try {
    const models = await AIJob.find({ user: session?.user.id, projectid: projectId });
    return NextResponse.json({ success: true, models }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch models' }, { status: 400 });
  }
}

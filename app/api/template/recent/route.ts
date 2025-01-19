// app/api/projects/route.ts
import { connectToDatabase } from '@/lib/db';
import { Template } from '@/models/Template';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  const searchParams = req.nextUrl.searchParams
  const time = searchParams.get('time') || new Date().toISOString()
  const limit = Number(searchParams.get('limit')) || null
  try {
    const recentPublicTemplates = await Template.find({ 
      private: false,
      created_at : { $lt: new Date(time) }
     })
      .sort({ created_at: -1 })
      .limit(null === limit ? 6 : limit)
      ;

    return NextResponse.json({ success: true, templates: recentPublicTemplates }, { status: 200 });
  } catch (error) {
    console.error('Error fetching recent public templates:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch templates' }, { status: 400 });
  }
}
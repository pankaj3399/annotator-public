import { connectToDatabase } from '@/lib/db';
import NotificationTemplate from '@/models/NotificationTemplate';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/auth';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const { triggerName, triggerBody, project, active = true } = await req.json();

    // Validation for missing fields
    if (!triggerName || !triggerBody || !project) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }


    // Create the new notification template
    const newTemplate = new NotificationTemplate({
      triggerName,
      triggerBody,
      active,
      project,
    });

    await newTemplate.save();

    return NextResponse.json({
      success: true,
      template: newTemplate,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create template' }, { status: 400 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const templates = await NotificationTemplate.find({});

    return NextResponse.json({ 
      success: true, 
      templates 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch templates' }, { status: 400 });
  }
}
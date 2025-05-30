import { getAllExpertsRegistrationData, getAllTeams } from '@/app/actions/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    switch (endpoint) {
      case 'registration-data':
        const registrationData = await getAllExpertsRegistrationData();
        return NextResponse.json(JSON.parse(registrationData), { status: 200 });
      
      case 'teams':
        const teamsData = await getAllTeams();
        return NextResponse.json(JSON.parse(teamsData), { status: 200 });
      
      default:
        return NextResponse.json(
          { error: 'Invalid endpoint. Use ?endpoint=registration-data or ?endpoint=teams' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('API Error:', error);
    
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }
    
    if (error.message.includes('You must be logged in')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
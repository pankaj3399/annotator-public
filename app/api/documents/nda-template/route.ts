// app/api/documents/nda-template/route.ts
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'templates', 'nda-template.pdf');
    const fileBuffer = await readFile(filePath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=NDA_Template.pdf',
      },
    });
  } catch (error) {
    console.error('Error serving NDA template:', error);
    return NextResponse.json(
      { message: 'Failed to serve NDA template' },
      { status: 500 }
    );
  }
}
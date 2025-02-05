import { UTApi } from "uploadthing/server";
import { NextRequest, NextResponse } from "next/server";

const utapi = new UTApi();

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract fileUrl from query parameters
    const fileUrl = request.nextUrl.searchParams.get('fileUrl');

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'File URL is required' },
        { status: 400 }
      );
    }

    // Extract the file key from the URL
    const fileKey = extractFileKeyFromUrl(fileUrl);

    if (!fileKey) {
      return NextResponse.json(
        { error: 'Invalid URL or file key not found' },
        { status: 400 }
      );
    }

    // Attempt to delete the file using UploadThing API
    await utapi.deleteFiles(fileKey);

    return NextResponse.json(
      { message: 'File deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Error deleting file' },
      { status: 500 }
    );
  }
}

// Helper function to extract file key from URL
function extractFileKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/');

    // Assuming the file key is always at the last segment of the path
    return pathSegments[pathSegments.length - 1];
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
}
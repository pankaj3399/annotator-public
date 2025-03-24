// app/api/temp-chunks/[chunkId]/route.ts
import { tempChunkMap } from '@/utils/audioChunker';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { chunkId: string } }
) {
  const chunkId = params.chunkId;
  
  // Check if chunk exists
  if (!tempChunkMap.has(chunkId)) {
    console.error(`Chunk not found: ${chunkId}`);
    return NextResponse.json(
      { error: 'Chunk not found' },
      { status: 404 }
    );
  }
  
  // Get the chunk
  const chunk = tempChunkMap.get(chunkId);
  console.log(`Serving chunk ${chunkId} (${chunk.size} bytes)`);
  
  // After serving, you may want to delete to free up memory
  // We'll keep it for now in case there are retries, but you may want to
  // implement a cleanup strategy based on your needs
  
  // Return the audio blob with appropriate content type
  return new NextResponse(chunk, {
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Length': chunk.size.toString()
    },
  });
}

// Optional: Add a cleanup route or mechanism
// You could create a cleanup function that removes chunks after they've been processed
// or implement a time-based expiration

export async function DELETE(
  request: NextRequest,
  { params }: { params: { chunkId: string } }
) {
  const chunkId = params.chunkId;
  
  if (tempChunkMap.has(chunkId)) {
    tempChunkMap.delete(chunkId);
    console.log(`Deleted chunk ${chunkId}`);
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json(
      { error: 'Chunk not found' },
      { status: 404 }
    );
  }
}
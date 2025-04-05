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

  // Add null check for TypeScript
  if (!chunk) {
    console.error(`Chunk with ID ${chunkId} was found in map but is undefined`);
    return NextResponse.json(
      { error: 'Chunk is undefined' },
      { status: 500 }
    );
  }

  console.log(`Serving chunk ${chunkId} (${chunk.size} bytes)`);

  // Return the audio blob with appropriate content type
  return new NextResponse(chunk, {
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Length': chunk.size.toString()
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { chunkId: string } }
) {
  const chunkId = params.chunkId;

  if (tempChunkMap.has(chunkId)) {
    const chunk = tempChunkMap.get(chunkId);

    // TypeScript safety check
    if (chunk) {
      tempChunkMap.delete(chunkId);
      console.log(`Deleted chunk ${chunkId}`);
      return NextResponse.json({ success: true });
    }
  }

  return NextResponse.json(
    { error: 'Chunk not found' },
    { status: 404 }
  );
}
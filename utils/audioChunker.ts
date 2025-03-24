// utils/audioChunker.ts
import { v4 as uuidv4 } from 'uuid';

// Global store for temporary chunks
// In production, use a more robust solution with automatic cleanup
export const tempChunkMap = new Map<string, Blob>();

export interface ChunkResult {
  chunks: Blob[];
}

// Simple chunking implementation
export async function chunkAudioFile(
  audioBlob: Blob, 
  maxChunkSizeInBytes: number = 10 * 1024 * 1024, // Default 10MB chunks
  overlapBytes: number = 44100 * 2 * 3 // ~3 seconds of 16-bit stereo audio at 44.1kHz
): Promise<ChunkResult> {
  const totalSize = audioBlob.size;
  const numChunks = Math.ceil(totalSize / (maxChunkSizeInBytes - overlapBytes));
  
  console.log(`Chunking audio file of ${totalSize} bytes into approximately ${numChunks} chunks`);
  
  const chunks: Blob[] = [];
  
  for (let i = 0; i < numChunks; i++) {
    const start = Math.max(0, i > 0 ? i * (maxChunkSizeInBytes - overlapBytes) : 0);
    const end = Math.min(totalSize, start + maxChunkSizeInBytes);
    
    const chunkBlob = audioBlob.slice(start, end);
    chunks.push(chunkBlob);
    
    console.log(`Created chunk ${i+1}/${numChunks}: ${start}-${end} (${chunkBlob.size} bytes)`);
  }
  
  return { chunks };
}

// Creates temporary URLs for chunks
export async function createChunksAndGetUrls(
  audioBlob: Blob,
  maxChunkSizeInBytes: number = 10 * 1024 * 1024,
  overlapSeconds: number = 3
): Promise<string[]> {
  // Estimate bytes for overlap (assuming 44.1kHz 16-bit stereo)
  const overlapBytes = 44100 * 2 * 2 * overlapSeconds; // samples * bytes per sample * channels * seconds
  
  const { chunks } = await chunkAudioFile(audioBlob, maxChunkSizeInBytes, overlapBytes);
  
  // Store chunks and generate URLs
  const urls: string[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunkId = `chunk-${uuidv4()}`;
    
    // Store in our in-memory map
    tempChunkMap.set(chunkId, chunks[i]);
    
    // Create a URL that can be used to fetch this chunk
    const chunkUrl = `/api/temp-chunks/${chunkId}`;
    urls.push(chunkUrl);
    
    console.log(`Stored chunk ${i+1} with ID ${chunkId}, URL: ${chunkUrl}`);
  }
  
  return urls;
}
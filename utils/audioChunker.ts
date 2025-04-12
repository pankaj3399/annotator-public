// utils/audioChunker.ts
import { v4 as uuidv4 } from 'uuid';

// Make this a global variable to persist across hot reloads in development
declare global {
  var _tempChunkMap: Map<string, Blob> | undefined;
}

// Use the global variable or create it if it doesn't exist
globalThis._tempChunkMap = globalThis._tempChunkMap || new Map<string, Blob>();

// Export a reference to the global map
export const tempChunkMap = globalThis._tempChunkMap;

export interface ChunkResult {
  chunks: Blob[];
}

// Simple chunking implementation with fix for audio format preservation
export async function chunkAudioFile(
  audioBlob: Blob,
  // Production values (uncommented)
  maxChunkSizeInBytes: number = 25 * 1024 * 1024, // Default 25MB chunks
  overlapBytes: number = 44100 * 2 * 2 * 3, // ~3 seconds of 16-bit stereo audio at 44.1kHz

  // Testing values (commented out as in your original code)
  // maxChunkSizeInBytes: number = 100 * 1024, // 100KB chunks for testing
  // overlapBytes: number = 1024, // 1KB overlap for testing
): Promise<ChunkResult> {
  const totalSize = audioBlob.size;

  // Ensure overlap doesn't exceed chunk size
  const safeOverlapBytes = Math.min(overlapBytes, maxChunkSizeInBytes * 0.1); // Cap at 10% of chunk size

  // Calculate effective chunk size (accounting for overlap)
  const effectiveChunkSize = maxChunkSizeInBytes - safeOverlapBytes;
  const numChunks = Math.max(1, Math.ceil(totalSize / effectiveChunkSize));

  console.log(`Chunking audio file of ${totalSize} bytes into approximately ${numChunks} chunks`);
  console.log(`Using max chunk size: ${maxChunkSizeInBytes} bytes with overlap: ${safeOverlapBytes} bytes`);

  // The key problem was that we were just slicing the audio blob without preserving WAV headers
  // Let's preserve the header in each chunk

  // First, extract the WAV header (typically 44 bytes, but we'll take the first 4KB to be safe)
  const headerSize = Math.min(4096, audioBlob.size);
  const headerBlob = audioBlob.slice(0, headerSize);
  const headerArrayBuffer = await headerBlob.arrayBuffer();

  const chunks: Blob[] = [];

  for (let i = 0; i < numChunks; i++) {
    const start = Math.max(0, i > 0 ? i * effectiveChunkSize : 0);
    const end = Math.min(totalSize, start + maxChunkSizeInBytes);

    if (start >= totalSize) {
      break; // Safety check
    }

    // Get the data portion of this chunk
    const dataBlob = audioBlob.slice(start, end);

    if (start === 0) {
      // First chunk already has the header
      chunks.push(dataBlob);
    } else {
      // For subsequent chunks, we need to prepend the header
      // Create a new blob with header + data
      const chunkWithHeader = new Blob([headerBlob, dataBlob], { type: audioBlob.type || 'audio/wav' });
      chunks.push(chunkWithHeader);
    }

    console.log(`Created chunk ${i + 1}/${numChunks}: ${start}-${end} (${chunks[i].size} bytes)`);
  }

  return { chunks };
}

// Creates temporary URLs for chunks
export async function createChunksAndGetUrls(
  audioBlob: Blob,
  // Production values (uncommented)
  maxChunkSizeInBytes: number = 10 * 1024 * 1024, // 10MB for production
  overlapSeconds: number = 3, // 3 seconds overlap for production

  // Testing values (commented out as in your original code)
  // maxChunkSizeInBytes: number = 100 * 1024, // 100KB for testing
  // overlapSeconds: number = 1, // 1 second overlap for testing
): Promise<string[]> {
  // Estimate bytes for overlap (assuming 44.1kHz 16-bit stereo)
  const overlapBytes = 44100 * 2 * 2 * overlapSeconds; // Production calculation
  // const overlapBytes = 1024 * overlapSeconds; // Simplified for testing

  const { chunks } = await chunkAudioFile(audioBlob, maxChunkSizeInBytes, overlapBytes);

  // Store chunks and generate URLs
  const urls: string[] = [];

  // Get base URL - use environment variable or default to localhost
  const baseUrl = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL
    : 'http://localhost:3000';

  for (let i = 0; i < chunks.length; i++) {
    const chunkId = `chunk-${uuidv4()}`;

    // Store in our in-memory map
    tempChunkMap.set(chunkId, chunks[i]);

    // Create a URL that can be used to fetch this chunk - make it absolute
    const relativePath = `/api/temp-chunks/${chunkId}`;
    const absoluteUrl = new URL(relativePath, baseUrl).toString();
    urls.push(absoluteUrl);

    console.log(`Stored chunk ${i + 1} with ID ${chunkId}, URL: ${absoluteUrl}`);
    console.log(`Map size after storing: ${tempChunkMap.size}, Contains this chunk: ${tempChunkMap.has(chunkId)}`);
  }

  return urls;
}

// Add a cleanup function to remove old chunks
export function cleanupOldChunks(): void {
  console.log(`Cleaning up chunks. Current map size: ${tempChunkMap.size}`);
  // In a real implementation, you'd track creation time and delete old chunks
}

// Before deploying to production, uncomment the production values and comment out the testing values
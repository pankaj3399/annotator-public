// src/services/hmsRecording.ts
import axios from 'axios';

// HMS API Configuration
const HMS_MANAGEMENT_TOKEN = process.env.HMS_MANAGEMENT_TOKEN;
const HMS_API_ENDPOINT = 'https://api.100ms.live/v2';

/**
 * Fetches recording asset details from 100ms for a specific room
 * and returns a presigned URL that can be directly used in React Player
 */
export async function getRecordingPresignedUrl(roomId: string): Promise<string | null> {
  try {
    if (!HMS_MANAGEMENT_TOKEN) {
      throw new Error('HMS_MANAGEMENT_TOKEN missing in environment variables');
    }

    // First, list all recording assets for the room
    const response = await axios.get(`${HMS_API_ENDPOINT}/recording-assets`, {
      params: {
        room_id: roomId,
        type: 'room-composite', // Specifically target room-composite recordings
        limit: 10, // Get the most recent recordings
        status: 'completed' // Only get completed recordings
      },
      headers: {
        Authorization: `Bearer ${HMS_MANAGEMENT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Type assertion for TypeScript
    const responseData = response.data as {
      data?: Array<{
        id: string;
        path?: string;
        status: string;
        type: string;
        created_at: string;
      }>;
      limit: number;
      total: number;
    };
    
    // Check if there are any completed recordings
    if (responseData.data && responseData.data.length > 0) {
      // Find the most recent room-composite recording
      const compositeRecordings = responseData.data.filter(
        asset => asset.type === 'room-composite' && asset.status === 'completed'
      );
      
      if (compositeRecordings.length > 0) {
        // Sort by created_at (newest first)
        compositeRecordings.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        const latestRecording = compositeRecordings[0];
        console.log(`Found latest recording for room ${roomId}: ${latestRecording.id}`);
        
        // Now, we need to get a presigned URL for this asset
        return await getPresignedUrl(latestRecording.id);
      }
    }
    
    console.log(`No completed room-composite recordings found for room ${roomId}`);
    return null;
  } catch (error: any) {
    console.error(`Error fetching recording for room ${roomId}:`, error.message || error);
    throw new Error('Failed to fetch recording from HMS');
  }
}

/**
 * Gets a presigned URL for a recording asset
 */
async function getPresignedUrl(assetId: string): Promise<string | null> {
  try {
    console.log(`Getting presigned URL for asset: ${assetId}`);
    
    // Get the pre-signed URL for the recording asset with a longer expiry time
    const response = await axios.get(
      `${HMS_API_ENDPOINT}/recording-assets/${assetId}/presigned-url?presign_duration=259200`, // 3 days in seconds
      {
        headers: {
          Authorization: `Bearer ${HMS_MANAGEMENT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = response.data as { 
      url?: string;
      expiry?: number;
    };
    
    if (data.url) {
      console.log(`Got presigned URL for asset ${assetId} with expiry of ${data.expiry} seconds`);
      return data.url;
    }
    
    console.log(`No presigned URL found for asset ${assetId}`);
    return null;
  } catch (error: any) {
    console.error(`Error getting presigned URL for asset ${assetId}:`, error.message || error);
    throw new Error(`Failed to get presigned URL for recording asset ${assetId}`);
  }
}
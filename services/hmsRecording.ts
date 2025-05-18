// services/hmsRecording.ts
import { generateManagementToken } from '@/app/actions/training';
import axios from 'axios';

// HMS API Configuration
const HMS_API_ENDPOINT = 'https://api.100ms.live/v2';

// Define response interfaces
interface ManagementTokenResponse {
  token: string;
}

interface HMSRecordingAsset {
  id: string;
  path?: string;
  status: string;
  type: string;
  created_at: string;
}

interface HMSRecordingAssetsResponse {
  data: HMSRecordingAsset[];
  limit: number;
  total: number;
}

interface HMSSession {
  id: string;
  room_id: string;
  created_at: string;
  updated_at: string;
}

interface HMSSessionsResponse {
  data: HMSSession[];
  limit: number;
  total: number;
}

interface HMSPresignedUrlResponse {
  url: string;
  expiry?: number;
}

/**
 * Fetch a fresh management token from our server
 */
async function getManagementToken(): Promise<string> {
  // Check if we're in a browser or on the server
  if (typeof window !== 'undefined') {
    // Browser environment - use API endpoint
    try {
      const response = await axios.get<ManagementTokenResponse>('/api/hms/management-token');
      if (response.data && response.data.token) {
        return response.data.token;
      }
      throw new Error('Invalid token response from server');
    } catch (error: any) {
      console.error('Failed to get management token:', error.message || error);
      throw new Error('Failed to authenticate with HMS services');
    }
  } else {
    // Server environment - generate token directly
    try {
      return await generateManagementToken();
    } catch (error: any) {
      console.error('Failed to generate management token:', error.message || error);
      throw new Error('Failed to authenticate with HMS services');
    }
  }
}

export async function getRecordingPresignedUrl(roomId: string): Promise<string | null> {
  try {
    // Get a fresh management token
    const managementToken = await getManagementToken();
    console.log(`Successfully obtained management token for room ${roomId}`);

    // Try different query parameters with the 100ms API
    console.log(`Attempting to fetch recordings with room_id: ${roomId}`);
    
    // First attempt: standard room_id parameter
    const response = await axios.get<HMSRecordingAssetsResponse>(`${HMS_API_ENDPOINT}/recording-assets`, {
      params: {
        room_id: roomId,
        limit: 20
      },
      headers: {
        Authorization: `Bearer ${managementToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.data && response.data.data.length > 0) {
      console.log(`Found ${response.data.data.length} recordings for room ${roomId}`);
      return processAndGetPresignedUrl(response.data.data, managementToken);
    }
    
    // If no results, try fetching by session search
    console.log(`No recordings found by room_id, trying other methods`);
    const sessionResponse = await axios.get<HMSSessionsResponse>(`${HMS_API_ENDPOINT}/sessions`, {
      params: {
        room_id: roomId,
        limit: 5
      },
      headers: {
        Authorization: `Bearer ${managementToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    // If sessions found, try each session ID for recordings
    if (sessionResponse.data.data && sessionResponse.data.data.length > 0) {
      console.log(`Found ${sessionResponse.data.data.length} sessions for room ${roomId}`);
      
      // Try each session ID
      for (const session of sessionResponse.data.data) {
        console.log(`Trying recordings for session: ${session.id}`);
        const sessionRecResponse = await axios.get<HMSRecordingAssetsResponse>(`${HMS_API_ENDPOINT}/recording-assets`, {
          params: {
            session_id: session.id,
            limit: 10
          },
          headers: {
            Authorization: `Bearer ${managementToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (sessionRecResponse.data.data && sessionRecResponse.data.data.length > 0) {
          console.log(`Found ${sessionRecResponse.data.data.length} recordings for session ${session.id}`);
          return processAndGetPresignedUrl(sessionRecResponse.data.data, managementToken);
        }
      }
    }
    
    console.log(`No recordings found for room ${roomId} via any method`);
    return null;
  } catch (error: any) {
    console.error(`Error fetching recording for room ${roomId}:`, error.message || error);
    throw new Error('Failed to fetch recording from HMS');
  }
}

// Helper function to process recordings and get a presigned URL
async function processAndGetPresignedUrl(recordings: HMSRecordingAsset[], token: string): Promise<string | null> {
  // Filter for completed room-composite recordings first
  let candidates = recordings.filter(
    asset => (asset.type === 'room-composite' || asset.type.includes('composite')) && 
             asset.status === 'completed'
  );
  
  if (candidates.length === 0) {
    // Fall back to any completed recording
    candidates = recordings.filter(asset => asset.status === 'completed');
  }
  
  if (candidates.length > 0) {
    // Sort by created_at (newest first)
    candidates.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    const latest = candidates[0];
    console.log(`Selected recording: ${latest.id}, type=${latest.type}`);
    
    return getPresignedUrl(latest.id, token);
  }
  
  return null;
}

/**
 * Gets a presigned URL for a recording asset
 */
async function getPresignedUrl(assetId: string, managementToken: string): Promise<string | null> {
  try {
    console.log(`Getting presigned URL for asset: ${assetId}`);
    
    // Get the pre-signed URL for the recording asset with a longer expiry time
    const response = await axios.get<HMSPresignedUrlResponse>(
      `${HMS_API_ENDPOINT}/recording-assets/${assetId}/presigned-url?presign_duration=259200`,
      {
        headers: {
          Authorization: `Bearer ${managementToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.url) {
      console.log(`Got presigned URL for asset ${assetId} with expiry of ${response.data.expiry || 'unknown'} seconds`);
      return response.data.url;
    }
    
    console.log(`No presigned URL found for asset ${assetId}`);
    return null;
  } catch (error: any) {
    console.error(`Error getting presigned URL for asset ${assetId}:`, error.message || error);
    throw new Error(`Failed to get presigned URL for recording asset ${assetId}`);
  }
}
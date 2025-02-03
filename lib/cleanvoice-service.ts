import axios, { AxiosError } from 'axios';

interface CleanvoiceConfig {
  video?: boolean;
  send_email?: boolean;
  long_silences?: boolean;
  stutters?: boolean;
  fillers?: boolean;
  mouth_sounds?: boolean;
  hesitations?: boolean;
  muted?: boolean;
  remove_noise?: boolean;
  keep_music?: boolean;
  breath?: boolean;
  normalize?: boolean;
  sound_studio?: boolean;
  mute_lufs?: number;
  target_lufs?: number;
  export_format?: 'auto' | 'mp3' | 'wav' | 'flac' | 'm4a';
}

interface EnhancementOptions {
  removeFillers: boolean;
  removePauses: boolean;
  removeBreath: boolean;
  removeNoise: boolean;
}

interface UploadResponse {
  signedUrl: string;
  fileUrl?: string;
}

export class CleanvoiceService {
  private readonly BASE_URL = 'https://api.cleanvoice.ai/v2';
  private readonly DEBUG: boolean;
  private readonly apiKey: string;

  constructor(apiKey?: string, debug = true) {
    this.DEBUG = debug;
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_CLEANVOICE_API_KEY || '';
  }

  private log(...args: any[]): void {
    if (this.DEBUG) {
      console.log('[Cleanvoice Debug]', ...args);
    }
  }

  private logError(...args: any[]): void {
    if (this.DEBUG) {
      console.error('[Cleanvoice Error]', ...args);
    }
  }

  private async getSignedUrl(filename: string): Promise<UploadResponse> {
    this.log('Getting signed URL for file:', filename);

    try {
      const response = await axios.post(
        `${this.BASE_URL}/upload`,
        {},
        {
          params: { filename },
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data?.signedUrl) {
        throw new Error('Failed to obtain upload URL');
      }

      // Extract the base URL (without query parameters)
      const fileUrl = response.data.fileUrl || response.data.signedUrl.split('?')[0];

      this.log('Upload response:', { signedUrl: response.data.signedUrl, fileUrl });
      return { signedUrl: response.data.signedUrl, fileUrl };
    } catch (error) {
      this.logError('Failed to get signed URL:', error);
      throw error;
    }
  }

  private async uploadToSignedUrl(signedUrl: string, audioBlob: Blob): Promise<void> {
    this.log('Uploading file:', {
      size: audioBlob.size,
      type: audioBlob.type
    });

    try {
      await axios.put(signedUrl, audioBlob, {
        headers: {
          'Content-Type': audioBlob.type
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || audioBlob.size));
          this.log('Upload progress:', percentCompleted + '%');
        }
      });

      this.log('Upload completed successfully');

      // Add a small delay after upload to ensure file processing
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      this.logError('Upload failed:', error);
      throw error;
    }
  }

  private async createEdit(fileUrl: string, config: CleanvoiceConfig): Promise<string> {
    this.log('Creating edit with config:', { fileUrl, config });

    try {
      const response = await axios.post(
        `${this.BASE_URL}/edits`,
        {
          input: {
            files: [fileUrl],
            config: {
              ...config,
              video: false
            }
          }
        },
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (!response.data?.id) {
        this.logError('Edit creation response:', response.data);
        throw new Error('No edit ID received in response');
      }

      this.log('Edit created with ID:', response.data.id);
      return response.data.id;
    } catch (error) {
      if (error instanceof AxiosError) {
        const errorMessage = error.response?.data?.detail || error.response?.data?.error || error.message;
        this.logError('Failed to create edit:', {
          status: error.response?.status,
          data: error.response?.data,
          message: errorMessage
        });
        throw new Error(`Failed to initialize audio processing: ${errorMessage}`);
      }
      throw error;
    }
  }

  private async checkEditStatus(editId: string): Promise<{
    status: string;
    result?: { download_url: string };
  }> {
    this.log('Checking edit status:', editId);

    try {
      const response = await axios.get(`${this.BASE_URL}/edits/${editId}`, {
        headers: { 'X-API-Key': this.apiKey }
      });

      this.log('Edit status response:', response.data);
      return response.data;
    } catch (error) {
      this.logError('Failed to check edit status:', error);
      throw new Error('Failed to check processing status');
    }
  }

  private async downloadEnhancedAudio(downloadUrl: string, onProgress?: (status: string) => void): Promise<Blob> {
    try {
      const response = await axios.get(downloadUrl, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 0));
          this.log('Download progress:', percentCompleted + '%');
          onProgress?.(`Downloading enhanced audio: ${percentCompleted}%`);
        }
      });

      return response.data;
    } catch (error) {
      this.logError('Failed to download enhanced audio:', error);
      throw new Error('Failed to download processed audio');
    }
  }

  async enhanceAudio(
    audioBlob: Blob,
    config: CleanvoiceConfig,
    onProgress?: (status: string) => void
  ): Promise<Blob> {
    this.log('Starting audio enhancement process');

    try {
      // Get signed URL and upload file
      onProgress?.('Preparing upload...');
      const filename = `recording-${Date.now()}.${config.export_format || 'wav'}`;
      const { signedUrl, fileUrl } = await this.getSignedUrl(filename);

      // Extract the base URL without query parameters if fileUrl is not provided
      const uploadUrl = fileUrl || signedUrl.split('?')[0];

      onProgress?.('Uploading audio...');
      await this.uploadToSignedUrl(signedUrl, audioBlob);

      // Create and monitor edit using the file URL
      onProgress?.('Initializing audio processing...');
      const editId = await this.createEdit(uploadUrl, config);

      let attempts = 0;
      const maxAttempts = 30;
      const pollingInterval = 2000;

      while (attempts < maxAttempts) {
        const editResponse = await this.checkEditStatus(editId);

        if (editResponse.status === 'SUCCESS' && editResponse.result?.download_url) {
          onProgress?.('Downloading enhanced audio...');
          return await this.downloadEnhancedAudio(editResponse.result.download_url, onProgress);
        }

        if (editResponse.status === 'FAILURE') {
          throw new Error('Audio processing failed');
        }

        onProgress?.(`Processing audio... ${Math.round((attempts / maxAttempts) * 100)}%`);
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
        attempts++;
      }

      throw new Error('Processing timeout');
    } catch (error) {
      this.logError('Enhancement process failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const cleanvoiceService = new CleanvoiceService();

// Helper function for processing audio with common options
export async function processWithCleanvoice(
  audioBlob: Blob,
  options: EnhancementOptions,
  onProgress?: (status: string) => void
): Promise<Blob> {
  console.log('Processing with Cleanvoice:', {
    blobSize: audioBlob.size,
    blobType: audioBlob.type,
    options
  });

  try {
    return await cleanvoiceService.enhanceAudio(
      audioBlob,
      {
        fillers: options.removeFillers,
        long_silences: options.removePauses,
        breath: options.removeBreath,
        remove_noise: options.removeNoise,
        normalize: true,
        sound_studio: true,
        export_format: 'wav'
      },
      onProgress
    );
  } catch (error) {
    console.error('Audio processing failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to process audio');
  }
}
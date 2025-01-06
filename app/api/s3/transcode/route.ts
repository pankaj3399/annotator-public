import { spawn } from 'child_process';
import { NextResponse } from 'next/server';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import os from 'os';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const mongoId = new ObjectId().toString();
    const tempFileName = `${uuidv4()}.mp4`;
    const hlsFolder = ''; // Root folder for all files
    const hlsFolderPath = path.join(os.tmpdir(), hlsFolder);

    // Ensure the HLS folder exists
    fs.mkdirSync(hlsFolderPath, { recursive: true });

    const tempFilePath = path.join(os.tmpdir(), tempFileName);
    const playlistPath = path.join(hlsFolderPath, 'playlist.m3u8');
    const segmentPattern = path.join(hlsFolderPath, 'segment%03d.ts');

    // Write the file to a temporary location
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tempFilePath, fileBuffer);

    // FFmpeg command remains the same
    const ffmpeg = spawn('ffmpeg', [
      '-i', tempFilePath,
      '-vf', `scale=${process.env.FFMPEG_RATIO}`,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-g', '30',
      '-sc_threshold', '0',
      '-hls_time', '10',
      '-hls_list_size', '0',
      '-hls_segment_type', 'mpegts',
      '-hls_flags', 'independent_segments',
      '-f', 'hls',
      '-max_muxing_queue_size', '1024',
      '-hls_segment_filename', segmentPattern,
      playlistPath
    ]);

    return new Promise<NextResponse>((resolve, reject) => {
      let ffmpegErrors: string[] = [];

      ffmpeg.on('close', async (code) => {
        if (code !== 0) {
          console.error('FFmpeg process exited with code:', code);
          console.error('FFmpeg errors:', ffmpegErrors.join('\n'));
          return reject(NextResponse.json(
            { success: false, error: 'Failed to convert video to HLS', details: ffmpegErrors },
            { status: 500 }
          ));
        }

        try {
          if (!fs.existsSync(playlistPath)) {
            throw new Error(`Playlist file not found at: ${playlistPath}`);
          }

          // Read the playlist
          let playlistContent = fs.readFileSync(playlistPath, 'utf8');

          // Get segment files
          const segmentFiles = fs
            .readdirSync(hlsFolderPath)
            .filter(file => file.endsWith('.ts'));

          // Calculate how many segments should be there based on video duration
          const videoDuration = await getVideoDuration(tempFilePath);
          const requiredSegmentsCount = Math.ceil(videoDuration / 10); // 30 seconds per segment

          // Only keep the necessary segments (based on calculated required segments)
          const validSegments = segmentFiles.slice(0, requiredSegmentsCount);

          // Construct the base URL for segments
          const baseUrl = `https://annotator-public.s3.ap-south-1.amazonaws.com/hls/${mongoId}/`;

          // Replace segment filenames with URLs in the playlist
          validSegments.forEach((segment, index) => {
            playlistContent = playlistContent.replace(`segment${index.toString().padStart(3, '0')}.ts`, `${baseUrl}segment${index.toString().padStart(3, '0')}.ts`);
          });

          // Prepare files array in the format expected by the video API
          const files = [
            {
              name: 'playlist.m3u8',
              content: Buffer.from(playlistContent).toString('base64')
            },
            ...validSegments.map(segment => ({
              name: segment,
              content: Buffer.from(
                fs.readFileSync(path.join(hlsFolderPath, segment))
              ).toString('base64')
            }))
          ];

          // Clean up temporary files
          try {
            fs.unlinkSync(tempFilePath);
            fs.rmSync(hlsFolderPath, { recursive: true, force: true });
          } catch (cleanupError) {
            console.warn('Cleanup error:', cleanupError);
          }

          resolve(NextResponse.json({
            success: true,
            files,
            mongoId,
            videoDuration // This will be used as folderId in the video API
          }));

        } catch (err) {
          console.error('Error processing HLS files:', err);
          reject(NextResponse.json(
            { success: false, error: 'Error processing HLS files', details: err },
            { status: 500 }
          ));
        }
      });

      ffmpeg.on('error', (err) => {
        console.error('FFmpeg spawn error:', err);
        reject(NextResponse.json(
          { success: false, error: 'Error spawning FFmpeg process', details: err.message },
          { status: 500 }
        ));
      });

      ffmpeg.stderr.on('data', (data) => {
        const errorMessage = data.toString();
        ffmpegErrors.push(errorMessage);
        console.error('FFmpeg stderr:', errorMessage);
      });

      ffmpeg.stdout.on('data', (data) => {
        // Optional: You can log stdout data here if needed for debugging
      });
    });

  } catch (error) {
    console.error('General error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process video', details: error },
      { status: 500 }
    );
  }
}

// Function to get video duration using ffmpeg
async function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ['-i', filePath]);
    
    let duration = 0;
    ffmpeg.stderr.on('data', (data) => {
      const dataString = data.toString();
      const match = /Duration: (\d+):(\d+):(\d+\.\d+)/.exec(dataString);
      if (match) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseFloat(match[3]);
        duration = (hours * 3600) + (minutes * 60) + seconds;
      }
    });
    
    ffmpeg.on('close', () => {
      resolve(duration);
    });
    
    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
}

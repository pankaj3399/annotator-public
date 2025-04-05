// app/api/transcribe/route.ts

import { createChunksAndGetUrls } from '@/utils/audioChunker';
import { NextRequest, NextResponse } from 'next/server';

// Maximum size for individual chunks (10MB is a typical limit for many APIs)
const MAX_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
// const MAX_CHUNK_SIZE = 100 * 1024;


// Seconds of overlap between chunks to ensure continuous transcription
const CHUNK_OVERLAP_SECONDS = 3;
// const CHUNK_OVERLAP_SECONDS = 1;


export async function POST(req: NextRequest) {
  try {
    const { audioUrl, model, apiKey, language, enableChunking = false } = await req.json();

    if (!audioUrl || !model) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Only require API key for non-local models
    if (!apiKey && model !== 'whisper-large-v3-local') {
      return NextResponse.json(
        { error: 'API key is required for cloud transcription services' },
        { status: 400 }
      );
    }

    // Pre-fetch the audio to check size and determine if chunking is needed
    const response = await fetch(audioUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch audio: ${response.statusText}` },
        { status: 500 }
      );
    }

    const audioBlob = await response.blob();
    console.log(`Audio file fetched successfully: ${audioBlob.size} bytes`);

    // Determine if we need to chunk the audio
    // - If enableChunking is true, and the file is larger than MAX_CHUNK_SIZE
    const shouldChunk = enableChunking && audioBlob.size > MAX_CHUNK_SIZE;

    let transcriptionResult = "";

    if (shouldChunk) {
      console.log(`Audio file size (${audioBlob.size} bytes) exceeds threshold. Chunking enabled.`);

      // Create temporary URLs for chunks
      const chunkUrls = await createChunksAndGetUrls(audioBlob, MAX_CHUNK_SIZE, CHUNK_OVERLAP_SECONDS);

      console.log(`Audio chunked into ${chunkUrls.length} parts`);

      // Process each chunk URL and collect results
      const chunkResults = [];

      for (let i = 0; i < chunkUrls.length; i++) {
        console.log(`Processing chunk ${i + 1}/${chunkUrls.length}`);
        const chunkUrl = new URL(chunkUrls[i], process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').toString();

        // Use existing transcription functions with the chunk URL
        const chunkTranscription = await transcribeChunk(
          chunkUrl,
          model,
          apiKey,
          language
        );

        chunkResults.push(chunkTranscription);

        console.log(`Transcription for chunk ${i + 1} completed`);
      }

      // Combine results
      transcriptionResult = combineTranscriptions(chunkResults);
    } else {
      // Process the entire audio file as a single piece
      console.log(`Processing audio file as a single chunk (${audioBlob.size} bytes)`);

      // Use existing transcription functions
      let transcriptionResponse;

      // Different API implementations based on the selected model
      switch (model) {
        case 'azure-ai-speech':
          transcriptionResponse = await transcribeWithAzure(audioUrl, apiKey, language);
          break;
        case 'deepgram-nova-2':
          transcriptionResponse = await transcribeWithDeepgram(audioUrl, apiKey, language);
          break;
        case 'openai-whisper-large-v2':
          transcriptionResponse = await transcribeWithOpenAI(audioUrl, apiKey, language);
          break;
        case 'groq-whisper-large-v3':
        case 'groq-whisper-large-v3-turbo':
        case 'groq-distil-whisper':
          transcriptionResponse = await transcribeWithGroq(audioUrl, apiKey, model, language);
          break;
        case 'assemblyai-universal-2':
          transcriptionResponse = await transcribeWithAssemblyAI(audioUrl, apiKey, language);
          break;
        // Remove or uncomment the local whisper case
        // case 'whisper-large-v3-local':
        //   transcriptionResponse = await transcribeWithLocalWhisper(audioUrl, language);
        //   break;
        // case 'speechmatics':
        //   transcriptionResponse = await transcribeWithSpeechmatics(audioUrl, apiKey, language);
        //   break;
        case 'gladia':
          transcriptionResponse = await transcribeWithGladia(audioUrl, apiKey, language);
          break;
        default:
          return NextResponse.json(
            { error: 'Unsupported transcription model' },
            { status: 400 }
          );
      }

      transcriptionResult = transcriptionResponse;
    }

    return NextResponse.json({ transcription: transcriptionResult });
  } catch (error: unknown) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// Helper function to intelligently combine transcriptions
// This could be enhanced with more sophisticated text processing
function combineTranscriptions(transcriptions: string[]): string {
  if (transcriptions.length === 0) return "";
  if (transcriptions.length === 1) return transcriptions[0];

  // Filter out empty transcriptions before combining
  const nonEmptyTranscriptions = transcriptions.filter(text => text.trim() !== '');

  if (nonEmptyTranscriptions.length === 0) return "";
  if (nonEmptyTranscriptions.length === 1) return nonEmptyTranscriptions[0];

  // Basic approach: join with spaces
  return nonEmptyTranscriptions.map(text => text.trim()).join(' ');

  // More advanced approach (commented out for now):
  // This would remove duplicate sentences at chunk boundaries
  /*
  let combined = nonEmptyTranscriptions[0];
  
  for (let i = 1; i < nonEmptyTranscriptions.length; i++) {
    const current = nonEmptyTranscriptions[i];
    
    // Find potential overlapping text (sentences, phrases)
    // This is a simplified approach - a real implementation would be more sophisticated
    const sentences = combined.match(/[^.!?]+[.!?]+/g) || [];
    
    if (sentences.length >= 2) {
      const lastTwoSentences = sentences.slice(-2).join(' ');
      if (current.startsWith(lastTwoSentences)) {
        combined += current.substring(lastTwoSentences.length);
      } else {
        combined += ' ' + current;
      }
    } else {
      combined += ' ' + current;
    }
  }
  
  return combined;
  */
}

// Helper function that uses the existing switch case logic
async function transcribeChunk(chunkUrl: string, model: string, apiKey: string, language = 'en'): Promise<string> {
  // Use the existing switch case logic
  let transcriptionResponse;

  // Different API implementations based on the selected model
  switch (model) {
    case 'azure-ai-speech':
      transcriptionResponse = await transcribeWithAzure(chunkUrl, apiKey, language);
      break;
    case 'deepgram-nova-2':
      transcriptionResponse = await transcribeWithDeepgram(chunkUrl, apiKey, language);
      break;
    case 'openai-whisper-large-v2':
      transcriptionResponse = await transcribeWithOpenAI(chunkUrl, apiKey, language);
      break;
    case 'groq-whisper-large-v3':
    case 'groq-whisper-large-v3-turbo':
    case 'groq-distil-whisper':
      transcriptionResponse = await transcribeWithGroq(chunkUrl, apiKey, model, language);
      break;
    case 'assemblyai-universal-2':
      transcriptionResponse = await transcribeWithAssemblyAI(chunkUrl, apiKey, language);
      break;
    // Remove or uncomment the local whisper case
    // case 'whisper-large-v3-local':
    //   transcriptionResponse = await transcribeWithLocalWhisper(chunkUrl, language);
    //   break;
    // case 'speechmatics':
    //   transcriptionResponse = await transcribeWithSpeechmatics(chunkUrl, apiKey, language);
    //   break;
    case 'gladia':
      transcriptionResponse = await transcribeWithGladia(chunkUrl, apiKey, language);
      break;
    default:
      throw new Error('Unsupported transcription model');
  }

  return transcriptionResponse;
}

// AssemblyAI Universal 2 transcription implementation
async function transcribeWithAssemblyAI(audioUrl: string, apiKey: string, language = 'en') {
  console.log(`Starting AssemblyAI Universal 2 transcription for: ${audioUrl} with language: ${language}`);
  try {
    // Fetch the audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio file from ${audioUrl}: ${response.status} ${response.statusText}`);
    }

    const audioBlob = await response.blob();
    console.log(`Audio file fetched successfully: ${audioBlob.size} bytes`);

    // Step 1: Upload the audio to AssemblyAI
    console.log('Uploading audio to AssemblyAI...');
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': apiKey
      },
      body: audioBlob
    });

    if (!uploadResponse.ok) {
      const responseText = await uploadResponse.text().catch(() => 'No response body');
      throw new Error(`AssemblyAI upload error: ${uploadResponse.status} ${uploadResponse.statusText}. Response: ${responseText}`);
    }

    const uploadData = await uploadResponse.json();
    const uploadUrl = uploadData.upload_url;
    console.log(`Audio uploaded successfully to AssemblyAI at: ${uploadUrl}`);

    // Step 2: Create a transcription job
    console.log('Creating transcription job...');
    const transcriptionResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: uploadUrl,
        language_code: language
      })
    });

    if (!transcriptionResponse.ok) {
      const responseText = await transcriptionResponse.text().catch(() => 'No response body');
      throw new Error(`AssemblyAI job creation error: ${transcriptionResponse.status} ${transcriptionResponse.statusText}. Response: ${responseText}`);
    }

    const transcriptionData = await transcriptionResponse.json();
    const transcriptId = transcriptionData.id;
    console.log(`AssemblyAI job created with ID: ${transcriptId}`);

    // Step 3: Poll for completion
    console.log('Polling for transcription completion...');
    const pollingEndpoint = `https://api.assemblyai.com/v2/transcript/${transcriptId}`;

    while (true) {
      const pollingResponse = await fetch(pollingEndpoint, {
        headers: {
          'Authorization': apiKey
        }
      });

      if (!pollingResponse.ok) {
        const responseText = await pollingResponse.text().catch(() => 'No response body');
        throw new Error(`AssemblyAI polling error: ${pollingResponse.status} ${pollingResponse.statusText}. Response: ${responseText}`);
      }

      const transcriptionResult = await pollingResponse.json();
      console.log(`AssemblyAI job status: ${transcriptionResult.status}`);

      if (transcriptionResult.status === 'completed') {
        // Check text field exists
        if (transcriptionResult.text === undefined) {
          console.error(`Unexpected AssemblyAI response structure: ${JSON.stringify(transcriptionResult)}`);
          throw new Error('Unexpected AssemblyAI response structure: text field not found');
        }

        // Log if empty but don't treat as error
        if (transcriptionResult.text === '') {
          console.log(`AssemblyAI returned an empty transcription for this chunk. This may be normal for silent segments.`);
        } else {
          console.log(`Transcription completed successfully. Text length: ${transcriptionResult.text.length} characters`);
        }

        return transcriptionResult.text;
      } else if (transcriptionResult.status === 'error') {
        throw new Error(`Transcription failed: ${transcriptionResult.error}`);
      } else {
        // Wait 3 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  } catch (error) {
    console.error(`AssemblyAI transcription failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
// // Updated transcribeWithSpeechmatics function in route.ts
// async function transcribeWithSpeechmatics(audioUrl: string, apiKey: string, language = 'en') {
//   console.log(`Starting Speechmatics transcription for: ${audioUrl} with language: ${language}`);
//   try {

//     // Fetch the audio file
//     const response = await fetch(audioUrl);
//     if (!response.ok) {
//       const errorMsg = `Failed to fetch audio file from ${audioUrl}: ${response.status} ${response.statusText}`;
//       console.error(errorMsg);
//       throw new Error(errorMsg);
//     }

//     // Get the audio as ArrayBuffer
//     const audioBuffer = await response.arrayBuffer();
//     console.log(`Audio file fetched successfully: ${audioBuffer.byteLength} bytes`);

//     // Extract filename from URL
//     let filename = 'audio.wav';
//     try {
//       const url = new URL(audioUrl);
//       const pathParts = url.pathname.split('/');
//       const lastPart = pathParts[pathParts.length - 1];
//       if (lastPart && lastPart.includes('.')) {
//         filename = lastPart;
//       }
//     } catch (e) {
//       console.warn('Could not parse URL for filename, using default');
//     }

//     console.log(`Using filename: ${filename}`);

//     // Try transcription with multiple format attempts
//     return await transcribeWithSpeechmaticsClient(
//       audioBuffer,
//       filename,
//       apiKey,
//       language
//     );
//   } catch (error: unknown) {
//     console.error(`Speechmatics transcription failed: ${error instanceof Error ? error.message : String(error)}`);
//     throw error;
//   }
// }
async function transcribeWithGladia(audioUrl: string, apiKey: string, language = 'en') {
  try {
    // Fetch the audio file
    const response = await fetch(audioUrl);
    const audioBlob = await response.blob();

    // Create form data for the API request
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');
    formData.append('language', language);

    // Prepare request options including language setting
    const options = {
      method: 'POST',
      headers: {
        'x-gladia-key': apiKey,
        'Accept': 'application/json'
      },
      body: formData
    };

    // Make API request to Gladia
    const gladiaResponse = await fetch('https://api.gladia.io/audio/text/audio-transcription/', options);

    if (!gladiaResponse.ok) {
      throw new Error(`Gladia API error: ${gladiaResponse.statusText}`);
    }

    const data = await gladiaResponse.json();

    // Check response structure
    if (!data.prediction) {
      console.error(`Unexpected Gladia response structure: ${JSON.stringify(data)}`);
      throw new Error('Unexpected Gladia response structure');
    }

    // Handle empty predictions array - no speech detected
    if (!Array.isArray(data.prediction) || data.prediction.length === 0) {
      console.log(`Gladia returned no transcript segments for this chunk. This may be normal for silent segments.`);
      return "";
    }

    // Join all transcription segments with a space
    const transcript = data.prediction
      .map((segment: { transcription: string }) => segment.transcription || "")
      .join(' ')
      .trim();

    if (transcript === "") {
      console.log(`Gladia returned an empty transcription for this chunk. This may be normal for silent segments.`);
    }

    return transcript;
  } catch (error: unknown) {
    console.error(`Gladia transcription failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Example implementation for OpenAI Whisper with enhanced logging
async function transcribeWithOpenAI(audioUrl: string, apiKey: string, language = 'en') {
  console.log(`Starting OpenAI Whisper transcription for: ${audioUrl} with language: ${language}`);
  try {
    // Fetch the audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      const errorMsg = `Failed to fetch audio file from ${audioUrl}: ${response.status} ${response.statusText}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const audioBlob = await response.blob();
    console.log(`Audio file fetched successfully: ${audioBlob.size} bytes`);

    // Create form data for the API request
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('language', language);

    // Make the API request to OpenAI
    console.log('Sending request to OpenAI Whisper API');
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!whisperResponse.ok) {
      const responseText = await whisperResponse.text().catch(() => 'No response body');
      const errorMsg = `OpenAI API error: ${whisperResponse.status} ${whisperResponse.statusText}. Response: ${responseText}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const data = await whisperResponse.json();
    console.log(`OpenAI Whisper transcription completed successfully. Result: ${JSON.stringify(data)}`);

    // Check if the text field exists
    if (data.text === undefined) {
      console.error(`Unexpected OpenAI response structure: ${JSON.stringify(data)}`);
      throw new Error('Unexpected OpenAI response structure: text field not found');
    }

    // Log empty transcriptions but don't treat them as errors
    if (data.text === '') {
      console.log(`OpenAI returned an empty transcription for this chunk. This may be normal for silent segments.`);
    }

    return data.text;
  } catch (error: unknown) {
    console.error(`OpenAI Whisper transcription failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function transcribeWithAzure(audioUrl: string, apiKey: string, language = 'en') {
  console.log(`Starting Azure transcription for: ${audioUrl} with language: ${language}`);
  try {
    // Map ISO 639-1 language codes to Azure's expected format
    const languageMap: Record<string, string> = {
      'en': 'en-US',
      'en-in': 'en-IN',
      'fr': 'fr-FR',
      'es': 'es-ES',
      'de': 'de-DE',
      'it': 'it-IT',
      'pt': 'pt-BR',
      'zh': 'zh-CN',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'ru': 'ru-RU',
      // Add more mappings as needed
    };

    // Get the Azure-compatible language code
    const azureLanguage = languageMap[language.toLowerCase()] || languageMap['en'];
    console.log(`Mapped language code '${language}' to Azure language code '${azureLanguage}'`);

    // Fetch the audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      const errorMsg = `Failed to fetch audio file from ${audioUrl}: ${response.status} ${response.statusText}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const audioBlob = await response.blob();
    console.log(`Audio file fetched successfully: ${audioBlob.size} bytes`);

    // Create the form data
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');

    // Create the transcription definition with various options to improve recognition
    const transcribeDefinition = {
      language: azureLanguage,
      wordLevelTimestampsEnabled: true,
      profanityFilterMode: "masked",
      timeToLive: "PT1H"
    };

    // Add the definition as a string 
    formData.append('definition', JSON.stringify(transcribeDefinition));

    // Define available regions to try (starting with standard ones and then India-specific)
    const regionsToTry = ['eastus', 'westus', 'centralindia', 'southindia'];

    // Try each region in sequence
    for (const region of regionsToTry) {
      try {
        console.log(`Trying Azure Speech API in region: ${region}`);

        // Use the new modern endpoint from the documentation
        const endpoint = `https://${region}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2024-11-15`;

        const azureResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': apiKey
          },
          body: formData
        });

        // If unauthorized, try next region
        if (azureResponse.status === 401) {
          console.warn(`Authentication failed for region ${region}. Trying next region...`);
          continue;
        }

        if (!azureResponse.ok) {
          const responseText = await azureResponse.text().catch(() => 'No response body');
          console.error(`Azure API error in region ${region}: ${azureResponse.status} ${azureResponse.statusText}. Response: ${responseText}`);
          continue; // Try next region
        }

        const data = await azureResponse.json();
        console.log(`Azure transcription successful in region ${region}. Response:`, data);

        // Extract the text from the response format
        let transcription = "";

        if (data.combinedPhrases && data.combinedPhrases.length > 0) {
          // Get text from all phrases
          transcription = data.combinedPhrases.map((phrase: any) => phrase.text || "").join(' ');
        } else if (data.phrases && data.phrases.length > 0) {
          // Fallback to using individual phrases if combined phrases not available
          transcription = data.phrases.map((phrase: any) => phrase.text || "").join(' ');
        }

        // Log empty results but don't treat as errors
        if (transcription.trim() === "") {
          console.log(`Azure returned an empty transcription for region ${region}. This may be normal for silent segments.`);
        } else {
          console.log(`Extracted transcription: ${transcription}`);
        }

        return transcription;
      } catch (error) {
        console.error(`Error with Azure Speech in region ${region}: ${error instanceof Error ? error.message : String(error)}`);
        // Continue to next region
      }
    }

    // If we've tried all regions with no success, try using Indian English specifically
    if (azureLanguage !== 'en-IN') {
      try {
        console.log("All regions failed. Trying with Indian English (en-IN) specifically");
        return await transcribeWithAzure(audioUrl, apiKey, 'en-in');
      } catch (fallbackError) {
        console.error(`Indian English fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
      }
    }

    // If all attempts fail, return empty string
    console.warn("All Azure Speech transcription attempts failed. Returning empty string.");
    return "";
  } catch (error: unknown) {
    console.error(`Azure transcription failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Deepgram implementation with enhanced logging
async function transcribeWithDeepgram(audioUrl: string, apiKey: string, language = 'en') {
  console.log(`Starting Deepgram transcription for: ${audioUrl} with language: ${language}`);
  try {
    // Fetch the audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      const errorMsg = `Failed to fetch audio file from ${audioUrl}: ${response.status} ${response.statusText}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`Audio file fetched successfully: ${audioBuffer.byteLength} bytes`);

    // Prepare the request options
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'audio/wav'
      },
      body: audioBuffer
    };

    // Construct URL with query parameters for language and model
    const url = `https://api.deepgram.com/v1/listen?model=nova-2&language=${language}`;

    // Make API request to Deepgram
    console.log(`Sending request to Deepgram API with model: nova-2`);
    const deepgramResponse = await fetch(url, options);

    if (!deepgramResponse.ok) {
      const responseText = await deepgramResponse.text().catch(() => 'No response body');
      const errorMsg = `Deepgram API error: ${deepgramResponse.status} ${deepgramResponse.statusText}. Response: ${responseText}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const data = await deepgramResponse.json();
    console.log(`Deepgram transcription completed. Result structure: ${JSON.stringify(Object.keys(data))}`);
    console.log(`Deepgram result preview: ${JSON.stringify(data).substring(0, 500)}...`);

    // Check if the expected structure exists
    if (!data.results?.channels?.[0]?.alternatives) {
      console.error(`Unexpected Deepgram response structure: ${JSON.stringify(data)}`);
      throw new Error('Unexpected Deepgram response structure');
    }

    // Handle an empty transcript (no speech detected)
    if (data.results.channels[0].alternatives.length === 0) {
      console.log(`Deepgram returned no alternatives for this chunk. This may be normal for silent segments.`);
      return "";
    }

    const transcript = data.results.channels[0].alternatives[0]?.transcript || "";
    if (transcript === "") {
      console.log(`Deepgram returned an empty transcription for this chunk. This may be normal for silent segments.`);
    }

    return transcript;
  } catch (error: unknown) {
    console.error(`Deepgram transcription failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function transcribeWithGroq(audioUrl: string, apiKey: string, model: string, language = 'en') {
  console.log(`Starting Groq transcription for: ${audioUrl} with model: ${model} and language: ${language}`);
  try {
    // Fetch the audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      const errorMsg = `Failed to fetch audio file from ${audioUrl}: ${response.status} ${response.statusText}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const audioBlob = await response.blob();
    console.log(`Audio file fetched successfully: ${audioBlob.size} bytes`);

    // Map Groq model names to actual model IDs
    // As of March 2025, Groq supports whisper-large-v3 for audio transcription
    const modelMap: Record<string, string> = {
      'groq-whisper-large-v3': 'whisper-large-v3',
      'groq-whisper-large-v3-turbo': 'whisper-large-v3', // Use standard model as fallback
      'groq-distil-whisper': 'whisper-large-v3' // Replace with a supported model
    };

    const actualModel = modelMap[model] || 'whisper-large-v3';
    console.log(`Using Groq model: ${actualModel} (mapped from ${model})`);

    // Create form data (multipart/form-data)
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3'); // Add file with a filename
    formData.append('model', actualModel);
    formData.append('language', language);

    // Define the Groq API endpoint
    const groqEndpoint = 'https://api.groq.com/openai/v1/audio/transcriptions';

    // Make API request to Groq with multipart/form-data
    console.log(`Sending request to Groq API`);
    const groqResponse = await fetch(groqEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
        // Don't set Content-Type manually; fetch will set it correctly with the boundary for multipart/form-data
      },
      body: formData
    });

    if (!groqResponse.ok) {
      const responseText = await groqResponse.text().catch(() => 'No response body');
      const errorMsg = `Groq API error: ${groqResponse.status} ${groqResponse.statusText}. Response: ${responseText}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const data = await groqResponse.json();
    console.log(`Groq transcription completed successfully. Result: ${JSON.stringify(data)}`);

    // Check if the text field exists and is not undefined
    if (data.text === undefined) {
      console.error(`Unexpected Groq response structure: ${JSON.stringify(data)}`);
      throw new Error('Unexpected Groq response structure: text field not found');
    }

    // Log when we get an empty transcription but continue processing
    if (data.text === '') {
      console.log(`Groq returned an empty transcription for this chunk. This may be normal for silent segments.`);
    }

    // Return the text (even if empty)
    return data.text;
  } catch (error: unknown) {
    console.error(`Groq transcription failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
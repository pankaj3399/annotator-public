// app/api/transcribe/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { audioUrl, model, apiKey, language } = await req.json();

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
    //   case 'whisper-large-v3-local':
    //     transcriptionResponse = await transcribeWithLocalWhisper(audioUrl, language);
    //     break;
      case 'speechmatics':
        transcriptionResponse = await transcribeWithSpeechmatics(audioUrl, apiKey, language);
        break;
      case 'gladia':
        transcriptionResponse = await transcribeWithGladia(audioUrl, apiKey, language);
        break;
      default:
        return NextResponse.json(
          { error: 'Unsupported transcription model' },
          { status: 400 }
        );
    }

    return NextResponse.json({ transcription: transcriptionResponse });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}

// async function transcribeWithLocalWhisper(audioUrl: string, language = 'en') {
//     console.log(`Starting Local Whisper transcription for: ${audioUrl} with language: ${language}`);
//     try {
//       // Fetch the audio file
//       const response = await fetch(audioUrl);
//       if (!response.ok) {
//         const errorMsg = `Failed to fetch audio file from ${audioUrl}: ${response.status} ${response.statusText}`;
//         console.error(errorMsg);
//         throw new Error(errorMsg);
//       }
      
//       const audioBlob = await response.blob();
//       console.log(`Audio file fetched successfully: ${audioBlob.size} bytes`);
      
//       // Create form data
//       const formData = new FormData();
//       formData.append('file', audioBlob, 'audio.wav');
//       formData.append('language', language);
      
//       // Create an absolute URL for the local endpoint using NEXTAUTH_URL if available
//       // This ensures it works both on the client and server side
//       let baseUrl = process.env.NEXTAUTH_URL;
      
//       if (!baseUrl) {
//         // Fallback if NEXTAUTH_URL is not available
//         const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
//         const host = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_HOST || 'localhost:3000';
//         baseUrl = `${protocol}://${host}`;
//       }
      
//       // Remove trailing slash if present
//       baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      
//       const localEndpoint = `${baseUrl}/api/transcribe-local`;
      
//       console.log(`Sending request to Local Whisper API endpoint: ${localEndpoint}`);
      
//       const whisperResponse = await fetch(localEndpoint, {
//         method: 'POST',
//         body: formData
//       });
      
//       if (!whisperResponse.ok) {
//         const responseText = await whisperResponse.text().catch(() => 'No response body');
//         const errorMsg = `Local Whisper API error: ${whisperResponse.status} ${whisperResponse.statusText}. Response: ${responseText}`;
//         console.error(errorMsg);
//         throw new Error(errorMsg);
//       }
      
//       const data = await whisperResponse.json();
//       console.log(`Local Whisper transcription completed successfully. Result length: ${data.text?.length || 0} characters`);
      
//       if (!data.text) {
//         console.error(`Unexpected Local Whisper response structure: ${JSON.stringify(data)}`);
//         throw new Error('Unexpected Local Whisper response structure: text field not found');
//       }
      
//       return data.text;
//     } catch (error) {
//       console.error(`Local Whisper transcription failed: ${error.message}`);
//       throw error;
//     }
//   }
  
  // Speechmatics implementation with enhanced logging and timeout
  async function transcribeWithSpeechmatics(audioUrl: string, apiKey: string, language = 'en', maxPollingTimeMs = 300000) {
    console.log(`Starting Speechmatics transcription for: ${audioUrl} with language: ${language}`);
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
      
      // Create job request payload
      const jobConfig = {
        type: "transcription",
        transcription_config: {
          language: language
        }
      };
      console.log(`Speechmatics job config: ${JSON.stringify(jobConfig)}`);
      
      // Create form data
      const formData = new FormData();
      formData.append('data_file', audioBlob);
      formData.append('config', JSON.stringify(jobConfig));
      
      // Submit job
      console.log(`Submitting job to Speechmatics API`);
      const submitResponse = await fetch('https://asr.api.speechmatics.com/v2/jobs/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      });
      
      if (!submitResponse.ok) {
        const responseText = await submitResponse.text().catch(() => 'No response body');
        const errorMsg = `Speechmatics job submission error: ${submitResponse.status} ${submitResponse.statusText}. Response: ${responseText}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      const jobData = await submitResponse.json();
      console.log(`Speechmatics job submitted successfully. Job ID: ${jobData.id}`);
      const jobId = jobData.id;
      
      // Poll for job completion
      let transcription = "";
      let jobComplete = false;
      const startTime = Date.now();
      let pollCount = 0;
      
      console.log(`Starting polling for job status. Max polling time: ${maxPollingTimeMs/1000} seconds`);
      while (!jobComplete) {
        // Check for timeout
        if (Date.now() - startTime > maxPollingTimeMs) {
          const timeoutMsg = `Speechmatics transcription timed out after ${maxPollingTimeMs/1000} seconds`;
          console.error(timeoutMsg);
          throw new Error(timeoutMsg);
        }
        
        // Wait a bit before polling again
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        pollCount++;
        console.log(`Polling job status (attempt ${pollCount})...`);
        
        const jobResponse = await fetch(`https://asr.api.speechmatics.com/v2/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });
        
        if (!jobResponse.ok) {
          const responseText = await jobResponse.text().catch(() => 'No response body');
          const errorMsg = `Speechmatics job status error: ${jobResponse.status} ${jobResponse.statusText}. Response: ${responseText}`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
        
        const statusData = await jobResponse.json();
        console.log(`Job status: ${statusData.job.status}`);
        
        if (statusData.job.status === 'done') {
          jobComplete = true;
          console.log(`Job completed successfully. Fetching transcript...`);
          
          // Get transcript
          const transcriptResponse = await fetch(
            `https://asr.api.speechmatics.com/v2/jobs/${jobId}/transcript?format=txt`,
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`
              }
            }
          );
          
          if (!transcriptResponse.ok) {
            const responseText = await transcriptResponse.text().catch(() => 'No response body');
            const errorMsg = `Speechmatics transcript error: ${transcriptResponse.status} ${transcriptResponse.statusText}. Response: ${responseText}`;
            console.error(errorMsg);
            throw new Error(errorMsg);
          }
          
          transcription = await transcriptResponse.text();
          console.log(`Transcript retrieved successfully. Length: ${transcription.length} characters`);
          console.log(`Transcript preview: ${transcription.substring(0, 200)}...`);
        } else if (statusData.job.status === 'failed') {
          const errorMsg = `Speechmatics job failed: ${JSON.stringify(statusData)}`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
      }
      
      return transcription;
    } catch (error) {
      console.error(`Speechmatics transcription failed: ${error.message}`);
      throw error;
    }
  }

  async function transcribeWithGladia(audioUrl: string, apiKey: string, language = 'en') {
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
    
    // Extract transcriptions from all segments in prediction array
    if (Array.isArray(data.prediction) && data.prediction.length > 0) {
      // Join all transcription segments with a space
      return data.prediction
        .map(segment => segment.transcription)
        .join(' ')
        .trim();
    } else {
      throw new Error('No transcription found in Gladia API response');
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
          return data.text;
        } catch (error) {
          console.error(`OpenAI Whisper transcription failed: ${error.message}`);
          throw error;
        }
      }
      

      
async function transcribeWithAzure(audioUrl: string, apiKey: string, language = 'en') {
    console.log(`Starting Azure transcription for: ${audioUrl} with language: ${language}`);
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
      
      // Azure Speech requires a specific region
      const region = "eastus"; // This should be configurable
      
      // Create form data
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.wav');
      
      // Make API request to Azure
      console.log(`Sending request to Azure Speech API (${region})`);
      const azureResponse = await fetch(
        `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${language}`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': apiKey,
            'Content-Type': 'audio/wav'
          },
          body: audioBlob
        }
      );
      
      if (!azureResponse.ok) {
        const responseText = await azureResponse.text().catch(() => 'No response body');
        const errorMsg = `Azure API error: ${azureResponse.status} ${azureResponse.statusText}. Response: ${responseText}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      const data = await azureResponse.json();
      console.log(`Azure transcription completed successfully: ${JSON.stringify(data)}`);
      return data.DisplayText;
    } catch (error) {
      console.error(`Azure transcription failed: ${error.message}`);
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
      
      if (!data.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
        console.error(`Unexpected Deepgram response structure: ${JSON.stringify(data)}`);
        throw new Error('Unexpected Deepgram response structure');
      }
      
      return data.results.channels[0].alternatives[0].transcript;
    } catch (error) {
      console.error(`Deepgram transcription failed: ${error.message}`);
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
      const modelMap = {
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
      
      if (!data.text) {
        console.error(`Unexpected Groq response structure: ${JSON.stringify(data)}`);
        throw new Error('Unexpected Groq response structure: text field not found');
      }
      
      return data.text;
    } catch (error) {
      console.error(`Groq transcription failed: ${error.message}`);
      throw error;
    }
  }
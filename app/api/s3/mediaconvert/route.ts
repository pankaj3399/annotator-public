import { MediaConvertClient, CreateJobCommand, GetJobCommand } from "@aws-sdk/client-mediaconvert";

const mediaConvertClient = new MediaConvertClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  try {
    const { s3Path } = await req.json();

    const jobResponse = await mediaConvertClient.send(
      new CreateJobCommand({
        Role: process.env.MEDIA_CONVERT_AWS_ROLE!,
        Settings: {
          Inputs: [
            {
              FileInput: `s3://${process.env.AWS_BUCKET_NAME}/${s3Path}`,
              AudioSelectors: {
                "Audio Selector 1": {
                  DefaultSelection: "DEFAULT", // Automatically uses the default audio track
                },
              },
            },
          ],
          OutputGroups: [
            {
              CustomName: "HLS",
              OutputGroupSettings: {
                Type: "HLS_GROUP_SETTINGS",
                HlsGroupSettings: {
                  SegmentLength: 10,
                  MinSegmentLength: 0,
                  DirectoryStructure: "SINGLE_DIRECTORY",
                  ManifestCompression: "NONE",
                  OutputSelection: "MANIFESTS_AND_SEGMENTS",
                  Destination: `s3://${process.env.AWS_BUCKET_NAME}/hls/${s3Path
                    .split("/")
                    .pop()
                    ?.replace(/\.[^/.]+$/, "")}/`,
                },
              },
              Outputs: [
                {
                  NameModifier: "stream",
                  ContainerSettings: {
                    Container: "M3U8",
                  },
                  VideoDescription: {
                    CodecSettings: {
                      Codec: "H_264",
                      H264Settings: {
                        Bitrate: 5000000,
                        RateControlMode: "CBR",
                        QualityTuningLevel: "MULTI_PASS_HQ",
                      },
                    },
                  },
                  AudioDescriptions: [
                    {
                      CodecSettings: {
                        Codec: "AAC",
                        AacSettings: {
                          Bitrate: 96000,
                          SampleRate: 48000,
                          CodingMode: "CODING_MODE_2_0",
                        },
                      },
                      AudioSourceName: "Audio Selector 1", // Link to the default audio selector
                    },
                  ],
                },
              ],
            },
          ],
        },
      })
    );

    const jobId = jobResponse.Job?.Id;
    if (!jobId) throw new Error("Failed to get MediaConvert job ID");

    console.log("Job created successfully, ID:", jobId);

    return new Response(
      JSON.stringify({ success: true, message: `Job started successfully with ID: ${jobId}` }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Request processing error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500 }
    );
  }
}

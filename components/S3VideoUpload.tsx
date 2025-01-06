import React, { useState } from "react";

interface VideoProps{
  onSuccess:(mongoId:string,videoDuration:string)=>void
}

function VideoUploader({onSuccess}:VideoProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(false);
    setProgress("Transcoding video...");

    try {
      // Step 1: Send file to transcode API and get mongoId and files
      const formData = new FormData();
      formData.append("file", file);

      const transcodeResponse = await fetch("/api/s3/transcode", {
        method: "POST",
        body: formData,
      });

      const transcodeData = await transcodeResponse.json();
      if (!transcodeData.success) throw new Error("Failed to convert video");

      const { mongoId, files,videoDuration } = transcodeData;
      console.log("MongoDB ObjectId:", mongoId);
      
      setProgress("Getting upload URLs...");

      // Step 2: Send mongoId and files to video API to get presigned URLs
      const videoResponse = await fetch("/api/s3/video", {
        method: "POST",
        body: JSON.stringify({ mongoId, files }),
        headers: { "Content-Type": "application/json" },
      });

      const videoData = await videoResponse.json();
      if (!videoData.success) throw new Error("Failed to get upload URLs");

      setProgress("Uploading files to S3...");

      // Step 3: Upload files to S3 using presigned URLs
      for (const file of files) {
        const presignedUrl = videoData.presignedUrls[file.name];
        if (!presignedUrl) {
          console.error(`No presigned URL for file: ${file.name}`);
          continue;
        }

        const response = await fetch(presignedUrl, {
          method: "PUT",
          body: Buffer.from(file.content, 'base64'),
          headers: {
            'Content-Type': file.name.endsWith('.m3u8') 
              ? 'application/vnd.apple.mpegurl'
              : 'video/MP2T'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      setSuccess(true);
      alert("Video uploaded successfully!");
      onSuccess(mongoId,videoDuration)
    } catch (error) {
      console.error("Error uploading video:", error);
      setError(error instanceof Error ? error.message : "Failed to upload video");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <input 
        type="file" 
        accept="video/mp4" 
        onChange={handleFileChange} 
        disabled={loading}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100
          disabled:opacity-50"
      />
      {loading && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-blue-600">
            {progress}
          </div>
          <div className="w-24 h-1 bg-blue-100 rounded-full overflow-hidden">
            <div className="w-full h-full bg-blue-600 animate-pulse"></div>
          </div>
        </div>
      )}
      {error && (
        <div className="text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="text-green-600">
          Upload successful!
        </div>
      )}
    </div>
  );
}

export default VideoUploader;
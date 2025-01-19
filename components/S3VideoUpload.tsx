import React, { useState } from "react";

interface VideoProps {
  onSuccess: (mongoId: string) => void;
}

function VideoUploader({ onSuccess }: VideoProps) {
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
    setProgress("Getting presigned URL...");

    try {
      // Step 1: Get the presigned URL from the backend
      const response = await fetch('/api/s3', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error("Failed to get presigned URL");
      const { url, s3Path,mongoId } = data; // s3Path should be the file path in S3
      setProgress("Uploading video...");

      // Step 2: Upload the file directly to S3 using the presigned URL
      const uploadRes = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload video to S3");

      setProgress("Starting transcoding...");

      // Step 3: Trigger MediaConvert job after upload
      const transcodeRes = await fetch('/api/s3/mediaconvert', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          s3Path,
          mongoId // Pass the S3 file path to MediaConvert
        }),
      });

      const transcodeData = await transcodeRes.json();
      if (!transcodeData.success) throw new Error("Failed to trigger transcoding");

      setSuccess(true);


      onSuccess(mongoId);

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

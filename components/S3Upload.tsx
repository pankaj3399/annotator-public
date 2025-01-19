'use client'
import { FileText, Loader2 } from "lucide-react";
import { useState } from "react";

interface FileUploadProps {
  onUploadComplete: (url: string) => void;
  currentFile?: string;
  accept: string;
  uploadType: "imageUploader" | "pdfUploader" | "videoUploader" | "audioUploader";
  label: string;
}

export function S3Upload({
  onUploadComplete,
  currentFile,
  accept,
  uploadType,
  label
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (file: File) => {
    try {
      setUploading(true);

      // Step 1: Get the signed URL from the API route
      const response = await fetch("/api/s3/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });
      const { url } = await response.json();

      // Step 2: Upload the file to S3 using the signed URL
      await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      // Step 3: Get the public URL of the uploaded file (assuming the bucket is public)
      const fileUrl = url.split("?")[0];

      // Step 4: Notify the parent component
      onUploadComplete(fileUrl);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 w-full">
      <div className="grid w-full gap-2">
        <input
          type="file"
          accept={accept}
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          disabled={uploading}
        />
        {uploading && (
          <div className="flex items-center">
            <Loader2 className="animate-spin h-5 w-5 text-blue-500" />
            <span>Uploading...</span>
          </div>
        )}
      </div>

      {currentFile && (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-500" />
          <a
            href={currentFile}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-500 hover:underline"
          >
            View current {label}
          </a>
        </div>
      )}
    </div>
  );
}
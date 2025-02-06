'use client'
import { useUploadThing } from "@/utils/uploadthing";
import { useState } from "react";
import { toast } from "sonner";

function UploadComponent() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { startUpload } = useUploadThing("audioUploader", {
    onClientUploadComplete: async (data) => {
      toast("Recording uploaded successfully");
    },
    onUploadError: () => {
      toast.error("Error occurred while uploading");
    },
    onUploadBegin: () => {
    },
  });

  const submitRecording = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }
    console.log(selectedFile)
    startUpload([selectedFile]);
  };

  return (
    <div>
      <input
        type="file"
        accept="audio/mp3"
        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
      />
      <button onClick={submitRecording}>Upload Audio</button>
    </div>
  );
}

export default UploadComponent;

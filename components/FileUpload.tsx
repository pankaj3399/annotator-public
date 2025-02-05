import { UploadDropzone } from "@/utils/uploadthing";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FileUploadProps {
  onUploadComplete: (url: string) => void;
  currentFile?: string;
  accept: string;
  uploadType: "imageUploader" | "pdfUploader" | "videoUploader" | "audioUploader";
  label: string;
}

export function FileUpload({
  onUploadComplete,
  currentFile,
  accept,
  uploadType,
  label
}: FileUploadProps) {
  return (
    <div className="space-y-4 w-full">
      <div className="grid w-full gap-2">
        <UploadDropzone
          endpoint={uploadType}
          onUploadBegin={() => {
            toast.loading(`Uploading ${label}...`);
          }}
          onUploadError={(error: Error) => {
            toast.error(`Error: ${error.message}`);
          }}
          onClientUploadComplete={(res) => {
            toast.dismiss();
            if (res?.[0]?.url) {
              onUploadComplete(res[0].url);
              toast.success(`${label} uploaded successfully!`);
            }
          }}
          config={{ mode: "auto" }}
        />
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
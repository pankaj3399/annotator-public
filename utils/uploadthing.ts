// utils/uploadthing.ts
import {
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

export const UploadButton = generateUploadButton<typeof OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<typeof OurFileRouter>();
export const { useUploadThing, uploadFiles } = generateReactHelpers<typeof OurFileRouter>();

// Helper function to get permitted file types
export const getPermittedFileTypes = (fileType: string) => {
  switch (fileType) {
    case 'image':
      return '.jpg,.jpeg,.png,.gif';
    case 'pdf':
      return '.pdf';
    case 'video':
      return '.mp4,.webm,.ogg';
    case 'audio':
      return '.mp3,.wav';
    default:
      return '*';
  }
};

// Helper function to get file size limits
export const getFileSizeLimit = (fileType: string) => {
  switch (fileType) {
    case 'image':
      return '4MB';
    case 'pdf':
      return '4MB';
    case 'video':
      return '64MB';
    case 'audio':
      return '32MB';
    default:
      return '4MB';
  }
};
// app/api/uploadthing/core.ts
import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
 
const f = createUploadthing();

// Common middleware for auth checking
const auth = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new UploadThingError("Unauthorized");
  return { userId: session.user.id };
};

export const OurFileRouter = {
  imageUploader: f({ 
    image: { maxFileSize: "4MB", maxFileCount: 1 }
  })
    .middleware(auth)
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Image upload complete", file.url, metadata);
      return { url: file.url };
    }),

  pdfUploader: f({ 
    pdf: { 
      maxFileSize: "4MB", 
      maxFileCount: 1 
    }
  })
    .middleware(auth)
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("PDF upload complete", file.url, metadata);
      return { url: file.url };
    }),

  videoUploader: f({ 
    video: { 
      maxFileSize: "64MB",
      maxFileCount: 1 
    }
  })
    .middleware(auth)
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Video upload complete", file.url, metadata);
      return { url: file.url };
    }),

  audioUploader: f({ 
    audio: { 
      maxFileSize: "32MB",
      maxFileCount: 1 
    }
  })
    .middleware(auth)
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Audio upload complete", file.url, metadata);
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof OurFileRouter;
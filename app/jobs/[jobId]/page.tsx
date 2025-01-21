"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { applyForJob, getJobPost } from "@/app/actions/job";
import Loader from "@/components/ui/Loader/Loader";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

// Helper function to format date
function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function JobDetailPage() {
  const { jobId } = useParams();
  const [post, setPost] = useState<any>(null);
  const router = useRouter();
  const { data: session } = useSession();

  console.log(jobId);

  const handleApply = async () => {
    console.log(session?.user.id);
    if (session?.user.id) {
      const response = await applyForJob(jobId as string);
      if (response?.success) {
        toast.success("Job successfully applied");
        localStorage.removeItem("pendingJobApplication");
        router.push("/tasks");
      } else if (response?.error) {
        toast.error(response.error);
      }
    } else {
      // Store the job ID and return URL in localStorage before redirecting
      localStorage.setItem("pendingJobApplication", jobId as string);
      router.push("/auth/login");
    }
  };

  useEffect(() => {
    const getPosts = async () => {
      const response = await getJobPost(jobId as string);
      console.log(response);

      if (!response.success || !response.data) {
        return notFound();
      }
      setPost(response.data);
    };

    getPosts();
  }, [jobId]);

  if (!post) {
    return <Loader />;
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header Section */}
      <div className="mb-8 pb-8 border-b">
        <h1 className="text-3xl font-bold mb-4">{post.title}</h1>

        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>
              Project Duration: {formatDate(post.projectDuration.startDate)} -{" "}
              {formatDate(post.projectDuration.endDate)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Compensation: {post.compensation}</span>
          </div>

          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Posted: {formatDate(post.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <article className="prose prose-lg max-w-none">
        <ReactMarkdown
          components={{
            // Override heading styles to match your design
            h1: ({ children }) => (
              <h1 className="text-3xl font-bold my-4">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-2xl font-bold my-4">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xl font-bold my-3">{children}</h3>
            ),
            // Style lists
            ul: ({ children }) => (
              <ul className="list-disc pl-6 my-4">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-6 my-4">{children}</ol>
            ),
            // Style links
            a: ({ children, href }) => (
              <a href={href} className="text-blue-600 hover:text-blue-800">
                {children}
              </a>
            ),
            // Style paragraphs
            p: ({ children }) => <p className="my-4">{children}</p>,
          }}
        >
          {post.content}
        </ReactMarkdown>
      </article>

      {/* Apply Section */}
      <div className="mt-8 pt-8 border-t">
        <button
          className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          onClick={handleApply}
        >
          Apply for this position
        </button>
      </div>
    </main>
  );
}

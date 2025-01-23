import { getJobPosts } from "@/app/actions/job";
import Link from "next/link";

// Helper function to format date range
function formatDateRange(startDate: Date, endDate: Date) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

// Helper function to clean and truncate markdown content
function truncateContent(markdownContent: string, maxLength: number = 100) {
  // Remove markdown formatting
  const cleanText = markdownContent
    .replace(/#{1,6}\s/g, "") // Remove headers
    .replace(/\*\*/g, "") // Remove bold
    .replace(/\*/g, "") // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Clean links
    .replace(/\n+/g, " ") // Replace multiple newlines with space
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/=+/g, "") // Remove === headers
    .trim();

  if (cleanText.length <= maxLength) return cleanText;
  return cleanText.slice(0, maxLength).trim() + "...";
}

export default async function JobPostsGrid() {
  const response = await getJobPosts({ limit: 10 });

  if (!response.success || !response.data) {
    return (
      <div className="text-center text-red-600">Failed to load job posts</div>
    );
  }

  const { posts } = response.data;

  if (posts.length === 0) {
    return <></>;
  }

  return (
    <main className="container mx-auto max-w-5xl p-8">
      <h1 className="text-4xl text-center font-bold mb-8">Latest Jobs</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map((post) => (
          <div key={post._id as string} className="group">
            <Link href={`/jobs/${post._id}`}>
              <div className="flex flex-col gap-3 p-6 border rounded-lg hover:shadow-lg transition-shadow duration-200 h-full">
                <h2 className="text-xl font-semibold group-hover:text-blue-600 transition-colors">
                  {post.title}
                </h2>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500 flex-shrink-0"
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
                    <span className="text-sm text-gray-600">
                      {formatDateRange(
                        new Date(post.projectDuration.startDate),
                        new Date(post.projectDuration.endDate)
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500 flex-shrink-0"
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
                    <span className="text-sm font-medium text-gray-600">
                      {post.compensation}
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-sm text-gray-600 line-clamp-3">
                  {truncateContent(post.content, 150)}
                </div>

                <div className="mt-auto pt-4 border-t">
                  <span className="text-sm text-blue-600 group-hover:text-blue-800">
                    View Details →
                  </span>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}

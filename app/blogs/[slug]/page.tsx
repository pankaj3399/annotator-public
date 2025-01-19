import { PortableText, type SanityDocument } from "next-sanity";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { client } from "@/client";
import Link from "next/link";
import { PortableTextReactComponents } from "@portabletext/react";
import { ArrowLeft, Calendar, Clock, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const POST_QUERY = `*[_type == "post" && slug.current == $slug][0]{
  title,
  slug,
  publishedAt,
  image,
  body,
  "related": *[_type == "post" && slug.current != $slug] | order(publishedAt desc)[0...3]{
    title,
    slug,
    publishedAt,
    image
  }
}`;

const { projectId, dataset } = client.config();
const urlFor = (source: SanityImageSource) => {
  if (!source || !projectId || !dataset) return null;
  try {
    return imageUrlBuilder({ projectId, dataset }).image(source);
  } catch (error) {
    console.error("Error generating image URL:", error);
    return null;
  }
};

const options = { next: { revalidate: 30 } };

export default async function PostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await client.fetch<SanityDocument>(POST_QUERY, params, options);
  const postImageUrl = post.image
    ? urlFor(post.image)?.width(1920).height(1080).url()
    : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      {postImageUrl && (
        <div className="relative w-full h-[60vh] min-h-[400px] max-h-[600px]">
          <div className="absolute inset-0">
            <img
              src={postImageUrl}
              alt={post.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0">
            <div className="container max-w-3xl mx-auto px-4 py-8">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                {post.title}
              </h1>
              <div className="flex items-center gap-4 text-white/80 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {Math.ceil(post.body?.length / 100) || 5} min read
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="container max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/blogs"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to all posts
        </Link>

        {!postImageUrl && (
          <>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-gray-600 text-sm mb-8">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {Math.ceil(post.body?.length / 100) || 5} min read
              </div>
            </div>
          </>
        )}

        <article className="prose prose-lg max-w-none">
          {Array.isArray(post.body) && post.body.length > 0 ? (
            <PortableText value={post.body} components={components} />
          ) : (
            <PortableText
              value={[
                {
                  _type: "block",
                  children: [
                    {
                      _type: "span",
                      text: "This is a sample content to showcase list styling:",
                    },
                  ],
                },
                {
                  _type: "block",
                  style: "h2",
                  children: [{ _type: "span", text: "Unordered List:" }],
                },
                {
                  _type: "block",
                  listItem: "bullet",
                  children: [{ _type: "span", text: "First item" }],
                },
                {
                  _type: "block",
                  listItem: "bullet",
                  children: [{ _type: "span", text: "Second item" }],
                },
                {
                  _type: "block",
                  listItem: "bullet",
                  children: [{ _type: "span", text: "Third item" }],
                },
                {
                  _type: "block",
                  style: "h2",
                  children: [{ _type: "span", text: "Ordered List:" }],
                },
                {
                  _type: "block",
                  listItem: "number",
                  children: [{ _type: "span", text: "First item" }],
                },
                {
                  _type: "block",
                  listItem: "number",
                  children: [{ _type: "span", text: "Second item" }],
                },
                {
                  _type: "block",
                  listItem: "number",
                  children: [{ _type: "span", text: "Third item" }],
                },
              ]}
              components={components}
            />
          )}
        </article>

        <Separator className="my-12" />

        {/* Related Posts */}
        {post.related && post.related.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">More Posts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {post.related.map((relatedPost: any) => {
                const imageUrl = relatedPost.image
                  ? urlFor(relatedPost.image)?.width(400).height(300).url()
                  : null;

                return (
                  <Link
                    key={relatedPost.slug.current}
                    href={`/blogs/${relatedPost.slug.current}`}
                    className="group"
                  >
                    {/* Only render image div if URL exists */}
                    {imageUrl && (
                      <div className="relative aspect-[4/3] mb-3 overflow-hidden rounded-lg">
                        <img
                          src={imageUrl}
                          alt={relatedPost.title}
                          className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {relatedPost.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(relatedPost.publishedAt).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const components: Partial<PortableTextReactComponents> = {
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal pl-6 mb-6 space-y-2 text-gray-700">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li className="leading-relaxed">{children}</li>,
    number: ({ children }) => <li className="leading-relaxed">{children}</li>,
  },
  block: {
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold mt-12 mb-6 text-gray-900">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-bold mt-10 mb-4 text-gray-900">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-bold mt-8 mb-3 text-gray-900">{children}</h3>
    ),
    normal: ({ children }) => (
      <p className="mb-6 leading-relaxed text-gray-700">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-500 pl-6 my-8 italic text-gray-700">
        {children}
      </blockquote>
    ),
  },
  marks: {
    strong: ({ children }) => (
      <strong className="font-bold text-gray-900">{children}</strong>
    ),
    em: ({ children }) => <em className="italic text-gray-800">{children}</em>,
    code: ({ children }) => (
      <code className="bg-gray-100 text-gray-900 rounded px-1.5 py-0.5 font-mono text-sm">
        {children}
      </code>
    ),
    link: ({ children, value }) => {
      const href = value?.href || "#";
      return (
        <Link
          href={href}
          className="text-blue-600 hover:text-blue-800 underline decoration-2 underline-offset-2 transition-colors"
        >
          {children}
        </Link>
      );
    },
  },
  types: {
    image: ({ value }) => {
      const imageUrl = urlFor(value)?.width(800).url();
      return imageUrl ? (
        <figure className="my-8">
          <img
            src={imageUrl}
            alt={value.alt || ""}
            className="rounded-lg w-full"
          />
          {value.caption && (
            <figcaption className="mt-3 text-center text-sm text-gray-600">
              {value.caption}
            </figcaption>
          )}
        </figure>
      ) : null;
    },
  },
};

import { PortableText } from "@portabletext/react";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { client } from "@/sanity/client";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { ArrowLeft } from 'lucide-react';

const POST_QUERY = `*[_type == "post" && slug.current == $slug][0]`;

const { projectId, dataset } = client.config();
const urlFor = (source: SanityImageSource) =>
  projectId && dataset
    ? imageUrlBuilder({ projectId, dataset }).image(source)
    : null;

const options = { next: { revalidate: 30 } };

export default async function PostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await client.fetch(POST_QUERY, params, options);
  const postImageUrl = post.image
    ? urlFor(post.image)?.width(1200).height(630).url()
    : null;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200 mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to posts
        </Link>
        {postImageUrl && (
          <div className="relative w-full h-[400px] mb-8 rounded-xl overflow-hidden shadow-lg">
            <Image
              src={postImageUrl}
              alt={post.title}
              layout="fill"
              objectFit="cover"
              priority
            />
          </div>
        )}
        <article className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">{post.title}</h1>
          <p className="text-gray-600 mb-8">
            Published: {format(new Date(post.publishedAt), "MMMM d, yyyy")}
          </p>
          <div className="prose prose-lg max-w-none">
            <PortableText
              value={post.body}
              components={portableTextComponents}
            />
          </div>
        </article>
      </div>
    </main>
  );
}

const portableTextComponents = {
  types: {
    image: ({ value }: { value: any }) => {
      if (!value?.asset?._ref) {
        return null;
      }
      return (
        <div className="relative w-full h-64 my-8">
          <Image
            src={urlFor(value).url()}
            alt={value.alt || " "}
            layout="fill"
            objectFit="cover"
            className="rounded-md"
          />
        </div>
      );
    },
  },
  marks: {
    link: ({ children, value }: { children: React.ReactNode; value: any }) => {
      const rel = !value.href.startsWith("/")
        ? "noreferrer noopener"
        : undefined;
      return (
        <a href={value.href} rel={rel} className="text-blue-600 hover:underline">
          {children}
        </a>
      );
    },
  },
};


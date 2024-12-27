import Link from "next/link";
import { type SanityDocument } from "next-sanity";
import imageUrlBuilder from "@sanity/image-url";
import { client } from "@/sanity/client";

const POSTS_QUERY = `*[
  _type == "post"
  && defined(slug.current)
]|order(publishedAt desc)[0...4]{_id, title, slug, image, publishedAt}`;

const { projectId, dataset } = client.config();
const urlFor = (source: any) =>
  projectId && dataset ? imageUrlBuilder({ projectId, dataset }).image(source) : null;

const options = { next: { revalidate: 30 } };

export default async function IndexPage() {
  const posts = await client.fetch<SanityDocument[]>(POSTS_QUERY, {}, options);

  return (
    <main className="container mx-auto max-w-5xl p-8">
      <h1 className="text-4xl text-center font-bold mb-8">Posts</h1>
      {/* 2x2 Grid layout using Tailwind CSS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8">
        {posts.map((post) => {
          // Get the image URL if it exists
          const postImageUrl = post.image
            ? urlFor(post.image)?.width(550).height(310).url()
            : null;

          return (
            <div key={post._id} className="hover:underline">
              <Link href={`/blogs/${post.slug.current}`}>
                <div className="flex flex-col gap-4">
                  {postImageUrl && (
                    <img
                      src={postImageUrl}
                      alt={post.title}
                      className="aspect-video rounded-xl"
                      width="550"
                      height="310"
                    />
                  )}
                  <h2 className="text-xl font-semibold">{post.title}</h2>
                  <p>{new Date(post.publishedAt).toLocaleDateString()}</p>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </main>
  );
}

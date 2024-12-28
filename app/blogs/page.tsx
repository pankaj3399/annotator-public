import Link from "next/link";
import { type SanityDocument } from "next-sanity";
import imageUrlBuilder from "@sanity/image-url";
import { client } from "@/client";
import { ArrowRight, Calendar, Clock, Tag } from 'lucide-react';

const POSTS_QUERY = `*[
  _type == "post"
  && defined(slug.current)
]|order(publishedAt desc)[0...9]{_id, title, slug, image, publishedAt, excerpt, categories, estimatedReadingTime}`;

const { projectId, dataset } = client.config();
const urlFor = (source: any) =>
  projectId && dataset ? imageUrlBuilder({ projectId, dataset }).image(source) : null;

const options = { next: { revalidate: 30 } };

export default async function BlogsPage() {
  const posts = await client.fetch<SanityDocument[]>(POSTS_QUERY, {}, options);
  const [featuredPost, ...otherPosts] = posts;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-extrabold text-center mb-12 text-gray-900">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
            Insights & Ideas
          </span>
        </h1>
        
        {/* Featured Post Section */}
        <section className="mb-16">
          <Link href={`/blogs/${featuredPost.slug.current}`} className="group">
            <div className="relative overflow-hidden rounded-3xl shadow-2xl transition-all duration-300 group-hover:shadow-3xl">
              <img
                src={urlFor(featuredPost.image)?.width(1200).height(675).url() || '/placeholder.svg?height=675&width=1200'}
                alt={featuredPost.title}
                className="w-full h-[500px] object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
                <div className="absolute bottom-0 left-0 p-8">
                  <span className="inline-block px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-full mb-4">
                    Featured
                  </span>
                  <h2 className="text-4xl font-bold text-white mb-4 leading-tight">{featuredPost.title}</h2>
                  <p className="text-gray-200 mb-6 line-clamp-2">{featuredPost.excerpt}</p>
                  <div className="flex items-center text-gray-300 mb-4">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span className="mr-4 text-sm">
                      {new Date(featuredPost.publishedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                    <Clock className="w-4 h-4 mr-2" />
                  </div>
                  <span className="inline-flex items-center text-purple-400 group-hover:text-purple-300 transition-colors duration-300">
                    Read Article <ArrowRight className="ml-2 h-4 w-4" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* Grid layout for other posts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {otherPosts.map((post) => (
            <Link key={post._id} href={`/blogs/${post.slug.current}`} className="group">
              <div className="bg-white rounded-2xl overflow-hidden shadow-lg transition-all duration-300 group-hover:shadow-2xl">
                <div className="relative">
                  <img
                    src={urlFor(post.image)?.width(400).height(225).url() || '/placeholder.svg?height=225&width=400'}
                    alt={post.title}
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-0 right-0 bg-white px-3 py-1 m-2 rounded-full text-xs font-semibold text-gray-700">
                    {post.categories?.[0]}
                  </div>
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors duration-300">
                    {post.title}
                  </h2>
                  <p className="text-gray-600 text-sm mb-4 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(post.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-gray-700 mb-4 line-clamp-2">{post.excerpt}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-purple-600 group-hover:text-purple-500 transition-colors duration-300 flex items-center">
                      Read More <ArrowRight className="ml-1 h-4 w-4" />
                    </span>
                    <span className="text-gray-500 text-sm flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {post.estimatedReadingTime} min
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Newsletter Subscription */}
        <section className="mt-16 bg-purple-700 rounded-3xl p-8 text-white">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
            <p className="mb-6">Subscribe to our newsletter for the latest insights and ideas.</p>
          </div>
        </section>
      </div>
    </main>
  );
}


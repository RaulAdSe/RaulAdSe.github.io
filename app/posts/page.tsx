import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { getSortedPostsData } from '@/lib/posts';

export const metadata = {
  title: 'Posts - Raul Adell',
  description: 'Blog posts by Raul Adell',
};

export default function Posts() {
  const posts = getSortedPostsData();

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Posts</h1>
          <p className="text-lg text-gray-600">
            Stories and insights from Barcelona's startup ecosystem.
          </p>
        </div>

        {posts.map((post) => (
          <article key={post.slug} className="border-b border-gray-200 pb-8 mb-8 relative">
            <div className="mb-4 flex items-center gap-3">
              {post.status === 'coming-soon' && (
                <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  Coming Soon
                </span>
              )}
              <time className="text-sm text-gray-500">
                {new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                })}
              </time>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
              <Link href={`/posts/${post.slug}`} className="hover:text-gray-700 transition-colors">
                <span dangerouslySetInnerHTML={{ __html: post.title }} />
              </Link>
            </h2>
            
            <div 
              className="text-gray-600 leading-relaxed mb-4"
              dangerouslySetInnerHTML={{ __html: post.excerpt }}
            />
            
            {post.status === 'coming-soon' ? (
              <span className="inline-block text-orange-600 font-medium">
                Stay tuned... 📧
              </span>
            ) : (
              <Link 
                href={`/posts/${post.slug}`}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Read more →
              </Link>
            )}
          </article>
        ))}

        {posts.length === 0 && (
          <div className="text-center text-gray-500">
            <p>No posts found.</p>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500">
            © {new Date().getFullYear()} Raul Adell
          </p>
        </div>
      </footer>
    </div>
  );
}
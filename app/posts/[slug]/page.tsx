import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { getPostData, getAllPostSlugs } from '@/lib/posts';

export async function generateStaticParams() {
  const paths = getAllPostSlugs();
  return paths;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostData(slug);
  
  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostData(slug);

  if (!post) {
    notFound();
  }

  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <header className="bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link 
              href="/" 
              className="text-gray-600 hover:text-gray-900 underline decoration-gray-300 underline-offset-4 font-medium inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to posts
            </Link>
            <span className="text-sm text-gray-500">Raul Adell</span>
          </div>
        </div>
      </header>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-8">
          {post.status === 'coming-soon' && (
            <div className="mb-4">
              <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Coming Soon
              </span>
            </div>
          )}
          
          <h1 
            className="text-4xl font-bold text-gray-900 mb-4"
            dangerouslySetInnerHTML={{ __html: post.title }}
          />
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>By {post.author}</span>
            <span>•</span>
            <time dateTime={post.date}>{formattedDate}</time>
            {post.readingTime && post.status !== 'coming-soon' && (
              <>
                <span>•</span>
                <span>{post.readingTime}</span>
              </>
            )}
          </div>
          
          {post.excerpt && (
            <div 
              className="text-lg text-gray-600 mt-6 font-medium"
              dangerouslySetInnerHTML={{ __html: post.excerpt }}
            />
          )}
        </header>

        <div 
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: post.contentHtml || '' }}
        />
      </article>

      <footer className="border-t border-gray-200 py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <p className="text-gray-500">© 2025 Raul Adell</p>
            <nav className="flex gap-6 text-sm text-gray-600">
              <Link href="/" className="hover:text-gray-900">Home</Link>
              <Link href="/posts" className="hover:text-gray-900">Posts</Link>
              <Link href="/about" className="hover:text-gray-900">About</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
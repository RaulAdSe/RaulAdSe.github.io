import Link from 'next/link';
import { Post } from '@/lib/posts';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <article className="group relative flex flex-col space-y-2 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
      <Link href={`/posts/${post.slug}`} className="absolute inset-0 z-10">
        <span className="sr-only">Read {post.title}</span>
      </Link>
      
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        <time dateTime={post.date}>{formattedDate}</time>
        <span>•</span>
        <span>{post.author}</span>
        {post.readingTime && (
          <>
            <span>•</span>
            <span>{post.readingTime}</span>
          </>
        )}
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {post.title}
      </h2>

      <p className="text-gray-600 dark:text-gray-300 line-clamp-3">
        {post.excerpt}
      </p>

      <div className="pt-4">
        <span className="text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
          Read more →
        </span>
      </div>
    </article>
  );
}
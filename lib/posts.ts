import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const postsDirectory = path.join(process.cwd(), 'content/posts');

export interface Post {
  slug: string;
  title: string;
  date: string;
  author: string;
  excerpt: string;
  content?: string;
  readingTime?: string;
  status?: string;
}

export interface PostData extends Post {
  contentHtml?: string;
}

function calculateReadingTime(content: string): string {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

export function getAllPostSlugs() {
  try {
    const fileNames = fs.readdirSync(postsDirectory);
    return fileNames
      .filter((fileName) => fileName.endsWith('.md'))
      .map((fileName) => {
        return {
          slug: fileName.replace(/\.md$/, ''),
        };
      });
  } catch (error) {
    console.error('Error reading posts directory:', error);
    return [];
  }
}

export function getSortedPostsData(): Post[] {
  try {
    if (!fs.existsSync(postsDirectory)) {
      fs.mkdirSync(postsDirectory, { recursive: true });
      return [];
    }

    const fileNames = fs.readdirSync(postsDirectory);
    const allPostsData = fileNames
      .filter((fileName) => fileName.endsWith('.md'))
      .map((fileName) => {
        const slug = fileName.replace(/\.md$/, '');
        const fullPath = path.join(postsDirectory, fileName);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const matterResult = matter(fileContents);

        const readingTime = calculateReadingTime(matterResult.content);

        return {
          slug,
          title: matterResult.data.title || 'Untitled',
          date: matterResult.data.date || new Date().toISOString(),
          author: matterResult.data.author || 'Anonymous',
          excerpt: matterResult.data.excerpt || matterResult.content.substring(0, 150) + '...',
          readingTime,
          status: matterResult.data.status,
        } as Post;
      });

    return allPostsData.sort((a, b) => {
      if (a.date < b.date) {
        return 1;
      } else {
        return -1;
      }
    });
  } catch (error) {
    console.error('Error getting sorted posts:', error);
    return [];
  }
}

export async function getPostData(slug: string): Promise<PostData | null> {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const matterResult = matter(fileContents);

    const processedContent = await remark()
      .use(html)
      .process(matterResult.content);
    const contentHtml = processedContent.toString();
    const readingTime = calculateReadingTime(matterResult.content);

    return {
      slug,
      contentHtml,
      title: matterResult.data.title || 'Untitled',
      date: matterResult.data.date || new Date().toISOString(),
      author: matterResult.data.author || 'Anonymous',
      excerpt: matterResult.data.excerpt || matterResult.content.substring(0, 150) + '...',
      readingTime,
      status: matterResult.data.status,
    };
  } catch (error) {
    console.error(`Error getting post data for ${slug}:`, error);
    return null;
  }
}
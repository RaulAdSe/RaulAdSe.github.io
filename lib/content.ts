import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const contentDirectory = path.join(process.cwd(), 'content');

export interface ContentData {
  metadata: {
    [key: string]: any;
  };
  content: string;
}

export function getHomeContent(): ContentData {
  const fullPath = path.join(contentDirectory, 'home.md');
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    metadata: data,
    content,
  };
}

export function getAboutContent(): ContentData {
  const fullPath = path.join(contentDirectory, 'about.md');
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    metadata: data,
    content,
  };
}
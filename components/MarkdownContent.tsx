import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
  centered?: boolean;
}

export default function MarkdownContent({ 
  content, 
  className = '', 
  centered = false 
}: MarkdownContentProps) {
  return (
    <div className={`prose prose-lg prose-gray max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className={`text-4xl font-bold text-gray-900 mb-8 ${centered ? 'text-center' : ''}`}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={`text-2xl font-bold text-gray-900 mb-6 mt-8 ${centered ? 'text-center' : ''}`}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={`text-xl font-semibold text-gray-900 mb-4 mt-6 ${centered ? 'text-center' : ''}`}>
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className={`text-gray-600 leading-relaxed mb-6 ${
              centered ? 'text-center' : 'text-justify'
            }`}>
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">
              {children}
            </strong>
          ),
          ul: ({ children }) => (
            <ul className={`list-disc mb-6 text-gray-600 space-y-2 ${
              centered ? 'max-w-md mx-auto text-left' : 'ml-6'
            }`}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className={`list-decimal mb-6 text-gray-600 space-y-2 ${
              centered ? 'max-w-md mx-auto text-left' : 'ml-6'
            }`}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-600">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 my-6 italic text-gray-700">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="border-gray-200 my-12" />
          ),
          em: ({ children }) => (
            <em className={`text-gray-500 italic block mt-8 ${
              centered ? 'text-center' : ''
            }`}>
              {children}
            </em>
          ),
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline transition-colors"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
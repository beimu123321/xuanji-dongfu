/**
 * Markdown 渲染（GFM）
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  children?: string;
  className?: string;
}

export default function MarkdownPreview({ children = '', className = '' }: MarkdownPreviewProps) {
  if (children.trim().length === 0) {
    return <p className="text-[13px] italic text-[#5A616A]">此间尚未落笔。</p>;
  }

  return (
    <div className={`md-preview ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

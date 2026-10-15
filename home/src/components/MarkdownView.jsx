/**
 * Markdown 渲染（支持 GFM 表格 / 任务列表 / 代码块）
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownView({ children, className = '' }) {
  const content = typeof children === 'string' ? children : '';
  if (content.trim().length === 0) {
    return <p className="text-stone/70 text-[13px] italic">此间尚未落笔。</p>;
  }

  return (
    <div className={`md-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

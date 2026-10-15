/**
 * Markdown 编辑器（文档 4.6 / 4.7）
 * 左侧书写、右侧实时预览；工具条支持常用语法，选区包裹自动处理。
 */
import { useRef, useState, type ReactNode } from 'react';
import { Button, Segmented, Tooltip } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  CodeOutlined,
  FontSizeOutlined,
  EyeOutlined,
  EditOutlined,
} from '@ant-design/icons';
import MarkdownPreview from './MarkdownPreview';

interface MarkdownEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

type Action = 'bold' | 'italic' | 'h2' | 'ul' | 'ol' | 'code' | 'link';

const ACTIONS: { key: Action; icon: ReactNode; tip: string }[] = [
  { key: 'bold', icon: <BoldOutlined />, tip: '加粗' },
  { key: 'italic', icon: <ItalicOutlined />, tip: '斜体' },
  { key: 'h2', icon: <FontSizeOutlined />, tip: '小标题' },
  { key: 'ul', icon: <UnorderedListOutlined />, tip: '无序列表' },
  { key: 'ol', icon: <OrderedListOutlined />, tip: '有序列表' },
  { key: 'code', icon: <CodeOutlined />, tip: '行内代码' },
  { key: 'link', icon: <LinkOutlined />, tip: '链接' },
];

export default function MarkdownEditor({
  value = '',
  onChange,
  rows = 10,
  placeholder = '以修仙语体书写…',
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** 在光标处包裹 / 插入文本 */
  const applyAction = (action: Action) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    let next = value;
    let cursor = end;

    const wrap = (prefix: string, suffix = prefix, fallback = '文字') => {
      const body = selected || fallback;
      next = `${value.slice(0, start)}${prefix}${body}${suffix}${value.slice(end)}`;
      cursor = start + prefix.length + body.length + suffix.length;
    };

    const prefixLine = (prefix: string, fallback = '条目') => {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const body = selected || fallback;
      next = `${value.slice(0, lineStart)}${prefix}${body}${value.slice(end)}`;
      cursor = lineStart + prefix.length + body.length;
    };

    switch (action) {
      case 'bold':
        wrap('**', '**');
        break;
      case 'italic':
        wrap('*', '*');
        break;
      case 'code':
        wrap('`', '`', 'code');
        break;
      case 'h2':
        prefixLine('## ', '小标题');
        break;
      case 'ul':
        prefixLine('- ', '条目');
        break;
      case 'ol':
        prefixLine('1. ', '条目');
        break;
      case 'link':
        wrap('[', '](https://)', '链接文字');
        break;
      default:
        break;
    }

    onChange?.(next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="rounded-sm border border-[#2A2F36] bg-[#0F1419]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2A2F36] px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-1">
          {ACTIONS.map((action) => (
            <Tooltip key={action.key} title={action.tip}>
              <Button
                type="text"
                size="small"
                icon={action.icon}
                disabled={mode === 'preview'}
                onClick={() => applyAction(action.key)}
              />
            </Tooltip>
          ))}
        </div>
        <Segmented
          size="small"
          value={mode}
          onChange={(v) => setMode(v as 'edit' | 'preview')}
          options={[
            { label: '书写', value: 'edit', icon: <EditOutlined /> },
            { label: '预览', value: 'preview', icon: <EyeOutlined /> },
          ]}
        />
      </div>

      {mode === 'edit' ? (
        <textarea
          ref={textareaRef}
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full resize-y bg-transparent px-3 py-2.5 font-[inherit] text-[13.5px] leading-[1.9] text-[#D7DBE0] outline-none placeholder:text-[#5A616A]"
          spellCheck={false}
        />
      ) : (
        <div className="max-h-[420px] overflow-y-auto px-3 py-2.5">
          <MarkdownPreview>{value}</MarkdownPreview>
        </div>
      )}
    </div>
  );
}

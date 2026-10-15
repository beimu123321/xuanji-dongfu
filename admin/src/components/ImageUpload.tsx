/**
 * 图片上传（文档 4.5 形象设置 / 4.7 法宝虚影）
 */
import { useState } from 'react';
import { Button, Upload } from 'antd';
import { message } from '../utils/message';
import { LoadingOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { uploadImage } from '../api/endpoints';

interface ImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  /** 预览区高度 */
  height?: number;
  tip?: string;
}

export default function ImageUpload({ value = '', onChange, height = 168, tip }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadImage(file);
      onChange?.(result.url);
      message.success('图影已上传');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  };

  return (
    <div>
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-sm border border-dashed border-[#2A2F36] bg-[#0F1419]"
        style={{ height }}
      >
        {value ? (
          <>
            <img src={value} alt="已上传图影" className="h-full w-full object-cover" />
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              className="!absolute right-2 top-2"
              onClick={() => onChange?.('')}
            >
              移除
            </Button>
          </>
        ) : (
          <span className="text-[12.5px] tracking-[0.12em] text-[#5A616A]">尚未上传图影</span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3">
        <Upload
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif"
          showUploadList={false}
          beforeUpload={(file) => handleUpload(file as unknown as File)}
        >
          <Button icon={uploading ? <LoadingOutlined /> : <PlusOutlined />} disabled={uploading}>
            {uploading ? '上传中…' : '选择图影'}
          </Button>
        </Upload>
        <span className="text-[12px] text-[#5A616A]">{tip ?? '支持 png / jpg / webp / gif / svg，不超过 5MB'}</span>
      </div>
    </div>
  );
}

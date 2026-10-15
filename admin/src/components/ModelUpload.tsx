/**
 * 人物模型（GLB）上传：对应后端 POST /api/upload/model。
 * 与 ImageUpload 同构，但上传 / 预览 / 移除的都是 3D 虚影模型。
 */
import { useState } from 'react';
import { Button, Upload } from 'antd';
import { message } from '../utils/message';
import { LoadingOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { uploadModel } from '../api/endpoints';

interface ModelUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  tip?: string;
}

export default function ModelUpload({ value = '', onChange, tip }: ModelUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    if (!/\.glb$/i.test(file.name)) {
      message.error('人物模型仅支持 .glb 格式');
      return false;
    }
    setUploading(true);
    try {
      const result = await uploadModel(file);
      onChange?.(result.url);
      message.success('人物模型已上传，正脸朝向会自动适配');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  };

  return (
    <div>
      <div className="rounded-sm border border-dashed border-[#2A2F36] bg-[#0F1419] px-4 py-5">
        <div className="text-[12.5px] text-[#8A94A0]">
          {value ? (
            <>
              当前模型：<span className="font-mono text-[#C9A961]">{value}</span>
            </>
          ) : (
            '尚未上传模型，主页使用内置人物'
          )}
        </div>
        <div className="mt-2 text-[12px] leading-5 text-[#5A616A]">
          上传后系统会按几何特征自动把正脸转向镜头；若仍有偏差，用下面的「人物朝向微调」校正。
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <Upload accept=".glb,model/gltf-binary" showUploadList={false} beforeUpload={(file) => handleUpload(file as unknown as File)}>
          <Button icon={uploading ? <LoadingOutlined /> : <PlusOutlined />} disabled={uploading}>
            {uploading ? '上传中…' : '选择模型'}
          </Button>
        </Upload>
        {value && (
          <Button danger icon={<DeleteOutlined />} onClick={() => onChange?.('')}>
            恢复内置人物
          </Button>
        )}
        <span className="text-[12px] text-[#5A616A]">{tip ?? '仅 .glb，不超过 80MB；模型面数越高越吃性能'}</span>
      </div>
    </div>
  );
}

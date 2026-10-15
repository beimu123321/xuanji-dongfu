/**
 * 筑基档案管理（文档 4.5）
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Slider,
  Space,
  Spin,
} from 'antd';
import { message } from '../../utils/message';
import { DeleteOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { profileApi } from '../../api/endpoints';
import { requestWithTip } from '../../api/client';
import ImageUpload from '../../components/ImageUpload';
import PageCard from '../../components/PageCard';
import type { CultivationLevel, Profile, TechItem } from '../../types';

const LEVELS = ['炼气', '筑基', '金丹'];

interface ProfileForm {
  dao_name: string;
  bone_age: number;
  location: string;
  realm: string;
  motto: string;
  avatar_url: string;
  particle_strength: number;
  tech_stack: { name: string; level: string }[];
  greetings: string[];
}

export default function ProfilePage() {
  const [form] = Form.useForm<ProfileForm>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fill = useCallback(
    (profile: Profile) => {
      form.setFieldsValue({
        dao_name: profile.dao_name ?? '',
        bone_age: profile.bone_age ?? 0,
        location: profile.location ?? '',
        realm: profile.realm ?? '',
        motto: profile.motto ?? '',
        avatar_url: profile.avatar_url ?? '',
        particle_strength: profile.particle_strength ?? 70,
        tech_stack: Array.isArray(profile.tech_stack) ? profile.tech_stack : [],
        greetings: Array.isArray(profile.greetings) ? profile.greetings : [],
      });
    },
    [form],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      fill(await profileApi.get());
    } catch (err) {
      message.error(err instanceof Error ? err.message : '筑基档案未能取回');
    } finally {
      setLoading(false);
    }
  }, [fill]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload: Partial<Profile> = {
        dao_name: values.dao_name.trim(),
        bone_age: Number(values.bone_age),
        location: values.location ?? '',
        realm: values.realm ?? '',
        motto: values.motto ?? '',
        avatar_url: values.avatar_url ?? '',
        particle_strength: Number(values.particle_strength ?? 70),
        tech_stack: (values.tech_stack ?? [])
          .filter((item) => item && item.name)
          .map<TechItem>((item) => ({
            name: item.name.trim(),
            level: (item.level as CultivationLevel) || '筑基',
          })),
        greetings: (values.greetings ?? []).map((g) => (g ?? '').trim()).filter(Boolean),
      };
      const updated = await requestWithTip<Profile>({ url: '/api/profile', method: 'PUT', data: payload }, '修为已更新');
      fill(updated);
    } catch {
      // 表单校验失败，或请求错误已由 requestWithTip 统一提示，此处无需重复处理
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    window.open(`${window.location.origin}/`, '_blank', 'noopener');
  };

  // 表单始终挂载，加载态用 Spin 覆盖：
  // 若在加载期提前 return，useForm 实例会脱离 Form 元素，setFieldsValue 触发的告警无法消除。
  return (
    <PageCard
      title="筑基档案"
      subtitle="对应前端「筑基概况」板块"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>
            重置
          </Button>
          <Button icon={<EyeOutlined />} onClick={handlePreview}>
            预览效果
          </Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            保存修为
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading} tip="筑基档案读取中…">
        <Form<ProfileForm> form={form} layout="vertical" requiredMark={false}>
          <Divider orientation="left" orientationMargin={0} style={{ marginTop: 0 }}>
            <span className="text-[13px] tracking-[0.16em] text-[#C9A961]">基础信息</span>
          </Divider>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="dao_name"
                label="道号（昵称 / ID）"
                rules={[{ required: true, message: '道号不可为空' }, { max: 50, message: '不得超过 50 字' }]}
              >
                <Input placeholder="如：玄玑子" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="bone_age"
                label="骨龄（年龄）"
                rules={[{ required: true, message: '请填写骨龄' }]}
              >
                <InputNumber min={0} max={999} className="!w-full" placeholder="如：23" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="location" label="修行地界（所在地）" rules={[{ max: 100, message: '不得超过 100 字' }]}>
                <Input placeholder="如：中原 · 焦作地界" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="realm" label="修为境界（能力等级）" rules={[{ max: 50, message: '不得超过 50 字' }]}>
                <Input placeholder="如：筑基有成，稳步金丹" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" orientationMargin={0}>
            <span className="text-[13px] tracking-[0.16em] text-[#C9A961]">功法配置（技术栈）</span>
          </Divider>

          <Form.List name="tech_stack">
            {(fields, { add, remove }) => (
              <div className="space-y-2">
                {fields.map(({ key, ...field }) => (
                  <Row key={key} gutter={12} align="middle">
                    <Col xs={14} md={10}>
                      <Form.Item {...field} name={[field.name, 'name']} className="!mb-0">
                        <Input placeholder="功法名，如 React" />
                      </Form.Item>
                    </Col>
                    <Col xs={8} md={6}>
                      <Form.Item {...field} name={[field.name, 'level']} className="!mb-0">
                        <Select
                          placeholder="修习程度"
                          options={LEVELS.map((level) => ({ label: level, value: level }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={2}>
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ name: '', level: '筑基' })}>
                  添加功法
                </Button>
              </div>
            )}
          </Form.List>

          <Divider orientation="left" orientationMargin={0}>
            <span className="text-[13px] tracking-[0.16em] text-[#C9A961]">道心所向</span>
          </Divider>

          <Form.Item name="motto" label="个人理念（支持 Markdown）" rules={[{ max: 1000, message: '不得超过 1000 字' }]}>
            <Input.TextArea rows={4} placeholder="以代码为器，以创意为丹，炼就数字乾坤。" showCount maxLength={1000} />
          </Form.Item>

          <Divider orientation="left" orientationMargin={0}>
            <span className="text-[13px] tracking-[0.16em] text-[#C9A961]">形象与问候</span>
          </Divider>

          <Row gutter={24}>
            <Col xs={24} md={10}>
              <Form.Item name="avatar_url" label="虚拟形象立绘">
                <ImageUpload height={200} tip="建议透明底 PNG，竖版比例" />
              </Form.Item>
            </Col>
            <Col xs={24} md={14}>
              <Form.Item name="particle_strength" label="周身粒子强度">
                <Slider min={0} max={100} tooltip={{ open: false }} marks={{ 0: '无', 50: '适中', 100: '浓郁' }} />
              </Form.Item>

              <Form.List name="greetings">
                {(fields, { add, remove }) => (
                  <div className="space-y-2">
                    <div className="text-[12.5px] text-[#8A94A0]">点击虚拟形象时随机浮现的问候语</div>
                    {fields.map(({ key, ...field }) => (
                      <Row key={key} gutter={12} align="middle">
                        <Col flex="auto">
                          <Form.Item {...field} className="!mb-0">
                            <Input placeholder="如：道友安好，可曾用膳？" />
                          </Form.Item>
                        </Col>
                        <Col>
                          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                        </Col>
                      </Row>
                    ))}
                    <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add('')}>
                      添加问候语
                    </Button>
                  </div>
                )}
              </Form.List>
            </Col>
          </Row>

          <div className="mt-6 flex justify-end gap-3 border-t border-[rgba(201,169,97,0.14)] pt-5">
            <Button icon={<ReloadOutlined />} onClick={load}>
              重置
            </Button>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
              保存修为
            </Button>
          </div>
        </Form>
      </Spin>
    </PageCard>
  );
}

/**
 * 洞府禁制（系统设置，文档 4.9）
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Col,
  ColorPicker,
  Divider,
  Form,
  Input,
  Radio,
  Row,
  Slider,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
} from 'antd';
import { message } from '../../utils/message';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, SaveOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { authApi, settingsApi } from '../../api/endpoints';
import ModelUpload from '../../components/ModelUpload';
import PageCard from '../../components/PageCard';
import type { LoginLog, Settings } from '../../types';

interface BasicForm {
  siteName: string;
  siteSubtitle: string;
  loadingTexts: string[];
  welcome: string;
  easterEgg: { cultivation: boolean; fortune: boolean; dayNight: boolean };
}

interface AppearanceForm {
  primaryColor: string;
  inkDensity: number;
  particleStrength: number;
  dayNightMode: 'auto' | 'day' | 'night';
  liteModeDefault: boolean;
  avatarModel: string;
  avatarYaw: number;
  avatarPose: 'auto' | 'raw';
}

interface SecurityForm {
  jwtExpiresIn: string;
}

interface PasswordForm {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [basicForm] = Form.useForm<BasicForm>();
  const [appearanceForm] = Form.useForm<AppearanceForm>();
  const [securityForm] = Form.useForm<SecurityForm>();
  const [passwordForm] = Form.useForm<PasswordForm>();

  const applySettings = useCallback(
    (data: Settings) => {
      setSettings(data);
      basicForm.setFieldsValue({
        siteName: data.basic.siteName,
        siteSubtitle: data.basic.siteSubtitle,
        loadingTexts: data.basic.loadingTexts,
        welcome: data.basic.welcome,
        easterEgg: data.basic.easterEgg,
      });
      appearanceForm.setFieldsValue({
        primaryColor: data.appearance.primaryColor,
        inkDensity: data.appearance.inkDensity,
        particleStrength: data.appearance.particleStrength,
        dayNightMode: data.appearance.dayNightMode,
        liteModeDefault: data.appearance.liteModeDefault,
        avatarModel: data.appearance.avatarModel ?? '',
        avatarYaw: data.appearance.avatarYaw ?? 0,
        avatarPose: data.appearance.avatarPose ?? 'auto',
      });
      securityForm.setFieldsValue({ jwtExpiresIn: data.security.jwtExpiresIn });
    },
    [appearanceForm, basicForm, securityForm],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      applySettings(await settingsApi.get());
    } catch (err) {
      message.error(err instanceof Error ? err.message : '设置未能取回');
    } finally {
      setLoading(false);
    }
  }, [applySettings]);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const data = await authApi.logs();
      setLogs(data.list ?? []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '登录日志未能取回');
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveBasic = async () => {
    try {
      const values = await basicForm.validateFields();
      setSaving(true);
      applySettings(await settingsApi.updateBasic(values as unknown as Settings['basic']));
      message.success('修为已更新');
    } catch (err) {
      if (err instanceof Error && err.message) message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveAppearance = async () => {
    try {
      const values = await appearanceForm.validateFields();
      setSaving(true);
      applySettings(await settingsApi.updateAppearance(values as unknown as Settings['appearance']));
      message.success('修为已更新');
    } catch (err) {
      if (err instanceof Error && err.message) message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveSecurity = async () => {
    try {
      const values = await securityForm.validateFields();
      setSaving(true);
      applySettings(await settingsApi.updateSecurity(values as unknown as Settings['security']));
      message.success('修为已更新');
    } catch (err) {
      if (err instanceof Error && err.message) message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    try {
      const values = await passwordForm.validateFields();
      if (values.newPassword !== values.confirmPassword) {
        message.error('两次输入的新密码不一致');
        return;
      }
      setChanging(true);
      await authApi.changePassword({ oldPassword: values.oldPassword, newPassword: values.newPassword });
      passwordForm.resetFields();
      message.success('禁制已更换');
    } catch (err) {
      if (err instanceof Error && err.message) message.error(err.message);
    } finally {
      setChanging(false);
    }
  };

  const logColumns: ColumnsType<LoginLog> = [
    { title: '道号', dataIndex: 'username', width: 120 },
    {
      title: '结果',
      dataIndex: 'success',
      width: 96,
      render: (success: boolean) =>
        success ? <Tag color="green" bordered={false}>功成</Tag> : <Tag color="red" bordered={false}>失败</Tag>,
    },
    { title: 'IP', dataIndex: 'ip', width: 150, render: (v: string) => <span className="font-mono text-[12px]">{v}</span> },
    { title: '来源', dataIndex: 'user_agent', ellipsis: true },
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 180,
      render: (v: string) => <span className="font-mono text-[12px]">{formatTime(v)}</span>,
    },
  ];

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spin tip="洞府禁制读取中…">
          <div className="h-16 w-40" />
        </Spin>
      </div>
    );
  }

  return (
    <>
    <PageCard
      title="洞府禁制"
      subtitle="系统设置 · 全站内容与外观的总开关"
      extra={
        <Button icon={<ReloadOutlined />} onClick={load}>
          重新读取
        </Button>
      }
    >
      <Tabs
        items={[
          {
            key: 'basic',
            label: '基础设置',
            // 三个页签的表单实例在页面挂载时即创建，需一并渲染，否则未激活页签的
            // useForm 实例会脱离 Form 元素并触发告警。
            forceRender: true,
            children: (
              <Form<BasicForm> form={basicForm} layout="vertical" requiredMark={false}>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="siteName"
                      label="洞府名称（站点名称）"
                      rules={[{ required: true, message: '洞府名称不可为空' }, { max: 50, message: '不得超过 50 字' }]}
                    >
                      <Input placeholder="如：玄玑洞府" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="siteSubtitle" label="站点副标题" rules={[{ max: 100, message: '不得超过 100 字' }]}>
                      <Input placeholder="如：以代码为器 · 以创意为丹" />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider orientation="left" orientationMargin={0}>
                  <span className="text-[13px] tracking-[0.16em] text-[#C9A961]">加载文案自定义</span>
                </Divider>

                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name={['loadingTexts', 0]}
                      label="0% - 30%"
                      rules={[{ required: true, message: '不可为空' }]}
                    >
                      <Input placeholder="道友请少待…" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name={['loadingTexts', 1]}
                      label="30% - 70%"
                      rules={[{ required: true, message: '不可为空' }]}
                    >
                      <Input placeholder="洞府禁制正在开启…" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name={['loadingTexts', 2]}
                      label="70% - 100%"
                      rules={[{ required: true, message: '不可为空' }]}
                    >
                      <Input placeholder="即将入府…" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="welcome" label="欢迎语配置" rules={[{ max: 200, message: '不得超过 200 字' }]}>
                  <Input placeholder="如：道友远来，洞府蓬荜生辉。" />
                </Form.Item>

                <Divider orientation="left" orientationMargin={0}>
                  <span className="text-[13px] tracking-[0.16em] text-[#C9A961]">彩蛋开关</span>
                </Divider>

                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item name={['easterEgg', 'cultivation']} label="修为值" valuePropName="checked">
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name={['easterEgg', 'fortune']} label="灵签" valuePropName="checked">
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name={['easterEgg', 'dayNight']} label="昼夜变化" valuePropName="checked">
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                  </Col>
                </Row>

                <div className="mt-4 flex justify-end">
                  <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={saveBasic}>
                    保存修为
                  </Button>
                </div>
              </Form>
            ),
          },
          {
            key: 'appearance',
            label: '外观设置',
            forceRender: true,
            children: (
              <Form<AppearanceForm> form={appearanceForm} layout="vertical" requiredMark={false}>
                <Row gutter={24}>
                  <Col xs={24} md={8}>
                    <Form.Item name="primaryColor" label="主题色调微调">
                      <ColorPicker
                        showText
                        format="hex"
                        onChange={(color) => appearanceForm.setFieldValue('primaryColor', color.toHexString())}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="inkDensity" label="水墨浓度">
                      <Slider min={0} max={100} marks={{ 0: '淡', 50: '中', 100: '浓' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="particleStrength" label="粒子效果强度">
                      <Slider min={0} max={100} marks={{ 0: '无', 50: '中', 100: '盛' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={24}>
                  <Col xs={24} md={14}>
                    <Form.Item name="dayNightMode" label="默认昼夜模式">
                      <Radio.Group>
                        <Radio.Button value="auto">自动（按时间）</Radio.Button>
                        <Radio.Button value="day">白昼</Radio.Button>
                        <Radio.Button value="night">夜晚</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={10}>
                    <Form.Item name="liteModeDefault" label="默认开启精简模式" valuePropName="checked">
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider orientation="left" orientationMargin={0}>
                  <span className="text-[13px] tracking-[0.16em] text-[#C9A961]">人物形象（3D 虚影）</span>
                </Divider>

                <Form.Item name="avatarModel" label="人物模型替换">
                  <ModelUpload tip="仅 .glb，不超过 80MB" />
                </Form.Item>

                <Row gutter={24}>
                  <Col xs={24} md={12}>
                    <Form.Item name="avatarYaw" label="人物朝向微调（自动适配的偏差校正）">
                      <Slider
                        min={-180}
                        max={180}
                        step={5}
                        marks={{ '-180': '-180°', 0: '0°', 180: '180°' }}
                        tooltip={{ formatter: (v) => `${v}°` }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="avatarPose" label="手臂姿势">
                      <Radio.Group>
                        <Radio.Button value="auto">自动收臂（推荐）</Radio.Button>
                        <Radio.Button value="raw">保持上传原样</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                </Row>
                <div className="mb-4 text-[12px] text-[#5A616A]">
                  正脸朝向由模型几何自动判定（不看命名、不依赖骨骼）；若判别有偏差，拖「朝向微调」即可，无需改模型文件。
                </div>

                <div className="mt-4 flex justify-end">
                  <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={saveAppearance}>
                    保存修为
                  </Button>
                </div>
              </Form>
            ),
          },
          {
            key: 'security',
            label: '账号设置',
            forceRender: true,
            children: (
              <Row gutter={24}>
                <Col xs={24} lg={10}>
                  <div className="rounded-sm border border-[rgba(201,169,97,0.16)] p-4">
                    <h4 className="mb-3 text-[13px] tracking-[0.16em] text-[#C9A961]">修改禁制密码</h4>
                    <Form<PasswordForm> form={passwordForm} layout="vertical" requiredMark={false}>
                      <Form.Item
                        name="oldPassword"
                        label="原密码"
                        rules={[{ required: true, message: '请输入原密码' }]}
                      >
                        <Input.Password placeholder="请输入原禁制密码" />
                      </Form.Item>
                      <Form.Item
                        name="newPassword"
                        label="新密码"
                        rules={[
                          { required: true, message: '请输入新密码' },
                          { min: 6, message: '新密码不得少于 6 位' },
                        ]}
                      >
                        <Input.Password placeholder="不少于 6 位" />
                      </Form.Item>
                      <Form.Item
                        name="confirmPassword"
                        label="确认新密码"
                        rules={[{ required: true, message: '请再次输入新密码' }]}
                      >
                        <Input.Password placeholder="请再次输入" />
                      </Form.Item>
                      <Button
                        type="primary"
                        block
                        icon={<SafetyCertificateOutlined />}
                        loading={changing}
                        onClick={changePassword}
                      >
                        更换禁制
                      </Button>
                    </Form>
                  </div>
                </Col>

                <Col xs={24} lg={14}>
                  <div className="rounded-sm border border-[rgba(201,169,97,0.16)] p-4">
                    <h4 className="mb-3 text-[13px] tracking-[0.16em] text-[#C9A961]">禁制有效期（JWT）</h4>
                    <Form<SecurityForm> form={securityForm} layout="inline" requiredMark={false}>
                      <Form.Item
                        name="jwtExpiresIn"
                        rules={[
                          { required: true, message: '请填写有效期' },
                          { pattern: /^\d+\s*(s|m|h|d)$/i, message: '格式形如 7d / 12h / 30m' },
                        ]}
                      >
                        <Input placeholder="7d" style={{ width: 160 }} />
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={saveSecurity}>
                          保存
                        </Button>
                      </Form.Item>
                    </Form>
                    <p className="mt-2 text-[12px] leading-relaxed text-[#5A616A]">
                      修改后仅对之后新签发的令牌生效，已开启的禁制仍按原有效期有效。
                    </p>

                    <Divider style={{ margin: '16px 0' }} />

                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-[13px] tracking-[0.16em] text-[#C9A961]">登录日志</h4>
                      <Space>
                        <span className="text-[12px] text-[#5A616A]">共 {logs.length} 条</span>
                        <Button size="small" icon={<ReloadOutlined />} loading={logsLoading} onClick={loadLogs}>
                          读取
                        </Button>
                      </Space>
                    </div>

                    <Table<LoginLog>
                      rowKey="id"
                      size="small"
                      columns={logColumns}
                      dataSource={logs}
                      loading={logsLoading}
                      pagination={{ pageSize: 6, size: 'small' }}
                      scroll={{ x: 720 }}
                      locale={{ emptyText: <span className="text-[#5A616A]">点击「读取」查看登录日志</span> }}
                    />
                  </div>
                </Col>
              </Row>
            ),
          },
        ]}
      />
    </PageCard>

      {settings && (
        <p className="mt-3 text-[11.5px] tracking-[0.1em] text-[#5A616A]">
          当前洞府名称：{settings.basic.siteName} · 主题色：{settings.appearance.primaryColor} · 禁制有效期：
          {settings.security.jwtExpiresIn}
        </p>
      )}
    </>
  );
}

function formatTime(iso: string): string {
  if (!iso) return '——';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

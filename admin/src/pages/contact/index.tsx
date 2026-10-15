/**
 * 传讯玉符管理（文档 4.8）
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import { message } from '../../utils/message';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  HolderOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { contactApi } from '../../api/endpoints';
import PageCard from '../../components/PageCard';
import type { Contact } from '../../types';

const TYPE_LABEL: Record<string, string> = {
  email: '邮箱',
  github: 'GitHub',
  wechat: '微信',
  blog: '博客',
  qq: 'QQ',
  phone: '电话',
  twitter: 'Twitter',
  link: '其他链接',
};

const ICON_OPTIONS = ['mail', 'github', 'wechat', 'link', 'qq', 'phone', 'twitter'];

interface ContactForm {
  type: string;
  label: string;
  value: string;
  icon: string;
  sort: number;
  status: boolean;
}

export default function ContactPage() {
  const [list, setList] = useState<Contact[]>([]);
  const [types, setTypes] = useState<string[]>(Object.keys(TYPE_LABEL));
  const [loading, setLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [form] = Form.useForm<ContactForm>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await contactApi.list();
      setList(data.list ?? []);
      if (data.types?.length) setTypes(data.types);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '传讯玉符未能取回');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'email',
      label: '',
      value: '',
      icon: 'mail',
      sort: list.length + 1,
      status: true,
    });
    setModalOpen(true);
  };

  const openEdit = (record: Contact) => {
    setEditing(record);
    form.setFieldsValue({
      type: record.type,
      label: record.label,
      value: record.value,
      icon: record.icon || record.type,
      sort: record.sort,
      status: record.status === 1,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: Partial<Contact> = {
        type: values.type,
        label: values.label.trim(),
        value: values.value.trim(),
        icon: values.icon || values.type,
        sort: Number(values.sort ?? 0),
        status: values.status ? 1 : 0,
      };
      setSaving(true);
      if (editing) {
        await contactApi.update(editing.id, payload);
        message.success('修为已更新');
      } else {
        await contactApi.create(payload);
        message.success('玉符已炼制');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      if (err instanceof Error && err.message) message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await contactApi.remove(id);
      message.success('已移除');
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '移除失败');
    }
  };

  const handleBatch = async (action: 'delete' | 'show' | 'hide') => {
    if (selectedKeys.length === 0) {
      message.warning('请先勾选玉符');
      return;
    }
    try {
      await contactApi.batch(selectedKeys, action);
      message.success('功成');
      setSelectedKeys([]);
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleTop = async (record: Contact) => {
    const next = [record, ...list.filter((item) => item.id !== record.id)];
    setList(next);
    try {
      await contactApi.sort(next.map((item) => item.id));
      message.success('已置顶');
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '排序失败');
      await load();
    }
  };

  const handleDrop = async (targetId: number) => {
    if (dragId === null || dragId === targetId) {
      setDragId(null);
      return;
    }
    const from = list.findIndex((item) => item.id === dragId);
    const to = list.findIndex((item) => item.id === targetId);
    if (from === -1 || to === -1) {
      setDragId(null);
      return;
    }
    const next = list.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setList(next);
    setDragId(null);
    try {
      await contactApi.sort(next.map((item) => item.id));
      message.success('顺序已定');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '排序失败');
      await load();
    }
  };

  const columns: ColumnsType<Contact> = [
    {
      title: '',
      key: 'drag',
      width: 40,
      render: () => <HolderOutlined className="cursor-grab text-[#5A616A]" />,
    },
    {
      title: '玉符类型',
      dataIndex: 'type',
      width: 130,
      render: (type: string) => (
        <Tag bordered={false} style={{ background: 'rgba(201,169,97,0.10)', color: '#C9A961' }}>
          {TYPE_LABEL[type] ?? type}
        </Tag>
      ),
    },
    { title: '显示名称', dataIndex: 'label', width: 140, render: (v: string) => <span className="text-[13.5px] text-[#E8E6E1]">{v}</span> },
    {
      title: '账号 / 链接',
      dataIndex: 'value',
      ellipsis: true,
      render: (value: string) => <span className="font-mono text-[12.5px] text-[#8A94A0]">{value}</span>,
    },
    { title: '图标', dataIndex: 'icon', width: 100, render: (icon: string) => <span className="text-[12.5px] text-[#8A94A0]">{icon}</span> },
    { title: '传讯数', dataIndex: 'clicks', width: 88, render: (v: number) => <span className="font-mono text-[12.5px]">{v}</span> },
    { title: '排序', dataIndex: 'sort', width: 76 },
    {
      title: '是否显示',
      dataIndex: 'status',
      width: 100,
      render: (status: number) =>
        status === 1 ? <Tag color="green" bordered={false}>显示</Tag> : <Tag bordered={false}>隐藏</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 210,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<ArrowUpOutlined />} onClick={() => handleTop(record)}>
            置顶
          </Button>
          <Popconfirm title="确定移除该枚玉符？" okText="移除" cancelText="取消" onConfirm={() => handleRemove(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageCard
        title="传讯玉符"
        subtitle="对应前端「传讯玉符」板块 · 拖拽行首可调整顺序"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增玉符
            </Button>
          </Space>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="text-[12.5px] text-[#8A94A0]">已选 {selectedKeys.length} 枚</span>
          <Button size="small" onClick={() => handleBatch('show')}>
            批量显示
          </Button>
          <Button size="small" onClick={() => handleBatch('hide')}>
            批量隐藏
          </Button>
          <Popconfirm
            title={`确定移除选中的 ${selectedKeys.length} 枚玉符？`}
            okText="移除"
            cancelText="取消"
            onConfirm={() => handleBatch('delete')}
          >
            <Button size="small" danger>
              批量删除
            </Button>
          </Popconfirm>
        </div>

        <Table<Contact>
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={list}
          pagination={false}
          scroll={{ x: 1120 }}
          rowSelection={{
            selectedRowKeys: selectedKeys,
            onChange: (keys) => setSelectedKeys(keys as number[]),
          }}
          onRow={(record) => ({
            draggable: true,
            onDragStart: () => setDragId(record.id),
            onDragOver: (event) => event.preventDefault(),
            onDrop: () => handleDrop(record.id),
            className: dragId === record.id ? 'row-dragging' : '',
          })}
        />
      </PageCard>

      <Modal
        open={modalOpen}
        title={editing ? '修订玉符' : '新增玉符'}
        width={620}
        okText="保存修为"
        cancelText="取消"
        confirmLoading={saving}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
      >
        <Form<ContactForm> form={form} layout="vertical" requiredMark={false}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="type" label="玉符类型" rules={[{ required: true, message: '请选择类型' }]}>
                <Select
                  options={Array.from(new Set([...types, ...Object.keys(TYPE_LABEL)])).map((type) => ({
                    label: TYPE_LABEL[type] ?? type,
                    value: type,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="label"
                label="显示名称"
                rules={[{ required: true, message: '显示名称不可为空' }, { max: 50, message: '不得超过 50 字' }]}
              >
                <Input placeholder="如：飞符传书" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item
                name="value"
                label="账号 / 链接"
                rules={[{ required: true, message: '账号或链接不可为空' }, { max: 255, message: '不得超过 255 字' }]}
              >
                <Input placeholder="邮箱 / 微信号 / https://…" />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item name="icon" label="图标名">
                <Select
                  allowClear
                  placeholder="如：mail"
                  options={ICON_OPTIONS.map((icon) => ({ label: icon, value: icon }))}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={7}>
              <Form.Item name="sort" label="排序权重">
                <InputNumber min={0} max={9999} className="!w-full" />
              </Form.Item>
            </Col>
            <Col xs={12} md={7}>
              <Form.Item name="status" label="是否显示" valuePropName="checked">
                <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}

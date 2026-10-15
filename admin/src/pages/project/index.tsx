/**
 * 丹器馆藏管理（文档 4.7）
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  CloudDownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  HolderOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { projectApi } from '../../api/endpoints';
import ImageUpload from '../../components/ImageUpload';
import MarkdownEditor from '../../components/MarkdownEditor';
import PageCard from '../../components/PageCard';
import type { Project } from '../../types';

const LEVELS = ['入门', '进阶', '高阶'];
const LEVEL_COLOR: Record<string, string> = { 高阶: 'red', 进阶: 'gold', 入门: 'green' };

interface ProjectForm {
  name: string;
  level: string;
  category: string;
  tech_stack: string[];
  description: string;
  github_url: string;
  cover_url: string;
  sort: number;
  status: boolean;
}

export default function ProjectPage() {
  const [list, setList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
  const [filters, setFilters] = useState<{ category?: string; level?: string; status?: string }>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importRepo, setImportRepo] = useState('');
  const [editing, setEditing] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [form] = Form.useForm<ProjectForm>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectApi.list({ all: 1 });
      setList(data.list ?? []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '丹器馆藏未能取回');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** 前端筛选（管理员视图已取回全量数据） */
  const filtered = useMemo(
    () =>
      list.filter((item) => {
        if (filters.category && item.category !== filters.category) return false;
        if (filters.level && item.level !== filters.level) return false;
        if (filters.status !== undefined && filters.status !== '' && String(item.status) !== filters.status) return false;
        return true;
      }),
    [list, filters],
  );

  const categories = useMemo(() => Array.from(new Set(list.map((item) => item.category).filter(Boolean))), [list]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      name: '',
      level: '入门',
      category: categories[0] ?? '前端',
      tech_stack: [],
      description: '',
      github_url: '',
      cover_url: '',
      sort: list.length + 1,
      status: true,
    });
    setModalOpen(true);
  };

  const openEdit = (record: Project) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      level: record.level,
      category: record.category,
      tech_stack: record.tech_stack ?? [],
      description: record.description ?? '',
      github_url: record.github_url ?? '',
      cover_url: record.cover_url ?? '',
      sort: record.sort,
      status: record.status === 1,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: Partial<Project> = {
        name: values.name.trim(),
        level: values.level,
        category: values.category?.trim() ?? '',
        tech_stack: (values.tech_stack ?? []).map((t) => String(t).trim()).filter(Boolean),
        description: values.description ?? '',
        github_url: values.github_url?.trim() ?? '',
        cover_url: values.cover_url ?? '',
        sort: Number(values.sort ?? 0),
        status: values.status ? 1 : 0,
      };
      setSaving(true);
      if (editing) {
        await projectApi.update(editing.id, payload);
        message.success('修为已更新');
      } else {
        await projectApi.create(payload);
        message.success('丹器已入库');
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
      await projectApi.remove(id);
      message.success('已移除');
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '移除失败');
    }
  };

  const handleBatch = async (action: 'delete' | 'online' | 'offline') => {
    if (selectedKeys.length === 0) {
      message.warning('请先勾选法宝');
      return;
    }
    try {
      await projectApi.batch(selectedKeys, action);
      message.success('功成');
      setSelectedKeys([]);
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleTop = async (record: Project) => {
    const next = [record, ...list.filter((item) => item.id !== record.id)];
    setList(next);
    try {
      await projectApi.sort(next.map((item) => item.id));
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
      await projectApi.sort(next.map((item) => item.id));
      message.success('顺序已定');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '排序失败');
      await load();
    }
  };

  /** 一键导入 GitHub 项目 */
  const handleImport = async () => {
    if (importRepo.trim().length === 0) {
      message.warning('请填写仓库地址');
      return;
    }
    setImporting(true);
    try {
      const data = await projectApi.importGithub(importRepo.trim());
      setImportOpen(false);
      setImportRepo('');
      setEditing(null);
      form.resetFields();
      form.setFieldsValue({
        name: data.name ?? '',
        level: (data.level as string) ?? '入门',
        category: (data.category as string) ?? '前端',
        tech_stack: data.tech_stack ?? [],
        description: data.description ?? '',
        github_url: data.github_url ?? '',
        cover_url: '',
        sort: list.length + 1,
        status: true,
      });
      setModalOpen(true);
      message.success('已从祭炼之地取回信息，请核对后保存');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '导入失败');
    } finally {
      setImporting(false);
    }
  };

  const columns: ColumnsType<Project> = [
    {
      title: '',
      key: 'drag',
      width: 40,
      render: () => <HolderOutlined className="cursor-grab text-[#5A616A]" />,
    },
    {
      title: '法宝虚影',
      dataIndex: 'cover_url',
      width: 84,
      render: (url: string, record) =>
        url ? (
          <img src={url} alt={record.name} className="h-10 w-14 rounded-sm border border-[#2A2F36] object-cover" />
        ) : (
          <div className="flex h-10 w-14 items-center justify-center rounded-sm border border-[#2A2F36] text-[13px] text-[#C9A961]/60">
            {record.name.slice(0, 1)}
          </div>
        ),
    },
    { title: '法宝名', dataIndex: 'name', width: 170, render: (v: string) => <span className="text-[13.5px] text-[#E8E6E1]">{v}</span> },
    {
      title: '品阶',
      dataIndex: 'level',
      width: 90,
      render: (level: string) => (
        <Tag color={LEVEL_COLOR[level] ?? 'default'} bordered={false}>
          {level}
        </Tag>
      ),
    },
    { title: '分类', dataIndex: 'category', width: 100 },
    {
      title: '炼制材料',
      dataIndex: 'tech_stack',
      render: (tags: string[]) => (
        <div className="flex flex-wrap gap-1">
          {(tags ?? []).slice(0, 4).map((tag) => (
            <Tag key={tag} bordered={false} style={{ background: 'rgba(201,169,97,0.10)', color: '#C9A961' }}>
              {tag}
            </Tag>
          ))}
          {(tags ?? []).length > 4 && <span className="text-[11.5px] text-[#5A616A]">+{tags.length - 4}</span>}
        </div>
      ),
    },
    { title: '品鉴', dataIndex: 'views', width: 80, render: (v: number) => <span className="font-mono text-[12.5px]">{v}</span> },
    {
      title: '状态',
      dataIndex: 'status',
      width: 84,
      render: (status: number) =>
        status === 1 ? <Tag color="green" bordered={false}>上架</Tag> : <Tag bordered={false}>下架</Tag>,
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
          <Popconfirm title="确定移除该件法宝？" okText="移除" cancelText="取消" onConfirm={() => handleRemove(record.id)}>
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
        title="丹器馆藏"
        subtitle="对应前端「丹器馆藏」板块 · 拖拽行首可调整顺序"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load}>
              刷新
            </Button>
            <Button icon={<CloudDownloadOutlined />} onClick={() => setImportOpen(true)}>
              导入 GitHub
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增丹器
            </Button>
          </Space>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Select
            allowClear
            placeholder="按分类筛选"
            style={{ width: 150 }}
            value={filters.category}
            onChange={(value) => setFilters((prev) => ({ ...prev, category: value }))}
            options={categories.map((c) => ({ label: c, value: c }))}
          />
          <Select
            allowClear
            placeholder="按品阶筛选"
            style={{ width: 140 }}
            value={filters.level}
            onChange={(value) => setFilters((prev) => ({ ...prev, level: value }))}
            options={LEVELS.map((l) => ({ label: l, value: l }))}
          />
          <Select
            allowClear
            placeholder="按状态筛选"
            style={{ width: 140 }}
            value={filters.status}
            onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
            options={[
              { label: '上架', value: '1' },
              { label: '下架', value: '0' },
            ]}
          />

          <span className="text-[12.5px] text-[#8A94A0]">
            已选 {selectedKeys.length} 件 / 共 {filtered.length} 件
          </span>

          <Button size="small" onClick={() => handleBatch('online')}>
            批量上架
          </Button>
          <Button size="small" onClick={() => handleBatch('offline')}>
            批量下架
          </Button>
          <Popconfirm
            title={`确定移除选中的 ${selectedKeys.length} 件法宝？`}
            okText="移除"
            cancelText="取消"
            onConfirm={() => handleBatch('delete')}
          >
            <Button size="small" danger>
              批量删除
            </Button>
          </Popconfirm>
        </div>

        <Table<Project>
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={filtered}
          pagination={false}
          scroll={{ x: 1180 }}
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

      {/* 编辑 / 新增 */}
      <Modal
        open={modalOpen}
        title={editing ? '修订丹器' : '新增丹器'}
        width={900}
        okText="保存修为"
        cancelText="取消"
        confirmLoading={saving}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
      >
        <Form<ProjectForm> form={form} layout="vertical" requiredMark={false}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="法宝名（项目名称）"
                rules={[{ required: true, message: '法宝名不可为空' }, { max: 100, message: '不得超过 100 字' }]}
              >
                <Input placeholder="如：玄玑洞府" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="level" label="品阶（难度）" rules={[{ required: true, message: '请选择品阶' }]}>
                <Select options={LEVELS.map((l) => ({ label: l, value: l }))} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="category" label="分类">
                <Select
                  showSearch
                  allowClear
                  placeholder="如：前端"
                  options={categories.map((c) => ({ label: c, value: c }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item name="tech_stack" label="炼制材料（技术栈标签）">
                <Select mode="tags" placeholder="输入后回车添加，如 React" tokenSeparators={[',', '，']} />
              </Form.Item>
            </Col>
            <Col xs={12} md={4}>
              <Form.Item name="sort" label="排序权重">
                <InputNumber min={0} max={9999} className="!w-full" />
              </Form.Item>
            </Col>
            <Col xs={12} md={4}>
              <Form.Item name="status" label="状态" valuePropName="checked">
                <Switch checkedChildren="上架" unCheckedChildren="下架" />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item
                name="github_url"
                label="祭炼之地（GitHub 链接）"
                rules={[
                  {
                    validator: (_rule, value: string) => {
                      if (!value || /^https?:\/\//i.test(value)) return Promise.resolve();
                      return Promise.reject(new Error('须为 http(s) 开头的链接'));
                    },
                  },
                ]}
              >
                <Input placeholder="https://github.com/owner/repo" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="法宝功用（Markdown 简介）">
            <MarkdownEditor rows={6} placeholder="以修仙语体描述项目简介…" />
          </Form.Item>

          <Form.Item name="cover_url" label="法宝虚影（封面图）">
            <ImageUpload height={200} tip="建议 16:9 比例，不超过 5MB" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 一键导入 GitHub */}
      <Modal
        open={importOpen}
        title="从祭炼之地取回信息"
        okText="取回并填写"
        cancelText="取消"
        confirmLoading={importing}
        onOk={handleImport}
        onCancel={() => setImportOpen(false)}
      >
        <p className="mb-3 text-[12.5px] leading-relaxed text-[#8A94A0]">
          填写仓库地址或 owner/repo，将自动抓取名称、描述与主要语言并填入表单。
          若网络不通，将提示「灵脉不畅」。
        </p>
        <Input
          value={importRepo}
          onChange={(e) => setImportRepo(e.target.value)}
          onPressEnter={handleImport}
          placeholder="https://github.com/facebook/react 或 facebook/react"
        />
      </Modal>
    </>
  );
}

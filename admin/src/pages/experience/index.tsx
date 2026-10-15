/**
 * 修行履历管理（文档 4.6）
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
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
import dayjs, { type Dayjs } from 'dayjs';
import { experienceApi } from '../../api/endpoints';
import MarkdownEditor from '../../components/MarkdownEditor';
import PageCard from '../../components/PageCard';
import type { Experience } from '../../types';

interface ExperienceForm {
  sect_name: string;
  position: string;
  range: [Dayjs, Dayjs | null];
  toPresent: boolean;
  duties: string;
  achievements: string;
  sort: number;
  status: boolean;
}

const DATE_FMT = 'YYYY-MM-DD';

export default function ExperiencePage() {
  const [list, setList] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Experience | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [form] = Form.useForm<ExperienceForm>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await experienceApi.list();
      setList(data.list ?? []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '修行履历未能取回');
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
      sect_name: '',
      position: '',
      range: [dayjs(), null],
      toPresent: true,
      duties: '',
      achievements: '',
      sort: list.length + 1,
      status: true,
    });
    setModalOpen(true);
  };

  const openEdit = (record: Experience) => {
    setEditing(record);
    form.setFieldsValue({
      sect_name: record.sect_name,
      position: record.position,
      range: [record.start_date ? dayjs(record.start_date) : dayjs(), record.end_date ? dayjs(record.end_date) : null],
      toPresent: !record.end_date,
      duties: record.duties,
      achievements: record.achievements,
      sort: record.sort,
      status: record.status === 1,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const [start, end] = values.range ?? [];
      const payload: Partial<Experience> = {
        sect_name: values.sect_name.trim(),
        position: values.position.trim(),
        start_date: start ? start.format(DATE_FMT) : '',
        end_date: values.toPresent || !end ? '' : end.format(DATE_FMT),
        duties: values.duties ?? '',
        achievements: values.achievements ?? '',
        sort: Number(values.sort ?? 0),
        status: values.status ? 1 : 0,
      };

      setSaving(true);
      if (editing) {
        await experienceApi.update(editing.id, payload);
        message.success('修为已更新');
      } else {
        await experienceApi.create(payload);
        message.success('履历已铭刻');
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
      await experienceApi.remove(id);
      message.success('已移除');
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '移除失败');
    }
  };

  const handleBatch = async (action: 'delete' | 'online' | 'offline') => {
    if (selectedKeys.length === 0) {
      message.warning('请先勾选履历');
      return;
    }
    try {
      await experienceApi.batch(selectedKeys, action);
      message.success('功成');
      setSelectedKeys([]);
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  /** 置顶 */
  const handleTop = async (record: Experience) => {
    const rest = list.filter((item) => item.id !== record.id);
    const next = [record, ...rest];
    setList(next);
    try {
      await experienceApi.sort(next.map((item) => item.id));
      message.success('已置顶');
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '排序失败');
      await load();
    }
  };

  /** 拖拽排序 */
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
      await experienceApi.sort(next.map((item) => item.id));
      message.success('顺序已定');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '排序失败');
      await load();
    }
  };

  const columns: ColumnsType<Experience> = [
    {
      title: '',
      key: 'drag',
      width: 40,
      render: () => <HolderOutlined className="cursor-grab text-[#5A616A]" />,
    },
    {
      title: '宗门名称',
      dataIndex: 'sect_name',
      width: 170,
      render: (value: string, record) => (
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] text-[#E8E6E1]">{value}</span>
          {record.sort === Math.min(...list.map((i) => i.sort)) && (
            <Tag color="gold" bordered={false}>
              置顶
            </Tag>
          )}
        </div>
      ),
    },
    { title: '司职', dataIndex: 'position', width: 130 },
    {
      title: '修行时长',
      key: 'range',
      width: 200,
      render: (_, record) => (
        <span className="font-mono text-[12.5px] text-[#8A94A0]">
          {record.start_date} ~ {record.end_date || '至今'}
        </span>
      ),
    },
    {
      title: '执掌事务',
      dataIndex: 'duties',
      ellipsis: true,
      render: (value: string) => <span className="text-[12.5px] text-[#8A94A0]">{plain(value)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (status: number) =>
        status === 1 ? <Tag color="green" bordered={false}>上架</Tag> : <Tag bordered={false}>下架</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<ArrowUpOutlined />} onClick={() => handleTop(record)}>
            置顶
          </Button>
          <Popconfirm title="确定移除该段履历？" okText="移除" cancelText="取消" onConfirm={() => handleRemove(record.id)}>
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
        title="修行履历"
        subtitle="对应前端「修行履历」板块 · 拖拽行首可调整顺序"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增履历
            </Button>
          </Space>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="text-[12.5px] text-[#8A94A0]">
            已选 {selectedKeys.length} 条
          </span>
          <Button size="small" onClick={() => handleBatch('online')}>
            批量上架
          </Button>
          <Button size="small" onClick={() => handleBatch('offline')}>
            批量下架
          </Button>
          <Popconfirm
            title={`确定移除选中的 ${selectedKeys.length} 条履历？`}
            okText="移除"
            cancelText="取消"
            onConfirm={() => handleBatch('delete')}
          >
            <Button size="small" danger>
              批量删除
            </Button>
          </Popconfirm>
        </div>

        <Table<Experience>
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={list}
          pagination={false}
          scroll={{ x: 1080 }}
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
        title={editing ? '修订履历' : '新增履历'}
        width={860}
        okText="保存修为"
        cancelText="取消"
        confirmLoading={saving}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
      >
        {/*
          这里不能用 preserve={false}：Modal 的内容是惰性挂载的，openCreate/openEdit 里的
          setFieldsValue 只是先写进了 store；而 <Form> 首次挂载时 setInitialValues 会用
          initialValues 覆盖这些字段，若字段又被标记为 preserve=false，StrictMode 的双次挂载
          会把它们直接抹成 undefined——表现为「新增时日期/排序/状态全空、编辑时表单一片空白」。
        */}
        <Form<ExperienceForm> form={form} layout="vertical" requiredMark={false}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="sect_name"
                label="宗门名称（公司 / 组织）"
                rules={[{ required: true, message: '宗门名称不可为空' }, { max: 100, message: '不得超过 100 字' }]}
              >
                <Input placeholder="如：青云数术阁" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="position"
                label="司职（职位）"
                rules={[{ required: true, message: '司职不可为空' }, { max: 50, message: '不得超过 50 字' }]}
              >
                <Input placeholder="如：全栈炼器师" />
              </Form.Item>
            </Col>
            <Col xs={24} md={14}>
              <Form.Item name="range" label="修行时长（起止时间）" rules={[{ required: true, message: '请选择起始时间' }]}>
                <DatePicker.RangePicker className="!w-full" format={DATE_FMT} allowEmpty={[false, true]} />
              </Form.Item>
            </Col>
            <Col xs={12} md={5}>
              <Form.Item name="toPresent" label="至今" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={12} md={5}>
              <Form.Item name="sort" label="排序权重">
                <InputNumber min={0} max={9999} className="!w-full" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="status" label="状态（上架 / 下架）" valuePropName="checked">
                <Switch checkedChildren="上架" unCheckedChildren="下架" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="duties" label="执掌事务（Markdown）">
            <MarkdownEditor rows={6} placeholder="以修仙语体描述核心工作内容…" />
          </Form.Item>

          <Form.Item name="achievements" label="修为精进（Markdown）">
            <MarkdownEditor rows={6} placeholder="以修仙语体描述业绩与成长…" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

/** 去掉 Markdown 标记，用于表格摘要 */
function plain(text: string): string {
  return String(text ?? '')
    .replace(/[#*`>~\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

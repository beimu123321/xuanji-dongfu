/**
 * 登录页（文档 4.3）：洞府禁制 · 身份验证
 */
import { useEffect, useState } from 'react';
import { Button, Form, Input } from 'antd';
import { message } from '../../utils/message';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string } | null)?.from || '/dashboard';

  // 已登录则直接进入控制室
  useEffect(() => {
    if (token) navigate(from, { replace: true });
  }, [token, from, navigate]);

  const handleSubmit = async (values: LoginForm) => {
    setLoading(true);
    try {
      await login(values.username.trim(), values.password);
      message.success('禁制已开启');
      navigate(from, { replace: true });
    } catch (err) {
      message.error(err instanceof Error ? err.message : '禁制密码有误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-5">
      <div className="gate-bg" />

      <div className="ink-card relative z-10 w-full max-w-[400px] rounded-sm px-8 py-10">
        <header className="mb-8 text-center">
          <div className="mb-3 text-[22px] text-[#C9A961]">◈</div>
          <h1 className="text-[20px] tracking-[0.3em] text-[#C9A961]">洞府禁制</h1>
          <p className="mt-2 text-[12px] tracking-[0.24em] text-[#8A94A0]">身份验证</p>
        </header>

        <Form<LoginForm> layout="vertical" onFinish={handleSubmit} autoComplete="off" requiredMark={false}>
          <Form.Item
            name="username"
            label={<span className="text-[12.5px] tracking-[0.14em] text-[#8A94A0]">道号（管理员账号）</span>}
            rules={[{ required: true, message: '请输入道号' }]}
          >
            <Input size="large" prefix={<UserOutlined />} placeholder="请输入道号" />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span className="text-[12.5px] tracking-[0.14em] text-[#8A94A0]">禁制密码</span>}
            rules={[{ required: true, message: '请输入禁制密码' }]}
          >
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="请输入禁制密码" />
          </Form.Item>

          <Form.Item className="!mb-0 !mt-8">
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              开启禁制
            </Button>
          </Form.Item>
        </Form>

        <p className="mt-6 text-center text-[11.5px] tracking-[0.12em] text-[#5A616A]">
          如需访问权限，请联系站点管理员
        </p>
      </div>
    </div>
  );
}

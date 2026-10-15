/**
 * 后台布局：洞府控制室
 */
import { useMemo, useState } from 'react';
import { Layout, Menu, Dropdown, Avatar, Button, Tooltip, theme as antdTheme } from 'antd';
import {
  DashboardOutlined,
  IdcardOutlined,
  ClusterOutlined,
  AppstoreOutlined,
  SendOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const { Header, Sider, Content } = Layout;

const MENU_ITEMS = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '洞府总览' },
  { key: '/profile', icon: <IdcardOutlined />, label: '筑基档案' },
  { key: '/experience', icon: <ClusterOutlined />, label: '修行履历' },
  { key: '/project', icon: <AppstoreOutlined />, label: '丹器馆藏' },
  { key: '/contact', icon: <SendOutlined />, label: '传讯玉符' },
  { key: '/settings', icon: <SettingOutlined />, label: '洞府禁制' },
];

const PAGE_TITLE: Record<string, string> = {
  '/dashboard': '洞府总览',
  '/profile': '筑基档案',
  '/experience': '修行履历',
  '/project': '丹器馆藏',
  '/contact': '传讯玉符',
  '/settings': '洞府禁制',
};

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const admin = useAuthStore((s) => s.admin);
  const logout = useAuthStore((s) => s.logout);
  const { token } = antdTheme.useToken();

  const selectedKey = useMemo(() => {
    const match = MENU_ITEMS.find((item) => location.pathname.startsWith(item.key));
    return match ? match.key : '/dashboard';
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={216}
        style={{ borderRight: '1px solid rgba(201,169,97,0.14)' }}
      >
        <div className="flex h-[64px] items-center justify-center gap-2 px-3">
          <span className="text-[18px] text-[#C9A961]">◈</span>
          {!collapsed && (
            <span className="whitespace-nowrap text-[15px] tracking-[0.24em] text-[#E8E6E1]">玄玑洞府</span>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={MENU_ITEMS}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', borderInlineEnd: 'none' }}
        />

        {!collapsed && (
          <div className="px-4 pt-6 text-[11.5px] leading-relaxed tracking-[0.1em] text-[#5A616A]">
            <p>洞府控制室</p>
            <p>v1.0</p>
          </div>
        )}
      </Sider>

      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingInline: 20,
            borderBottom: '1px solid rgba(201,169,97,0.14)',
          }}
        >
          <div className="flex items-center gap-3">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((v) => !v)}
            />
            <span className="text-[15px] tracking-[0.2em] text-[#E8E6E1]">
              {PAGE_TITLE[selectedKey] ?? '洞府控制室'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip title="在新标签页打开 3D 主页">
              <Button
                type="text"
                icon={<LinkOutlined />}
                onClick={() => window.open(`${window.location.origin}/`, '_blank', 'noopener')}
              >
                预览洞府
              </Button>
            </Tooltip>

            <Dropdown
              menu={{
                items: [
                  { key: 'settings', icon: <SettingOutlined />, label: '洞府禁制' },
                  { type: 'divider' },
                  { key: 'logout', icon: <LogoutOutlined />, label: '关闭禁制（退出）', danger: true },
                ],
                onClick: ({ key }) => {
                  if (key === 'logout') handleLogout();
                  if (key === 'settings') navigate('/settings');
                },
              }}
            >
              <div className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 transition-colors hover:bg-[rgba(201,169,97,0.08)]">
                <Avatar size={28} style={{ background: token.colorPrimary, color: '#12181E' }} icon={<UserOutlined />} />
                <span className="text-[13.5px] tracking-[0.1em] text-[#E8E6E1]">{admin?.username ?? 'admin'}</span>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ padding: 20, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

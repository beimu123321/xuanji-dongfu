/**
 * 后台根组件：主题注入 + 路由 + 401 桥接
 */
import { useEffect } from 'react';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import xiuXianTheme from './theme/xiuXianTheme';
import AdminLayout from './layouts/AdminLayout';
import RequireAuth from './components/RequireAuth';
import { setUnauthorizedHandler } from './api/client';
import { bindMessage } from './utils/message';
import { useAuthStore } from './store/useAuthStore';

import LoginPage from './pages/login';
import DashboardPage from './pages/dashboard';
import ProfilePage from './pages/profile';
import ExperiencePage from './pages/experience';
import ProjectPage from './pages/project';
import ContactPage from './pages/contact';
import SettingsPage from './pages/settings';
import NotFoundPage from './pages/not-found';

/** 把 <App> 的 message 实例交给全局桥接，使其能消费主题上下文 */
function MessageBridge() {
  const { message } = AntApp.useApp();

  useEffect(() => {
    bindMessage(message);
  }, [message]);

  return null;
}

/** 令牌失效时统一回到登录页 */
function AuthBridge() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout(true).finally(() => navigate('/login', { replace: true }));
    });
  }, [logout, navigate]);

  return null;
}

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <ConfigProvider locale={zhCN} theme={xiuXianTheme}>
      <AntApp>
        <MessageBridge />
        <HashRouter>
          <AuthBridge />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="experience" element={<ExperiencePage />} />
              <Route path="project" element={<ProjectPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </HashRouter>
      </AntApp>
    </ConfigProvider>
  );
}

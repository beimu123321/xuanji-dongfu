/**
 * 路由守卫：未开启禁制（未登录）则跳转登录页
 */
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '../store/useAuthStore';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const initializing = useAuthStore((s) => s.initializing);
  const location = useLocation();

  if (initializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spin size="large" tip="禁制校验中…">
          <div className="h-20 w-40" />
        </Spin>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

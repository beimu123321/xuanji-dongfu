/**
 * 请求层：Axios 实例 + 统一响应拆包 + 鉴权注入 + 401 自动登出
 */
import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { message } from '../utils/message';

export const TOKEN_KEY = 'xuanji:admin:token';

/** 统一响应结构（文档 5.2） */
interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/** 401 时由外部注入的登出回调，避免 api 层直接依赖路由 */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => {
    const payload = response.data as ApiEnvelope<unknown> | undefined;
    if (payload && typeof payload.code === 'number' && payload.code !== 200) {
      const error = new Error(payload.message || '请求失败');
      (error as Error & { code?: number }).code = payload.code;
      return Promise.reject(error);
    }
    return response;
  },
  (error: AxiosError<ApiEnvelope<unknown>>) => {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;

    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      onUnauthorized?.();
      return Promise.reject(new Error(serverMessage || '令牌已失效，请重新开启禁制'));
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('灵脉不畅，请求超时'));
    }

    if (!error.response) {
      return Promise.reject(new Error('灵脉不畅，未能连通洞府'));
    }

    return Promise.reject(new Error(serverMessage || `请求失败（HTTP ${status}）`));
  },
);

/** 统一拆包：直接返回 data */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await instance.request<ApiEnvelope<T>>(config);
  return response.data.data;
}

/** 带错误提示的请求包装（用于页面内的主动操作） */
export async function requestWithTip<T>(config: AxiosRequestConfig, successTip?: string): Promise<T> {
  try {
    const data = await request<T>(config);
    if (successTip) message.success(successTip);
    return data;
  } catch (err) {
    message.error(err instanceof Error ? err.message : '操作失败');
    throw err;
  }
}

export default instance;

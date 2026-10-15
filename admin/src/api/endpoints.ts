/**
 * 接口清单（文档 5.3）
 */
import { request } from './client';
import type {
  AdminInfo,
  Contact,
  DashboardOverview,
  Experience,
  ListResult,
  LoginLog,
  Profile,
  Project,
  Settings,
} from '../types';

/* ---------------- 鉴权 ---------------- */

export const authApi = {
  login: (payload: { username: string; password: string }) =>
    request<{ token: string; admin: { id: number; username: string }; expiresIn: string }>({
      url: '/api/auth/login',
      method: 'POST',
      data: payload,
    }),
  logout: () => request<Record<string, never>>({ url: '/api/auth/logout', method: 'POST' }),
  me: () => request<AdminInfo>({ url: '/api/auth/profile' }),
  changePassword: (payload: { oldPassword: string; newPassword: string }) =>
    request<Record<string, never>>({ url: '/api/auth/password', method: 'PUT', data: payload }),
  logs: () => request<{ list: LoginLog[] }>({ url: '/api/auth/logs' }),
};

/* ---------------- 筑基档案 ---------------- */

export const profileApi = {
  get: () => request<Profile>({ url: '/api/profile' }),
  update: (data: Partial<Profile>) => request<Profile>({ url: '/api/profile', method: 'PUT', data }),
};

/* ---------------- 修行履历 ---------------- */

export const experienceApi = {
  list: () => request<ListResult<Experience>>({ url: '/api/experiences' }),
  create: (data: Partial<Experience>) => request<Experience>({ url: '/api/experiences', method: 'POST', data }),
  update: (id: number, data: Partial<Experience>) =>
    request<Experience>({ url: `/api/experiences/${id}`, method: 'PUT', data }),
  remove: (id: number) => request<{ id: number }>({ url: `/api/experiences/${id}`, method: 'DELETE' }),
  batch: (ids: number[], action: 'delete' | 'online' | 'offline') =>
    request<{ affected: number }>({ url: '/api/experiences/batch', method: 'POST', data: { ids, action } }),
  sort: (ids: number[]) => request<Record<string, never>>({ url: '/api/experiences/sort', method: 'POST', data: { ids } }),
};

/* ---------------- 丹器馆藏 ---------------- */

export const projectApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    request<ListResult<Project> & { categories: string[]; levels: string[] }>({
      url: '/api/projects',
      method: 'GET',
      params,
    }),
  detail: (id: number) => request<Project>({ url: `/api/projects/${id}` }),
  create: (data: Partial<Project>) => request<Project>({ url: '/api/projects', method: 'POST', data }),
  update: (id: number, data: Partial<Project>) =>
    request<Project>({ url: `/api/projects/${id}`, method: 'PUT', data }),
  remove: (id: number) => request<{ id: number }>({ url: `/api/projects/${id}`, method: 'DELETE' }),
  batch: (ids: number[], action: 'delete' | 'online' | 'offline') =>
    request<{ affected: number }>({ url: '/api/projects/batch', method: 'POST', data: { ids, action } }),
  sort: (ids: number[]) => request<Record<string, never>>({ url: '/api/projects/sort', method: 'POST', data: { ids } }),
  importGithub: (repo: string) =>
    request<Partial<Project>>({ url: '/api/projects/import-github', method: 'POST', data: { repo } }),
};

/* ---------------- 传讯玉符 ---------------- */

export const contactApi = {
  list: () => request<ListResult<Contact> & { types: string[] }>({ url: '/api/contacts' }),
  create: (data: Partial<Contact>) => request<Contact>({ url: '/api/contacts', method: 'POST', data }),
  update: (id: number, data: Partial<Contact>) =>
    request<Contact>({ url: `/api/contacts/${id}`, method: 'PUT', data }),
  remove: (id: number) => request<{ id: number }>({ url: `/api/contacts/${id}`, method: 'DELETE' }),
  batch: (ids: number[], action: 'delete' | 'show' | 'hide') =>
    request<{ affected: number }>({ url: '/api/contacts/batch', method: 'POST', data: { ids, action } }),
  sort: (ids: number[]) => request<Record<string, never>>({ url: '/api/contacts/sort', method: 'POST', data: { ids } }),
};

/* ---------------- 系统设置 ---------------- */

export const settingsApi = {
  get: () => request<Settings>({ url: '/api/settings' }),
  updateBasic: (data: Partial<Settings['basic']>) =>
    request<Settings>({ url: '/api/settings/basic', method: 'PUT', data }),
  updateAppearance: (data: Partial<Settings['appearance']>) =>
    request<Settings>({ url: '/api/settings/appearance', method: 'PUT', data }),
  updateSecurity: (data: Partial<Settings['security']>) =>
    request<Settings>({ url: '/api/settings/security', method: 'PUT', data }),
};

/* ---------------- 数据统计 ---------------- */

export const statsApi = {
  overview: () => request<DashboardOverview>({ url: '/api/stats/overview' }),
};

/* ---------------- 上传 ---------------- */

export async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  return request<{ url: string }>({
    url: '/api/upload',
    method: 'POST',
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/** 人物模型（GLB）上传：体积大，单独放宽超时 */
export async function uploadModel(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  return request<{ url: string }>({
    url: '/api/upload/model',
    method: 'POST',
    data: form,
    timeout: 600000,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

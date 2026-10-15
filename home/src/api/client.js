/**
 * 前端接口层（文档 5.2 统一响应格式）
 * 开发环境经 Vite 代理转发到服务端；生产由 Nginx 反向代理。
 */
const BASE = import.meta.env.VITE_API_BASE ?? '';

async function request(path, options = {}) {
  let resp;
  try {
    resp = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
  } catch {
    throw new Error('灵脉不畅，未能连通洞府');
  }

  let payload = null;
  const text = await resp.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error('洞府回音紊乱（响应解析失败）');
    }
  }

  if (!resp.ok || (payload && payload.code !== 200)) {
    throw new Error((payload && payload.message) || `请求失败（HTTP ${resp.status}）`);
  }

  return payload ? payload.data : null;
}

export const api = {
  health: () => request('/api/health'),
  getSettings: () => request('/api/settings'),
  getProfile: () => request('/api/profile'),
  getExperiences: () => request('/api/experiences'),
  getProjects: () => request('/api/projects'),
  getProject: (id) => request(`/api/projects/${id}`),
  getContacts: () => request('/api/contacts'),
  visit: () => request('/api/stats/visit', { method: 'POST' }),
  projectView: (id) => request(`/api/projects/${id}/view`, { method: 'POST' }),
  contactClick: (id) => request(`/api/contacts/${id}/click`, { method: 'POST' }),
};

export default api;

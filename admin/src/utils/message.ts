/**
 * 消息提示桥接。
 *
 * antd v5 的静态 `message` 无法消费 ConfigProvider 的主题上下文，
 * 直接调用会退回默认主题（在暗色修仙主题下观感割裂），并触发控制台警告。
 * 这里持有 `<App>` 提供的实例，供非组件模块（如 api/client）与各页面统一调用。
 */
interface MessageApi {
  success(content: string): void;
  error(content: string): void;
  warning(content: string): void;
  info(content: string): void;
}

let instance: MessageApi | null = null;

/** 由 App 内的桥接组件注入实例 */
export function bindMessage(api: MessageApi) {
  instance = api;
}

export const message: MessageApi = {
  // App 尚未挂载时静默忽略，避免提示失败反过来打断业务流程
  success: (content) => instance?.success(content),
  error: (content) => instance?.error(content),
  warning: (content) => instance?.warning(content),
  info: (content) => instance?.info(content),
};

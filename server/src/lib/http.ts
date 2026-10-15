/**
 * 统一响应格式与错误处理（文档 5.2 / 5.4）
 * 成功：{ code: 200, message: 'success', data: {} }
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export const ERROR_CODE = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL: 500,
} as const;

/** 业务异常：抛出后由全局错误中间件统一转为响应 */
export class ApiError extends Error {
  public readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }

  static badRequest(message = '参数错误'): ApiError {
    return new ApiError(ERROR_CODE.BAD_REQUEST, message);
  }

  static unauthorized(message = '未授权，令牌已失效'): ApiError {
    return new ApiError(ERROR_CODE.UNAUTHORIZED, message);
  }

  static forbidden(message = '权限不足'): ApiError {
    return new ApiError(ERROR_CODE.FORBIDDEN, message);
  }

  static notFound(message = '资源不存在'): ApiError {
    return new ApiError(ERROR_CODE.NOT_FOUND, message);
  }
}

/** 统一成功响应 */
export function ok<T>(res: Response, data: T = {} as T, message = 'success'): void {
  res.status(200).json({ code: ERROR_CODE.OK, message, data });
}

/** 统一失败响应 */
export function fail(res: Response, code: number, message: string): void {
  res.status(code).json({ code, message, data: null });
}

/** 包装异步路由，异常自动转交错误中间件 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** 全局错误中间件（必须置于所有路由之后） */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    fail(res, err.code, err.message);
    return;
  }

  // multer 上传异常（文件过大 / 字段名不符等）
  if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string') {
    const code = (err as { code: string }).code;
    if (code.startsWith('LIMIT_')) {
      fail(res, ERROR_CODE.BAD_REQUEST, code === 'LIMIT_FILE_SIZE' ? '图影不得超过 5MB' : '上传参数有误');
      return;
    }
  }
  const message = err instanceof Error ? err.message : '服务器内部错误';
  // 打印完整堆栈便于定位，但不外泄给客户端
  console.error('[server error]', err);
  fail(res, ERROR_CODE.INTERNAL, process.env.NODE_ENV === 'production' ? '服务器内部错误' : message);
}

/** 404 兜底 */
export function notFoundHandler(req: Request, res: Response): void {
  fail(res, ERROR_CODE.NOT_FOUND, `接口不存在：${req.method} ${req.originalUrl}`);
}

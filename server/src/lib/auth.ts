/**
 * 鉴权：JWT 签发与校验（文档 5.3.1）
 */
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { ApiError } from './http';

const FALLBACK_SECRET = 'xuanji-dongfu-dev-secret-please-change';

export interface TokenPayload {
  id: number;
  username: string;
}

function getSecret(): string {
  return process.env.JWT_SECRET && process.env.JWT_SECRET.length > 0
    ? process.env.JWT_SECRET
    : FALLBACK_SECRET;
}

export function signToken(payload: TokenPayload, expiresIn?: string): string {
  const expires = expiresIn || process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, getSecret(), { expiresIn: expires } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, getSecret()) as TokenPayload;
}

/** 从请求头解析 Bearer Token */
function extractToken(req: Request): string | null {
  const header = req.headers.authorization || req.headers.Authorization;
  if (typeof header !== 'string' || header.length === 0) return null;
  const [scheme, value] = header.split(' ');
  if (!value || scheme.toLowerCase() !== 'bearer') return null;
  return value.trim();
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: TokenPayload;
    }
  }
}

/** 鉴权中间件：校验失败返回 401 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next(ApiError.unauthorized('未携带令牌，请先开启禁制'));
    return;
  }
  try {
    req.admin = verifyToken(token);
    next();
  } catch {
    next(ApiError.unauthorized('令牌已失效，请重新开启禁制'));
  }
}

/**
 * 可选鉴权：携带合法令牌时注入 req.admin，否则按游客处理。
 * 用于「同一条查询接口，管理员可见全量、游客只见已上架」的场景。
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      req.admin = verifyToken(token);
    } catch {
      req.admin = undefined;
    }
  }
  next();
}

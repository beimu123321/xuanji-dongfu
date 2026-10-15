/**
 * 资源上传
 * POST /api/upload        单张图片上传（鉴权，字段名 file，≤5MB）
 * POST /api/upload/model  人物模型上传（鉴权，字段名 file，仅 .glb，≤80MB）
 * 返回：{ url } 供表单直接写入 avatar_url / appearance.avatarModel
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../lib/auth';
import { ApiError, asyncHandler, ok } from '../lib/http';

const router = Router();

const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');
const MODEL_DIR = path.resolve(UPLOAD_DIR, 'models');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(MODEL_DIR)) fs.mkdirSync(MODEL_DIR, { recursive: true });

const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif'];

/** GLB 魔数校验：真正的 glTF 二进制容器头四个字节是 'glTF' */
function looksLikeGlb(buf: Buffer) {
  return buf.length > 12 && buf.readUInt32LE(0) === 0x46546c67;
}

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt = IMAGE_EXT.includes(ext) ? ext : '.png';
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!IMAGE_EXT.includes(ext)) {
      cb(ApiError.badRequest('仅支持 png / jpg / jpeg / webp / gif / svg / avif 图片'));
      return;
    }
    cb(null, true);
  },
});

const modelUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, MODEL_DIR),
    filename: (_req, file, cb) => {
      // 统一落库成 .glb：模型只从磁盘原样吐出，扩展名统一便于缓存与静态路由
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.glb`);
    },
  }),
  limits: { fileSize: 80 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.glb') {
      cb(ApiError.badRequest('人物模型仅支持 .glb 格式'));
      return;
    }
    cb(null, true);
  },
});

router.post(
  '/',
  requireAuth,
  imageUpload.single('file'),
  asyncHandler((req, res) => {
    if (!req.file) throw ApiError.badRequest('未接收到文件');
    ok(res, {
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
      size: req.file.size,
    }, '图影已上传');
  }),
);

router.post(
  '/model',
  requireAuth,
  modelUpload.single('file'),
  asyncHandler((req, res) => {
    if (!req.file) throw ApiError.badRequest('未接收到文件');
    // 魔数校验：只认扩展名不够，避免把 HTML / 压缩包当模型传上来后前端白屏
    const head = Buffer.alloc(16);
    const fd = fs.openSync(req.file.path, 'r');
    try {
      fs.readSync(fd, head, 0, 16, 0);
    } finally {
      fs.closeSync(fd);
    }
    if (!looksLikeGlb(head)) {
      fs.unlinkSync(req.file.path);
      throw ApiError.badRequest('该文件不是有效的 glTF 二进制模型（.glb）');
    }
    ok(res, {
      url: `/uploads/models/${req.file.filename}`,
      filename: req.file.filename,
      size: req.file.size,
    }, '人物模型已上传');
  }),
);

export default router;

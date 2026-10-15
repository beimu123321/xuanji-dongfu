# 玄玑洞府 · 使用文档

## 一、环境要求

- Node.js >= 18（开发与部署均已在 Node 24 验证）
- pnpm 9.x
- 一个支持反向代理的 Web 服务器（如 Nginx / 宝塔面板）用于生产部署

## 二、本地开发

```bash
# 1. 安装依赖（workspace 一次装全）
pnpm install

# 2. 配置服务端环境变量
cp server/.env.example server/.env
# 按需修改 server/.env（见第三节）

# 3. 启动全部（server + home + admin）
pnpm dev
```

- 主页预览：http://localhost:5173
- 后台预览：http://localhost:5174/admin/
- API：http://localhost:3000/api/health

## 三、服务端环境变量（server/.env）

| 变量 | 说明 | 默认 |
|---|---|---|
| PORT | 服务端口 | 3000 |
| NODE_ENV | 运行环境 | development |
| JWT_SECRET | JWT 签名密钥，**生产必须替换为随机长串** | 占位值 |
| JWT_EXPIRES_IN | 令牌有效期 | 7d |
| ADMIN_USERNAME / ADMIN_PASSWORD | 首次初始化时的管理员账号 | 见 .env.example |
| CORS_ORIGIN | 允许跨域来源，多个用逗号分隔 | * |

> 注意：`ADMIN_USERNAME` / `ADMIN_PASSWORD` 仅在数据文件不存在、首次初始化时生效。

## 四、构建

```bash
pnpm build
# 产物：
#   home/dist      3D 主页静态资源
#   admin/dist     管理后台静态资源（base=/admin/）
#   server/dist    API 服务编译产物
```

## 五、生产部署（概览）

前端产物为静态资源，后端为 Node 服务。典型部署：

1. 将 `home/dist` 放到站点根目录，`admin/dist` 放到 `/admin/` 子目录。
2. 将 `server/dist` + `package.json` 部署为 Node 服务（PM2 / 宝塔 Node 项目均可），监听某端口（如 3000）。
3. 用 Nginx 收口：
   - `/` → home 静态
   - `/admin/` → admin 静态
   - `/api/` 与 `/uploads/` → 反代到 `127.0.0.1:3000`
4. 反代配置可参考仓库 `deploy/nginx.conf` 模板。

## 六、后台访问与鉴权

- 访问 `/admin/` 进入管理后台。
- 使用服务端配置的 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 登录。
- 登录后接口携带 `Authorization: Bearer <token>`。

## 七、API 概览

| 接口 | 方法 | 说明 |
|---|---|---|
| /api/health | GET | 健康检查 |
| /api/auth/login | POST | 管理员登录，返回 token |
| /api/auth/profile | GET | 当前管理员信息（鉴权） |
| /api/profile | GET/PUT | 个人主页资料 |
| /api/experiences | GET/POST | 修行履历 |
| /api/projects | GET/POST | 丹器 / 项目馆藏 |
| /api/contacts | GET/POST | 联系方式 |
| /api/settings | GET/PUT | 系统设置（含外观） |
| /api/stats | GET | 访问统计 |
| /api/upload | POST | 图片 / 模型上传 |

完整路由见 `server/src/routes/`。

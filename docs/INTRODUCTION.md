# 玄玑洞府 · 项目介绍

玄玑洞府是一套**个人主页系统**，由三部分组成：一个以 3D 场景为核心的视觉主页、一个功能完整的管理后台，以及一个轻量的 Express API 服务。整体采用前后端分离架构，通过 pnpm workspace 管理三个子项目。

## 一、它解决什么问题

传统个人主页多为静态图文堆叠。玄玑洞府把「主页」做成一座可交互的 3D 洞府：访客在加载过程中逐帧开启一道水墨山门，门后展开群山云海与洞府厅堂；所有可编辑内容（人物设定、修行履历、丹器馆藏、联系方式等）都在管理后台维护，前端即时呈现。

## 二、技术栈

| 子项目 | 技术 | 说明 |
|---|---|---|
| home（3D 主页） | React + Vite + three.js / @react-three/fiber / @react-three/drei | 全屏 3D 山门入口、洞府场景、人物模型与背景 |
| admin（管理后台） | React + Vite + Ant Design 5 + ECharts | 内容管理、外观配置、模型上传、登录鉴权 |
| server（API） | Express + TypeScript + JWT + bcrypt | 提供 `/api/*` 接口，JSON 文件存储（零配置运行） |

构建产物均为静态资源 / Node 服务，可部署于任意支持 Node 的服务器或静态托管。

## 三、整体架构

```
浏览器
  ├─ /            → home（3D 主页，静态）
  ├─ /admin/      → admin（管理后台，静态）
  └─ /api/*        → server（Express，端口可配）
       └─ JSON 文件存储（data/db.json，无需数据库）
```

前端与后端通过 `/api` 与 `/uploads` 两个前缀交互，生产环境由 Nginx（或宝塔面板）反向代理收口。

## 四、核心特性

- **全屏山门入口**：加载进度驱动山门逐帧开启，门洞灵光随进度变亮，玉简「啟」字封印随启封进度填充。
- **3D 洞府场景**：云海、远山、大厅云鸟花草、人物模型自动姿态适配与朝向校正。
- **管理后台**：外观配置（主色 / 水墨浓度 / 粒子 / 昼夜）、人物模型上传替换、丹器馆藏与修行履历编辑、登录日志。
- **零依赖存储**：服务端与文档存储表结构一致，开箱即用，无需 MySQL。
- **统一内容接口**：简历、项目、联系方式、设置等均通过 `/api` 暴露。

## 五、目录结构

```
xuanji-dongfu/
├── home/        # 3D 主页（React + Vite + three.js）
├── admin/       # 管理后台（React + Vite + Ant Design）
├── server/      # API 服务（Express + TypeScript）
├── deploy/      # nginx.conf / docker-compose 等部署模板
├── docs/        # 文档（介绍 / 使用）
├── package.json # pnpm workspace 根配置
└── README.md
```

更完整的运行与部署说明见 [USAGE.md](./USAGE.md)。

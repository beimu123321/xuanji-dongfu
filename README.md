# 玄玑洞府 · 个人主页系统

> 以东方水墨为骨、低多边形科技为魂的个人主页系统。
> 前端 3D 洞府沉浸式游历 + Ant Design 水墨修仙后台可视化管理，内容与展示完全分离。

---

## 一、项目结构

```
xuanji-dongfu/
├── server/                     # 服务端（Express + TypeScript + JWT）
│   ├── src/
│   │   ├── index.ts            # 入口
│   │   ├── app.ts              # 应用装配（CORS / 静态资源 / 路由 / 错误处理）
│   │   ├── lib/
│   │   │   ├── types.ts        # 实体类型（与文档第五章字段一一对应）
│   │   │   ├── store.ts        # 数据访问层（原子落盘，零配置）
│   │   │   ├── auth.ts         # JWT 签发与校验
│   │   │   └── http.ts         # 统一响应格式与错误码
│   │   └── routes/             # auth / profile / experiences / projects / contacts / settings / stats / upload
│   ├── data/db.json            # 运行时数据（首次启动自动生成种子数据）
│   ├── uploads/                # 上传的图影
│   ├── schema.sql              # MySQL 8.0 建表脚本（切换数据库时使用）
│   └── .env.example
├── home/                       # 前端 3D 主页（React 18 + Three.js r160）
│   ├── public/models/          # 人物模型 avatar-tripo.glb（用户提供 GLB 经减面管线的产物）
│   └── src/
│       ├── scenes/             # 六大场景：山门 / 前厅 / 筑基 / 履历 / 丹器 / 传讯
│       ├── three/              # 3D 基础构件（镜头 / 虚拟形象 / 玉简 / 山石 / 粒子 / 石门）
│       ├── shaders/            # 自定义水墨 Toon 着色器
│       ├── components/         # 2D 覆盖层与内容面板
│       ├── store/              # Zustand 全局状态
│       ├── utils/              # 程序化贴图、剪贴板工具
│       └── api/                # 接口层
├── admin/                      # 管理后台（React 18 + TypeScript + Ant Design 5）
│   └── src/
│       ├── pages/              # login / dashboard / profile / experience / project / contact / settings
│       ├── layouts/            # 后台布局
│       ├── components/         # 通用组件（Markdown 编辑器 / 图表 / 上传 / 路由守卫）
│       ├── api/                # Axios 实例与接口清单
│       ├── theme/              # Ant Design 水墨修仙主题
│       └── store/              # 鉴权状态
├── deploy/                     # Nginx 配置与 Docker 编排
├── pnpm-workspace.yaml
└── package.json
```

---

## 二、快速开始

### 环境要求

- Node.js ≥ 18（推荐 20 / 22）
- pnpm ≥ 9（`npm i -g pnpm`）

### 安装与启动

```bash
cd xuanji-dongfu

# 1. 安装依赖
pnpm install

# 2. 一次性启动三端（服务端 3000 / 主页 5173 / 后台 5174）
pnpm dev
```

也可以分别启动：

```bash
pnpm dev:server   # http://localhost:3000
pnpm dev:home     # http://localhost:5173
pnpm dev:admin    # http://localhost:5174
```

### 默认账号

| 项目 | 值 |
|---|---|
| 后台地址（开发 `pnpm dev`） | http://localhost:5174 |
| 后台地址（构建预览 `pnpm preview`） | http://localhost:4174/admin/ |
| 主页地址（构建预览） | http://localhost:4173 |
| 道号 | 见 `server/.env` 的 `ADMIN_USERNAME` |
| 禁制密码 | 见 `server/.env` 的 `ADMIN_PASSWORD` |

> 后台生产构建的 `base` 是 `/admin/`（见 `admin/vite.config.ts`），所以预览地址带 `/admin/` 路径——访问 `:4174/` 会 302 跳转到 `/admin/`。`preview` 同样配了 `/api` 代理，因此预览下登录与接口调用都正常。
> 生产环境请务必修改默认密码与 `JWT_SECRET`。

---

## 三、环境变量

复制 `server/.env.example` 为 `server/.env` 后按需修改：

| 变量 | 说明 | 默认 |
|---|---|---|
| `PORT` | 服务端端口 | `3000` |
| `JWT_SECRET` | JWT 签名密钥 | 开发用占位值 |
| `JWT_EXPIRES_IN` | 令牌有效期 | `7d` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 首次初始化时的管理员账号 | 见 `server/.env`（不在文档中记录明文） |
| `CORS_ORIGIN` | 允许跨域来源，多个用逗号分隔 | `*` |

> `ADMIN_USERNAME` / `ADMIN_PASSWORD` **仅在数据文件不存在、首次初始化时生效**。

---

## 四、接口一览

统一响应格式：`{ "code": 200, "message": "success", "data": {} }`
鉴权：请求头携带 `Authorization: Bearer {token}`

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| POST | `/api/auth/login` | 管理员登录 | 否 |
| POST | `/api/auth/logout` | 退出登录 | 是 |
| GET | `/api/auth/profile` | 当前管理员信息 | 是 |
| PUT | `/api/auth/password` | 修改密码 | 是 |
| GET | `/api/auth/logs` | 登录日志 | 是 |
| GET / PUT | `/api/profile` | 个人信息读取 / 更新 | 否 / 是 |
| GET / POST | `/api/experiences` | 履历列表 / 新增 | 否 / 是 |
| PUT / DELETE | `/api/experiences/:id` | 履历编辑 / 删除 | 是 |
| POST | `/api/experiences/batch` | 批量删除 / 上下架 | 是 |
| POST | `/api/experiences/sort` | 拖拽排序 | 是 |
| GET | `/api/projects` | 项目列表（支持 category / level / status / keyword） | 否 |
| GET | `/api/projects/:id` | 项目详情 | 否 |
| POST / PUT / DELETE | `/api/projects[/:id]` | 项目增删改 | 是 |
| POST | `/api/projects/:id/view` | 记一次品鉴 | 否 |
| POST | `/api/projects/import-github` | 一键导入 GitHub 项目 | 是 |
| GET | `/api/contacts` | 联系方式列表 | 否 |
| POST / PUT / DELETE | `/api/contacts[/:id]` | 联系方式增删改 | 是 |
| POST | `/api/contacts/:id/click` | 记一次传讯 | 否 |
| GET / PUT | `/api/settings[/basic\|/appearance\|/security]` | 系统设置 | 否 / 是 |
| GET | `/api/stats/overview` | 仪表盘聚合数据 | 是 |
| POST | `/api/stats/visit` | 访问埋点 | 否 |
| POST | `/api/upload` | 图片上传（字段名 `file`，≤5MB） | 是 |
| POST | `/api/upload/model` | 人物模型上传（字段名 `file`，仅 `.glb`，≤80MB，校验 GLB 魔数） | 是 |

错误码：`200` 成功 / `400` 参数错误 / `401` 未授权 / `403` 权限不足 / `404` 资源不存在 / `500` 服务器内部错误。

---

## 五、构建与部署

```bash
pnpm build          # 依次构建 home、admin、server
pnpm build:home     # 产物 home/dist
pnpm build:admin    # 产物 admin/dist（base = /admin/）
pnpm build:server   # 产物 server/dist
```

### Nginx（静态资源 + API 反向代理）

配置示例见 `deploy/nginx.conf`，与开发文档 7.3 一致，可直接替换 `server_name` 与证书路径使用。

### Docker Compose

```bash
cd deploy
docker compose up -d --build
```

---

## 六、实现说明与文档差异

为满足「零配置即可运行」与「跨设备稳定」的目标，以下三点相对开发文档做了等价替换，功能与字段完全一致：

1. **数据层**：文档推荐 MySQL 8.0 + Prisma。本项目默认使用 **JSON 文档存储 + 原子写入**（`server/src/lib/store.ts`），实体字段、自增规则、约束与文档第五章完全一致，**无需安装任何数据库即可运行**。
   需要切换到 MySQL 时：导入 `server/schema.sql`，把 `store.ts` 中的读写实现替换为对应 SQL 即可，**路由层与前端无需任何改动**。

2. **后台工程化**：文档推荐 Umi 4。本项目使用 **Vite 5 + React Router（HashRouter）**，构建更快、产物更小，且在任意子路径部署与直接打开 `dist/index.html` 时都不会 404。

3. **后处理特效**：文档推荐 Bloom + FXAA。为避免部分设备上后处理管线导致的白屏与掉帧，本项目改用 **自发光材质 + 叠加光晕（Additive Blending）** 实现同等观感；「精简模式」则统一关闭粒子与光晕。水墨边缘羽化、墨色浓淡由自定义 Shader 实现，未做降级。

4. **场景挂载策略**：六处洞府同属一座山体，坐标互有前后关系。若六者常驻，相邻区域会串进当前镜头（前厅能看见丹器馆藏的法宝与另一尊虚影，丹器馆藏又能看见传讯玉符的玉牌）。因此 `home/src/App.jsx` 的 `useSceneVisibility` **只挂载当前场景，并在转场期间（1.3s，与镜头 1.2s 动画对齐）保留上一场景**，镜头平移的连续感不变，构图则各自干净。地面、岩壁、粒子等公共元素始终常驻。

### 已实现的完整能力

**前端 3D 主页**

- 六大场景：山门候客（加载）→ 洞府前厅 → 筑基概况 / 修行履历 / 丹器馆藏 / 传讯玉符
- 镜头系统：GSAP 插值（`power2.inOut`，1.2s）、前厅待机公转（20s 周期 ±15°）、鼠标跟随偏移、转场期间禁用交互
- 虚拟形象：用户提供的开源人物模型（男生小孩，Tripo 生成 GLB），经自研减面管线把 43MB / 149 万三角形压到 3.14MB / 11 万三角形；统一染「生宣暖白」色调融入青绿水彩，待机呼吸、微摆、悬停放大、点击抱拳行礼 + 随机问候
- 场景交互：玉简悬停展开、灵脉节点悬停涟漪与点击展开、法宝拖拽 360° 环绕与分类高亮、玉符点击复制/跳转
- 彩蛋：修为值（浏览累积并进阶）、灵签、昼夜轮转
- 全局：御剑归宗、精简模式、移动端底部导航、篆文进度加载、弱网提示
- 降级：WebGL 2.0 检测失败自动切换 **2D 水墨版主页**（内容完全一致）
- 贴图：全部由 Canvas 2D 程序化生成（八卦纹、玉简篆文、匾额、卷轴、光晕、水墨噪声），无额外静态资源；石壁卷轴会按当前档案内容实时排版竖排文字（右起，含落款印）

**管理后台**

- 登录（禁制验证）、仪表盘（4 张概览卡 + 近 7 日趋势折线 + 技术栈占比饼图 + 操作记录 + 品鉴排行 + 快捷入口）
- 筑基档案：基础信息 / 功法配置（名称 + 炼气·筑基·金丹）/ 道心所向 / 形象立绘上传 / 粒子强度 / 问候语池
- 修行履历：拖拽排序、置顶、批量上下架、批量删除、Markdown 编辑器（书写 + 实时预览）
- 丹器馆藏：分类/品阶/状态筛选、一键导入 GitHub、标签输入、封面上传、Markdown 简介、拖拽排序
- 传讯玉符：四种内置类型、图标、排序、显隐、拖拽排序
- 洞府禁制：基础设置（名称/副标题/三段加载文案/欢迎语/彩蛋开关）、外观设置（主题色/水墨浓度/粒子强度/昼夜模式/人物模型替换与朝向姿势）、账号设置（改密/JWT 有效期/登录日志）
- 主题一致性：消息提示经 `admin/src/utils/message.ts` 桥接到 `<App>` 提供的实例，静态 `message` 无法消费暗色主题上下文的问题已消除；各页表单实例在页面挂载时即与 `Form` 元素连接（`Tabs` 页签设 `forceRender`、加载态用 `Spin` 覆盖而非提前 return）

### 真实渲染校验与修复记录

以下问题均在**真实浏览器（headless Edge + CDP 真实鼠标事件）**中复现并修复，修完逐项回归确认。

1. **前厅玉简互相遮挡、点击命中错位**
   three 对 `LineSegments` 的射线拾取带 1 个世界单位的阈值（`Raycaster.params.Line.threshold`），玉简描边的命中区因此向外膨胀近一个单位；前厅相邻玉简中心距仅约 1.8 单位，于是点「修行履历」会命中「丹器馆藏」。玉简背光面片（1.44 × 1.9）同样会盖住邻座。
   修复：`home/src/three/RuneSlip.jsx` 中背光面片与描边统一挂 `raycast={NO_PICK}`，命中区只留玉简本体。另将玉简环改为扁椭圆（`RING_RX=5.0 / RING_RZ=0.7`），正后方一枚抬到 `BEHIND_Y=3.0`，并把匾额移到虚影后上方 `[0, 4.7, -3.2]`，五枚在镜头公转的每个相位都不再互相遮挡。

2. **「修行手札」置灰后点击毫无反馈**
   修复：`onClick` 不再因 `disabled` 提前 return，改由父级给出「修行手札 · 尚在参悟」提示；`disabled` 只表达置灰与不响应悬停展开。

3. **窄屏出现「玉简环放不下、底部导航又不显示」的空档**
   新增 `home/src/hooks/useViewportTier.js`，3D 玉简环与底部导航共用同一判据（`width <= 768` 或环半径缩放后不足可见半宽的 65%），两者恰有一个在场。

4. **传讯玉符场景：底部信息卡盖住四枚 3D 小玉符**
   修复：`ContactPanel` 压成单行头部 + 紧凑卡片（`pb-[62px] md:pb-7`），玉符抬到 y=2.55，窄屏不挂 3D 玉符只留卡片。悬停小玉符会浮现对应账号（文档 3.7.3）。

5. **卷轴竖排档案糊成一片、无法辨读**
   根因：标签与正文各占一栏，六条档案共 12 栏，栏距被压到 42px 而字宽 34px；且 `motto` 未去空格，竖排把每个空格排成一格空位。
   修复：改为一栏一条（标签暗金 30px 紧接正文玉白 34px），`colGap = 48`、条间再加 32px 与一道细线，统一 `compact()` 去除所有空白。

6. **后台「修行履历」新增/编辑时表单一片空白**
   根因：该页 `<Form>` 多带了 `preserve={false}`。`Modal` 内容惰性挂载，`openCreate/openEdit` 里的 `setFieldsValue` 只是先写进 store；`<Form>` 首次挂载时 `setInitialValues` 会用 `initialValues` 覆盖这些字段，而 `preserve={false}` 的字段在 StrictMode 双次挂载下会被直接抹成 `undefined`——表现为「新增时日期/排序/状态全空、编辑时表单一片空白」。其余各页未设该属性，故不受影响。
   修复：移除 `preserve={false}`，与其余各页保持一致。

7. **窄屏前厅匾额过大、与左上角题名挤在一处**
   修复：窄屏下匾额整体缩至 0.62 并下移。

8. **人物 GLB 直接上首屏不可用（43MB / 149 万三角形）**
   自研纯 Python（标准库 + Pillow）减面管线 `xj-reg/glb-optimize.py`：解析 GLB → 按表面积估算目标边长 `h` → 顶点聚类（`floor(pos/h)` 哈希聚合，重算质心/法线/UV，索引重映射后丢弃退化三角形）→ 贴图缩放重编码（color 1024² JPEG q78、normal q82，丢弃 ORM，metallic 0.05 / roughness 0.78 / normalScale 0.7）→ 重新组装 GLB。
   产物 `home/public/models/avatar-tripo.glb`：5.2 万顶点 / 109,698 三角形 / 3.14MB，首屏可秒载。

9. **换模型后「网格挂载正常、变换正确、就是不渲染也点不到」**
   根因：材质接管时把**单材质包成了一元素数组**（`obj.material = mats.map(...)`）。three 的 `projectObject` 与射线拾取都按 `geometry.groups` 逐组取材质，`groups` 为空时一个 draw item 都不会 push——既不自绘也不可拾取。
   修复：`Array.isArray(obj.material) ? obj.material.map(tweak) : tweak(obj.material)`。另附带的两个同源问题：`useFrame` 里 `scale.setScalar(1)` 覆写了 2.4 的基础缩放、`position.y = bob` 覆写了半个身位的抬升，全部改为在基础值上叠加；AI 导出的三角形绕序不保证，材质统一 `DoubleSide` 防正面被整体剔除。

10. **后位玉简「筑基概况」曾疑似点击无效**
   实为诊断坐标估错：该枚玉简被抬到 `BEHIND_Y=3.0`、位于虚影正后方，屏幕位置在画面中上部，而早前估算点落在虚影头颈一带——那里命中的是**可交互的虚拟形象**（悬停指针、点击只触发问候），并非玉简。按前厅机位（相机 `[0,2.15,7.4]` → 注视 `[0,1.42,0]`，fov 52°）反推，五枚玉简的实际像素（1410×805 视口）为 筑基 (705,234) / 丹器 (1057,385) / 履历 (1216,388) / 传讯 (353,385) / 手札 (194,388)，逐一实测悬停与转场均正常。

### 青绿水彩改造

用户反馈「整体画面太暗、前厅背景模型不好看、颜色要对齐参考的国风水彩」后做的整幅提亮与换色，默认**昼**（夜间模式仅在右上角显式切换「昼/夜」时生效，`auto` 一律解析为昼）：

- **远景换图**：`three/WatercolorBackdrop.jsx` 由 3D 山石改为水彩图 + 天空渐变，随昼夜换色调（夜换暮青 `#5E8E96 / #7FAFA2 / #4E7E70 / #2E5A50`）
- **光照**：`App.jsx` 的环境光/半球光/两盏方向光全部按昼夜切换，昼 2.2 / 1.6 / 1.7 / 0.55，夜压到约六成（1.35 / 0.95 / 1.05 / 0.32）
- **配色**：`home/src/theme/palette.js` 为 3D 侧唯一配色来源，`tailwind.config.js` 九个色板 token 与 `index.css` 的 `--ink-*` 变量同步翻亮（moxuan `#EEF5EC`、xuanqing `#E1EFE6`、gold `#8A6F32`、jade `#16504A`…）；`GateLoader` 的山水与石门、`inkToon` 默认色同步调整
- **地面**：`three/BaguaGround.jsx` 八卦纹与晕染层按昼夜换色（夜 `#9DBFA8`，晕染不透明度 0.26/0.18）
- **氛围**：全局 `InkParticles` 换成暖金浮尘 `#D8BE7C`（亮景下灰白粒子看不见）

**回归结论**（headless Edge，真实鼠标事件驱动）：

- 主页（青绿水彩 + 人物 GLB，`vite preview :4173`）：前厅五枚玉简按前厅机位反推坐标逐一实测——悬停指针与 HUD 标签均命中正确标签，筑基 (705,234) / 丹器 (1057,385) / 履历 (1216,388) / 传讯 (353,385) 四枚点击转场成功并「御剑归宗」回前厅，手札 (194,388) 点击弹「修行手札 · 尚在参悟」不跳转；点击虚影躯干弹问候「此间功法，任君翻阅。」；昼夜切换后画面整体入暮（HUD「昼/夜」同步）；夜间截图无穿帮。`errors: []`
- 移动端（412×915）：底部导航「筑基 履历 丹器 传讯 手札 归宗」齐全、逐项转场与返回均正常。`errors: []`
- 降级：拦截 `getContext('webgl2')` 后自动进入「简素画卷」2D 主页，内容与 3D 版一致，`canvas` 数量为 0。`errors: []`
- 历史回归（504×805、后台五页、生产构建三端、`typecheck`、构建体积）结论同前，仍成立。

> 为便于在生产构建上直接做本地冒烟，`home/vite.config.js` 与 `admin/vite.config.ts` 的 `preview` 段也配置了 `/api`、`/uploads` 代理（与 `server` 段共用同一份 `proxy` 常量）。生产环境仍由 Nginx 反向代理，该配置不影响构建产物。

### 人物形象替换与背景修复

用户反馈「人物侧身背对镜头、手臂平举不自然、背景有残缺、履历与丹器的背景板没颜色」后的一轮改造。

**一、人物朝向与姿势自动适配（`home/src/three/modelAutoPose.js`）**

用户上传的 GLB 来源各异（Tripo / Mixamo / 各版本 Blender 导出），朝向与姿势都不一致。全部用**纯几何判据**推断，不依赖节点命名，也不依赖骨骼：

- **朝向**：肩带（身高 68%~84%）里水平跨度更大的那条轴即「左右轴」（人形正面本就瘦长，摊手时该轴跨度远大于另一轴），另一条为「前后轴」；正脸侧由上半身质心偏移与顶点密度分布加权定符号，换算成「面朝 +z」的 yaw。本模型实测 `lrAxis='z'`、`frontSign=1`、`autoYaw=-π/2`。
- **姿势**：仅当左右跨度 / 前后跨度 > 1.8（判定为 T-pose）时才收臂。手臂顶点绕**肩关节处的「前后轴」**旋转 77°（`ARM_FOLD_ANGLE=1.34`），枢轴取在躯干外缘——枢轴上的顶点位移恒为 0，躯干与手臂之间天然连续，不会塌陷或自交。过渡带取 0.55 倍躯干半宽：太窄（0.25 倍，试过）会把肩头的剪切挤成一道折痕，太宽（1.1 倍，也试过）会让整条袖子弯成扇形。
- 模型确认**无骨骼**（`skins: 0 / animations: 0 / nodes: 1 / 单网格`），做不了骨骼动画，只能做顶点变形，故采用上述方案。

这一轮踩到并修掉的三个坑：

1. **`useFrame` 的 `delta` 是第二个参数**。写成 `useFrame((state) => ...)` 再读 `state.delta` 得 `undefined`，`NaN` 一路污染 `rotation.y` → 整棵子树 `matrixWorld` 变 NaN → three 直接跳过该对象。表现为「模型挂载正常、三角形也计入了渲染统计，就是不显示、也点不到，且没有任何报错」，极难定位。已改为 `useFrame((state, delta) => ...)`。
2. **`useGLTF`（drei/Suspense）在 URL 中途切换时不恢复**。R3F 自绘渲染树里二次挂起后，promise 兑现不会触发重渲染（静默卡死）。已改为 `GLTFLoader.loadAsync` + 模块级 Promise 缓存 + `useState` 命令式加载，加载期间保留上一个模型，不会闪空。
3. **收臂四元数算完没作用回顶点**。`foldArms` 里 `quat.setFromAxisAngle(...)` 之后漏了 `offset.applyQuaternion(quat)`，于是循环跑满、`moved` 返回 `true`、但包围盒前后一模一样（`0.289 × 1.000 × 0.883`），表现为「代码执行了但手臂纹丝不动」。这个坑是用 `xj-reg/xj-analyze.mjs` 在 Node 里直接跑几何分析、打印收臂前后包围盒对比才揪出来的。

**二、后台「人物模型替换」（外观设置 → 人物形象）**

- 新增 `POST /api/upload/model`：仅收 `.glb`、上限 80MB、校验 GLB 魔数（`0x46546C67`），校验失败即删除落盘文件；图片上传重构为独立的 `imageUpload`（≤5MB）。
- `settings.appearance` 新增 `avatarModel`（须匹配 `^/uploads/models/[\w.-]+\.glb$` 或空串）、`avatarYaw`（-180~180）、`avatarPose`（`auto`/`raw`）。
- 后台 `admin/src/components/ModelUpload.tsx` + 朝向微调滑块 + 姿势单选；主页 `Avatar.jsx` 优先读上传模型，为空则回落到内置 `avatar-tripo.glb`。上传后朝向自动适配，若仍有偏差用滑块校正，无需改模型文件。

**三、背景残缺修复**

- **远景跟随镜头**：`WatercolorBackdrop.jsx` 原先固定在世界原点，镜头转场后远景平面会甩出画面、留下硬边。改为每帧贴住相机机身（`camera.position - forward × 85`）并朝向相机，前厅 / 丹器 / 履历 / 夜间各机位背景均完整无硬边。
- **壁面四缘渐隐**：`getWallTexture` 新增 `edgeFade` / `edgeFadeV`，用两遍 `destination-out`（等价于 alpha 相乘，四角自然过渡）把壁面边缘擦成透明。履历场景主壁左缘原先落在画面 ndc≈-0.44（约 440px）处，后面直接露出远景天空，两色相撞就是一道竖直硬缝——按机位（相机 `[2.5,2.2,4.9]` → 注视 `[6.8,2.05,0.2]`，fov 52°）反推的像素位置与实测完全吻合。渐隐后壁面融进远景。同时移除了会在渐隐区重新露出硬边的背衬 box，以及一块经反推确认完全落在视锥外的「左侧山影」死几何。

**回归结论**（headless Edge，真实鼠标事件驱动，`vite preview :4173` / `:4174`）：

- 主页全场景：前厅 → 丹器馆藏 → 履历 → 筑基概况 → 夜间，逐场截图确认人物正脸朝镜头、双臂垂于身侧、各场景背景无硬边；`RUNTIME_ERRORS: []`
- 后台外观页：模型上传（`DOM.setFileInputFiles` 走真实文件输入框）→ 提示「人物模型已上传」→ 当前模型路径更新 → 保存 → 接口回读一致 → 静态资源 `200`（3,136,488 字节，GLB 魔数正确）；朝向滑块 0→30→保存→回读一致；姿势单选 `raw` ↔ `auto` 往返正常。测试产生的文件与设置已还原。
- 内置回退：`avatarModel` 置空后主页正常回落到内置模型。
- `server tsc --noEmit` 与 `admin typecheck` 均 exit 0；三端构建通过。

### 界面细节改造（传讯/筑基背景、大厅装饰、门牌、丹器渐显、入口页）

用户反馈「传讯玉符与筑基档案两个界面背景没变、大厅太单调、洞府门牌太丑、灵器界面要像生涯一样渐显、主页 UI 需重新设计」后的一轮改造。

**一、传讯玉符 / 筑基档案「背景没变」的根因**

这两个场景最深处根本没有背景板：传讯是一块纯色 `#DCE9DF` 的 box，筑基是一堵 `0.6×10×18` 的扁墙——它的顶边落在屏幕 y≈34px、底边 y≈669px，上下都露在画外，看起来就是一块浮着的板子。两处都换成 `getWallTexture('danqi', …)` 青绿山水壁面。

关键在于**按机位反推贴图密度**。fov 52°、景深 d 处可视半高 `d·tan26° = 0.4877d`：

| 场景 | 相机 → 注视 | 壁面处景深 | 可视高 |
| --- | --- | --- | --- |
| 传讯 | `[0,2.95,-14.4]` → `[0,2.8,-20.6]` | 9.6 | 9.4 |
| 筑基 | `[-2.6,3.2,4.6]` → `[-7.0,3.2,0.2]` | 6.86 | 6.7 |
| 丹器 | `[0,2.7,-6.2]` → `[0,1.95,-12.2]` | 13.3 | 13.0 |

传讯/筑基的景深只有丹器的一半，同一张贴图会摊成大色块。故 `getWallTexture` 新增 `ridgeScale` 参数，把山脊频率按倍数加密、采样步长同步收紧为 `Math.max(2, Math.round(8 / ridgeScale))`；两处传 `ridgeScale: 2`，山脊层次才立得住。缓存键相应扩为 `wall:${variant}:${edgeFade}:${edgeFadeV}:${ridgeScale}`。

**二、大厅云鸟花草（`home/src/three/HallDecor.jsx`）**

- `Clouds`：`liteMode ? 4 : 7` 团祥云，`x∈±17, y∈3.4~8, z∈-8~-23`，每帧 `x = it.x + Math.sin(t·drift + phase)·3.4` 横向漂移。面片**每帧 `quaternion.copy(camera.quaternion)`**——否则镜头公转 ±15° 时面片会被压成一条线。
- `Birds`：两群飞鸟剪影沿椭圆盘旋（`speed` 带正负号使两群反向），`cy = 5.3 + i·1.35 + rand()·1.1`、`w = 5.2~7.8`。
- `Plants`：`Tuft` 用 7 片叶子合并成一个 `BufferGeometry`（三排顶点×两侧，索引 `[0,1,3, 0,3,2, 2,3,5, 2,5,4]`），`meshBasicMaterial vertexColors DoubleSide`，根 `#4E8F63` → 尖 `#A6DDA9`；荷叶用 `circleGeometry args={[s, 14, 0.34, 2π-0.68]}` 留一道缺口，否则俯视机位下实心圆片读起来像「地上的绿水洼」。成丛分布（`clusters` 11 / 精简 6）。
- 全部布局用确定性伪随机 `mulberry32(seed)`，保证重渲染间不跳位。

**三、洞府门牌重设计（`getPlaqueTexture`）**

画布 224→256 高，重新排布：木框（`#966E38→#6E4E27→#4C3318` 渐变 + 18 道横向木纹贝塞尔）→ 内芯深青漆面 → 顶部柔光 → 金色双线框 → 回纹带**只画在外线与内线之间的窄带**（`meander(42)`/`meander(h-42)`，`unit=44, s=11`）→ 四角如意云头 → 题字 `size = clamp(620/len, 74, 124)`（先画 `rgba(0,0,0,0.38)` 暗影做刻痕，再叠金色渐变）→ 右下朱印。旧版题字 132px 与回纹直接重叠，是「丑」的主因。

**四、丹器详情卡每次切换都渐显**

`{selected && <aside>}` 是同一个 DOM 节点，切换法宝时节点不重挂，`animate-inkRise` 只在首次播一次。加 `key={selected.id}` 强制重挂即可。修行履历的展开内容天然挂在各自 `<li>` 下、切换即重挂，所以本来就每次渐显——这就是两者观感不一致的来源。另外详情卡 `top-[8%]`（≈64px）会压住右上角 HUD（占顶部约 116px），改为 `top-32`；卡片内三块内容与底部卡片阵列加了错峰 `animate-inkFade`。

**五、入口页（`home/src/components/GateLoader.jsx`）重设计**

原版是一块淡色底 + 一扇 `opacity: 0.7` 的石门虚影，太单薄。重做为完整的青绿水彩「山门图」。

**背景**：五重山峦 + 日晕 + 两层流云 + 云海 + 十颗浮尘。这里踩了两个坑——

1. 折线直连会得到「硬边三角」，读起来像壁纸贴图；改用 Catmull-Rom 转三次贝塞尔平滑。
2. 但标准张力（1/6）会把折线抹成一条正弦，五层叠起来变成「重复的波浪」。**张力收到 1/9** 才是山的轮廓（峰顶保留圆角、坡面基本保持直）；同时各层峰距必须拉开（远景三四座大峰、近景十余座小峰）。
3. 纯色平涂的山影无论轮廓多准都像剪纸，五层改共用一条竖向 `userSpaceOnUse` 渐变（山顶受光 `#A8DCCE` → 山脚积墨 `#2F8B78`）。渐变顶端**不能取近白**——远山的可见部分只有山顶一带，取近白就和天空糊成一片（这一版返工过一次）。
4. 山体统一收在上半部（base 646~734），下半部留给云海，既避免山影压在底部题名上，也拿到「山门立于云海之上」这个更好认的构图。

**主体：从「看一个山门」改成「站在山门正前方」**。第一版把山门做成 470×490 的小件挂在屏幕正中，结果是竖长的窄矩形加顶上一块匾额，轮廓读起来像墓碑，也谈不上大气。第二版改为全屏构图，按视口百分比分区：

| 分区 | 位置 | 内容 |
| --- | --- | --- |
| 飞檐 | 0 ~ 15% | 全宽屋面，正脊 + 瓦垄 + 檐口板 |
| 匾额 | 13.4 ~ 21.8% | 悬于檐下、压在门楣上，题站点名 |
| 门楣 | 15 ~ 19.6% | 全宽横梁 |
| 门扇 | 19.6% ~ 底部 25% | 两扇铺满，木纹 + 门钉阵列 + 铺首衔环 |
| 门槛 | 底部 21 ~ 25% | 全宽门槛石 |
| 地面 | 底部 0 ~ 21% | 石阶留白，承载底部文字 |

- **门扇「分开」用 `translateX` 而非 `scaleX`**：缩放会把门钉压扁，平移则门扇滑到门框后面去，缝隙自然张开、没有任何形变。`DOOR_OPEN = 7`（占门扇自身宽度的 7%），配合门缝后的灵光柱，加载进度直接读成「门开多大」。
- **飞檐的 viewBox 必须与 band 比例匹配**：`preserveAspectRatio="none"` 下，viewBox `1440×120` 对应 `100vw × 15vh`，常见 16:9 视口横竖缩放比才接近 1。第一版用 `1440×170`，屋顶被竖向压扁成一条「透镜」。另外檐线要**中段近水平、只在两端勾起来**——整条檐线都做成大弧线的话，屋面会收成一个透镜形，同样读不出是屋顶。
- **玉简不复用站点名**：匾额已经题过，重复反而泄气。改为题一个「啟」字封印，底部的金色填充高度就是启封程度。
- **性能**：静态背景与飞檐用 `useMemo` 固化元素引用，逐帧重渲染时 React 直接复用同一元素、不触碰 DOM，SVG 滤镜结果得以缓存，不会因 60fps 刷新掉帧。
- 首屏 splash 同步改浅色：`index.html` 里 `#boot-splash` 与内联 `body` 仍是提亮之前的 `#0f1419` 深色，会在浅色主题前闪一下黑屏，已改为 `#eef5ec` / 金字 `#8a6f32`。

**回归结论**（`xj-reg/xj-round4.mjs`，headless Edge + 真实鼠标事件，`vite preview :4173`）：

- 入口页 → 前厅 → 传讯 → 筑基 → 丹器（点第 1/2 张卡片验证详情卡重挂）→ 履历，逐场截图；`RUNTIME_ERRORS: []`
- 详情卡重挂断言：在 `aside` 上打标记 → 切到另一件法宝 → 标记消失 → `详情卡切换后已重挂: true`
- GLB 两次请求均 3,136,488 字节

---

## 七、常见问题

**Q：`pnpm install` 卡在 esbuild 的 postinstall？**
项目根目录已提供 `.npmrc` 并设置 `ignore-scripts=true`。本项目全部依赖均为纯 JS 包，平台二进制由 `@esbuild/win32-x64` 等 optionalDependencies 直接提供，无需执行安装脚本。

**Q：主页一直停在加载页？**
加载页会在 3D 场景装配完成后解锁「推门入府」按钮。若服务端未启动，页面仍可进入洞府，但内容为空。请确认 `http://localhost:3000/api/health` 可访问。

**Q：后台点「预览洞府」打不开？**
该按钮会打开 `http://localhost:5173`。生产环境请改为实际的主页域名（`admin/src/layouts/AdminLayout.tsx`）。

**Q：前厅的「筑基概况」玉简点不到？**
那枚玉简被抬到虚影正后方（`BEHIND_Y=3.0`），屏幕位置在画面中上部，不在其余四枚所在的横排上；点它下方的虚影头颈只会触发虚拟形象的问候。各机位下的实测像素（1410×805 视口、精简模式冻结公转）见「真实渲染校验与修复记录」第 10 条。非精简模式下前厅有 20s 周期 ±15° 待机公转，玉简会随镜头横向摆动，属预期观感。

**Q：`pnpm dev:home` 起不来或页面空白？**
先确认 5173 没有被别的开发服务器占用（`netstat -ano | findstr :5173`）。若端口被早期遗留进程占用，主页会静默换端口或直接白屏；关掉遗留进程或用 `--port` 指定新端口即可。远端调试（headless Edge + CDP）时建议直接用 `vite preview :4173`，与生产产物一致。

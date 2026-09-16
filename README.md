# 🌸 锋锋の小站 (my-json-notes)

一个基于 **Node.js + Express + JSON 文件存储** 的个人展示网站，无需数据库即可运行。
粉系可爱风设计，内置博客、动态、轮播图、激励语录与完整的后台管理系统，开箱即用。

![Node](https://img.shields.io/badge/Node.js-%3E%3D16-brightgreen)
![Express](https://img.shields.io/badge/Express-4.x-blue)
![License](https://img.shields.io/badge/License-ISC-yellow)

---

## ✨ 功能特性

### 前台
- 🏠 **主页**：实时时钟（数字翻动动画）、图片轮播（自动播放 / 触摸滑动 / Ken Burns 缩放）、每日一句、关于与最新动态
- 📖 **动态页**：文章列表，点击卡片打开**阅读弹窗**，支持**点赞**（每篇文章每浏览器限一次，带爆心动画）与**浏览量统计**
- 👤 **关于页**：个人简介、兴趣爱好、联系方式（均可在后台自定义）
- 🎨 **全局动效**：樱花飘落、漂浮渐变光斑、流光渐变标题、打字机标语、卡片聚光灯跟随鼠标、3D 倾斜、按钮涟漪、滚动级联入场、返回顶部滚动进度环、自定义粉色滚动条，并适配 `prefers-reduced-motion` 无障碍偏好

### 后台（`/admin.html` 登录）
- 📝 **发布 / 编辑 / 删除文章**（编辑支持表单回填与保存修改）
- 🖼️ **轮播图管理**、📜 **励志语录管理**、📄 **关于内容管理**、🎯 **兴趣爱好管理**、📬 **联系方式管理**
- ⚙️ **网站信息设置**（网站名称、标语修改后前台实时生效）
- 🔐 **修改密码**（scrypt 哈希持久化存储，重启不失效）
- 🧹 **数据管理**：清除缓存、一键重置所有设置

## 🔒 安全设计

| 措施 | 说明 |
|------|------|
| 密码哈希 | `scrypt + 随机盐` 存储，杜绝明文；使用 `timingSafeEqual` 防时序攻击 |
| 接口鉴权 | 所有写操作（POST/PUT/DELETE）要求 `Bearer Token`（登录后颁发，24h 有效） |
| 防暴力破解 | 同一 IP 15 分钟内登录失败 8 次即锁定 |
| XSS 防护 | 所有动态内容渲染前 HTML 转义，正文以纯文本渲染 |
| 数据自愈 | `data.json` 损坏时自动备份并重建，网站不会 500 |
| 原子写入 | 先写临时文件再重命名，避免写入中断损坏数据 |

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动
npm start

# 开发模式（文件变动自动重启）
npm run dev
```

访问 http://localhost:3000 ，后台管理入口在 http://localhost:3000/admin.html 。

**默认管理员账号：** `admin` / `admin123` —— 首次登录后请立即在「设置 → 安全设置」中修改密码！

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务监听端口 | `3000` |
| `DATA_PATH` | 数据文件存放目录（Railway Volume 持久化用） | 项目根目录 |
| `ADMIN_USERNAME` | 初始管理员用户名 | `admin` |
| `ADMIN_PASSWORD` | 初始管理员密码（仅首次创建生效） | `admin123` |

## ☁️ 部署到 Railway

1. Fork 或推送本仓库到 GitHub
2. 在 [Railway](https://railway.app) 新建项目并选择该仓库
3. 添加一个 **Volume**，挂载路径设为 `/data`，并设置环境变量 `DATA_PATH=/data`
4. （推荐）设置 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 环境变量
5. 部署完成，Railway 会自动注入 `PORT`

## 📡 API 一览

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|:----:|------|
| POST | `/api/login` | — | 登录，返回 Token |
| POST | `/api/logout` | ✅ | 登出并吊销 Token |
| POST | `/api/change-password` | ✅ | 修改密码 |
| POST | `/api/reset-settings` | ✅ | 重置所有设置 |
| GET | `/api/health` | — | 健康检查 |
| GET / POST | `/api/notes` | GET 公开 | 笔记列表 / 新建 |
| DELETE | `/api/notes/:id` | ✅ | 删除笔记 |
| GET / POST | `/api/posts` | POST 需鉴权 | 文章列表 / 发布 |
| GET / PUT / DELETE | `/api/posts/:id` | 写操作需鉴权 | 文章详情 / 编辑 / 删除 |
| POST | `/api/posts/:id/view` | — | 浏览量 +1 |
| POST | `/api/posts/:id/like` | — | 点赞 +1 |
| GET / PUT | `/api/site-info` | PUT 需鉴权 | 网站信息 |
| GET / PUT | `/api/quotes` | PUT 需鉴权 | 激励语录 |
| GET / PUT | `/api/about` | PUT 需鉴权 | 关于内容 |
| GET / PUT | `/api/interests` | PUT 需鉴权 | 兴趣爱好 |
| GET / PUT | `/api/contact` | PUT 需鉴权 | 联系方式 |
| GET / PUT | `/api/carousel-images` | PUT 需鉴权 | 轮播图 |

> 鉴权方式：登录后携带请求头 `Authorization: Bearer <token>`

## 📁 目录结构

```
my-json-notes/
├── server.js              # Express 后端（API + 鉴权 + 数据存取）
├── data.json              # JSON 数据文件（首次运行自动生成）
├── package.json
└── public/
    ├── index.html         # 主页
    ├── about.html         # 关于
    ├── blog.html          # 动态
    ├── admin.html         # 登录
    ├── dashboard.html     # 后台 · 发布/编辑文章
    ├── posts.html         # 后台 · 文章管理
    ├── settings.html      # 后台 · 设置
    ├── 404.html           # 友好 404 页面
    ├── css/style.css      # 全站样式 + 动效层
    ├── js/main.js         # 前端逻辑 + 动效引擎
    └── img/               # 轮播图片
```

## 🛠️ 技术栈

- **后端**：Node.js、Express 4、原生 `fs` JSON 存储（零数据库依赖）
- **前端**：原生 HTML / CSS / JavaScript，Font Awesome 6 图标
- **安全**：scrypt 密码哈希、Bearer Token 会话、登录限流、HTML 转义

## 📄 License

[ISC](https://opensource.org/licenses/ISC)

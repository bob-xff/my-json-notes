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
- 📖 **动态页**：文章列表，点击卡片打开**阅读弹窗**，支持**点赞**（每篇文章每浏览器限一次，带爆心动画）、**浏览量统计** 与 **评论**（游客可评论，管理员可在弹窗中删除）
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
| 评论防刷 | 同一 IP 两次评论至少间隔 5 秒，每小时最多 30 条；昵称/内容长度校验 |
| XSS 防护 | 所有动态内容渲染前 HTML 转义，正文以纯文本渲染 |
| 数据自愈 | `data.json` 损坏时自动备份并重建，网站不会 500 |
| 原子写入 | 先写临时文件再重命名，避免写入中断损坏数据 |
| 默认密码告警 | 服务器启动时检测到默认密码 `admin123` 会在控制台醒目告警 |

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

支持 `.env` 文件配置（零依赖，服务器启动时自动读取；系统环境变量优先）：

```bash
cp .env.example .env   # 然后编辑 .env，设置强密码
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务监听端口（Railway 等平台自动注入） | `3000` |
| `DATA_PATH` | 数据文件存放目录（Railway Volume 持久化用） | 项目根目录 |
| `ADMIN_USERNAME` | 初始管理员用户名（仅首次创建 data.json 时生效） | `admin` |
| `ADMIN_PASSWORD` | 初始管理员密码（仅首次创建 data.json 时生效） | `admin123` |

> ⚠️ **部署前务必设置强密码**：可运行 `node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))"` 生成。
> `ADMIN_PASSWORD` 只在 data.json 尚无管理员凭据时生效；之后改密码请用后台「安全设置」。

## ☁️ 部署方案（发布到互联网）

### 方案 A：Railway（推荐，5 分钟上线，零运维）

代码已原生支持 Railway 的 Volume 持久化，步骤：

1. 把本仓库推送到你的 GitHub（已就绪）
2. 打开 [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → 选择 `my-json-notes`
3. Railway 会自动识别 `npm start` 并部署
4. **添加持久化存储**（重要，否则每次重新部署文章/评论都会丢失）：
   - 项目里右键 → **Volume**，挂载到服务，挂载路径填 `/data`
   - 在服务的 **Variables** 中添加 `DATA_PATH=/data`
5. 设置环境变量：
   - `ADMIN_USERNAME=admin`
   - `ADMIN_PASSWORD=<你的强密码>`
6. **Settings → Networking → Generate Domain** 生成 `xxx.up.railway.app` 公网地址（也可绑定自己的域名）
7. 部署完成后访问 `https://xxx.up.railway.app/admin.html` 登录后台发文章

### 方案 B：腾讯云 / 阿里云轻量服务器（国内访问最快）

适合已有云服务器或需要自定义域名+备案的场景：

```bash
# 服务器上（Ubuntu 为例）
git clone https://github.com/bob-xff/my-json-notes.git
cd my-json-notes && npm install
npm i -g pm2
echo "ADMIN_PASSWORD=你的强密码" > .env
pm2 start server.js --name my-site && pm2 save && pm2 startup
```

再用 Nginx 反向代理 3000 端口并配置 HTTPS（certbot 免费证书）：

```nginx
server {
    server_name yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

> 国内服务器绑定域名需要 ICP 备案；数据在服务器本地 `data.json`，记得定期备份。

### 方案 C：Render / Zeabur 等其它 PaaS

- **Zeabur**：对国内网络较友好，同样支持从 GitHub 部署，建议挂持久盘并设 `DATA_PATH`
- **Render 免费版**：可以跑但有两个硬伤——15 分钟无访问会休眠、**免费档无持久磁盘**（重启丢数据），只适合临时演示，不建议存正式文章

**总结**：想省事选 **Railway（方案 A）**；要国内快选 **轻量服务器（方案 B）**。无论哪种，都请先设 `ADMIN_PASSWORD`！

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
| GET | `/api/posts/:id/comments` | — | 评论列表 |
| POST | `/api/posts/:id/comments` | — | 发表评论（防刷限流） |
| DELETE | `/api/posts/:id/comments/:commentId` | ✅ | 删除评论（管理员） |
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

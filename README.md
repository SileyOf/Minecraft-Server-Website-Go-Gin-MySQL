# 🏰 HXZD — Minecraft 服务器官网

<p align="center">
  <strong>SAO (刀剑神域) 风格的 Minecraft 服务器门户网站</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Go-1.24-00ADD8?logo=go&logoColor=white" alt="Go">
  <img src="https://img.shields.io/badge/Gin-Framework-00ADD8?logo=go" alt="Gin">
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white" alt="MySQL">
  <img src="https://img.shields.io/badge/Frontend-Vanilla_JS-F7DF1E?logo=javascript" alt="JavaScript">
</p>

---

## ✨ 功能特性

- 🎨 **SAO 主题 UI** — 深蓝暗色调 + 金色 accent，动态粒子背景
- 🖥️ **多服务器状态** — 通过 [mcsrvstat.us](https://api.mcsrvstat.us/) API 自动查询，多服务器轮播展示
- 📢 **公告系统** — 支持富文本、置顶公告（📌 金色高亮）
- 💬 **微论坛** — 发帖、评论、编辑、置顶
- 🗺️ **世界地图** — 嵌入 BlueMap / Dynmap 等地图，支持多地图折叠
- ⚙️ **管理面板** — 全功能后台：公告/页面/服务器/地图/用户/设置管理
- 🔐 **JWT 认证** — 注册、登录、管理员权限控制
- 🖼️ **自定义外观** — 后台设置背景图、Favicon、页脚、标题
- 📱 **响应式** — 适配桌面和移动设备

## 📁 项目结构

```
HXZD/
├── index.html              # 首页（Hero + MOTD + 服务器信息 + 公告）
├── gameplay.html            # 玩法介绍
├── map.html                 # 世界地图（嵌入式）
├── announcements.html       # 公告列表
├── forum.html               # 微论坛
├── about.html               # 关于页面
├── status.html              # 服务器状态（嵌入监控）
├── sponsor.html             # 赞助页面
├── login.html               # 登录/注册
├── admin.html               # 管理面板
├── css/
│   ├── style.css            # 主样式
│   ├── sao-buttons.css      # SAO 风格按钮/导航
│   └── admin.css            # 管理面板样式
├── js/
│   ├── common.js            # 公共工具（认证、导航、背景）
│   ├── main.js              # 首页逻辑
│   ├── admin.js             # 管理面板逻辑
│   ├── auth.js              # 登录/注册
│   ├── forum.js             # 论坛逻辑
│   ├── status.js            # 状态页逻辑
│   └── particles.js         # 粒子动画
├── backend/
│   ├── main.go              # 入口
│   ├── .env.example         # 环境变量模板
│   ├── config/config.go     # 配置加载
│   ├── database/database.go # 数据库初始化 & Seed
│   ├── models/models.go     # 数据模型
│   ├── handlers/            # API 处理器
│   │   ├── announcement.go
│   │   ├── auth.go
│   │   ├── forum.go
│   │   ├── page.go
│   │   ├── server_status.go
│   │   ├── settings.go
│   │   ├── user.go
│   │   └── world_map.go
│   ├── middleware/auth.go   # JWT 中间件
│   ├── routes/routes.go     # 路由注册
│   └── utils/jwt.go         # JWT 工具
└── Makefile
```

## 🚀 快速开始

### 环境要求

- **Go** 1.24+
- **MySQL** 8.0+
- **Git**

### 1. 克隆项目

```bash
git clone https://github.com/YOUR_USERNAME/HXZD.git
cd HXZD
```

### 2. 配置数据库

```bash
cp backend/.env.example backend/.env
# 编辑 .env 填入你的 MySQL 连接信息
```

### 3. 安装依赖 & 启动

```bash
# 安装 Go 依赖
make deps

# 开发模式启动
make dev
```

访问 `http://localhost:8080` 即可。

默认管理员账号：`admin` / `admin123`（请登录后立即修改密码）

### 4. 生产构建

```bash
# 构建 Linux amd64 二进制
make build

# 或手动交叉编译
cd backend
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o hxzd-server .
```

## 🌐 部署指南

### 服务器部署

1. 上传 `dist/` 目录内容（或所有 HTML/CSS/JS + 后端二进制）到服务器
2. 配置 `.env` 文件
3. 启动后端：

```bash
chmod +x hxzd-server
nohup ./hxzd-server > hxzd.log 2>&1 &
```

### Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📡 API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/settings` | 公开设置 |
| `GET` | `/api/server-status` | 所有服务器状态 |
| `GET` | `/api/announcements` | 公告列表 |
| `GET` | `/api/forum/posts` | 论坛帖子 |
| `GET` | `/api/world-maps` | 世界地图列表 |
| `GET` | `/api/pages/:slug` | 自定义页面 |
| `POST` | `/api/auth/login` | 登录 |
| `POST` | `/api/auth/register` | 注册 |
| `*` | `/api/admin/*` | 管理接口（需 Admin JWT） |

## 🛠️ 技术栈

- **后端**: Go 1.24 / Gin / GORM / MySQL
- **前端**: 原生 HTML / CSS / JavaScript（零框架依赖）
- **认证**: JWT (HS256, 72h 有效期)
- **服务器查询**: mcsrvstat.us API v3（60 秒缓存轮询）
- **数据库**: MySQL 8.0（支持 Aliyun RDS / 本地）

## 📄 License

MIT License

---

<p align="center">⚔️ Built with SAO spirit ⚔️</p>

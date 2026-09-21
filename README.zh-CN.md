# 万图 Wan Pictures

一个简洁的图床与媒体资产管理系统，支持图片上传、相册、标签、用户权限，以及本地、S3 和 WebDAV 存储。

[English documentation](README.md)

## 功能

- 图片上传、预览、缩略图和外链
- 相册与标签管理
- 用户注册、登录和角色权限
- 本地、S3、WebDAV 存储
- 管理后台
- 支持 SQLite、MySQL 和 PostgreSQL

## 技术栈

- 前端：React 19、TypeScript、Vite
- 后端：Go、Gin、GORM
- 认证：JWT、bcrypt
- 缓存与队列：Redis
- 缩略图：libvips

## 快速开始

### 前端

需要 Node.js 20+：

```bash
npm install
npm run dev
```

前端默认运行在 `http://localhost:3000`。

### 后端

需要 Go 1.27+、Redis 和 libvips：

```bash
cd backend
go mod download
go run ./cmd/server
```

后端默认运行在 `http://localhost:8080`。在 Ubuntu/Debian 上安装缩略图依赖：

```bash
sudo apt-get install -y libvips-dev librsvg2-dev
```

复制 `.env.example` 为 `.env`，按需修改数据库、JWT 和管理员账号配置。生产环境请务必修改 `JWT_SECRET` 和 `ADMIN_PASSWORD`。

## Docker

项目提供了包含前端、后端、Nginx 和 Redis 的单容器部署方式：

```bash
docker build -t wan-pictures .
docker run -d \
  --name wan-pictures \
  -p 8080:80 \
  -v wan-pictures-data:/app/data \
  -e JWT_SECRET='change-this-secret' \
  -e ADMIN_PASSWORD='change-this-password' \
  wan-pictures
```

访问 `http://localhost:8080`。数据库和上传文件保存在 `/app/data` 卷中。

## 常用命令

```bash
npm run build   # 构建前端
npm run lint    # 类型检查
cd backend && go test ./...  # 运行后端测试
```

## 许可证

本项目采用 [MIT 许可证](LICENSE) 开源。
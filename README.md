# Wan Pictures

A lightweight image hosting and media asset management system with uploads, albums, tags, user roles, and local, S3, or WebDAV storage.

[中文文档](README.zh-CN.md)

## Features

- Image uploads, previews, thumbnails, and shareable links
- Album and tag management
- User registration, login, and role-based access
- Local, S3, and WebDAV storage
- Admin dashboard
- SQLite, MySQL, and PostgreSQL support

## Stack

- Frontend: React 19, TypeScript, Vite
- Backend: Go, Gin, GORM
- Authentication: JWT, bcrypt
- Cache and queue: Redis
- Thumbnail processing: libvips

## Quick Start

### Frontend

Requires Node.js 20+:

```bash
npm install
npm run dev
```

The frontend runs at `http://localhost:3000` by default.

### Backend

Requires Go 1.27+, Redis, and libvips:

```bash
cd backend
go mod download
go run ./cmd/server
```

The backend runs at `http://localhost:8080` by default. On Ubuntu/Debian, install the thumbnail dependencies with:

```bash
sudo apt-get install -y libvips-dev librsvg2-dev
```

Copy `.env.example` to `.env` and adjust the database, JWT, and admin settings. Change `JWT_SECRET` and `ADMIN_PASSWORD` before deploying to production.

## Docker

The included image packages the frontend, backend, Nginx, and Redis:

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

Visit `http://localhost:8080`. The database and uploaded files are stored in the `/app/data` volume.

## Commands

```bash
npm run build   # Build frontend
npm run lint    # Type check
cd backend && go test ./...  # Run backend tests
```

## License

This project is licensed under the [MIT License](LICENSE).
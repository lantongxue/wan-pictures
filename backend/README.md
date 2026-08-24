# 万图 (Wan Pictures) 后端系统 (Golang + Gin + GORM)

现代化图床与资产管理系统的高性能 Go 后端服务，基于 **Gin Web 框架**、**GORM ORM** 以及 **JWT + Bcrypt 安全认证体系** 构建。

---

## 🛠 技术栈

- **Web 框架**: [Gin](https://github.com/gin-gonic/gin) (高性能 HTTP 微框架，内置中间件支持)
- **ORM 数据层**: [GORM](https://gorm.io/) (支持 SQLite、MySQL、PostgreSQL 自动迁移与连接池优化)
- **安全与认证**: [golang-jwt/jwt/v5](https://github.com/golang-jwt/jwt) + [golang.org/x/crypto/bcrypt](https://pkg.go.dev/golang.org/x/crypto/bcrypt)
- **跨域中间件**: [gin-contrib/cors](https://github.com/gin-contrib/cors)

---

## 📁 目录结构

```text
backend/
├── cmd/
│   └── server/
│       └── main.go              # 后端主入口与服务优雅停机
├── config/
│   └── config.go                # 环境变量配置加载与默认参数
├── controllers/
│   └── auth_controller.go       # 认证控制器 (注册、登录、个人信息获取与修改、改密)
├── database/
│   └── database.go              # GORM 数据库连接初始化与自动迁移 (AutoMigrate)
├── middleware/
│   ├── cors.go                  # 全局跨域处理中间件
│   └── jwt_auth.go              # JWT 鉴权中间件与角色拦截
├── models/
│   ├── user.go                  # GORM 数据表实体结构 (User)
│   └── dto.go                   # 请求传输对象 (DTO) 与标准统一响应 (APIResponse)
├── utils/
│   ├── jwt.go                   # JWT 令牌签发与解析校验
│   └── password.go              # Bcrypt 密码安全哈希与比对
├── go.mod                       # Go 模块依赖定义
└── .env.example                 # 环境变量模版
```

---

## 🚀 快速启动

### 1. 检查 Go 环境
需要 Go 1.22 及以上版本：
```bash
go version
```

### 2. 下载依赖
```bash
cd backend
go mod download
# 或者整理依赖
go mod tidy
```

### 3. 运行服务
```bash
# 默认使用 SQLite 数据库，监听 8080 端口
go run cmd/server/main.go
```

---

## 🔌 核心 API 接口文档

统一响应格式：
```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

### 1. 用户注册
- **请求地址**: `POST /api/v1/auth/register`
- **请求体**:
```json
{
  "username": "alex_designer",
  "email": "alex@example.com",
  "password": "Password123",
  "nickname": "Alex Pro",
  "avatar": "https://api.dicebear.com/7.x/identicon/svg?seed=alex"
}
```
- **返回响应**:
```json
{
  "code": 201,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 259200,
    "user": {
      "id": 1,
      "username": "alex_designer",
      "email": "alex@example.com",
      "nickname": "Alex Pro",
      "avatar": "https://api.dicebear.com/7.x/identicon/svg?seed=alex",
      "role": "user",
      "created_at": "2026-08-23T21:00:00Z"
    }
  }
}
```

### 2. 用户登录
- **请求地址**: `POST /api/v1/auth/login`
- **请求体**: (支持用户名或邮箱登录)
```json
{
  "account": "alex@example.com",
  "password": "Password123"
}
```
- **返回响应**:
```json
{
  "code": 200,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 259200,
    "user": {
      "id": 1,
      "username": "alex_designer",
      "email": "alex@example.com",
      "nickname": "Alex Pro",
      "avatar": "https://api.dicebear.com/7.x/identicon/svg?seed=alex",
      "role": "user"
    }
  }
}
```

### 3. 获取当前登录用户信息 (需要携带 Token)
- **请求地址**: `GET /api/v1/auth/me`
- **请求头**: `Authorization: Bearer <token>`

### 4. 修改个人资料
- **请求地址**: `PUT /api/v1/auth/profile`
- **请求头**: `Authorization: Bearer <token>`
- **请求体**:
```json
{
  "nickname": "Alex Master",
  "avatar": "https://api.dicebear.com/7.x/identicon/svg?seed=alex_master",
  "bio": "Senior Visual Creator & Photography Enthusiast"
}
```

### 5. 修改密码
- **请求地址**: `POST /api/v1/auth/password`
- **请求头**: `Authorization: Bearer <token>`
- **请求体**:
```json
{
  "old_password": "Password123",
  "new_password": "NewSecretPassword456"
}
```

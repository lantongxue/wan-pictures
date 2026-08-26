export type ImageFormat =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/gif'
  | 'image/svg+xml'
  | 'image/avif'
  | 'image/bmp'
  | 'image/x-icon'
  | string;

export type LinkFormatType = 'raw' | 'markdown' | 'html' | 'bbcode' | 'markdown_link';

export interface ImageItem {
  id: string;
  name: string;
  originalName: string;
  size: number; // in bytes
  type: string; // mime type
  extension: string;
  width: number;
  height: number;
  aspectRatio: number;
  dataUrl: string; // Base64 or Blob URL for rendering
  url?: string; // Public external URL
  createdAt: number;
  updatedAt: number;
  albumId: string;
  tags: string[];
  favorite?: boolean;
  colorPalette?: string[];
  compressed?: boolean;
  originalSize?: number;
  storageDriver?: 'local' | 'webdav' | 's3' | string;
}

export interface Album {
  id: string;
  name: string;
  description?: string;
  color: string;
  coverImageId?: string;
  coverImageUrl?: string;
  createdAt: number;
  isDefault?: boolean;
  imageCount?: number;
  totalSize?: number;
}

export interface TagItem {
  id: number | string;
  name: string;
  color: string;
  description?: string;
  imageCount: number;
  createdAt?: string | number;
}

export type StorageDriverType = 'local' | 'webdav' | 's3';

export interface LocalStorageConfig {
  storagePath: string;
  pathPrefix?: string;
  subfolderFormat?: string;
  maxSizeMB?: number;
  retentionDays?: number;
  autoCleanEnabled?: boolean;
  publicUrlPrefix?: string;
}

export interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  customDomain?: string;
  pathPrefix?: string;
  forcePathStyle?: boolean;
  acl?: string;
}

export interface WebDAVConfig {
  serverUrl: string;
  username: string;
  password: string;
  rootPath: string;
  publicProxy?: string;
}

export interface StorageConfigItem {
  id: number;
  driver: StorageDriverType;
  name: string;
  isEnabled?: boolean;
  isActive: boolean;
  config: LocalStorageConfig | S3Config | WebDAVConfig | Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface StorageTestResult {
  success: boolean;
  driver: StorageDriverType;
  latencyMs?: number;
  statusCode?: number;
  message: string;
  diagnostics?: string;
  bucket?: string;
  region?: string;
  serverUrl?: string;
  rootPath?: string;
  storagePath?: string;
  previewSamplePath?: string;
}

export interface UploadQuotaSettings {
  allow_anonymous: boolean;
  anonymous_daily_limit: number;
  anonymous_max_size_mb: number;
  free_user_daily_limit: number;
  free_user_max_size_mb: number;
  vip_daily_limit: number;
  vip_max_size_mb: number;
  anonymous_upload_qps?: number; // 匿名上传 QPS（Redis 滑动窗口），0 表示不限流
  user_upload_qps?: number;      // 登录用户上传 QPS（Redis 滑动窗口），0 表示不限流
  anonymous_upload_rpm?: number; // 匿名上传 RPM（每分钟滑动窗口），0 表示不限流
  user_upload_rpm?: number;      // 登录用户上传 RPM（每分钟滑动窗口），0 表示不限流
  naming_rule: 'uuid' | 'original' | 'timestamp' | 'random' | 'custom';
  custom_prefix?: string;
  auto_compress?: boolean;
  compress_quality?: number;
  convert_to_webp?: boolean;
}

export interface UploadQuotaInfo {
  role: 'anonymous' | 'user' | 'vip' | 'admin' | string;
  daily_limit: number;
  today_used: number;
  remaining_today: number;
  single_max_size_mb: number;
  single_max_size_bytes: number;
  allow_anonymous: boolean;
  naming_rule: string;
}

export interface AdminOverviewStats {
  totalImages: number;
  totalAlbums: number;
  totalTags: number;
  totalUsers: number;
  totalSize: number;
  activeStorage: StorageDriverType;
  storageUsage: {
    local: number;
    s3: number;
    webdav: number;
    [key: string]: number;
  };
  formatStats: Record<string, number>;
  recentActivity: ImageItem[];
}

export interface UploadQueueItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  isInstant?: boolean;
  error?: string;
  resultItem?: ImageItem;
  width?: number;
  height?: number;
}

export type ViewMode = 'masonry' | 'grid' | 'list';

export type SortOption =
  | 'date-desc'
  | 'date-asc'
  | 'size-desc'
  | 'size-asc'
  | 'name-asc'
  | 'name-desc'
  | 'dimension-desc';

export type AspectRatioFilter = 'all' | 'landscape' | 'portrait' | 'square';

export interface FilterOptions {
  albumId: string; // 'all' | 'unassigned' | albumId
  searchQuery: string;
  formatFilter: string; // 'all' | 'png' | 'jpeg' | 'webp' | 'svg' | 'gif'
  favoritesOnly: boolean;
  sortBy: SortOption;
  viewMode: ViewMode;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  aspectRatioFilter?: AspectRatioFilter;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description?: string;
  duration?: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  nickname: string;
  avatar: string;
  role: 'user' | 'admin' | 'vip' | string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
  imageCount?: number;
  albumCount?: number;
}

export interface AdminUserItem extends User {
  imageCount?: number;
  albumCount?: number;
  uploadQps?: number | null; // null=跟随全局, 0=不限流, >0=自定义 QPS
  uploadRpm?: number | null; // null=跟随全局, 0=不限流, >0=自定义 RPM
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  nickname?: string;
  avatar?: string;
  role?: 'user' | 'admin' | 'vip';
  bio?: string;
  uploadQps?: number | null;
  uploadRpm?: number | null;
}

export interface UpdateUserPayload {
  email?: string;
  nickname?: string;
  avatar?: string;
  role?: 'user' | 'admin' | 'vip';
  bio?: string;
  password?: string;
  uploadQps?: number | null;
  uploadRpm?: number | null;
}

export interface ResetUserPasswordPayload {
  newPassword: string;
}

export interface AuthResponse {
  token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  nickname?: string;
  avatar?: string;
}

export interface LoginPayload {
  account: string;
  password: string;
}

export interface UpdateProfilePayload {
  nickname?: string;
  avatar?: string;
  bio?: string;
}


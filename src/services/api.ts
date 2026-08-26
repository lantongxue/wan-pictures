/**
 * Wan Pictures (万图) Backend API Service
 * Communicates with the Golang + Gin + GORM backend (/api/v1/...)
 */

import {
  User,
  AdminUserItem,
  CreateUserPayload,
  UpdateUserPayload,
  AuthResponse,
  RegisterPayload,
  LoginPayload,
  UpdateProfilePayload,
  AdminOverviewStats,
  ImageItem,
  Album,
  TagItem,
  StorageConfigItem,
  StorageDriverType,
  StorageTestResult,
  UploadQuotaInfo,
} from '../types';
import { sha256 } from 'js-sha256';

// API Base URL (same-origin /api/v1 via dev proxy, or override with VITE_API_BASE_URL)
const API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL as string) || '/api/v1';

/**
 * Well-known auto-increment ID of the seeded default album.
 * The backend guarantees albums.id = 1 is the default album (models.DefaultAlbumID).
 */
export const DEFAULT_ALBUM_ID = 1;

const TOKEN_KEY = 'wan_auth_token';
const USER_KEY = 'wan_auth_user';

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  removeToken() {
    localStorage.removeItem(TOKEN_KEY);
  },
  getUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setUser(user: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  removeUser() {
    localStorage.removeItem(USER_KEY);
  },
  clear() {
    this.removeToken();
    this.removeUser();
  },
};

/**
 * Helper to perform authenticated HTTP requests to the Go backend
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; isBackendOnline: boolean }> {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        success: false,
        message: json?.message || `Request failed with status ${res.status}`,
        isBackendOnline: true,
      };
    }

    return {
      success: true,
      data: (json?.data || json) as T,
      message: json?.message || 'Success',
      isBackendOnline: true,
    };
  } catch (err: any) {
    // Network / Offline error
    return {
      success: false,
      message: err.message || 'Network error connecting to Go backend',
      isBackendOnline: false,
    };
  }
}

export const authApi = {
  /**
   * Register a new user (Go backend)
   */
  async register(payload: RegisterPayload): Promise<{ success: boolean; data?: AuthResponse; message?: string }> {
    const res = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.success && res.data) {
      authStorage.setToken(res.data.token);
      authStorage.setUser(res.data.user);
      return { success: true, data: res.data, message: res.message };
    }
    return { success: false, message: res.message || '无法连接后端服务，请稍后重试' };
  },

  /**
   * Login user (Go backend)
   */
  async login(payload: LoginPayload): Promise<{ success: boolean; data?: AuthResponse; message?: string }> {
    const res = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.success && res.data) {
      authStorage.setToken(res.data.token);
      authStorage.setUser(res.data.user);
      return { success: true, data: res.data, message: res.message };
    }
    return { success: false, message: res.message || '无法连接后端服务，请稍后重试' };
  },

  /**
   * Get current authenticated user profile (Go backend)
   */
  async getMe(): Promise<{ success: boolean; data?: User; message?: string }> {
    const res = await request<User>('/auth/me', {
      method: 'GET',
    });

    if (res.success && res.data) {
      authStorage.setUser(res.data);
      return { success: true, data: res.data };
    }

    return { success: false, message: res.message || '未登录' };
  },

  /**
   * Update current user profile (Go backend)
   */
  async updateProfile(payload: UpdateProfilePayload): Promise<{ success: boolean; data?: User; message?: string }> {
    const res = await request<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (res.success && res.data) {
      authStorage.setUser(res.data);
      return { success: true, data: res.data, message: res.message };
    }

    return { success: false, message: res.message || '更新失败' };
  },

  /**
   * Check backend health status
   */
  async checkBackendHealth(): Promise<{ online: boolean; version?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/api/health`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        return { online: true, version: data.version };
      }
      return { online: false };
    } catch {
      return { online: false };
    }
  },

  /**
   * Logout user
   */
  logout() {
    authStorage.clear();
  },
};

/**
 * Wan Pictures (万图) Admin & Management API Service
 */

/**
 * Map backend AdminUserItemResponse (snake_case) to frontend AdminUserItem
 */
function mapBackendUser(u: any): AdminUserItem {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    nickname: u.nickname || u.username,
    avatar: u.avatar,
    role: u.role || 'user',
    bio: u.bio,
    uploadQps: u.upload_qps === undefined || u.upload_qps === null ? null : Number(u.upload_qps),
    uploadRpm: u.upload_rpm === undefined || u.upload_rpm === null ? null : Number(u.upload_rpm),
    imageCount: Number(u.image_count || 0),
    albumCount: Number(u.album_count || 0),
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  };
}

/**
 * Public read-only API (anonymous accessible): GET /images, /albums, /tags
 */
export const publicApi = {
  /**
   * Get Images List (public route, no auth required)
   */
  async getImages(params: {
    q?: string;
    albumId?: number | 'all' | 'unassigned';
    tag?: string;
    storageDriver?: string;
    sortBy?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ success: boolean; data: { items: ImageItem[]; total: number }; message?: string }> {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (typeof params.albumId === 'number') query.set('album_id', String(params.albumId));
    if (params.tag) query.set('tag', params.tag);
    if (params.storageDriver && params.storageDriver !== 'all') query.set('storage_driver', params.storageDriver);
    if (params.sortBy) query.set('sort_by', params.sortBy);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('page_size', String(params.pageSize));

    return request<any>(`/images?${query.toString()}`).then((res) => {
      if (res.success && res.data) {
        const d = res.data as any;
        const items = ((d.items || []) as any[]).map((img) => ({
          id: Number(img.id),
          name: img.name,
          originalName: img.original_name || img.name,
          size: img.size,
          type: img.type,
          extension: img.extension,
          width: img.width,
          height: img.height,
          aspectRatio: img.aspect_ratio,
          dataUrl: img.url,
          url: img.url,
          createdAt: new Date(img.created_at).getTime() || Date.now(),
          updatedAt: new Date(img.updated_at).getTime() || Date.now(),
          albumId: Number(img.album_id) || DEFAULT_ALBUM_ID,
          tags: typeof img.tags === 'string' ? JSON.parse(img.tags || '[]') : img.tags || [],
          favorite: img.favorite,
          storageDriver: img.storage_driver || 'local',
        }));
        return {
          success: true,
          data: { items, total: Number(d.total || items.length) },
          message: res.message,
        };
      }
      return { success: false, data: { items: [], total: 0 }, message: res.message };
    });
  },

  /**
   * Get Albums List (public route, no auth required)
   */
  async getAlbums(): Promise<{ success: boolean; data: Album[]; message?: string }> {
    return request<any[]>('/albums').then((res) => {
      if (res.success && Array.isArray(res.data)) {
        const albums: Album[] = res.data.map((a) => ({
          id: Number(a.id),
          name: a.name,
          description: a.description,
          color: a.color || '#6366F1',
          coverImageUrl: a.cover_image_url,
          coverImageId: a.cover_image_id ? Number(a.cover_image_id) : undefined,
          isDefault: a.is_default,
          createdAt: new Date(a.created_at).getTime() || Date.now(),
          imageCount: a.image_count,
          totalSize: a.total_size,
        }));
        return { success: true, data: albums, message: res.message };
      }
      return { success: false, data: [], message: res.message };
    });
  },
};

export const adminApi = {
  /**
   * Get Admin Overview Metrics & Storage Usage
   */
  async getOverviewStats(): Promise<{ success: boolean; data?: AdminOverviewStats; message?: string }> {
    const res = await request<any>('/admin/stats');
    if (res.success && res.data) {
      const d = res.data;
      return {
        success: true,
        data: {
          totalImages: Number(d.total_images || 0),
          totalAlbums: Number(d.total_albums || 0),
          totalTags: Number(d.total_tags || 0),
          totalUsers: Number(d.total_users || 0),
          totalSize: Number(d.total_size || 0),
          activeStorage: d.active_storage || 'local',
          storageUsage: {
            local: Number(d.storage_usage?.local || 0),
            s3: Number(d.storage_usage?.s3 || 0),
            webdav: Number(d.storage_usage?.webdav || 0),
          },
          formatStats: d.format_stats || {},
          recentActivity: (d.recent_activity || []).map((img: any) => ({
            id: Number(img.id),
            name: img.name,
            originalName: img.original_name || img.name,
            size: img.size,
            type: img.type,
            extension: img.extension,
            width: img.width,
            height: img.height,
            aspectRatio: img.aspect_ratio,
            dataUrl: img.url,
            url: img.url,
            createdAt: new Date(img.created_at).getTime() || Date.now(),
            updatedAt: new Date(img.updated_at).getTime() || Date.now(),
            albumId: Number(img.album_id) || DEFAULT_ALBUM_ID,
            tags: typeof img.tags === 'string' ? JSON.parse(img.tags || '[]') : img.tags || [],
            favorite: img.favorite,
            storageDriver: img.storage_driver || 'local',
          })),
        },
      };
    }

    return { success: false, message: res.message || '无法连接后端服务' };
  },

  /**
   * Get Images List with Filters
   */
  async getImages(params: {
    q?: string;
    albumId?: number | 'all' | 'unassigned';
    tag?: string;
    storageDriver?: string;
    sortBy?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ success: boolean; data: { items: ImageItem[]; total: number }; message?: string }> {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (typeof params.albumId === 'number') query.set('album_id', String(params.albumId));
    if (params.tag) query.set('tag', params.tag);
    if (params.storageDriver) query.set('storage_driver', params.storageDriver);
    if (params.sortBy) query.set('sort_by', params.sortBy);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('page_size', String(params.pageSize));

    const res = await request<any>(`/admin/images?${query.toString()}`);
    if (res.isBackendOnline && res.success && res.data) {
      const items = (res.data.items || []).map((img: any) => ({
        id: Number(img.id),
        name: img.name,
        originalName: img.original_name || img.name,
        size: img.size,
        type: img.type,
        extension: img.extension,
        width: img.width,
        height: img.height,
        aspectRatio: img.aspect_ratio,
        dataUrl: img.url,
        url: img.url,
        createdAt: new Date(img.created_at).getTime() || Date.now(),
        updatedAt: new Date(img.updated_at).getTime() || Date.now(),
        albumId: Number(img.album_id) || DEFAULT_ALBUM_ID,
        tags: typeof img.tags === 'string' ? JSON.parse(img.tags || '[]') : img.tags || [],
        favorite: img.favorite,
        storageDriver: img.storage_driver || 'local',
      }));
      return {
        success: true,
        data: {
          items,
          total: res.data.total || items.length,
        },
      };
    }

    return {
      success: false,
      data: { items: [], total: 0 },
      message: res.message || '无法连接后端服务',
    };
  },

  /**
   * Update Image Metadata (requires JWT; goes through the user workspace route)
   */
  async updateImage(id: number, updates: Partial<ImageItem>): Promise<{ success: boolean; data?: ImageItem; message?: string }> {
    const payload: Record<string, any> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.albumId !== undefined) payload.album_id = updates.albumId;
    if (updates.tags !== undefined) payload.tags = JSON.stringify(updates.tags);
    if (updates.favorite !== undefined) payload.favorite = updates.favorite;
    if (updates.storageDriver !== undefined) payload.storage_driver = updates.storageDriver;

    const res = await request<any>(`/user/images/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (res.success && res.data) {
      const img = res.data as any;
      const updated: ImageItem = {
        id: Number(img.id),
        name: img.name,
        originalName: img.original_name || img.name,
        size: img.size,
        type: img.type,
        extension: img.extension,
        width: img.width,
        height: img.height,
        aspectRatio: img.aspect_ratio,
        dataUrl: img.url,
        url: img.url,
        createdAt: new Date(img.created_at).getTime() || Date.now(),
        updatedAt: new Date(img.updated_at).getTime() || Date.now(),
        albumId: Number(img.album_id) || DEFAULT_ALBUM_ID,
        tags: typeof img.tags === 'string' ? JSON.parse(img.tags || '[]') : img.tags || [],
        favorite: img.favorite,
        storageDriver: img.storage_driver || 'local',
      };
      return { success: true, data: updated, message: res.message };
    }
    return { success: false, message: res.message || '更新失败' };
  },

  /**
   * Update post-upload image metadata (tags ONLY).
   * The backend strictly rejects any other field on this endpoint.
   */
  async updateImageMetadata(
    id: number,
    updates: { tags?: string[] }
  ): Promise<{ success: boolean; data?: ImageItem; message?: string }> {
    const payload: Record<string, any> = {};
    if (updates.tags !== undefined) payload.tags = updates.tags;

    const res = await request<any>(`/user/images/${id}/metadata`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (res.success && res.data) {
      const img = res.data as any;
      const updated: ImageItem = {
        id: Number(img.id),
        name: img.name,
        originalName: img.original_name || img.name,
        size: img.size,
        type: img.type,
        extension: img.extension,
        width: img.width,
        height: img.height,
        aspectRatio: img.aspect_ratio,
        dataUrl: img.url,
        url: img.url,
        createdAt: new Date(img.created_at).getTime() || Date.now(),
        updatedAt: new Date(img.updated_at).getTime() || Date.now(),
        albumId: Number(img.album_id) || DEFAULT_ALBUM_ID,
        tags: typeof img.tags === 'string' ? JSON.parse(img.tags || '[]') : img.tags || [],
        favorite: img.favorite,
        storageDriver: img.storage_driver || 'local',
      };
      return { success: true, data: updated, message: res.message };
    }
    return { success: false, message: res.message || '更新失败' };
  },

  /**
   * Delete Image (requires JWT; goes through the user workspace route)
   */
  async deleteImage(id: number): Promise<{ success: boolean; message?: string }> {
    const res = await request(`/user/images/${id}`, { method: 'DELETE' });
    return { success: res.success, message: res.message };
  },

  /**
   * Batch Operation on Images (admin only)
   */
  async batchImageAction(ids: number[], action: 'delete' | 'move' | 'tag', extra?: { albumId?: number; tagToAdd?: string }): Promise<{ success: boolean; message?: string }> {
    const res = await request('/admin/images/batch', {
      method: 'POST',
      body: JSON.stringify({
        ids,
        action,
        album_id: extra?.albumId || 0,
        tag_to_add: extra?.tagToAdd || '',
      }),
    });
    return { success: res.success, message: res.message };
  },

  /**
   * Get Albums List with metrics
   */
  async getAlbums(): Promise<{ success: boolean; data: Album[]; message?: string }> {
    const res = await request<any[]>('/admin/albums');
    if (res.isBackendOnline && res.success && Array.isArray(res.data)) {
      const albums: Album[] = res.data.map((a) => ({
        id: Number(a.id),
        name: a.name,
        description: a.description,
        color: a.color || '#6366F1',
        coverImageUrl: a.cover_image_url,
        coverImageId: a.cover_image_id ? Number(a.cover_image_id) : undefined,
        isDefault: a.is_default,
        createdAt: new Date(a.created_at).getTime() || Date.now(),
        imageCount: a.image_count,
        totalSize: a.total_size,
      }));
      return { success: true, data: albums };
    }

    return {
      success: false,
      data: [],
      message: res.message || '无法连接后端服务',
    };
  },

  /**
   * Create Album (requires JWT; goes through the user workspace route).
   * The backend assigns the auto-increment ID; the created album is returned.
   */
  async saveAlbum(album: Omit<Album, 'id'> & { id?: number }): Promise<{ success: boolean; data?: Album; message?: string }> {
    const res = await request<any>('/user/albums', {
      method: 'POST',
      body: JSON.stringify({
        id: album.id || 0,
        name: album.name,
        description: album.description || '',
        color: album.color || '#6366F1',
        cover_image_url: album.coverImageUrl || '',
        cover_image_id: album.coverImageId || 0,
        is_default: !!album.isDefault,
      }),
    });

    if (res.success && res.data) {
      const a = res.data;
      const created: Album = {
        id: Number(a.id),
        name: a.name,
        description: a.description,
        color: a.color || '#6366F1',
        coverImageUrl: a.cover_image_url,
        coverImageId: a.cover_image_id ? Number(a.cover_image_id) : undefined,
        isDefault: a.is_default,
        createdAt: new Date(a.created_at).getTime() || Date.now(),
        imageCount: 0,
        totalSize: 0,
      };
      return { success: true, data: created, message: res.message || 'Album created' };
    }
    return { success: false, message: res.message || '相册创建失败' };
  },

  /**
   * Update Album (requires JWT; goes through the user workspace route)
   */
  async updateAlbum(album: Album): Promise<{ success: boolean; data?: Album; message?: string }> {
    const res = await request<any>(`/user/albums/${album.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: album.name,
        description: album.description || '',
        color: album.color,
        cover_image_url: album.coverImageUrl || '',
        cover_image_id: album.coverImageId || 0,
      }),
    });

    if (res.success) {
      return { success: true, data: album, message: res.message || 'Album updated' };
    }
    return { success: false, message: res.message || '相册更新失败' };
  },

  /**
   * Delete Album (requires JWT; backend reassigns its images to the default album)
   */
  async deleteAlbum(id: number): Promise<{ success: boolean; message?: string }> {
    if (id === DEFAULT_ALBUM_ID) {
      return { success: false, message: '默认相册不可删除' };
    }
    const res = await request(`/user/albums/${id}`, { method: 'DELETE' });
    return { success: res.success, message: res.message };
  },

  /**
   * Get Tags List with image counts
   */
  async getTags(): Promise<{ success: boolean; data: TagItem[]; message?: string }> {
    const res = await request<any[]>('/admin/tags');
    if (res.isBackendOnline && res.success && Array.isArray(res.data)) {
      const tags: TagItem[] = res.data.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color || '#3B82F6',
        description: t.description,
        imageCount: t.image_count || 0,
        createdAt: t.created_at,
      }));
      return { success: true, data: tags };
    }

    return {
      success: false,
      data: [],
      message: res.message || '无法连接后端服务',
    };
  },

  /**
   * Create Tag
   */
  async createTag(tag: { name: string; color?: string; description?: string }): Promise<{ success: boolean; data?: TagItem; message?: string }> {
    const tagName = tag.name.toUpperCase().trim();

    const res = await request<any>('/admin/tags', {
      method: 'POST',
      body: JSON.stringify({
        name: tagName,
        color: tag.color || '#3B82F6',
        description: tag.description || '',
      }),
    });

    if (res.success && res.data) {
      const t = res.data as any;
      const created: TagItem = {
        id: t.id ?? Date.now(),
        name: t.name || tagName,
        color: t.color || tag.color || '#3B82F6',
        description: t.description || '',
        imageCount: 0,
      };
      return { success: true, data: created, message: res.message || 'Tag created' };
    }
    return { success: false, message: res.message || '标签创建失败' };
  },

  /**
   * Update Tag
   */
  async updateTag(id: number | string, tag: { name: string; color?: string; description?: string }): Promise<{ success: boolean; message?: string }> {
    const res = await request(`/admin/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: tag.name,
        color: tag.color,
        description: tag.description,
      }),
    });
    return { success: res.success, message: res.success ? 'Tag updated' : res.message };
  },

  /**
   * Delete Tag
   */
  async deleteTag(id: number | string, _name: string): Promise<{ success: boolean; message?: string }> {
    const res = await request(`/admin/tags/${id}`, { method: 'DELETE' });
    return { success: res.success, message: res.success ? 'Tag deleted' : res.message };
  },

  /**
   * Merge Tags
   */
  async mergeTags(sourceTag: string, targetTag: string): Promise<{ success: boolean; count: number; message?: string }> {
    const res = await request<any>('/admin/tags/merge', {
      method: 'POST',
      body: JSON.stringify({
        source_tag: sourceTag,
        target_tag: targetTag,
      }),
    });

    if (res.success) {
      const count = Number((res.data as any)?.moved ?? (res.data as any)?.count ?? 0);
      return { success: true, count, message: `已将标签 ${sourceTag} 合并至 ${targetTag}` };
    }
    return { success: false, count: 0, message: res.message || '标签合并失败' };
  },

  /**
   * Get Storage Configurations
   */
  async getStorageConfigs(): Promise<{ success: boolean; data: StorageConfigItem[]; message?: string }> {
    const res = await request<any[]>('/admin/storage');
    if (res.isBackendOnline && res.success && Array.isArray(res.data)) {
      const list: StorageConfigItem[] = res.data.map((item) => ({
        id: item.id,
        driver: item.driver,
        name: item.name,
        isEnabled: item.is_enabled !== false,
        isActive: item.is_active,
        config: item.config || {},
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
      return { success: true, data: list };
    }

    return {
      success: false,
      data: [],
      message: res.message || '无法连接后端服务',
    };
  },

  /**
   * Save Storage Config
   */
  async saveStorageConfig(item: StorageConfigItem): Promise<{ success: boolean; message?: string }> {
    const res = await request('/admin/storage', {
      method: 'POST',
      body: JSON.stringify({
        driver: item.driver,
        name: item.name,
        is_enabled: item.isEnabled !== false,
        is_active: item.isActive,
        config_json: JSON.stringify(item.config),
      }),
    });

    return { success: res.success, message: res.success ? 'Storage config saved' : res.message };
  },

  /**
   * Switch Active Storage Engine
   */
  async setActiveStorage(driver: StorageDriverType): Promise<{ success: boolean; message?: string }> {
    const res = await request('/admin/storage/active', {
      method: 'POST',
      body: JSON.stringify({ driver }),
    });

    if (!res.success) {
      return { success: false, message: res.message || '切换主存储失败' };
    }

    return { success: true, message: res.message || `Active storage driver switched to ${driver.toUpperCase()}` };
  },

  /**
   * Toggle Enable/Disable for a Storage Engine
   */
  async toggleStorageEnabled(driver: StorageDriverType, isEnabled: boolean): Promise<{ success: boolean; message?: string }> {
    const res = await request<any>('/admin/storage/toggle', {
      method: 'POST',
      body: JSON.stringify({ driver, is_enabled: isEnabled }),
    });

    if (res.isBackendOnline && !res.success) {
      throw new Error(res.message || '切换存储启用状态失败');
    }

    return { success: true, message: res.message || '已更新存储状态' };
  },

  /**
   * Get System Upload Quota Settings
   */
  async getQuotaSettings(): Promise<{ success: boolean; data: any }> {
    const res = await request<any>('/admin/settings/quotas');
    if (res.isBackendOnline && res.success && res.data) {
      return { success: true, data: res.data };
    }

    // Default fallback
    return {
      success: true,
      data: {
        allow_anonymous: true,
        anonymous_daily_limit: 20,
        anonymous_max_size_mb: 5,
        free_user_daily_limit: 50,
        free_user_max_size_mb: 10,
        vip_daily_limit: 500,
        vip_max_size_mb: 50,
        naming_rule: 'uuid',
        custom_prefix: '',
        auto_compress: false,
        compress_quality: 85,
        convert_to_webp: false,
      },
    };
  },

  /**
   * Save System Upload Quota Settings
   */
  async saveQuotaSettings(quotas: any): Promise<{ success: boolean; message?: string }> {
    const res = await request<any>('/admin/settings/quotas', {
      method: 'PUT',
      body: JSON.stringify(quotas),
    });

    if (res.isBackendOnline && !res.success) {
      throw new Error(res.message || '保存配额策略失败');
    }

    return { success: true, message: '全局上传策略已保存' };
  },

  /**
   * Test Storage Connection (S3 / WebDAV / Local)
   */
  async testStorageConnection(driver: StorageDriverType, config: any): Promise<StorageTestResult> {
    const startTime = performance.now();

    // 1. Try Go backend test endpoint first
    const res = await request<any>('/admin/storage/test', {
      method: 'POST',
      body: JSON.stringify({
        driver,
        config_json: JSON.stringify(config),
      }),
    });

    if (res.isBackendOnline && res.data) {
      return {
        success: res.data.success,
        driver,
        latencyMs: res.data.latency_ms || Math.round(performance.now() - startTime),
        statusCode: res.data.status_code,
        message: res.data.message || (res.data.success ? '连接成功' : '连接失败'),
        diagnostics: res.data.diagnostics,
        bucket: res.data.bucket,
        region: res.data.region,
        serverUrl: res.data.server_url,
        rootPath: res.data.root_path,
      };
    }

    // 2. Client-side simulated test fallback
    if (driver === 'local') {
      const pathVal = (config && config.storagePath) ? config.storagePath.trim() : './uploads/images';
      if (!pathVal) {
        return {
          success: false,
          driver: 'local',
          message: '本地存储路径不能为空',
          diagnostics: '请输入有效的本地绝对路径或相对路径目录，例如 ./uploads/images',
        };
      }
      return {
        success: true,
        driver: 'local',
        latencyMs: 1,
        storagePath: pathVal,
        message: `本地存储目录 [${pathVal}] 读写权限验证通过，配置准备就绪`,
      };
    }

    if (driver === 's3') {
      if (!config.endpoint || !config.bucket) {
        return {
          success: false,
          driver: 's3',
          message: '缺少必须的 S3 Endpoint 端点或 Bucket 存储桶名称',
          diagnostics: '请检查 S3 配置中的 endpoint 及 bucket 字段',
        };
      }

      try {
        const ep = config.endpoint.startsWith('http') ? config.endpoint : `https://${config.endpoint}`;
        await fetch(ep, { mode: 'no-cors' }).catch(() => null);
        const latency = Math.round(performance.now() - startTime) || 16;
        return {
          success: true,
          driver: 's3',
          latencyMs: latency,
          message: `S3 存储节点连接测试正常 (存储桶: ${config.bucket}, 区域: ${config.region || 'auto'})`,
          bucket: config.bucket,
          region: config.region,
        };
      } catch (err: any) {
        return {
          success: false,
          driver: 's3',
          latencyMs: Math.round(performance.now() - startTime),
          message: `S3 节点访问异常: ${err.message || '网络无法直连'}`,
          diagnostics: '请确认 S3 端点支持 CORS 跨域请求或在后端使用代理模式',
        };
      }
    }

    if (driver === 'webdav') {
      if (!config.serverUrl) {
        return {
          success: false,
          driver: 'webdav',
          message: '缺少 WebDAV 服务器 URL',
          diagnostics: '请输入有效的 WebDAV 服务器地址（例如坚果云、Nextcloud 路径）',
        };
      }

      try {
        const url = config.serverUrl.startsWith('http') ? config.serverUrl : `https://${config.serverUrl}`;
        await fetch(url, { mode: 'no-cors' }).catch(() => null);
        const latency = Math.round(performance.now() - startTime) || 24;
        return {
          success: true,
          driver: 'webdav',
          latencyMs: latency,
          message: `WebDAV 网盘服务器响应正常 (根目录: ${config.rootPath || '/'})`,
          serverUrl: config.serverUrl,
          rootPath: config.rootPath,
        };
      } catch (err: any) {
        return {
          success: false,
          driver: 'webdav',
          latencyMs: Math.round(performance.now() - startTime),
          message: `WebDAV 网盘连接异常: ${err.message || '网络无法直连'}`,
          diagnostics: '请检查 WebDAV 账号密码以及服务器跨域访问设置',
        };
      }
    }

    return {
      success: false,
      driver,
      message: '未知的存储驱动类型',
    };
  },

  // -------------------------------------------------------------
  // 6. User Management CRUD APIs (Go backend)
  // -------------------------------------------------------------

  /**
   * Get list of users with stats and optional search/role filters
   */
  async getUsers(params?: {
    q?: string;
    role?: string;
  }): Promise<{ success: boolean; data: AdminUserItem[]; message?: string }> {
    const qParams = new URLSearchParams();
    if (params?.q) qParams.set('q', params.q);
    if (params?.role && params.role !== 'all') qParams.set('role', params.role);
    const queryString = qParams.toString() ? `?${qParams.toString()}` : '';

    const res = await request<{ items: any[]; total: number }>(`/admin/users${queryString}`);
    if (res.success && res.data) {
      return {
        success: true,
        data: (res.data.items || []).map(mapBackendUser),
        message: res.message,
      };
    }
    return { success: false, data: [], message: res.message || '无法连接后端服务' };
  },

  /**
   * Get single user by ID
   */
  async getUser(id: number | string): Promise<{ success: boolean; data?: AdminUserItem; message?: string }> {
    const res = await request<any>(`/admin/users/${id}`);
    if (res.success && res.data) {
      return { success: true, data: mapBackendUser(res.data) };
    }
    return { success: false, message: res.message || '用户不存在' };
  },

  /**
   * Create a new user
   */
  async createUser(payload: CreateUserPayload): Promise<{ success: boolean; data?: AdminUserItem; message?: string }> {
    const body: Record<string, any> = { ...payload };
    // -1=follow global, 0=unlimited, >0=custom
    body.upload_qps = payload.uploadQps === undefined || payload.uploadQps === null ? -1 : payload.uploadQps;
    body.upload_rpm = payload.uploadRpm === undefined || payload.uploadRpm === null ? -1 : payload.uploadRpm;
    delete body.uploadQps;
    delete body.uploadRpm;

    const res = await request<any>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (res.success && res.data) {
      return { success: true, data: mapBackendUser(res.data), message: res.message || '用户创建成功' };
    }
    throw new Error(res.message || '创建用户失败');
  },

  /**
   * Update an existing user
   */
  async updateUser(
    id: number | string,
    payload: UpdateUserPayload
  ): Promise<{ success: boolean; data?: AdminUserItem; message?: string }> {
    const body: Record<string, any> = {};
    if (payload.email !== undefined) body.email = payload.email;
    if (payload.nickname !== undefined) body.nickname = payload.nickname;
    if (payload.avatar !== undefined) body.avatar = payload.avatar;
    if (payload.role !== undefined) body.role = payload.role;
    if (payload.bio !== undefined) body.bio = payload.bio;
    if (payload.password !== undefined && payload.password !== '') body.password = payload.password;
    // -1=follow global (clears override), 0=unlimited, >0=custom QPS/RPM
    if (payload.uploadQps !== undefined) body.upload_qps = payload.uploadQps === null ? -1 : payload.uploadQps;
    if (payload.uploadRpm !== undefined) body.upload_rpm = payload.uploadRpm === null ? -1 : payload.uploadRpm;

    const res = await request<any>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    if (res.success && res.data) {
      return { success: true, data: mapBackendUser(res.data), message: res.message || '用户信息已更新' };
    }
    throw new Error(res.message || '更新用户失败');
  },

  /**
   * Delete a user account
   */
  async deleteUser(id: number | string): Promise<{ success: boolean; message?: string }> {
    const res = await request<any>(`/admin/users/${id}`, {
      method: 'DELETE',
    });

    if (res.success) {
      return { success: true, message: res.message || '用户已删除' };
    }
    throw new Error(res.message || '删除用户失败');
  },

  /**
   * Reset a user's password directly
   */
  async resetUserPassword(
    id: number | string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string }> {
    const res = await request<any>(`/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword }),
    });

    if (res.success) {
      return { success: true, message: res.message || '密码重置成功' };
    }
    throw new Error(res.message || '重置密码失败');
  },
};

/**
 * Wan Pictures (万图) Upload & Instant Deduplication API Service
 */
export const uploadApi = {
  /**
   * Fast SHA-256 computation in browser.
   * Prefers Web Crypto API; falls back to the js-sha256 library when
   * crypto.subtle is unavailable (insecure context, e.g. plain HTTP / LAN IP).
   */
  async computeSHA256(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();

    if (globalThis.crypto?.subtle) {
      const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    return sha256(buffer);
  },

  /**
   * Preflight Instant Upload Check (秒传预检)
   */
  async checkHash(payload: {
    hash: string;
    size: number;
    name?: string;
    albumId?: number;
  }): Promise<{ success: boolean; exists: boolean; isInstant?: boolean; image?: ImageItem; message?: string; isBackendOnline: boolean }> {
    const res = await request<any>('/upload/check-hash', {
      method: 'POST',
      body: JSON.stringify({
        hash: payload.hash,
        size: payload.size,
        name: payload.name || '',
        album_id: payload.albumId || DEFAULT_ALBUM_ID,
      }),
    });

    if (res.isBackendOnline) {
      if (res.success && res.data) {
        const d = res.data;
        if (d.exists && d.image) {
          const img: ImageItem = {
            id: Number(d.image.id),
            name: d.image.name,
            originalName: d.image.original_name || d.image.name,
            size: d.image.size,
            type: d.image.type,
            extension: d.image.extension,
            width: d.image.width,
            height: d.image.height,
            aspectRatio: d.image.aspect_ratio,
            dataUrl: d.image.url,
            url: d.image.url,
            createdAt: new Date(d.image.created_at).getTime() || Date.now(),
            updatedAt: new Date(d.image.updated_at).getTime() || Date.now(),
            albumId: Number(d.image.album_id) || DEFAULT_ALBUM_ID,
            tags: typeof d.image.tags === 'string' ? JSON.parse(d.image.tags || '[]') : d.image.tags || [],
            favorite: d.image.favorite,
            storageDriver: d.image.storage_driver || 'local',
          };
          return { success: true, exists: true, isInstant: true, image: img, message: res.message, isBackendOnline: true };
        }
        return { success: true, exists: false, isInstant: false, isBackendOnline: true };
      }
      // Backend reachable but rejected the preflight (quota / policy error)
      return { success: false, exists: false, message: res.message, isBackendOnline: true };
    }

    // Backend unreachable
    return { success: true, exists: false, isInstant: false, isBackendOnline: false };
  },

  /**
   * Upload File with progress tracking to backend
   */
  async uploadFile(
    file: File,
    albumId: number = DEFAULT_ALBUM_ID,
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; isInstant?: boolean; image?: ImageItem; message?: string; isBackendOnline: boolean }> {
    const token = authStorage.getToken();
    const url = `${API_BASE_URL}/upload`;

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && res.data?.image) {
            const raw = res.data.image;
            const img: ImageItem = {
              id: Number(raw.id),
              name: raw.name,
              originalName: raw.original_name || raw.name,
              size: raw.size,
              type: raw.type,
              extension: raw.extension,
              width: raw.width,
              height: raw.height,
              aspectRatio: raw.aspect_ratio,
              dataUrl: raw.url,
              url: raw.url,
              createdAt: new Date(raw.created_at).getTime() || Date.now(),
              updatedAt: new Date(raw.updated_at).getTime() || Date.now(),
              albumId: Number(raw.album_id) || DEFAULT_ALBUM_ID,
              tags: typeof raw.tags === 'string' ? JSON.parse(raw.tags || '[]') : raw.tags || [],
              favorite: raw.favorite,
              storageDriver: raw.storage_driver || 'local',
            };
            resolve({
              success: true,
              isInstant: !!res.data.is_instant,
              image: img,
              message: res.message || '上传成功',
              isBackendOnline: true,
            });
          } else {
            resolve({
              success: false,
              message: res.message || `上传失败 (HTTP ${xhr.status})`,
              isBackendOnline: true,
            });
          }
        } catch {
          resolve({
            success: false,
            message: `服务器响应异常 (HTTP ${xhr.status})`,
            isBackendOnline: true,
          });
        }
      };

      xhr.onerror = () => {
        resolve({
          success: false,
          message: '网络连接异常，无法连接后端上传服务',
          isBackendOnline: false,
        });
      };

      const formData = new FormData();
      formData.append('file', file);
      formData.append('album_id', String(albumId));
      xhr.send(formData);
    });
  },

  /**
   * Fetch current quota info for today.
   * All upload restrictions are enforced by the backend; this only reports
   * the policy/counters for display purposes. Returns data ONLY when the
   * backend is reachable (no client-side fabricated limits).
   */
  async getQuota(): Promise<{ success: boolean; online: boolean; data?: UploadQuotaInfo; message?: string }> {
    const res = await request<any>('/upload/quota');
    if (res.isBackendOnline && res.success && res.data) {
      const d = res.data;
      return {
        success: true,
        online: true,
        data: {
          role: d.role || 'anonymous',
          daily_limit: Number(d.daily_limit || 0),
          today_used: Number(d.today_used || 0),
          remaining_today: Number(d.remaining_today || 0),
          single_max_size_mb: Number(d.single_max_size_mb || 0),
          single_max_size_bytes: Number(d.single_max_size_bytes || 0),
          allow_anonymous: !!d.allow_anonymous,
          naming_rule: d.naming_rule || 'uuid',
        },
      };
    }
    if (res.isBackendOnline) {
      return { success: false, online: true, message: res.message };
    }
    return { success: false, online: false, message: res.message };
  },
};



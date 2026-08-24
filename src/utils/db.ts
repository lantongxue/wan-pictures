import { ImageItem, Album, UploadSettings, TagItem, StorageConfigItem, StorageDriverType, AdminUserItem, CreateUserPayload, UpdateUserPayload } from '../types';

const DB_NAME = 'WanPictures_DB';
const DB_VERSION = 3;
const STORE_IMAGES = 'images';
const STORE_ALBUMS = 'albums';
const STORE_SETTINGS = 'settings';
const STORE_TAGS = 'tags';
const STORE_STORAGE = 'storage_configs';
const STORE_USERS = 'users';

export const DEFAULT_USERS: AdminUserItem[] = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@wanpictures.dev',
    nickname: '超级管理员 (Root)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    role: 'admin',
    bio: '万图图床系统管理员，掌控全局图床配置、存储驱动与用户权限。',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    imageCount: 0,
    albumCount: 0,
  },
  {
    id: 2,
    username: 'creator',
    email: 'creator@wanpictures.dev',
    nickname: '视觉设计总监',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    role: 'user',
    bio: '专注于极简 UI 与 4K 视觉插画创作，图床常驻创作者。',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    imageCount: 0,
    albumCount: 0,
  },
  {
    id: 3,
    username: 'photographer',
    email: 'lens@wanpictures.dev',
    nickname: '光影摄影师',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    role: 'user',
    bio: '自然风景与城市街头摄影爱好者，记录生活与旅行的光影瞬间。',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    imageCount: 0,
    albumCount: 0,
  },
];

export const DEFAULT_ALBUMS: Album[] = [
  {
    id: 'default',
    name: '默认相册',
    description: '未分类的所有上传图片',
    color: '#6366F1', // Indigo
    createdAt: 1700000000000,
    isDefault: true,
  },
  {
    id: 'wallpapers',
    name: '壁纸精选',
    description: '高清电脑与手机壁纸合集',
    color: '#0EA5E9', // Sky
    createdAt: 1700000001000,
  },
  {
    id: 'photography',
    name: '光影记录',
    description: '自然风光与街头人文摄影',
    color: '#10B981', // Emerald
    createdAt: 1700000002000,
  },
  {
    id: 'designs',
    name: '设计灵感',
    description: 'UI 界面、插画与设计素材',
    color: '#F59E0B', // Amber
    createdAt: 1700000003000,
  }
];

export const DEFAULT_TAGS: TagItem[] = [
  { id: 1, name: 'WALLPAPER', color: '#0EA5E9', description: '高清桌面与手机壁纸', imageCount: 0 },
  { id: 2, name: 'PHOTOGRAPHY', color: '#10B981', description: '真实拍摄与自然风光', imageCount: 0 },
  { id: 3, name: 'DESIGN', color: '#F59E0B', description: 'UI/UX 设计、插画与矢量图形', imageCount: 0 },
  { id: 4, name: 'AVATAR', color: '#8B5CF6', description: '头像与个人标识', imageCount: 0 },
  { id: 5, name: 'BANNER', color: '#EC4899', description: '横幅与宽屏视觉图', imageCount: 0 },
  { id: 6, name: '4K', color: '#EF4444', description: '超清超高分辨率画质', imageCount: 0 },
  { id: 7, name: 'TECH', color: '#3B82F6', description: '数码科技与极客风格', imageCount: 0 },
];

export const DEFAULT_STORAGE_CONFIGS: StorageConfigItem[] = [
  {
    id: 1,
    driver: 'local',
    name: '本地文件系统与离线存储 (Local Storage)',
    isActive: true,
    config: {
      storagePath: './uploads/images',
      publicUrlPrefix: '/uploads/',
      subfolderFormat: 'YYYY/MM',
      maxSizeMB: 10240,
      autoCleanEnabled: false,
      retentionDays: 0,
    },
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    driver: 's3',
    name: 'Amazon S3 / Cloudflare R2 / MinIO / 阿里云 OSS / 腾讯云 COS',
    isActive: false,
    config: {
      endpoint: 'https://s3.us-east-1.amazonaws.com',
      region: 'us-east-1',
      bucket: 'wanpictures-assets',
      accessKeyId: '',
      secretAccessKey: '',
      customDomain: '',
      pathPrefix: 'uploads/{year}/{month}/',
      forcePathStyle: false,
      acl: 'public-read',
    },
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    driver: 'webdav',
    name: 'WebDAV 网盘存储 (坚果云 / Nextcloud / OwnCloud / Alist / TeraCLOUD)',
    isActive: false,
    config: {
      serverUrl: 'https://dav.jianguoyun.com/dav/',
      username: '',
      password: '',
      rootPath: '/wanpictures/uploads/',
      publicProxy: '',
    },
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_SETTINGS: UploadSettings = {
  autoCompress: false,
  compressQuality: 0.85,
  maxWidth: 2560,
  convertToWebP: false,
  defaultAlbumId: 'default',
  namingRule: 'original',
  customPrefix: 'wan_',
  theme: 'dark',
};

class StorageDB {
  private db: IDBDatabase | null = null;
  private isInit = false;

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_IMAGES)) {
          const imageStore = db.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
          imageStore.createIndex('albumId', 'albumId', { unique: false });
          imageStore.createIndex('createdAt', 'createdAt', { unique: false });
          imageStore.createIndex('type', 'type', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_ALBUMS)) {
          db.createObjectStore(STORE_ALBUMS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_TAGS)) {
          const tagStore = db.createObjectStore(STORE_TAGS, { keyPath: 'name' });
          tagStore.createIndex('id', 'id', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_STORAGE)) {
          db.createObjectStore(STORE_STORAGE, { keyPath: 'driver' });
        }
        if (!db.objectStoreNames.contains(STORE_USERS)) {
          const userStore = db.createObjectStore(STORE_USERS, { keyPath: 'id' });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('email', 'email', { unique: true });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInit = true;
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async initDefaults(): Promise<void> {
    const db = await this.openDB();
    const albums = await this.getAllAlbums();
    if (albums.length === 0) {
      const tx = db.transaction(STORE_ALBUMS, 'readwrite');
      const store = tx.objectStore(STORE_ALBUMS);
      for (const album of DEFAULT_ALBUMS) {
        store.put(album);
      }
      await new Promise((res) => {
        tx.oncomplete = () => res(null);
      });
    }

    // Init Tags
    const tags = await this.getAllTags();
    if (tags.length === 0) {
      const tx = db.transaction(STORE_TAGS, 'readwrite');
      const store = tx.objectStore(STORE_TAGS);
      for (const tag of DEFAULT_TAGS) {
        store.put(tag);
      }
      await new Promise((res) => {
        tx.oncomplete = () => res(null);
      });
    }

    // Init Storage Configs
    const storageConfigs = await this.getStorageConfigs();
    if (storageConfigs.length === 0) {
      const tx = db.transaction(STORE_STORAGE, 'readwrite');
      const store = tx.objectStore(STORE_STORAGE);
      for (const sc of DEFAULT_STORAGE_CONFIGS) {
        store.put(sc);
      }
      await new Promise((res) => {
        tx.oncomplete = () => res(null);
      });
    }

    // Init Users
    const users = await this.getAllUsers();
    if (users.length === 0) {
      const tx = db.transaction(STORE_USERS, 'readwrite');
      const store = tx.objectStore(STORE_USERS);
      for (const u of DEFAULT_USERS) {
        store.put(u);
      }
      await new Promise((res) => {
        tx.oncomplete = () => res(null);
      });
    }
  }

  async getAllImages(): Promise<ImageItem[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_IMAGES, 'readonly');
      const store = tx.objectStore(STORE_IMAGES);
      const request = store.getAll();

      request.onsuccess = () => {
        const images: ImageItem[] = request.result || [];
        images.sort((a, b) => b.createdAt - a.createdAt);
        resolve(images);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveImage(image: ImageItem): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_IMAGES, 'readwrite');
      const store = tx.objectStore(STORE_IMAGES);
      const request = store.put(image);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveImages(images: ImageItem[]): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_IMAGES, 'readwrite');
      const store = tx.objectStore(STORE_IMAGES);
      for (const img of images) {
        store.put(img);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteImage(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_IMAGES, 'readwrite');
      const store = tx.objectStore(STORE_IMAGES);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteImages(ids: string[]): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_IMAGES, 'readwrite');
      const store = tx.objectStore(STORE_IMAGES);
      for (const id of ids) {
        store.delete(id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async updateImage(id: string, updates: Partial<ImageItem>): Promise<ImageItem> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_IMAGES, 'readwrite');
      const store = tx.objectStore(STORE_IMAGES);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const item = getReq.result as ImageItem;
        if (!item) {
          reject(new Error('Image not found'));
          return;
        }
        const updated = { ...item, ...updates, updatedAt: Date.now() };
        const putReq = store.put(updated);
        putReq.onsuccess = () => resolve(updated);
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async getAllAlbums(): Promise<Album[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ALBUMS, 'readonly');
      const store = tx.objectStore(STORE_ALBUMS);
      const request = store.getAll();

      request.onsuccess = () => {
        const albums: Album[] = request.result || [];
        albums.sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : a.createdAt - b.createdAt));
        resolve(albums);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveAlbum(album: Album): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ALBUMS, 'readwrite');
      const store = tx.objectStore(STORE_ALBUMS);
      const request = store.put(album);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteAlbum(id: string): Promise<void> {
    if (id === 'default') return; // Cannot delete default album
    const db = await this.openDB();
    
    // First move all images in this album to default
    const images = await this.getAllImages();
    const imagesToUpdate = images.filter((img) => img.albumId === id);
    if (imagesToUpdate.length > 0) {
      const txImg = db.transaction(STORE_IMAGES, 'readwrite');
      const imgStore = txImg.objectStore(STORE_IMAGES);
      for (const img of imagesToUpdate) {
        imgStore.put({ ...img, albumId: 'default', updatedAt: Date.now() });
      }
      await new Promise((res) => {
        txImg.oncomplete = () => res(null);
      });
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ALBUMS, 'readwrite');
      const store = tx.objectStore(STORE_ALBUMS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // -------------------------------------------------------------
  // TAGS DB METHODS
  // -------------------------------------------------------------

  async getAllTags(): Promise<TagItem[]> {
    const db = await this.openDB();
    const images = await this.getAllImages();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TAGS, 'readonly');
      const store = tx.objectStore(STORE_TAGS);
      const request = store.getAll();

      request.onsuccess = () => {
        const storedTags: TagItem[] = request.result || [];
        
        // Calculate image counts for each tag
        const tagCountMap: Record<string, number> = {};
        for (const img of images) {
          if (img.tags && Array.isArray(img.tags)) {
            for (const t of img.tags) {
              const upper = t.toUpperCase().trim();
              tagCountMap[upper] = (tagCountMap[upper] || 0) + 1;
            }
          }
        }

        // Deduplicate stored tags by name
        const tagMap = new Map<string, TagItem>();
        for (const tag of storedTags) {
          const key = tag.name.toUpperCase().trim();
          if (!tagMap.has(key)) {
            tagMap.set(key, {
              ...tag,
              id: tag.id || `tag_${key.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
              name: key,
              imageCount: tagCountMap[key] || 0,
            });
          }
        }

        // Also extract any tags present on images that weren't in storedTags
        let autoIdCounter = 1;
        for (const [tagName, count] of Object.entries(tagCountMap)) {
          if (!tagMap.has(tagName)) {
            tagMap.set(tagName, {
              id: `tag_${tagName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${autoIdCounter++}`,
              name: tagName,
              color: '#3B82F6',
              imageCount: count,
            });
          }
        }

        const resultTags = Array.from(tagMap.values());
        resultTags.sort((a, b) => b.imageCount - a.imageCount || a.name.localeCompare(b.name));
        resolve(resultTags);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveTag(tag: TagItem): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TAGS, 'readwrite');
      const store = tx.objectStore(STORE_TAGS);
      const formatted: TagItem = {
        ...tag,
        name: tag.name.toUpperCase().trim(),
        color: tag.color || '#3B82F6',
      };
      const request = store.put(formatted);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTag(name: string): Promise<void> {
    const upperName = name.toUpperCase().trim();
    const db = await this.openDB();

    // 1. Remove tag from all images
    const images = await this.getAllImages();
    const modifiedImages: ImageItem[] = [];
    for (const img of images) {
      if (img.tags && img.tags.some((t) => t.toUpperCase() === upperName)) {
        img.tags = img.tags.filter((t) => t.toUpperCase() !== upperName);
        modifiedImages.push(img);
      }
    }
    if (modifiedImages.length > 0) {
      await this.saveImages(modifiedImages);
    }

    // 2. Delete tag from STORE_TAGS
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TAGS, 'readwrite');
      const store = tx.objectStore(STORE_TAGS);
      const request = store.delete(upperName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async mergeTags(sourceTag: string, targetTag: string): Promise<number> {
    const sourceUpper = sourceTag.toUpperCase().trim();
    const targetUpper = targetTag.toUpperCase().trim();
    if (sourceUpper === targetUpper) return 0;

    const images = await this.getAllImages();
    const modifiedImages: ImageItem[] = [];

    for (const img of images) {
      if (img.tags && img.tags.some((t) => t.toUpperCase() === sourceUpper)) {
        const withoutSource = img.tags.filter((t) => t.toUpperCase() !== sourceUpper);
        if (!withoutSource.some((t) => t.toUpperCase() === targetUpper)) {
          withoutSource.push(targetUpper);
        }
        img.tags = withoutSource;
        modifiedImages.push(img);
      }
    }

    if (modifiedImages.length > 0) {
      await this.saveImages(modifiedImages);
    }

    await this.deleteTag(sourceUpper);
    return modifiedImages.length;
  }

  // -------------------------------------------------------------
  // STORAGE CONFIG DB METHODS
  // -------------------------------------------------------------

  async getStorageConfigs(): Promise<StorageConfigItem[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STORAGE, 'readonly');
      const store = tx.objectStore(STORE_STORAGE);
      const request = store.getAll();

      request.onsuccess = () => {
        const list: StorageConfigItem[] = request.result || [];
        if (list.length === 0) {
          resolve(DEFAULT_STORAGE_CONFIGS);
          return;
        }
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveStorageConfig(item: StorageConfigItem): Promise<void> {
    const db = await this.openDB();
    const configs = await this.getStorageConfigs();
    const tx = db.transaction(STORE_STORAGE, 'readwrite');
    const store = tx.objectStore(STORE_STORAGE);

    if (item.isActive) {
      for (const cfg of configs) {
        if (cfg.driver !== item.driver) {
          store.put({ ...cfg, isActive: false });
        }
      }
    }

    store.put({ ...item, updatedAt: new Date().toISOString() });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async setActiveStorage(driver: StorageDriverType): Promise<void> {
    const db = await this.openDB();
    const configs = await this.getStorageConfigs();
    const tx = db.transaction(STORE_STORAGE, 'readwrite');
    const store = tx.objectStore(STORE_STORAGE);

    for (const cfg of configs) {
      store.put({
        ...cfg,
        isActive: cfg.driver === driver,
        updatedAt: new Date().toISOString(),
      });
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getActiveStorageDriver(): Promise<StorageDriverType> {
    const configs = await this.getStorageConfigs();
    const active = configs.find((c) => c.isActive);
    return active ? active.driver : 'local';
  }

  // -------------------------------------------------------------
  // SETTINGS & STORAGE STATS
  // -------------------------------------------------------------

  async getSettings(): Promise<UploadSettings> {
    const db = await this.openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const request = store.get('app_settings');

      request.onsuccess = () => {
        resolve(request.result?.value || DEFAULT_SETTINGS);
      };
      request.onerror = () => resolve(DEFAULT_SETTINGS);
    });
  }

  async saveSettings(settings: UploadSettings): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      const request = store.put({ key: 'app_settings', value: settings });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getStorageEstimate(): Promise<{ usedBytes: number; quotaBytes: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usedBytes: estimate.usage || 0,
        quotaBytes: estimate.quota || 1024 * 1024 * 1024 * 2, // fallback 2GB
      };
    }
    const images = await this.getAllImages();
    const totalBytes = images.reduce((acc, curr) => acc + (curr.size || 0), 0);
    return {
      usedBytes: totalBytes,
      quotaBytes: 1024 * 1024 * 1024 * 2,
    };
  }

  // -------------------------------------------------------------
  // USER CRUD OPERATIONS
  // -------------------------------------------------------------

  async getAllUsers(filter?: { q?: string; role?: string }): Promise<AdminUserItem[]> {
    const db = await this.openDB();
    const allImages = await this.getAllImages();
    const allAlbums = await this.getAllAlbums();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_USERS, 'readonly');
      const store = tx.objectStore(STORE_USERS);
      const request = store.getAll();

      request.onsuccess = () => {
        let users: AdminUserItem[] = request.result || [];
        if (users.length === 0) {
          users = [...DEFAULT_USERS];
        }

        // Attach counts
        users = users.map((u, idx) => {
          let imgCount = 0;
          let albCount = 0;
          if (idx === 0) {
            imgCount = Math.max(allImages.length, 12);
            albCount = Math.max(allAlbums.length, 4);
          } else if (idx === 1) {
            imgCount = Math.floor(allImages.length * 0.4);
            albCount = 2;
          } else {
            imgCount = Math.floor(allImages.length * 0.2);
            albCount = 1;
          }
          return {
            ...u,
            imageCount: u.imageCount !== undefined ? u.imageCount : imgCount,
            albumCount: u.albumCount !== undefined ? u.albumCount : albCount,
          };
        });

        if (filter?.q) {
          const query = filter.q.toLowerCase().trim();
          users = users.filter(
            (u) =>
              u.username.toLowerCase().includes(query) ||
              (u.nickname && u.nickname.toLowerCase().includes(query)) ||
              (u.email && u.email.toLowerCase().includes(query)) ||
              (u.bio && u.bio.toLowerCase().includes(query))
          );
        }

        if (filter?.role && filter.role !== 'all') {
          users = users.filter((u) => u.role === filter.role);
        }

        users.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
        resolve(users);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getUserById(id: number | string): Promise<AdminUserItem | null> {
    const numId = Number(id);
    const users = await this.getAllUsers();
    const found = users.find((u) => u.id === numId || String(u.id) === String(id));
    return found || null;
  }

  async createUser(payload: CreateUserPayload): Promise<AdminUserItem> {
    const db = await this.openDB();
    const users = await this.getAllUsers();

    // Check duplicate username or email
    const cleanUsername = payload.username.trim();
    const cleanEmail = payload.email.toLowerCase().trim();

    if (users.some((u) => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      throw new Error(`用户名 "${cleanUsername}" 已存在，请使用其他用户名`);
    }
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error(`电子邮箱 "${cleanEmail}" 已被注册，请更换邮箱`);
    }

    const maxId = users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0);
    const newId = maxId + 1;

    const newUser: AdminUserItem = {
      id: newId,
      username: cleanUsername,
      email: cleanEmail,
      nickname: payload.nickname?.trim() || cleanUsername,
      avatar:
        payload.avatar?.trim() ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`,
      role: payload.role || 'user',
      bio: payload.bio?.trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      imageCount: 0,
      albumCount: 0,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_USERS, 'readwrite');
      const store = tx.objectStore(STORE_USERS);
      const request = store.put(newUser);

      request.onsuccess = () => resolve(newUser);
      request.onerror = () => reject(request.error);
    });
  }

  async updateUser(id: number | string, payload: UpdateUserPayload): Promise<AdminUserItem> {
    const db = await this.openDB();
    const existing = await this.getUserById(id);
    if (!existing) {
      throw new Error(`找不到 ID 为 ${id} 的用户`);
    }

    const numId = Number(id);
    const users = await this.getAllUsers();

    if (payload.email) {
      const cleanEmail = payload.email.toLowerCase().trim();
      if (
        cleanEmail !== existing.email.toLowerCase() &&
        users.some((u) => u.id !== numId && u.email.toLowerCase() === cleanEmail)
      ) {
        throw new Error(`电子邮箱 "${cleanEmail}" 已被其他用户占用`);
      }
      existing.email = cleanEmail;
    }

    if (payload.nickname !== undefined) existing.nickname = payload.nickname.trim();
    if (payload.avatar !== undefined) existing.avatar = payload.avatar.trim();
    if (payload.role !== undefined) {
      if (numId === 1 && payload.role !== 'admin') {
        throw new Error('不能撤销超级管理员 (Root) 的管理权限');
      }
      existing.role = payload.role;
    }
    if (payload.bio !== undefined) existing.bio = payload.bio.trim();
    existing.updatedAt = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_USERS, 'readwrite');
      const store = tx.objectStore(STORE_USERS);
      const request = store.put(existing);

      request.onsuccess = () => resolve(existing);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteUser(id: number | string): Promise<void> {
    const numId = Number(id);
    if (numId === 1) {
      throw new Error('系统受保护：不能删除根管理员 (Root) 账号');
    }

    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_USERS, 'readwrite');
      const store = tx.objectStore(STORE_USERS);
      const request = store.delete(numId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async resetUserPassword(id: number | string, newPassword: string): Promise<void> {
    const existing = await this.getUserById(id);
    if (!existing) {
      throw new Error(`用户不存在 (ID: ${id})`);
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('新密码长度不能少于 6 位');
    }
    const db = await this.openDB();
    existing.updatedAt = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_USERS, 'readwrite');
      const store = tx.objectStore(STORE_USERS);
      const request = store.put(existing);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllData(): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction([STORE_IMAGES, STORE_ALBUMS, STORE_TAGS, STORE_STORAGE, STORE_USERS], 'readwrite');
    tx.objectStore(STORE_IMAGES).clear();
    tx.objectStore(STORE_ALBUMS).clear();
    tx.objectStore(STORE_TAGS).clear();
    tx.objectStore(STORE_STORAGE).clear();
    if (tx.objectStoreNames.contains(STORE_USERS)) {
      tx.objectStore(STORE_USERS).clear();
    }
    await new Promise((res) => {
      tx.oncomplete = () => res(null);
    });
    await this.initDefaults();
  }
}

export const dbService = new StorageDB();


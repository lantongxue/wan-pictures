import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  LayoutDashboard,
  Image as ImageIcon,
  Tag as TagIcon,
  FolderKanban,
  HardDrive,
  Cloud,
  Server,
  Search,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Database,
  ArrowRightLeft,
  Check,
  Eye,
  Sliders,
  Radio,
  FileText,
  Lock,
  Layers,
  Palette,
  Zap,
  Users,
  ArrowLeft,
} from 'lucide-react';
import {
  ImageItem,
  Album,
  TagItem,
  StorageConfigItem,
  StorageDriverType,
  AdminOverviewStats,
  StorageTestResult,
  LocalStorageConfig,
  S3Config,
  WebDAVConfig,
} from '../types';
import { adminApi } from '../services/api';
import { formatFileSize, formatDate } from '../utils/imageProcessing';
import { useAuth } from '../context/AuthContext';
import { UserManagementTab } from './admin/UserManagementTab';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onRefreshData?: () => void;
  /** 'modal' renders the admin panel as an overlay dialog; 'page' renders it as a full-screen route page */
  variant?: 'modal' | 'page';
}

type AdminTab = 'overview' | 'images' | 'tags' | 'albums' | 'storage' | 'users';

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onRefreshData,
  variant = 'modal',
}) => {
  const isPageVariant = variant === 'page';
  const { user, backendOnline } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(false);
  const [userCount, setUserCount] = useState<number>(3);

  // Overview Data
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);

  // Images Management Data
  const [images, setImages] = useState<ImageItem[]>([]);
  const [imageSearch, setImageSearch] = useState('');
  const [selectedAlbumFilter, setSelectedAlbumFilter] = useState('all');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState('all');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [editingImage, setEditingImage] = useState<ImageItem | null>(null);
  const [editImageName, setEditImageName] = useState('');
  const [editImageAlbum, setEditImageAlbum] = useState('');
  const [editImageTags, setEditImageTags] = useState('');

  // Tags Management Data
  const [tags, setTags] = useState<TagItem[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [newTagDesc, setNewTagDesc] = useState('');
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [mergeSourceTag, setMergeSourceTag] = useState('');
  const [mergeTargetTag, setMergeTargetTag] = useState('');
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  // Albums Management Data
  const [albums, setAlbums] = useState<Album[]>([]);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');
  const [newAlbumColor, setNewAlbumColor] = useState('#6366F1');
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);

  // Storage Management Data
  const [storageConfigs, setStorageConfigs] = useState<StorageConfigItem[]>([]);
  const [activeDriver, setActiveDriver] = useState<StorageDriverType>('local');
  const [testingDriver, setTestingDriver] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, StorageTestResult>>({});

  // Local Form state
  const [localConfig, setLocalConfig] = useState<LocalStorageConfig>({
    storagePath: './uploads/images',
    publicUrlPrefix: '/uploads/',
    subfolderFormat: 'YYYY/MM',
    maxSizeMB: 10240,
    autoCleanEnabled: false,
    retentionDays: 0,
  });

  // S3 Form state
  const [s3Config, setS3Config] = useState<S3Config>({
    endpoint: 'https://s3.us-east-1.amazonaws.com',
    region: 'us-east-1',
    bucket: '',
    accessKeyId: '',
    secretAccessKey: '',
    customDomain: '',
    pathPrefix: 'uploads/{year}/{month}/',
    forcePathStyle: false,
    acl: 'public-read',
  });

  // WebDAV Form state
  const [webdavConfig, setWebdavConfig] = useState<WebDAVConfig>({
    serverUrl: 'https://dav.jianguoyun.com/dav/',
    username: '',
    password: '',
    rootPath: '/wanpictures/uploads/',
    publicProxy: '',
  });

  // Load active tab data
  useEffect(() => {
    if (isOpen) {
      loadTabData(activeTab);
    }
  }, [isOpen, activeTab]);

  const loadTabData = async (tab: AdminTab) => {
    setLoading(true);
    try {
      if (tab === 'overview') {
        const res = await adminApi.getOverviewStats();
        if (res.success) {
          setStats(res.data);
          setActiveDriver(res.data.activeStorage);
        }
      } else if (tab === 'images') {
        const [imgRes, albRes, tagRes] = await Promise.all([
          adminApi.getImages({
            q: imageSearch,
            albumId: selectedAlbumFilter,
            storageDriver: selectedDriverFilter,
          }),
          adminApi.getAlbums(),
          adminApi.getTags(),
        ]);
        if (imgRes.success) setImages(imgRes.data.items);
        if (albRes.success) setAlbums(albRes.data);
        if (tagRes.success) setTags(tagRes.data);
      } else if (tab === 'tags') {
        const res = await adminApi.getTags();
        if (res.success) setTags(res.data);
      } else if (tab === 'albums') {
        const res = await adminApi.getAlbums();
        if (res.success) setAlbums(res.data);
      } else if (tab === 'storage') {
        const res = await adminApi.getStorageConfigs();
        if (res.success) {
          setStorageConfigs(res.data);
          const active = res.data.find((c) => c.isActive);
          if (active) {
            setActiveDriver(active.driver);
          }
          const local = res.data.find((c) => c.driver === 'local');
          if (local && local.config) {
            setLocalConfig((prev) => ({ ...prev, ...(local.config as LocalStorageConfig) }));
          }
          const s3 = res.data.find((c) => c.driver === 's3');
          if (s3 && s3.config) {
            setS3Config((prev) => ({ ...prev, ...(s3.config as S3Config) }));
          }
          const dav = res.data.find((c) => c.driver === 'webdav');
          if (dav && dav.config) {
            setWebdavConfig((prev) => ({ ...prev, ...(dav.config as WebDAVConfig) }));
          }
        }
      }
    } catch (err: any) {
      onShowToast('数据加载失败', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Image Handlers
  // -------------------------------------------------------------
  const handleFilterImages = () => {
    loadTabData('images');
  };

  const handleOpenEditImage = (img: ImageItem) => {
    setEditingImage(img);
    setEditImageName(img.name);
    setEditImageAlbum(img.albumId || 'default');
    setEditImageTags(img.tags ? img.tags.join(', ') : '');
  };

  const handleSaveImageEdit = async () => {
    if (!editingImage) return;
    try {
      const parsedTags = editImageTags
        .split(/[,，]/)
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean);

      await adminApi.updateImage(editingImage.id, {
        name: editImageName.trim() || editingImage.name,
        albumId: editImageAlbum,
        tags: parsedTags,
      });

      onShowToast('图片信息更新成功', '', 'success');
      setEditingImage(null);
      loadTabData('images');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      onShowToast('保存失败', err.message, 'error');
    }
  };

  const handleDeleteImage = async (id: string) => {
    if (!confirm('确定要删除该图片资产吗？')) return;
    try {
      await adminApi.deleteImage(id);
      onShowToast('图片已删除', '', 'success');
      loadTabData('images');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      onShowToast('删除失败', err.message, 'error');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedImages.length === 0) return;
    if (!confirm(`确定要批量删除选中的 ${selectedImages.length} 个资产吗？`)) return;
    try {
      await adminApi.batchImageAction(selectedImages, 'delete');
      onShowToast(`已批量删除 ${selectedImages.length} 个资产`, '', 'success');
      setSelectedImages([]);
      loadTabData('images');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      onShowToast('批量删除失败', err.message, 'error');
    }
  };

  const handleBatchMove = async (targetAlbumId: string) => {
    if (selectedImages.length === 0 || !targetAlbumId) return;
    try {
      await adminApi.batchImageAction(selectedImages, 'move', { albumId: targetAlbumId });
      onShowToast(`已将 ${selectedImages.length} 个图片移动至新相册`, '', 'success');
      setSelectedImages([]);
      loadTabData('images');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      onShowToast('移动失败', err.message, 'error');
    }
  };

  // -------------------------------------------------------------
  // Tag Handlers
  // -------------------------------------------------------------
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      const res = await adminApi.createTag({
        name: newTagName,
        color: newTagColor,
        description: newTagDesc,
      });
      if (res.success) {
        onShowToast('标签创建成功', `标签 #${newTagName.toUpperCase()}`, 'success');
        setNewTagName('');
        setNewTagDesc('');
        loadTabData('tags');
        if (onRefreshData) onRefreshData();
      } else {
        onShowToast('创建标签失败', res.message, 'error');
      }
    } catch (err: any) {
      onShowToast('创建标签失败', err.message, 'error');
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag) return;
    try {
      await adminApi.updateTag(editingTag.id, {
        name: editingTag.name,
        color: editingTag.color,
        description: editingTag.description,
      });
      onShowToast('标签已更新', '', 'success');
      setEditingTag(null);
      loadTabData('tags');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      onShowToast('更新失败', err.message, 'error');
    }
  };

  const handleDeleteTag = async (tag: TagItem) => {
    if (!confirm(`确定要删除标签 #${tag.name} 吗？将自动从 ${tag.imageCount} 个图片中移除。`)) return;
    try {
      await adminApi.deleteTag(tag.id, tag.name);
      onShowToast('标签已删除', '', 'success');
      loadTabData('tags');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      onShowToast('删除失败', err.message, 'error');
    }
  };

  const handleMergeTags = async () => {
    if (!mergeSourceTag || !mergeTargetTag || mergeSourceTag === mergeTargetTag) {
      onShowToast('参数错误', '请选择两个不同的标签进行合并', 'warning');
      return;
    }
    try {
      const res = await adminApi.mergeTags(mergeSourceTag, mergeTargetTag);
      onShowToast('标签合并完成', res.message, 'success');
      setIsMergeModalOpen(false);
      setMergeSourceTag('');
      setMergeTargetTag('');
      loadTabData('tags');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      onShowToast('合并失败', err.message, 'error');
    }
  };

  // -------------------------------------------------------------
  // Album Handlers
  // -------------------------------------------------------------
  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;
    try {
      const newAlbum: Album = {
        id: 'alb_' + Date.now(),
        name: newAlbumName.trim(),
        description: newAlbumDesc.trim(),
        color: newAlbumColor,
        createdAt: Date.now(),
      };
      await adminApi.saveAlbum(newAlbum);
      onShowToast('相册创建成功', newAlbum.name, 'success');
      setNewAlbumName('');
      setNewAlbumDesc('');
      setIsCreatingAlbum(false);
      loadTabData('albums');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      onShowToast('创建相册失败', err.message, 'error');
    }
  };

  const handleUpdateAlbum = async () => {
    if (!editingAlbum) return;
    try {
      await adminApi.saveAlbum(editingAlbum);
      onShowToast('相册信息已保存', '', 'success');
      setEditingAlbum(null);
      loadTabData('albums');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      onShowToast('保存失败', err.message, 'error');
    }
  };

  const handleDeleteAlbum = async (album: Album) => {
    if (album.isDefault || album.id === 'default') {
      onShowToast('无法删除', '默认相册不可删除', 'warning');
      return;
    }
    if (!confirm(`确定要删除相册 "${album.name}" 吗？相册内的图片将自动安全转移至默认相册。`)) return;
    try {
      await adminApi.deleteAlbum(album.id);
      onShowToast('相册已删除', '原相册图片已安全移入默认相册', 'success');
      loadTabData('albums');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      onShowToast('删除相册失败', err.message, 'error');
    }
  };

  // -------------------------------------------------------------
  // Storage Handlers
  // -------------------------------------------------------------
  const handleSaveLocalConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const item: StorageConfigItem = {
        id: 1,
        driver: 'local',
        name: '本地文件系统与磁盘存储 (Local Storage)',
        isActive: activeDriver === 'local',
        config: localConfig,
      };
      await adminApi.saveStorageConfig(item);
      onShowToast('本地存储配置已保存', `存储路径已更新为: ${localConfig.storagePath}`, 'success');
      loadTabData('storage');
    } catch (err: any) {
      onShowToast('保存本地存储配置失败', err.message, 'error');
    }
  };

  const handleSaveS3Config = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const item: StorageConfigItem = {
        id: 2,
        driver: 's3',
        name: 'Amazon S3 / R2 / MinIO / OSS 存储',
        isActive: activeDriver === 's3',
        config: s3Config,
      };
      await adminApi.saveStorageConfig(item);
      onShowToast('S3 存储配置已保存', '配置已持久化至系统配置中', 'success');
      loadTabData('storage');
    } catch (err: any) {
      onShowToast('保存 S3 配置失败', err.message, 'error');
    }
  };

  const handleSaveWebDAVConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const item: StorageConfigItem = {
        id: 3,
        driver: 'webdav',
        name: 'WebDAV 网盘存储 (Nextcloud/坚果云/Alist)',
        isActive: activeDriver === 'webdav',
        config: webdavConfig,
      };
      await adminApi.saveStorageConfig(item);
      onShowToast('WebDAV 存储配置已保存', '配置已持久化至系统配置中', 'success');
      loadTabData('storage');
    } catch (err: any) {
      onShowToast('保存 WebDAV 配置失败', err.message, 'error');
    }
  };

  const handleSwitchActiveStorage = async (driver: StorageDriverType) => {
    try {
      await adminApi.setActiveStorage(driver);
      setActiveDriver(driver);
      onShowToast('主存储引擎已切换', `当前上传将默认存储至: ${driver.toUpperCase()}`, 'success');
      loadTabData('storage');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      onShowToast('切换失败', err.message, 'error');
    }
  };

  const handleTestStorage = async (driver: StorageDriverType) => {
    setTestingDriver(driver);
    try {
      const config =
        driver === 's3'
          ? s3Config
          : driver === 'webdav'
          ? webdavConfig
          : localConfig;
      const res = await adminApi.testStorageConnection(driver, config);
      setTestResults((prev) => ({ ...prev, [driver]: res }));
      if (res.success) {
        onShowToast('连接测试通过', res.message, 'success');
      } else {
        onShowToast('连接测试失败', res.message, 'error');
      }
    } catch (err: any) {
      onShowToast('测试出错', err.message, 'error');
    } finally {
      setTestingDriver(null);
    }
  };

    const renderTabContent = () => (
    <>
      {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-6">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  <div
                    onClick={() => setActiveTab('images')}
                    className="p-4 rounded-2xl border border-border/80 bg-muted/20 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-medium">总图床资产</span>
                      <ImageIcon className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-black font-mono text-foreground tracking-tight">
                      {stats.totalImages}
                    </p>
                    <p className="text-[11px] text-muted-foreground">全系统已入库图片</p>
                  </div>

                  <div
                    onClick={() => setActiveTab('storage')}
                    className="p-4 rounded-2xl border border-border/80 bg-muted/20 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-medium">存储容量总计</span>
                      <HardDrive className="w-4 h-4 text-indigo-500" />
                    </div>
                    <p className="text-2xl font-black font-mono text-foreground tracking-tight">
                      {formatFileSize(stats.totalSize)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      活跃: {stats.activeStorage.toUpperCase()}
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab('albums')}
                    className="p-4 rounded-2xl border border-border/80 bg-muted/20 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-medium">分类相册</span>
                      <FolderKanban className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-black font-mono text-foreground tracking-tight">
                      {stats.totalAlbums}
                    </p>
                    <p className="text-[11px] text-muted-foreground">主题空间集合</p>
                  </div>

                  <div
                    onClick={() => setActiveTab('tags')}
                    className="p-4 rounded-2xl border border-border/80 bg-muted/20 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-medium">检索标签</span>
                      <TagIcon className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-black font-mono text-foreground tracking-tight">
                      {stats.totalTags}
                    </p>
                    <p className="text-[11px] text-muted-foreground">多维属性标签</p>
                  </div>

                  <div
                    onClick={() => setActiveTab('users')}
                    className="p-4 rounded-2xl border border-border/80 bg-muted/20 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all cursor-pointer space-y-1 col-span-2 sm:col-span-1"
                  >
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-medium">注册用户</span>
                      <Users className="w-4 h-4 text-indigo-500" />
                    </div>
                    <p className="text-2xl font-black font-mono text-foreground tracking-tight">
                      {userCount}
                    </p>
                    <p className="text-[11px] text-muted-foreground">账号与角色权限</p>
                  </div>
                </div>

                {/* Storage Distribution & Formats */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Storage Driver Distribution */}
                  <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cloud className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold text-foreground">存储引擎使用量分配</h3>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        多云负载
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500" /> 本地 Local 存储
                          </span>
                          <span className="font-mono text-muted-foreground">
                            {formatFileSize(stats.storageUsage.local)}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{
                              width: `${
                                stats.totalSize > 0
                                  ? (stats.storageUsage.local / stats.totalSize) * 100
                                  : 100
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500" /> Amazon S3 / R2 /
                            OSS 存储
                          </span>
                          <span className="font-mono text-muted-foreground">
                            {formatFileSize(stats.storageUsage.s3)}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{
                              width: `${
                                stats.totalSize > 0
                                  ? (stats.storageUsage.s3 / stats.totalSize) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> WebDAV
                            网络存储 (Nextcloud/坚果云)
                          </span>
                          <span className="font-mono text-muted-foreground">
                            {formatFileSize(stats.storageUsage.webdav)}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{
                              width: `${
                                stats.totalSize > 0
                                  ? (stats.storageUsage.webdav / stats.totalSize) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/50 flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">当前默认主存储引擎:</span>
                      <Button
                        variant="subtle"
                        size="sm"
                        onClick={() => setActiveTab('storage')}
                        className="h-7 text-xs rounded-full gap-1 cursor-pointer"
                      >
                        <span>{stats.activeStorage.toUpperCase()}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Format Breakdown */}
                  <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold text-foreground">文件格式资产分布</h3>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        MIME 类型
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      {Object.entries(stats.formatStats).map(([format, count]) => (
                        <div
                          key={format}
                          className="p-3 rounded-xl bg-muted/40 border border-border/50 flex flex-col justify-between"
                        >
                          <span className="text-[11px] uppercase font-bold text-primary">
                            {format}
                          </span>
                          <span className="text-lg font-black font-mono text-foreground mt-1">
                            {count}
                          </span>
                          <span className="text-[10px] text-muted-foreground">张图片</span>
                        </div>
                      ))}
                      {Object.keys(stats.formatStats).length === 0 && (
                        <div className="col-span-3 text-center py-6 text-xs text-muted-foreground">
                          暂无格式统计数据
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent Assets List */}
                <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">最近入库资产</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('images')}
                      className="text-xs h-7 gap-1 cursor-pointer"
                    >
                      <span>进入资产列表</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
                    {stats.recentActivity.map((item, idx) => (
                      <div
                        key={`recent-act-${item.id || idx}-${idx}`}
                        onClick={() => {
                          setActiveTab('images');
                          setImageSearch(item.name);
                        }}
                        className="group relative rounded-xl overflow-hidden border border-border/60 aspect-square bg-muted/50 cursor-pointer"
                      >
                        <img
                          src={item.dataUrl || item.url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                          <p className="text-[10px] text-white font-medium truncate w-full">
                            {item.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: IMAGES CRUD */}
            {activeTab === 'images' && (
              <div className="space-y-4">
                {/* Search & Filter Header */}
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 max-w-lg">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="检索图片名称、标签或格式..."
                        value={imageSearch}
                        onChange={(e) => setImageSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleFilterImages()}
                        className="pl-8 text-xs h-9 rounded-xl"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleFilterImages}
                      className="rounded-xl h-9 px-3 text-xs cursor-pointer"
                    >
                      筛选
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 px-0.5">
                    {/* Storage Driver Filter */}
                    <div className="w-36 sm:w-40 shrink-0">
                      <Select
                        value={selectedDriverFilter}
                        onValueChange={setSelectedDriverFilter}
                      >
                        <SelectTrigger className="h-9 rounded-xl text-xs">
                          <SelectValue placeholder="存储驱动" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">所有存储驱动</SelectItem>
                          <SelectItem value="local">本地存储 (Local)</SelectItem>
                          <SelectItem value="s3">Amazon S3 / R2</SelectItem>
                          <SelectItem value="webdav">WebDAV 网盘</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Album Filter */}
                    <div className="w-36 sm:w-40 shrink-0">
                      <Select
                        value={selectedAlbumFilter}
                        onValueChange={setSelectedAlbumFilter}
                      >
                        <SelectTrigger className="h-9 rounded-xl text-xs">
                          <SelectValue placeholder="相册分类" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">所有相册分类</SelectItem>
                          {albums.map((alb) => (
                            <SelectItem key={alb.id} value={alb.id}>
                              {alb.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Batch Action Toolbar */}
                {selectedImages.length > 0 && (
                  <div className="p-3 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">
                        已选 {selectedImages.length} 个
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedImages([])}
                        className="text-xs h-7 text-muted-foreground cursor-pointer"
                      >
                        取消全选
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-40 sm:w-48">
                        <Select
                          onValueChange={(val) => {
                            if (val) handleBatchMove(val);
                          }}
                        >
                          <SelectTrigger className="h-8 rounded-xl text-xs bg-background">
                            <SelectValue placeholder="批量移动到相册..." />
                          </SelectTrigger>
                          <SelectContent>
                            {albums.map((alb) => (
                              <SelectItem key={alb.id} value={alb.id}>
                                {alb.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBatchDelete}
                        className="rounded-xl h-8 px-3 text-xs gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>批量删除</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Images Table / List */}
                <div className="border border-border/80 rounded-2xl overflow-hidden bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-3 w-10">
                            <Checkbox
                              checked={
                                images.length > 0 && selectedImages.length === images.length
                                  ? true
                                  : selectedImages.length > 0
                                  ? 'indeterminate'
                                  : false
                              }
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedImages(images.map((i) => i.id));
                                } else {
                                  setSelectedImages([]);
                                }
                              }}
                              aria-label="全选图片"
                              className="rounded-md"
                            />
                          </th>
                          <th className="p-3">缩略图</th>
                          <th className="p-3">图片名称与原始名</th>
                          <th className="p-3">大小 / 规格</th>
                          <th className="p-3">相册</th>
                          <th className="p-3">标签</th>
                          <th className="p-3">存储后端</th>
                          <th className="p-3">上传时间</th>
                          <th className="p-3 text-right">管理操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-mono">
                        {images.map((img, imgIdx) => {
                          const isSelected = selectedImages.includes(img.id);
                          const matchedAlbum = albums.find((a) => a.id === img.albumId);
                          return (
                            <tr
                              key={`admin-img-row-${img.id || imgIdx}-${imgIdx}`}
                              className={`hover:bg-muted/30 transition-colors ${
                                isSelected ? 'bg-primary/5' : ''
                              }`}
                            >
                              <td className="p-3">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedImages([...selectedImages, img.id]);
                                    } else {
                                      setSelectedImages(selectedImages.filter((id) => id !== img.id));
                                    }
                                  }}
                                  aria-label={`选择 ${img.name}`}
                                  className="rounded-md"
                                />
                              </td>
                              <td className="p-3">
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-border bg-muted/30 shrink-0">
                                  <img
                                    src={img.dataUrl || img.url}
                                    alt={img.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </td>
                              <td className="p-3 max-w-[200px]">
                                <p className="font-semibold text-foreground truncate font-sans">
                                  {img.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {img.originalName || img.name}
                                </p>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <p className="text-foreground">{formatFileSize(img.size)}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {img.width} × {img.height} ({img.extension.toUpperCase()})
                                </p>
                              </td>
                              <td className="p-3 whitespace-nowrap font-sans">
                                <Badge variant="subtle" className="text-[10px] gap-1">
                                  <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: matchedAlbum?.color || '#6366F1' }}
                                  />
                                  {matchedAlbum?.name || '默认相册'}
                                </Badge>
                              </td>
                              <td className="p-3 max-w-[150px] font-sans">
                                <div className="flex flex-wrap gap-1">
                                  {img.tags && img.tags.length > 0 ? (
                                    img.tags.slice(0, 3).map((t, tIdx) => (
                                      <span
                                        key={`admin-img-${img.id}-tag-${t}-${tIdx}`}
                                        className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono"
                                      >
                                        #{t}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground/60">
                                      无标签
                                    </span>
                                  )}
                                  {img.tags && img.tags.length > 3 && (
                                    <span className="text-[9px] text-muted-foreground">
                                      +{img.tags.length - 3}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 whitespace-nowrap font-sans">
                                <Badge
                                  variant={
                                    img.storageDriver === 's3'
                                      ? 'default'
                                      : img.storageDriver === 'webdav'
                                      ? 'secondary'
                                      : 'outline'
                                  }
                                  className="text-[10px] uppercase font-mono"
                                >
                                  {img.storageDriver || 'local'}
                                </Badge>
                              </td>
                              <td className="p-3 whitespace-nowrap text-muted-foreground text-[11px]">
                                {formatDate(img.createdAt)}
                              </td>
                              <td className="p-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenEditImage(img)}
                                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                                    title="编辑元数据"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteImage(img.id)}
                                    className="h-7 w-7 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                                    title="删除图片"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {images.length === 0 && (
                          <tr>
                            <td colSpan={9} className="p-8 text-center text-muted-foreground font-sans">
                              未找到符合条件的图片资产
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: TAGS CRUD & MERGE */}
            {activeTab === 'tags' && (
              <div className="space-y-6">
                {/* Create Tag Bar & Merge Action Trigger */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Create New Tag Form */}
                  <form
                    onSubmit={handleCreateTag}
                    className="p-5 rounded-2xl border border-border/80 bg-card space-y-4 lg:col-span-1"
                  >
                    <div className="flex items-center gap-2">
                      <TagIcon className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">创建新标签</h3>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">
                          标签名称 (自动大写)
                        </label>
                        <Input
                          type="text"
                          required
                          placeholder="例如: CYBERPUNK, RETRO"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          className="text-xs h-9 rounded-xl mt-1"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">
                          标签标识色
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={newTagColor}
                            onChange={(e) => setNewTagColor(e.target.value)}
                            className="w-9 h-9 rounded-xl border border-border cursor-pointer bg-transparent p-0.5"
                          />
                          <Input
                            type="text"
                            value={newTagColor}
                            onChange={(e) => setNewTagColor(e.target.value)}
                            className="text-xs h-9 rounded-xl font-mono flex-1"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">
                          标签说明描述
                        </label>
                        <Input
                          type="text"
                          placeholder="描述该标签的分类归属"
                          value={newTagDesc}
                          onChange={(e) => setNewTagDesc(e.target.value)}
                          className="text-xs h-9 rounded-xl mt-1"
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full rounded-xl text-xs h-9 gap-1.5 cursor-pointer mt-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>添加标签 (Create Tag)</span>
                      </Button>
                    </div>
                  </form>

                  {/* Tags Pool & Operations */}
                  <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-4 lg:col-span-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-primary" />
                          <h3 className="text-sm font-bold text-foreground">全系统标签资产库</h3>
                          <Badge variant="subtle" className="text-[10px] font-mono">
                            {tags.length} 个标签
                          </Badge>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsMergeModalOpen(true)}
                          className="rounded-full text-xs h-8 gap-1.5 cursor-pointer border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/10"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>标签合并工具 (Merge)</span>
                        </Button>
                      </div>

                      {/* Tag Filter Search */}
                      <div className="relative mb-3">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="搜索标签..."
                          value={tagSearch}
                          onChange={(e) => setTagSearch(e.target.value)}
                          className="pl-8 text-xs h-8 rounded-xl"
                        />
                      </div>

                      {/* Tags Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[400px] overflow-y-auto pr-1">
                        {tags
                          .filter((t) =>
                            t.name.toLowerCase().includes(tagSearch.toLowerCase().trim())
                          )
                          .map((tag, tagIdx) => (
                            <div
                              key={`admin-tag-card-${tag.name}-${tag.id || tagIdx}-${tagIdx}`}
                              className="p-2.5 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between gap-2 hover:border-primary/40 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                                  style={{ backgroundColor: tag.color || '#3B82F6' }}
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold font-mono text-foreground truncate">
                                    #{tag.name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {tag.imageCount} 张图片关联
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-0.5 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingTag(tag)}
                                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteTag(tag)}
                                  className="h-7 w-7 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ALBUMS CRUD */}
            {activeTab === 'albums' && (
              <div className="space-y-6">
                {/* Header Action & Add Modal Trigger */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">相册空间管理 (Albums)</h3>
                    <p className="text-xs text-muted-foreground">
                      管理相册的主题颜色、描述信息以及安全删除与资产迁移
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setIsCreatingAlbum(true)}
                    className="rounded-full text-xs h-8 px-3.5 gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新建相册空间</span>
                  </Button>
                </div>

                {/* Albums Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {albums.map((album, albIdx) => (
                    <div
                      key={`admin-album-card-${album.id || albIdx}-${albIdx}`}
                      className="p-4 rounded-2xl border border-border/80 bg-card flex flex-col justify-between space-y-3 relative group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                              style={{ backgroundColor: album.color || '#6366F1' }}
                            />
                            <h4 className="text-xs font-bold text-foreground truncate">
                              {album.name}
                            </h4>
                          </div>
                          {album.isDefault ? (
                            <Badge variant="default" className="text-[9px] px-1.5 py-0">
                              默认
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
                              {album.id}
                            </Badge>
                          )}
                        </div>

                        <p className="text-[11px] text-muted-foreground line-clamp-2 min-h-[32px]">
                          {album.description || '暂无详细描述'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                        <div className="space-y-0.5 font-mono">
                          <span className="font-semibold text-foreground">
                            {album.imageCount || 0}
                          </span>
                          <span className="text-muted-foreground text-[10px]"> 张图片</span>
                          {album.totalSize !== undefined && (
                            <p className="text-[10px] text-muted-foreground">
                              {formatFileSize(album.totalSize)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingAlbum(album)}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          {!album.isDefault && album.id !== 'default' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteAlbum(album)}
                              className="h-7 w-7 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: STORAGE CONFIG (S3 & WEBDAV) */}
            {activeTab === 'storage' && (
              <div className="space-y-6">
                {/* Active Storage Engine Banner */}
                <div className="p-5 rounded-2xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        当前主存储引擎:{' '}
                        <span className="text-primary font-mono">{activeDriver.toUpperCase()}</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        所有前端上传与资产管理默认直接写入此存储介质，支持在多云存储间自由无缝切换
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant={activeDriver === 'local' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSwitchActiveStorage('local')}
                      className="rounded-xl text-xs h-8 px-3 cursor-pointer flex-1 sm:flex-initial"
                    >
                      <span>本地 (Local)</span>
                    </Button>
                    <Button
                      variant={activeDriver === 's3' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSwitchActiveStorage('s3')}
                      className="rounded-xl text-xs h-8 px-3 cursor-pointer flex-1 sm:flex-initial"
                    >
                      <span>S3 / R2 / OSS</span>
                    </Button>
                    <Button
                      variant={activeDriver === 'webdav' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSwitchActiveStorage('webdav')}
                      className="rounded-xl text-xs h-8 px-3 cursor-pointer flex-1 sm:flex-initial"
                    >
                      <span>WebDAV 网盘</span>
                    </Button>
                  </div>
                </div>

                {/* Storage Modules Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {/* Local Storage Config Form */}
                  <form
                    onSubmit={handleSaveLocalConfig}
                    className="p-5 rounded-2xl border border-border/80 bg-card space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-blue-500" />
                          <h3 className="text-sm font-bold text-foreground">
                            本地磁盘与存储路径 (Local FS)
                          </h3>
                        </div>
                        <Badge
                          variant={activeDriver === 'local' ? 'default' : 'outline'}
                          className="text-[10px]"
                        >
                          {activeDriver === 'local' ? '当前使用中' : '备用存储'}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                            <span>本地存储路径 (Storage Path)</span>
                            <span className="text-[10px] text-primary/80 font-normal">支持绝对/相对路径</span>
                          </label>
                          <Input
                            type="text"
                            required
                            placeholder="./uploads/images"
                            value={localConfig.storagePath || ''}
                            onChange={(e) =>
                              setLocalConfig({ ...localConfig, storagePath: e.target.value })
                            }
                            className="text-xs h-8 rounded-xl font-mono mt-1"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                            示例: 相对路径 <code className="text-foreground">./uploads/images</code> 或绝对路径 <code className="text-foreground">/var/data/wanpictures</code>
                          </p>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground">
                            公开 HTTP 访问 URL 前缀
                          </label>
                          <Input
                            type="text"
                            placeholder="/uploads/"
                            value={localConfig.publicUrlPrefix || ''}
                            onChange={(e) =>
                              setLocalConfig({ ...localConfig, publicUrlPrefix: e.target.value })
                            }
                            className="text-xs h-8 rounded-xl font-mono mt-1"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground">
                            子目录按日期组织格式
                          </label>
                          <Select
                            value={localConfig.subfolderFormat || 'YYYY/MM'}
                            onValueChange={(val) =>
                              setLocalConfig({ ...localConfig, subfolderFormat: val })
                            }
                          >
                            <SelectTrigger className="text-xs h-8 rounded-xl font-mono mt-1">
                              <SelectValue placeholder="子目录格式" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="YYYY/MM">YYYY/MM (例如: 2026/08)</SelectItem>
                              <SelectItem value="YYYY/MM/DD">YYYY/MM/DD (按日归档)</SelectItem>
                              <SelectItem value="flat">Flat (不分层子目录)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground">
                            最大配额与容量上限 (MB)
                          </label>
                          <Input
                            type="number"
                            placeholder="10240"
                            value={localConfig.maxSizeMB || ''}
                            onChange={(e) =>
                              setLocalConfig({
                                ...localConfig,
                                maxSizeMB: parseInt(e.target.value) || 0,
                              })
                            }
                            className="text-xs h-8 rounded-xl font-mono mt-1"
                          />
                        </div>
                      </div>

                      {/* Test Result Box */}
                      {testResults['local'] && (
                        <div
                          className={`p-3 rounded-xl border text-xs ${
                            testResults['local'].success
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold">
                            {testResults['local'].success ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <AlertCircle className="w-4 h-4" />
                            )}
                            <span>{testResults['local'].message}</span>
                          </div>
                          {testResults['local'].storagePath && (
                            <p className="text-[10px] mt-0.5 opacity-80 font-mono">
                              目录路径: {testResults['local'].storagePath}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2 mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={testingDriver === 'local'}
                        onClick={() => handleTestStorage('local')}
                        className="rounded-xl text-xs h-8 gap-1.5 cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            testingDriver === 'local' ? 'animate-spin' : ''
                          }`}
                        />
                        <span>测试读写</span>
                      </Button>

                      <Button
                        type="submit"
                        size="sm"
                        className="rounded-xl text-xs h-8 px-4 cursor-pointer"
                      >
                        保存本地配置
                      </Button>
                    </div>
                  </form>

                  {/* S3 Storage Config Form */}
                  <form
                    onSubmit={handleSaveS3Config}
                    className="p-5 rounded-2xl border border-border/80 bg-card space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cloud className="w-4 h-4 text-amber-500" />
                          <h3 className="text-sm font-bold text-foreground">
                            Amazon S3 / R2 / MinIO / OSS
                          </h3>
                        </div>
                        <Badge
                          variant={activeDriver === 's3' ? 'default' : 'outline'}
                          className="text-[10px]"
                        >
                          {activeDriver === 's3' ? '当前使用中' : '备用存储'}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">
                              Endpoint 端点
                            </label>
                            <Input
                              type="text"
                              required
                              placeholder="https://s3.us-east-1.amazonaws.com"
                              value={s3Config.endpoint}
                              onChange={(e) =>
                                setS3Config({ ...s3Config, endpoint: e.target.value })
                              }
                              className="text-xs h-8 rounded-xl font-mono mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">
                              Region 区域
                            </label>
                            <Input
                              type="text"
                              placeholder="us-east-1 / auto"
                              value={s3Config.region}
                              onChange={(e) =>
                                setS3Config({ ...s3Config, region: e.target.value })
                              }
                              className="text-xs h-8 rounded-xl font-mono mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground">
                            Bucket 存储桶名称
                          </label>
                          <Input
                            type="text"
                            required
                            placeholder="例如: wanpictures-assets"
                            value={s3Config.bucket}
                            onChange={(e) =>
                              setS3Config({ ...s3Config, bucket: e.target.value })
                            }
                            className="text-xs h-8 rounded-xl font-mono mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">
                              Access Key ID (AK)
                            </label>
                            <Input
                              type="text"
                              placeholder="AKIAIOSFODNN7EXAMPLE"
                              value={s3Config.accessKeyId}
                              onChange={(e) =>
                                setS3Config({ ...s3Config, accessKeyId: e.target.value })
                              }
                              className="text-xs h-8 rounded-xl font-mono mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">
                              Secret Access Key (SK)
                            </label>
                            <Input
                              type="password"
                              placeholder="••••••••••••••••"
                              value={s3Config.secretAccessKey}
                              onChange={(e) =>
                                setS3Config({ ...s3Config, secretAccessKey: e.target.value })
                              }
                              className="text-xs h-8 rounded-xl font-mono mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground">
                            自定义 CDN 访问域名 (可选)
                          </label>
                          <Input
                            type="text"
                            placeholder="https://cdn.wanpictures.dev"
                            value={s3Config.customDomain || ''}
                            onChange={(e) =>
                              setS3Config({ ...s3Config, customDomain: e.target.value })
                            }
                            className="text-xs h-8 rounded-xl font-mono mt-1"
                          />
                        </div>
                      </div>

                      {/* Test Result Box */}
                      {testResults['s3'] && (
                        <div
                          className={`p-3 rounded-xl border text-xs ${
                            testResults['s3'].success
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold">
                            {testResults['s3'].success ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <AlertCircle className="w-4 h-4" />
                            )}
                            <span>{testResults['s3'].message}</span>
                          </div>
                          {testResults['s3'].latencyMs !== undefined && (
                            <p className="text-[10px] mt-0.5 opacity-80 font-mono">
                              网络往返耗时: {testResults['s3'].latencyMs} ms
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2 mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={testingDriver === 's3'}
                        onClick={() => handleTestStorage('s3')}
                        className="rounded-xl text-xs h-8 gap-1.5 cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${testingDriver === 's3' ? 'animate-spin' : ''}`}
                        />
                        <span>测试连接</span>
                      </Button>

                      <Button
                        type="submit"
                        size="sm"
                        className="rounded-xl text-xs h-8 px-4 cursor-pointer"
                      >
                        保存 S3 配置
                      </Button>
                    </div>
                  </form>

                  {/* WebDAV Storage Config Form */}
                  <form
                    onSubmit={handleSaveWebDAVConfig}
                    className="p-5 rounded-2xl border border-border/80 bg-card space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4 text-emerald-500" />
                          <h3 className="text-sm font-bold text-foreground">
                            WebDAV 网盘存储 (Nextcloud / 坚果云)
                          </h3>
                        </div>
                        <Badge
                          variant={activeDriver === 'webdav' ? 'default' : 'outline'}
                          className="text-[10px]"
                        >
                          {activeDriver === 'webdav' ? '当前使用中' : '备用存储'}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground">
                            WebDAV 服务器地址 (Server URL)
                          </label>
                          <Input
                            type="text"
                            required
                            placeholder="https://dav.jianguoyun.com/dav/"
                            value={webdavConfig.serverUrl}
                            onChange={(e) =>
                              setWebdavConfig({ ...webdavConfig, serverUrl: e.target.value })
                            }
                            className="text-xs h-8 rounded-xl font-mono mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">
                              WebDAV 用户名
                            </label>
                            <Input
                              type="text"
                              placeholder="username@example.com"
                              value={webdavConfig.username}
                              onChange={(e) =>
                                setWebdavConfig({ ...webdavConfig, username: e.target.value })
                              }
                              className="text-xs h-8 rounded-xl font-mono mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">
                              密码 / 应用专用授权码
                            </label>
                            <Input
                              type="password"
                              placeholder="••••••••••••••••"
                              value={webdavConfig.password}
                              onChange={(e) =>
                                setWebdavConfig({ ...webdavConfig, password: e.target.value })
                              }
                              className="text-xs h-8 rounded-xl font-mono mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground">
                            网盘存储根目录 (Root Directory)
                          </label>
                          <Input
                            type="text"
                            placeholder="/wanpictures/uploads/"
                            value={webdavConfig.rootPath}
                            onChange={(e) =>
                              setWebdavConfig({ ...webdavConfig, rootPath: e.target.value })
                            }
                            className="text-xs h-8 rounded-xl font-mono mt-1"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground">
                            公开访问代理地址 (可选)
                          </label>
                          <Input
                            type="text"
                            placeholder="https://dav-proxy.example.com"
                            value={webdavConfig.publicProxy || ''}
                            onChange={(e) =>
                              setWebdavConfig({ ...webdavConfig, publicProxy: e.target.value })
                            }
                            className="text-xs h-8 rounded-xl font-mono mt-1"
                          />
                        </div>
                      </div>

                      {/* Test Result Box */}
                      {testResults['webdav'] && (
                        <div
                          className={`p-3 rounded-xl border text-xs ${
                            testResults['webdav'].success
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold">
                            {testResults['webdav'].success ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <AlertCircle className="w-4 h-4" />
                            )}
                            <span>{testResults['webdav'].message}</span>
                          </div>
                          {testResults['webdav'].latencyMs !== undefined && (
                            <p className="text-[10px] mt-0.5 opacity-80 font-mono">
                              网络往返耗时: {testResults['webdav'].latencyMs} ms
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2 mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={testingDriver === 'webdav'}
                        onClick={() => handleTestStorage('webdav')}
                        className="rounded-xl text-xs h-8 gap-1.5 cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            testingDriver === 'webdav' ? 'animate-spin' : ''
                          }`}
                        />
                        <span>测试连接</span>
                      </Button>

                      <Button
                        type="submit"
                        size="sm"
                        className="rounded-xl text-xs h-8 px-4 cursor-pointer"
                      >
                        保存 WebDAV 配置
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 5: USER MANAGEMENT */}
            {activeTab === 'users' && (
              <UserManagementTab
                currentUser={user}
                onShowToast={onShowToast}
                onUserCountChange={(count) => setUserCount(count)}
              />
            )}
    </>
  );

  const renderDialogs = () => (
    <>
      {/* Edit Image Modal Sub-Dialog */}
          <Dialog open={!!editingImage} onOpenChange={(open) => !open && setEditingImage(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold text-foreground">编辑图片元数据</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  修改图片的显示名称、归属相册及索引标签
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">图片名称</label>
                  <Input
                    type="text"
                    value={editImageName}
                    onChange={(e) => setEditImageName(e.target.value)}
                    className="text-xs h-9 rounded-xl mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">归属相册</label>
                  <div className="mt-1">
                    <Select
                      value={editImageAlbum}
                      onValueChange={setEditImageAlbum}
                    >
                      <SelectTrigger className="w-full text-xs h-9 rounded-xl">
                        <SelectValue placeholder="选择归属相册" />
                      </SelectTrigger>
                      <SelectContent>
                        {albums.map((alb) => (
                          <SelectItem key={alb.id} value={alb.id}>
                            {alb.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    标签 (英文逗号隔开)
                  </label>
                  <Input
                    type="text"
                    placeholder="WALLPAPER, 4K, NATURE"
                    value={editImageTags}
                    onChange={(e) => setEditImageTags(e.target.value)}
                    className="text-xs h-9 rounded-xl mt-1 font-mono"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingImage(null)}
                  className="text-xs h-8 rounded-xl"
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveImageEdit}
                  className="text-xs h-8 rounded-xl px-4 cursor-pointer"
                >
                  保存更新
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Merge Tags Modal Sub-Dialog */}
          <Dialog open={isMergeModalOpen} onOpenChange={setIsMergeModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
                  <span>合并标签工具</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  将源标签下的所有图片资产统一迁移至目标标签，并自动删除源标签。
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    源标签 (将被合并并删除)
                  </label>
                  <div className="mt-1">
                    <Select
                      value={mergeSourceTag}
                      onValueChange={setMergeSourceTag}
                    >
                      <SelectTrigger className="w-full text-xs h-9 rounded-xl font-mono">
                        <SelectValue placeholder="-- 选择要被合并的标签 --" />
                      </SelectTrigger>
                      <SelectContent>
                        {tags.map((t, tIdx) => (
                          <SelectItem
                            key={`merge-src-tag-${t.name}-${t.id || tIdx}-${tIdx}`}
                            value={t.name}
                          >
                            #{t.name} ({t.imageCount} 张图片)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    目标标签 (保留并继承资产)
                  </label>
                  <div className="mt-1">
                    <Select
                      value={mergeTargetTag}
                      onValueChange={setMergeTargetTag}
                    >
                      <SelectTrigger className="w-full text-xs h-9 rounded-xl font-mono">
                        <SelectValue placeholder="-- 选择目标标签 --" />
                      </SelectTrigger>
                      <SelectContent>
                        {tags
                          .filter((t) => t.name !== mergeSourceTag)
                          .map((t, tIdx) => (
                            <SelectItem
                              key={`merge-tgt-tag-${t.name}-${t.id || tIdx}-${tIdx}`}
                              value={t.name}
                            >
                              #{t.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMergeModalOpen(false)}
                  className="text-xs h-8 rounded-xl"
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleMergeTags}
                  disabled={!mergeSourceTag || !mergeTargetTag}
                  className="text-xs h-8 rounded-xl px-4 cursor-pointer"
                >
                  执行合并
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Album Modal Sub-Dialog */}
          <Dialog open={isCreatingAlbum} onOpenChange={setIsCreatingAlbum}>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleCreateAlbum} className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-sm font-bold text-foreground">新建相册空间</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    创建独立的相册主题空间来归类管理图片
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-1">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">相册名称</label>
                    <Input
                      type="text"
                      required
                      placeholder="例如: 2026 年风光特辑"
                      value={newAlbumName}
                      onChange={(e) => setNewAlbumName(e.target.value)}
                      className="text-xs h-9 rounded-xl mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">相册主题色</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={newAlbumColor}
                        onChange={(e) => setNewAlbumColor(e.target.value)}
                        className="w-9 h-9 rounded-xl border border-border cursor-pointer bg-transparent p-0.5"
                      />
                      <Input
                        type="text"
                        value={newAlbumColor}
                        onChange={(e) => setNewAlbumColor(e.target.value)}
                        className="text-xs h-9 rounded-xl font-mono flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      相册描述 (可选)
                    </label>
                    <Input
                      type="text"
                      placeholder="记录与收藏此相册的目的"
                      value={newAlbumDesc}
                      onChange={(e) => setNewAlbumDesc(e.target.value)}
                      className="text-xs h-9 rounded-xl mt-1"
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCreatingAlbum(false)}
                    className="text-xs h-8 rounded-xl"
                  >
                    取消
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="text-xs h-8 rounded-xl px-4 cursor-pointer"
                  >
                    创建相册
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Tag Sub-Dialog */}
          <Dialog open={!!editingTag} onOpenChange={(open) => !open && setEditingTag(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold text-foreground">编辑标签</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  修改标签名称、色彩标识及描述说明
                </DialogDescription>
              </DialogHeader>

              {editingTag && (
                <div className="space-y-3 py-1">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">标签名称</label>
                    <Input
                      type="text"
                      required
                      value={editingTag.name}
                      onChange={(e) =>
                        setEditingTag({ ...editingTag, name: e.target.value.toUpperCase() })
                      }
                      className="text-xs h-9 rounded-xl mt-1 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">标签颜色</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={editingTag.color}
                        onChange={(e) => setEditingTag({ ...editingTag, color: e.target.value })}
                        className="w-9 h-9 rounded-xl border border-border cursor-pointer bg-transparent p-0.5"
                      />
                      <Input
                        type="text"
                        value={editingTag.color}
                        onChange={(e) => setEditingTag({ ...editingTag, color: e.target.value })}
                        className="text-xs h-9 rounded-xl font-mono flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">描述</label>
                    <Input
                      type="text"
                      value={editingTag.description || ''}
                      onChange={(e) =>
                        setEditingTag({ ...editingTag, description: e.target.value })
                      }
                      className="text-xs h-9 rounded-xl mt-1"
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTag(null)}
                  className="text-xs h-8 rounded-xl"
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdateTag}
                  className="text-xs h-8 rounded-xl px-4 cursor-pointer"
                >
                  保存标签
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Album Sub-Dialog */}
          <Dialog open={!!editingAlbum} onOpenChange={(open) => !open && setEditingAlbum(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold text-foreground">编辑相册空间</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  修改相册名称、主题色及备注信息
                </DialogDescription>
              </DialogHeader>

              {editingAlbum && (
                <div className="space-y-3 py-1">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">相册名称</label>
                    <Input
                      type="text"
                      required
                      value={editingAlbum.name}
                      onChange={(e) => setEditingAlbum({ ...editingAlbum, name: e.target.value })}
                      className="text-xs h-9 rounded-xl mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">主题颜色</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={editingAlbum.color}
                        onChange={(e) => setEditingAlbum({ ...editingAlbum, color: e.target.value })}
                        className="w-9 h-9 rounded-xl border border-border cursor-pointer bg-transparent p-0.5"
                      />
                      <Input
                        type="text"
                        value={editingAlbum.color}
                        onChange={(e) => setEditingAlbum({ ...editingAlbum, color: e.target.value })}
                        className="text-xs h-9 rounded-xl font-mono flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">描述</label>
                    <Input
                      type="text"
                      value={editingAlbum.description || ''}
                      onChange={(e) =>
                        setEditingAlbum({ ...editingAlbum, description: e.target.value })
                      }
                      className="text-xs h-9 rounded-xl mt-1"
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingAlbum(null)}
                  className="text-xs h-8 rounded-xl"
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdateAlbum}
                  className="text-xs h-8 rounded-xl px-4 cursor-pointer"
                >
                  保存相册
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
    </>
  );

  if (!isOpen && !isPageVariant) return null;

  // For page variant, use a full-page layout instead of the modal overlay
  if (isPageVariant) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
                  万图管理中心 (Wan Pictures Admin)
                </h2>
                <Badge variant="default" className="text-[10px] px-2 py-0.5">
                  CONTROL PLANE
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground">
                  全量资产管理、标签相册与 S3 / WebDAV 多存储引擎调度
                </p>
                <span className="text-muted-foreground/40">•</span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${backendOnline ? "text-emerald-500" : "text-emerald-500"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? "bg-emerald-500" : "bg-emerald-500"}`} />
                  {backendOnline ? "云端服务在线" : "本地数据模式"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTabData(activeTab)}
              disabled={loading}
              className="rounded-full h-8 px-3 text-xs gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>刷新</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-full h-8 px-3 text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回</span>
            </Button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center px-6 border-b border-border/80 bg-muted/40 overflow-x-auto no-scrollbar shrink-0 gap-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "overview"
                ? "border-primary text-primary bg-background/50"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>系统概览与指标</span>
          </button>

          <button
            onClick={() => setActiveTab("images")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "images"
                ? "border-primary text-primary bg-background/50"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>图片资产管理</span>
            {stats && (
              <Badge variant="subtle" className="text-[10px] px-1.5 py-0 font-mono">
                {stats.totalImages}
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveTab("tags")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "tags"
                ? "border-primary text-primary bg-background/50"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <TagIcon className="w-4 h-4" />
            <span>标签归类与合并</span>
            {stats && (
              <Badge variant="subtle" className="text-[10px] px-1.5 py-0 font-mono">
                {stats.totalTags}
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveTab("albums")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "albums"
                ? "border-primary text-primary bg-background/50"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>相册空间管理</span>
            {stats && (
              <Badge variant="subtle" className="text-[10px] px-1.5 py-0 font-mono">
                {stats.totalAlbums}
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveTab("storage")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "storage"
                ? "border-primary text-primary bg-background/50"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>存储引擎配置 (S3 / WebDAV)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "users"
                ? "border-primary text-primary bg-background/50"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4 text-indigo-500" />
            <span>用户权限管理</span>
            <Badge variant="subtle" className="text-[10px] px-1.5 py-0 font-mono bg-indigo-500/10 text-indigo-500">
              {userCount}
            </Badge>
          </button>
        </div>

        {/* Main Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {renderTabContent()}
        </div>

        {/* Sub-dialogs */}
        {renderDialogs()}
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-6xl h-[92vh] max-h-[850px] bg-background border border-border/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-foreground"
        >
          {/* Top Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-muted/20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
                    万图管理中心 (Wan Pictures Admin)
                  </h2>
                  <Badge variant="default" className="text-[10px] px-2 py-0.5">
                    CONTROL PLANE
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground">
                    全量资产管理、标签相册与 S3 / WebDAV 多存储引擎调度
                  </p>
                  <span className="text-muted-foreground/40">•</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${backendOnline ? "text-emerald-500" : "text-emerald-500"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? "bg-emerald-500" : "bg-emerald-500"}`} />
                    {backendOnline ? "云端服务在线" : "本地数据模式"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadTabData(activeTab)}
                disabled={loading}
                className="rounded-full h-8 px-3 text-xs gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>刷新</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="flex items-center px-6 border-b border-border/80 bg-muted/40 overflow-x-auto no-scrollbar shrink-0 gap-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "overview"
                  ? "border-primary text-primary bg-background/50"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>系统概览与指标</span>
            </button>

            <button
              onClick={() => setActiveTab("images")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "images"
                  ? "border-primary text-primary bg-background/50"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>图片资产管理</span>
              {stats && (
                <Badge variant="subtle" className="text-[10px] px-1.5 py-0 font-mono">
                  {stats.totalImages}
                </Badge>
              )}
            </button>

            <button
              onClick={() => setActiveTab("tags")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "tags"
                  ? "border-primary text-primary bg-background/50"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <TagIcon className="w-4 h-4" />
              <span>标签归类与合并</span>
              {stats && (
                <Badge variant="subtle" className="text-[10px] px-1.5 py-0 font-mono">
                  {stats.totalTags}
                </Badge>
              )}
            </button>

            <button
              onClick={() => setActiveTab("albums")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "albums"
                  ? "border-primary text-primary bg-background/50"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              <span>相册空间管理</span>
              {stats && (
                <Badge variant="subtle" className="text-[10px] px-1.5 py-0 font-mono">
                  {stats.totalAlbums}
                </Badge>
              )}
            </button>

            <button
              onClick={() => setActiveTab("storage")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "storage"
                  ? "border-primary text-primary bg-background/50"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>存储引擎配置 (S3 / WebDAV)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "users"
                  ? "border-primary text-primary bg-background/50"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4 text-indigo-500" />
              <span>用户权限管理</span>
              <Badge variant="subtle" className="text-[10px] px-1.5 py-0 font-mono bg-indigo-500/10 text-indigo-500">
                {userCount}
              </Badge>
            </button>
          </div>

          {/* Main Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {renderTabContent()}
          </div>

          {/* Sub-dialogs */}
          {renderDialogs()}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

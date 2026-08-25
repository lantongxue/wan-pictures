import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HardDrive,
  Cloud,
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Sliders,
  Radio,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Database,
  Check,
  Globe,
  FolderTree,
  FileCheck,
} from 'lucide-react';
import {
  StorageConfigItem,
  StorageDriverType,
  StorageTestResult,
  LocalStorageConfig,
  S3Config,
  WebDAVConfig,
} from '../../types';
import { adminApi } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';

export const AdminStoragePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [storageConfigs, setStorageConfigs] = useState<StorageConfigItem[]>([]);
  const [activeDriver, setActiveDriver] = useState<StorageDriverType>('local');
  const [testingDriver, setTestingDriver] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, StorageTestResult>>({});

  // Active tab inside storage page: 'all' | 'local' | 's3' | 'webdav'
  const [selectedDriverTab, setSelectedDriverTab] = useState<StorageDriverType>('local');

  // Show/Hide password states
  const [showS3Secret, setShowS3Secret] = useState(false);
  const [showDavPassword, setShowDavPassword] = useState(false);

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

  // Toast feedback
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const loadConfigs = async () => {
    setLoading(true);
    try {
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
    } catch (err: any) {
      showNotification(err.message || '加载存储配置失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleSwitchActiveStorage = async (driver: StorageDriverType) => {
    try {
      await adminApi.setActiveStorage(driver);
      setActiveDriver(driver);
      showNotification(`主存储引擎已切换至: ${driver.toUpperCase()}`);
      loadConfigs();
    } catch (err: any) {
      showNotification(err.message || '切换主存储失败', 'error');
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
        showNotification(`[${driver.toUpperCase()}] 连接测试成功 (耗时: ${res.latencyMs || 12}ms)`);
      } else {
        showNotification(`[${driver.toUpperCase()}] 连接测试失败: ${res.message}`, 'error');
      }
    } catch (err: any) {
      showNotification(err.message || '连接测试异常', 'error');
    } finally {
      setTestingDriver(null);
    }
  };

  const handleSaveLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const item: StorageConfigItem = {
        id: 1,
        driver: 'local',
        name: '本地文件系统与离线存储 (Local Storage)',
        isActive: activeDriver === 'local',
        config: localConfig,
      };
      await adminApi.saveStorageConfig(item);
      showNotification('本地磁盘存储配置已成功持久化');
      loadConfigs();
    } catch (err: any) {
      showNotification(err.message || '保存失败', 'error');
    }
  };

  const handleSaveS3 = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const item: StorageConfigItem = {
        id: 2,
        driver: 's3',
        name: 'Amazon S3 / Cloudflare R2 / OSS / COS 对象存储',
        isActive: activeDriver === 's3',
        config: s3Config,
      };
      await adminApi.saveStorageConfig(item);
      showNotification('S3 对象存储配置已成功保存');
      loadConfigs();
    } catch (err: any) {
      showNotification(err.message || '保存失败', 'error');
    }
  };

  const handleSaveWebDAV = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const item: StorageConfigItem = {
        id: 3,
        driver: 'webdav',
        name: 'WebDAV 网盘存储 (坚果云 / Nextcloud / Alist)',
        isActive: activeDriver === 'webdav',
        config: webdavConfig,
      };
      await adminApi.saveStorageConfig(item);
      showNotification('WebDAV 网盘存储配置已保存');
      loadConfigs();
    } catch (err: any) {
      showNotification(err.message || '保存失败', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500 text-white'
                : 'bg-rose-500 text-white'
            }`}
          >
            <span>{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              多云存储引擎调度与配置
            </h1>
            <Badge variant="subtle" className="text-[10px] font-mono">
              MULTI-DRIVER
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            支持本地磁盘 Local、S3/OSS/R2 对象存储与 WebDAV 网盘协议动态调度与连通性自检
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadConfigs}
            disabled={loading}
            className="h-9 px-3 text-xs rounded-xl gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>刷新配置</span>
          </Button>
        </div>
      </div>

      {/* Storage Engine Status Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Local Card */}
        <div
          onClick={() => setSelectedDriverTab('local')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
            selectedDriverTab === 'local'
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/5'
              : 'border-border/80 bg-card hover:border-border'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">本地磁盘存储</h3>
                <p className="text-[11px] text-muted-foreground">Local File System</p>
              </div>
            </div>

            {activeDriver === 'local' ? (
              <Badge variant="default" className="text-[9px] bg-blue-600">
                ACTIVE
              </Badge>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSwitchActiveStorage('local');
                }}
                className="text-[10px] text-primary hover:underline font-semibold"
              >
                设为主存储
              </button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            利用服务端本地磁盘或挂载卷存储，支持无损路径归档与极速读写。
          </p>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60">
            <span className="text-[11px] font-mono text-muted-foreground">
              {localConfig.storagePath}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleTestStorage('local');
              }}
              className="h-7 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 cursor-pointer"
            >
              {testingDriver === 'local' ? '检测中...' : '测试连通性'}
            </Button>
          </div>
        </div>

        {/* S3 Card */}
        <div
          onClick={() => setSelectedDriverTab('s3')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
            selectedDriverTab === 's3'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5'
              : 'border-border/80 bg-card hover:border-border'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">S3 对象存储</h3>
                <p className="text-[11px] text-muted-foreground">AWS / R2 / OSS / MinIO</p>
              </div>
            </div>

            {activeDriver === 's3' ? (
              <Badge variant="default" className="text-[9px] bg-amber-600">
                ACTIVE
              </Badge>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSwitchActiveStorage('s3');
                }}
                className="text-[10px] text-primary hover:underline font-semibold"
              >
                设为主存储
              </button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            兼容标准 S3 协议，支持 AWS S3、Cloudflare R2、阿里云 OSS、腾讯云 COS 与自建 MinIO。
          </p>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60">
            <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[150px]">
              {s3Config.bucket ? `bucket: ${s3Config.bucket}` : '未配置存储桶'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleTestStorage('s3');
              }}
              className="h-7 text-xs text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 cursor-pointer"
            >
              {testingDriver === 's3' ? '检测中...' : '测试连通性'}
            </Button>
          </div>
        </div>

        {/* WebDAV Card */}
        <div
          onClick={() => setSelectedDriverTab('webdav')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
            selectedDriverTab === 'webdav'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5'
              : 'border-border/80 bg-card hover:border-border'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">WebDAV 网盘</h3>
                <p className="text-[11px] text-muted-foreground">坚果云 / Nextcloud / Alist</p>
              </div>
            </div>

            {activeDriver === 'webdav' ? (
              <Badge variant="default" className="text-[9px] bg-emerald-600">
                ACTIVE
              </Badge>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSwitchActiveStorage('webdav');
                }}
                className="text-[10px] text-primary hover:underline font-semibold"
              >
                设为主存储
              </button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            连接坚果云、群晖 NAS、Nextcloud 或 Alist 网盘，将个人私有网盘作为图床持久化后端。
          </p>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60">
            <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[150px]">
              {webdavConfig.serverUrl}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleTestStorage('webdav');
              }}
              className="h-7 text-xs text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
            >
              {testingDriver === 'webdav' ? '检测中...' : '测试连通性'}
            </Button>
          </div>
        </div>
      </div>

      {/* Test Result Callout if available */}
      {testResults[selectedDriverTab] && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border text-xs flex items-start justify-between gap-3 ${
            testResults[selectedDriverTab].success
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {testResults[selectedDriverTab].success ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
            )}
            <div>
              <p className="font-bold">
                [{selectedDriverTab.toUpperCase()} 连通性测试] {testResults[selectedDriverTab].message}
              </p>
              {testResults[selectedDriverTab].diagnostics && (
                <p className="text-[11px] mt-0.5 font-mono opacity-80">
                  {testResults[selectedDriverTab].diagnostics}
                </p>
              )}
            </div>
          </div>

          {testResults[selectedDriverTab].latencyMs !== undefined && (
            <Badge variant="subtle" className="text-[10px] font-mono shrink-0">
              {testResults[selectedDriverTab].latencyMs} ms
            </Badge>
          )}
        </motion.div>
      )}

      {/* Configuration Forms */}
      <div className="p-6 rounded-3xl border border-border/80 bg-card space-y-6 shadow-xs">
        {/* ========================================================= */}
        {/* TAB 1: LOCAL STORAGE CONFIG */}
        {/* ========================================================= */}
        {selectedDriverTab === 'local' && (
          <form onSubmit={handleSaveLocal} className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-blue-500" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">本地磁盘存储参数配置</h3>
                  <p className="text-xs text-muted-foreground">Local Storage Parameters & Retention</p>
                </div>
              </div>

              {activeDriver !== 'local' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleSwitchActiveStorage('local')}
                  className="text-xs rounded-xl gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>设为主写入存储</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  服务端存储根路径 (Storage Root Path)
                </label>
                <Input
                  type="text"
                  required
                  value={localConfig.storagePath}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, storagePath: e.target.value })
                  }
                  className="text-xs h-9 rounded-xl mt-1 font-mono"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  图片在服务器文件系统的真实持久化目录，例如 ./uploads/images
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  公网访问 URL 前缀 (Public URL Prefix)
                </label>
                <Input
                  type="text"
                  required
                  value={localConfig.publicUrlPrefix}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, publicUrlPrefix: e.target.value })
                  }
                  className="text-xs h-9 rounded-xl mt-1 font-mono"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  静态资源路由映射前缀，例如 /uploads/
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  子目录日期划分规范 (Subfolder Format)
                </label>
                <Input
                  type="text"
                  value={localConfig.subfolderFormat || 'YYYY/MM'}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, subfolderFormat: e.target.value })
                  }
                  className="text-xs h-9 rounded-xl mt-1 font-mono"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  支持 YYYY/MM 或 YYYYMMDD 按年月自动创建子目录
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  最大存储配额容量 (MB)
                </label>
                <Input
                  type="number"
                  value={localConfig.maxSizeMB || 10240}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, maxSizeMB: Number(e.target.value) })
                  }
                  className="text-xs h-9 rounded-xl mt-1 font-mono"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  本地单磁盘最大允许占用的配额容量 (默认 10GB)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTestStorage('local')}
                className="text-xs rounded-xl cursor-pointer"
              >
                {testingDriver === 'local' ? '测试中...' : '测试磁盘连通性'}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs rounded-xl bg-primary text-primary-foreground font-semibold cursor-pointer shadow-xs"
              >
                保存本地配置
              </Button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* TAB 2: S3 STORAGE CONFIG */}
        {/* ========================================================= */}
        {selectedDriverTab === 's3' && (
          <form onSubmit={handleSaveS3} className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">S3 兼容对象存储参数配置</h3>
                  <p className="text-xs text-muted-foreground">Amazon S3 / R2 / OSS / MinIO Credentials</p>
                </div>
              </div>

              {activeDriver !== 's3' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleSwitchActiveStorage('s3')}
                  className="text-xs rounded-xl gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>设为主写入存储</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  S3 Endpoint (端点地址) *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="https://s3.us-east-1.amazonaws.com 或 https://xxx.r2.cloudflarestorage.com"
                  value={s3Config.endpoint}
                  onChange={(e) => setS3Config({ ...s3Config, endpoint: e.target.value })}
                  className="text-xs h-9 rounded-xl mt-1 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Bucket (存储桶名称) *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="例如: wanpictures-assets"
                  value={s3Config.bucket}
                  onChange={(e) => setS3Config({ ...s3Config, bucket: e.target.value })}
                  className="text-xs h-9 rounded-xl mt-1 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Access Key ID (AK) *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  value={s3Config.accessKeyId}
                  onChange={(e) => setS3Config({ ...s3Config, accessKeyId: e.target.value })}
                  className="text-xs h-9 rounded-xl mt-1 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Secret Access Key (SK) *
                </label>
                <div className="relative mt-1">
                  <Input
                    type={showS3Secret ? 'text' : 'password'}
                    required
                    placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                    value={s3Config.secretAccessKey}
                    onChange={(e) =>
                      setS3Config({ ...s3Config, secretAccessKey: e.target.value })
                    }
                    className="text-xs h-9 rounded-xl font-mono pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowS3Secret(!showS3Secret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showS3Secret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  自定义 CDN 加速域名 (Custom Domain)
                </label>
                <Input
                  type="text"
                  placeholder="https://cdn.yourdomain.com (留空则默认 S3 直链)"
                  value={s3Config.customDomain}
                  onChange={(e) => setS3Config({ ...s3Config, customDomain: e.target.value })}
                  className="text-xs h-9 rounded-xl mt-1 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Region (地域)</label>
                <Input
                  type="text"
                  placeholder="例如: us-east-1 / auto / oss-cn-hangzhou"
                  value={s3Config.region}
                  onChange={(e) => setS3Config({ ...s3Config, region: e.target.value })}
                  className="text-xs h-9 rounded-xl mt-1 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTestStorage('s3')}
                className="text-xs rounded-xl cursor-pointer"
              >
                {testingDriver === 's3' ? '测试中...' : '测试 S3 连通性'}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold cursor-pointer shadow-xs"
              >
                保存 S3 配置
              </Button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* TAB 3: WEBDAV STORAGE CONFIG */}
        {/* ========================================================= */}
        {selectedDriverTab === 'webdav' && (
          <form onSubmit={handleSaveWebDAV} className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-emerald-500" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">WebDAV 网盘存储参数配置</h3>
                  <p className="text-xs text-muted-foreground">Nextcloud / 坚果云 / Alist Protocol Parameters</p>
                </div>
              </div>

              {activeDriver !== 'webdav' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleSwitchActiveStorage('webdav')}
                  className="text-xs rounded-xl gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>设为主写入存储</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  WebDAV 服务器地址 (Server URL) *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="https://dav.jianguoyun.com/dav/ 或 https://pan.example.com/dav"
                  value={webdavConfig.serverUrl}
                  onChange={(e) =>
                    setWebdavConfig({ ...webdavConfig, serverUrl: e.target.value })
                  }
                  className="text-xs h-9 rounded-xl mt-1 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  网盘根目录路径 (Root Path)
                </label>
                <Input
                  type="text"
                  placeholder="/wanpictures/uploads/"
                  value={webdavConfig.rootPath}
                  onChange={(e) =>
                    setWebdavConfig({ ...webdavConfig, rootPath: e.target.value })
                  }
                  className="text-xs h-9 rounded-xl mt-1 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  WebDAV 账号 / 邮箱 (Username) *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="alex@example.com"
                  value={webdavConfig.username}
                  onChange={(e) =>
                    setWebdavConfig({ ...webdavConfig, username: e.target.value })
                  }
                  className="text-xs h-9 rounded-xl mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  WebDAV 密码 / 应用授权码 (App Password) *
                </label>
                <div className="relative mt-1">
                  <Input
                    type={showDavPassword ? 'text' : 'password'}
                    required
                    placeholder="坚果云生成的应用授权专用密码"
                    value={webdavConfig.password}
                    onChange={(e) =>
                      setWebdavConfig({ ...webdavConfig, password: e.target.value })
                    }
                    className="text-xs h-9 rounded-xl font-mono pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDavPassword(!showDavPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showDavPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTestStorage('webdav')}
                className="text-xs rounded-xl cursor-pointer"
              >
                {testingDriver === 'webdav' ? '测试中...' : '测试 WebDAV 连通性'}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-xs"
              >
                保存 WebDAV 配置
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

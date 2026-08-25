import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings,
  Database,
  Download,
  Upload,
  Trash2,
  Check,
  AlertTriangle,
  Server,
  Cpu,
  Layers,
  Shield,
  RefreshCw,
  HardDrive,
} from 'lucide-react';
import { UploadSettings, Album } from '../../types';
import { dbService, DEFAULT_SETTINGS, DEFAULT_ALBUMS } from '../../utils/db';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

export const AdminSettingsPage: React.FC = () => {
  const { backendOnline } = useAuth();
  const [settings, setSettings] = useState<UploadSettings>(DEFAULT_SETTINGS);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);

  // Notification feedback
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [currSettings, currAlbums] = await Promise.all([
        dbService.getSettings(),
        dbService.getAllAlbums(),
      ]);
      setSettings(currSettings);
      setAlbums(currAlbums);
    } catch (err: any) {
      showNotification(err.message || '加载配置失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dbService.saveSettings(settings);
      showNotification('全局默认偏好设置已成功保存');
    } catch (err: any) {
      showNotification(err.message || '保存设置失败', 'error');
    }
  };

  // Export Full Data Backup (JSON)
  const handleExportBackup = async () => {
    try {
      const [images, albumsList, tagsList, configs, usersList] = await Promise.all([
        dbService.getAllImages(),
        dbService.getAllAlbums(),
        dbService.getAllTags(),
        dbService.getStorageConfigs(),
        dbService.getAllUsers(),
      ]);

      const backupData = {
        version: '1.1.0',
        exportedAt: new Date().toISOString(),
        appName: 'Wan Pictures (万图)',
        data: {
          images,
          albums: albumsList,
          tags: tagsList,
          storageConfigs: configs,
          settings,
          users: usersList,
        },
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wanpictures_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showNotification('全量数据库备份文件已成功导出下载');
    } catch (err: any) {
      showNotification(err.message || '导出失败', 'error');
    }
  };

  // Import Backup (JSON)
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      if (json.data && json.data.images && json.data.albums) {
        await dbService.saveImages(json.data.images);
        for (const alb of json.data.albums) {
          await dbService.saveAlbum(alb);
        }
        if (json.data.tags) {
          for (const tag of json.data.tags) {
            await dbService.saveTag(tag);
          }
        }
        if (json.data.settings) {
          await dbService.saveSettings(json.data.settings);
        }

        showNotification(`备份数据还原成功！已导入 ${json.data.images.length} 张图片`);
        loadData();
      } else {
        showNotification('备份文件格式不合法', 'error');
      }
    } catch (err: any) {
      showNotification(err.message || '导入还原失败', 'error');
    } finally {
      e.target.value = '';
    }
  };

  // Clear all data
  const handleClearDatabase = async () => {
    if (
      !confirm(
        '⚠️ 高危操作：确定要清空数据库中的所有图片与自定义相册吗？此操作不可恢复！'
      )
    )
      return;

    try {
      await dbService.clearAllData();
      showNotification('数据库已重置为出厂初始状态');
      loadData();
    } catch (err: any) {
      showNotification(err.message || '清空失败', 'error');
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
              系统维护、全局偏好与数据备份
            </h1>
            <Badge variant="subtle" className="text-[10px] font-mono">
              SYSTEM
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            系统环境规格、全库 JSON 备份导出导入与资产预处理默认策略配置
          </p>
        </div>
      </div>

      {/* 1. Environment & Architecture Spec Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl border border-border/80 bg-card space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-primary">
            <Server className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">后端架构 (Backend Engine)</h3>
          </div>
          <p className="text-base font-black font-mono text-foreground">Golang 1.22 + Gin + GORM</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={`w-2 h-2 rounded-full ${
                backendOnline ? 'bg-emerald-500' : 'bg-emerald-500'
              }`}
            />
            <span>{backendOnline ? '云端 API 服务运行中' : '本地浏览器存储引擎就绪'}</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl border border-border/80 bg-card space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-500">
            <Database className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">持久化存储 (Database Engine)</h3>
          </div>
          <p className="text-base font-black font-mono text-foreground">SQLite / IndexedDB v3</p>
          <p className="text-xs text-muted-foreground">双向离线优先持久化机制与事务保证</p>
        </div>

        <div className="p-5 rounded-3xl border border-border/80 bg-card space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-500">
            <Cpu className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">前端框架 (Frontend Stack)</h3>
          </div>
          <p className="text-base font-black font-mono text-foreground">React 19 + Vite 6 + Tailwind 4</p>
          <p className="text-xs text-muted-foreground">React Router 独立路由管理系统</p>
        </div>
      </div>

      {/* 2. Global Upload & Processing Settings Form */}
      <div className="p-6 rounded-3xl border border-border/80 bg-card space-y-5 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-border/60">
          <Settings className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-foreground">全局上传与图片预处理默认策略</h3>
            <p className="text-xs text-muted-foreground">Global Asset Preprocessing Defaults</p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">默认上传归属相册</label>
              <div className="mt-1">
                <Select
                  value={settings.defaultAlbumId || 'default'}
                  onValueChange={(val) => setSettings({ ...settings, defaultAlbumId: val })}
                >
                  <SelectTrigger className="w-full text-xs h-9 rounded-xl">
                    <SelectValue placeholder="选择相册" />
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
              <label className="text-xs font-semibold text-muted-foreground">重命名规范规则</label>
              <div className="mt-1">
                <Select
                  value={settings.namingRule || 'original'}
                  onValueChange={(val: any) => setSettings({ ...settings, namingRule: val })}
                >
                  <SelectTrigger className="w-full text-xs h-9 rounded-xl">
                    <SelectValue placeholder="命名规则" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">保留原始文件名 (Original)</SelectItem>
                    <SelectItem value="timestamp">规范时间戳 (YYYYMMDD_HHMMSS)</SelectItem>
                    <SelectItem value="random">随机哈希值 (Random Hash)</SelectItem>
                    <SelectItem value="custom">自定义前缀命名</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/60">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">自动压缩大图体积</p>
                <p className="text-[11px] text-muted-foreground">上传时自动无损压缩，优化外链速度</p>
              </div>
              <Switch
                checked={settings.autoCompress}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoCompress: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/60">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">自动转换为 WebP 格式</p>
                <p className="text-[11px] text-muted-foreground">大幅减小体积，兼顾透明通道与画质</p>
              </div>
              <Switch
                checked={settings.convertToWebP}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, convertToWebP: checked })
                }
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-border/60">
            <Button
              type="submit"
              size="sm"
              className="text-xs rounded-xl bg-primary text-primary-foreground font-semibold cursor-pointer shadow-xs"
            >
              保存全局偏好
            </Button>
          </div>
        </form>
      </div>

      {/* 3. Database Backup & Disaster Recovery */}
      <div className="p-6 rounded-3xl border border-border/80 bg-card space-y-5 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-border/60">
          <Database className="w-5 h-5 text-amber-500" />
          <div>
            <h3 className="text-sm font-bold text-foreground">数据备份与灾难恢复中心</h3>
            <p className="text-xs text-muted-foreground">Full Database Export, Import & Reset</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Export JSON */}
          <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-foreground">全量数据导出备份</p>
              <p className="text-[11px] text-muted-foreground">
                导出包含图片元数据、相册、标签与存储配置的完整 JSON 文件。
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportBackup}
              className="w-full text-xs rounded-xl gap-1.5 cursor-pointer bg-background"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>导出 JSON 备份</span>
            </Button>
          </div>

          {/* Import JSON */}
          <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-foreground">从备份文件还原</p>
              <p className="text-[11px] text-muted-foreground">
                上传历史 JSON 备份文件，系统将安全合并并恢复已有资产数据。
              </p>
            </div>
            <label className="w-full">
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
              <span className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl border border-border/80 bg-background hover:bg-muted/60 text-xs font-semibold text-foreground cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-indigo-500" />
                <span>导入还原备份</span>
              </span>
            </label>
          </div>

          {/* Reset / Clear */}
          <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                出厂初始化重置
              </p>
              <p className="text-[11px] text-muted-foreground">
                清除数据库中所有图片与相册，恢复出厂纯净初始状态。
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearDatabase}
              className="w-full text-xs rounded-xl gap-1.5 cursor-pointer text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空所有数据</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

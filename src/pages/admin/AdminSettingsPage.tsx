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
  Crown,
  UserCheck,
  Users,
  Sliders,
} from 'lucide-react';
import { UploadSettings, Album, UploadQuotaSettings } from '../../types';
import { dbService, DEFAULT_SETTINGS, DEFAULT_ALBUMS } from '../../utils/db';
import { adminApi } from '../../services/api';
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
import {
  Field,
  FieldSet,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from '../../components/ui/field';

export const AdminSettingsPage: React.FC = () => {
  const { backendOnline } = useAuth();
  const [settings, setSettings] = useState<UploadSettings>(DEFAULT_SETTINGS);
  const [quotaSettings, setQuotaSettings] = useState<UploadQuotaSettings>({
    allow_anonymous: true,
    anonymous_daily_limit: 20,
    anonymous_max_size_mb: 5,
    free_user_daily_limit: 50,
    free_user_max_size_mb: 10,
    vip_daily_limit: 500,
    vip_max_size_mb: 50,
    anonymous_upload_qps: 2,
    user_upload_qps: 10,
    naming_rule: 'uuid',
    auto_compress: false,
    compress_quality: 85,
    convert_to_webp: false,
  });
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
      const [currSettings, currAlbums, quotaRes] = await Promise.all([
        dbService.getSettings(),
        dbService.getAllAlbums(),
        adminApi.getQuotaSettings().catch(() => ({ success: false, data: null })),
      ]);
      setSettings(currSettings);
      setAlbums(currAlbums);
      if (quotaRes.success && quotaRes.data) {
        setQuotaSettings((prev) => ({ ...prev, ...quotaRes.data }));
      }
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
      await Promise.all([
        dbService.saveSettings(settings),
        adminApi.saveQuotaSettings(quotaSettings).catch(() => null),
      ]);
      showNotification('全局上传限制与配额策略已成功保存');
    } catch (err: any) {
      showNotification(err.message || '保存设置失败', 'error');
    }
  };

  // Export Full Data Backup (JSON)
  const handleExportBackup = async () => {
    try {
      const [images, albumsList, tagsList, configs] = await Promise.all([
        dbService.getAllImages(),
        dbService.getAllAlbums(),
        dbService.getAllTags(),
        dbService.getStorageConfigs(),
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

      {/* 2. Upload Quotas & Restriction Policy (Anonymous, Free, VIP) */}
      <div className="p-6 rounded-3xl border border-border/80 bg-card space-y-6 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-border/60">
          <Shield className="w-5 h-5 text-indigo-500" />
          <div>
            <h3 className="text-sm font-bold text-foreground">上传限制与分级配额策略</h3>
            <p className="text-xs text-muted-foreground">Role-based Upload Quotas & Restriction Policies</p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          <FieldSet className="gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 1. Anonymous Guests */}
              <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold text-foreground">匿名未登录访客</span>
                    </div>
                    <Badge variant="subtle" className="text-[9px] font-mono">
                      IP-BASED
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/60">
                    <span className="text-xs text-foreground font-medium">允许匿名访客上传</span>
                    <Switch
                      checked={quotaSettings.allow_anonymous}
                      onCheckedChange={(checked) =>
                        setQuotaSettings({ ...quotaSettings, allow_anonymous: checked })
                      }
                    />
                  </div>

                  <FieldGroup className="gap-2.5">
                    <Field>
                      <FieldLabel htmlFor="guest-daily-limit" className="text-[11px]">
                        单日上传上限 (张/天)
                      </FieldLabel>
                      <Input
                        id="guest-daily-limit"
                        type="number"
                        min={1}
                        max={500}
                        value={quotaSettings.anonymous_daily_limit}
                        onChange={(e) =>
                          setQuotaSettings({
                            ...quotaSettings,
                            anonymous_daily_limit: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className="h-8 text-xs rounded-xl"
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="guest-max-size" className="text-[11px]">
                        单张图片体积上限 (MB)
                      </FieldLabel>
                      <Input
                        id="guest-max-size"
                        type="number"
                        min={1}
                        max={100}
                        value={quotaSettings.anonymous_max_size_mb}
                        onChange={(e) =>
                          setQuotaSettings({
                            ...quotaSettings,
                            anonymous_max_size_mb: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className="h-8 text-xs rounded-xl"
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="guest-upload-qps" className="text-[11px]">
                        匿名上传频率 QPS (次/秒)
                      </FieldLabel>
                      <Input
                        id="guest-upload-qps"
                        type="number"
                        min={0}
                        max={1000}
                        value={quotaSettings.anonymous_upload_qps ?? 2}
                        onChange={(e) =>
                          setQuotaSettings({
                            ...quotaSettings,
                            anonymous_upload_qps: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="h-8 text-xs rounded-xl"
                      />
                    </Field>
                  </FieldGroup>
                </div>

                <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/40">
                  按客户端 IP 统计每日上传次数，超出限制将提示登录或明日再试。QPS 基于 Redis
                  滑动窗口按 IP 限流，0 表示不限流。
                </p>
              </div>

              {/* 2. Free Registered Users */}
              <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-foreground">普通注册用户 (Free)</span>
                    </div>
                    <Badge variant="subtle" className="text-[9px] font-mono">
                      USER-ID
                    </Badge>
                  </div>

                  <FieldGroup className="gap-2.5 pt-1">
                    <Field>
                      <FieldLabel htmlFor="user-daily-limit" className="text-[11px]">
                        单日上传上限 (张/天)
                      </FieldLabel>
                      <Input
                        id="user-daily-limit"
                        type="number"
                        min={1}
                        max={2000}
                        value={quotaSettings.free_user_daily_limit}
                        onChange={(e) =>
                          setQuotaSettings({
                            ...quotaSettings,
                            free_user_daily_limit: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className="h-8 text-xs rounded-xl"
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="user-max-size" className="text-[11px]">
                        单张图片体积上限 (MB)
                      </FieldLabel>
                      <Input
                        id="user-max-size"
                        type="number"
                        min={1}
                        max={100}
                        value={quotaSettings.free_user_max_size_mb}
                        onChange={(e) =>
                          setQuotaSettings({
                            ...quotaSettings,
                            free_user_max_size_mb: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className="h-8 text-xs rounded-xl"
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="user-upload-qps" className="text-[11px]">
                        登录用户上传频率 QPS (次/秒)
                      </FieldLabel>
                      <Input
                        id="user-upload-qps"
                        type="number"
                        min={0}
                        max={1000}
                        value={quotaSettings.user_upload_qps ?? 10}
                        onChange={(e) =>
                          setQuotaSettings({
                            ...quotaSettings,
                            user_upload_qps: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="h-8 text-xs rounded-xl"
                      />
                    </Field>
                  </FieldGroup>
                </div>

                <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/40">
                  登录后按账号 ID 统计每日限额，提供更高并发与秒传去重保障。QPS 基于 Redis
                  滑动窗口按账号限流（对全体登录角色生效），0 表示不限流，可在用户管理中单独覆盖。
                </p>
              </div>

              {/* 3. VIP Paid Users */}
              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold text-foreground">付费 / VIP 用户 (VIP)</span>
                    </div>
                    <Badge variant="default" className="text-[9px] bg-amber-500 text-white font-mono">
                      RESERVED
                    </Badge>
                  </div>

                  <FieldGroup className="gap-2.5 pt-1">
                    <Field>
                      <FieldLabel htmlFor="vip-daily-limit" className="text-[11px]">
                        单日上传上限 (张/天)
                      </FieldLabel>
                      <Input
                        id="vip-daily-limit"
                        type="number"
                        min={0}
                        max={10000}
                        value={quotaSettings.vip_daily_limit}
                        onChange={(e) =>
                          setQuotaSettings({
                            ...quotaSettings,
                            vip_daily_limit: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        placeholder="500 (0表示无限制)"
                        className="h-8 text-xs rounded-xl bg-background"
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="vip-max-size" className="text-[11px]">
                        单张图片体积上限 (MB)
                      </FieldLabel>
                      <Input
                        id="vip-max-size"
                        type="number"
                        min={1}
                        max={500}
                        value={quotaSettings.vip_max_size_mb}
                        onChange={(e) =>
                          setQuotaSettings({
                            ...quotaSettings,
                            vip_max_size_mb: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className="h-8 text-xs rounded-xl bg-background"
                      />
                    </Field>
                  </FieldGroup>
                </div>

                <p className="text-[10px] text-amber-700 dark:text-amber-300 pt-2 border-t border-amber-500/20">
                  已预留 VIP 账号标记与权限通道，管理员可在用户列表中直接指派。
                </p>
              </div>
            </div>

            {/* System-Level Naming & Image Preprocessing Rules */}
            <div className="pt-4 border-t border-border/60 space-y-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  系统级重命名与图片处理全局策略 (System-Level Policy)
                </h4>
              </div>

              <FieldGroup className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field>
                  <FieldLabel htmlFor="sys-naming-rule">系统重命名策略</FieldLabel>
                  <Select
                    value={quotaSettings.naming_rule === 'original' ? 'original' : 'uuid'}
                    onValueChange={(val: any) => {
                      setQuotaSettings({ ...quotaSettings, naming_rule: val });
                      setSettings({ ...settings, namingRule: val });
                    }}
                  >
                    <SelectTrigger id="sys-naming-rule" className="w-full text-xs h-9 rounded-xl">
                      <SelectValue placeholder="命名规则" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uuid">UUID 自动命名 (唯一标识)</SelectItem>
                      <SelectItem value="original">保留原始文件名 (Original)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="sys-default-album">默认上传归属相册</FieldLabel>
                  <Select
                    value={settings.defaultAlbumId || 'default'}
                    onValueChange={(val) => setSettings({ ...settings, defaultAlbumId: val })}
                  >
                    <SelectTrigger id="sys-default-album" className="w-full text-xs h-9 rounded-xl">
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
                </Field>
              </FieldGroup>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/60">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">自动压缩大图体积</p>
                    <p className="text-[11px] text-muted-foreground">上传时自动无损压缩，优化外链速度</p>
                  </div>
                  <Switch
                    checked={settings.autoCompress}
                    onCheckedChange={(checked) => {
                      setSettings({ ...settings, autoCompress: checked });
                      setQuotaSettings({ ...quotaSettings, auto_compress: checked });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/60">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">自动转换为 WebP 格式</p>
                    <p className="text-[11px] text-muted-foreground">大幅减小体积，兼顾透明通道与画质</p>
                  </div>
                  <Switch
                    checked={settings.convertToWebP}
                    onCheckedChange={(checked) => {
                      setSettings({ ...settings, convertToWebP: checked });
                      setQuotaSettings({ ...quotaSettings, convert_to_webp: checked });
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-border/60">
              <Button
                type="submit"
                size="sm"
                className="text-xs rounded-xl bg-primary text-primary-foreground font-semibold cursor-pointer shadow-xs"
              >
                保存全局限制与策略
              </Button>
            </div>
          </FieldSet>
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

import React, { useState, useEffect } from 'react';
import {
  Settings,
  HardDrive,
  Download,
  Upload,
  Trash2,
  Check,
  Sliders,
  Database,
  Sun,
  Moon,
  Palette,
  Lock,
  LogIn,
} from 'lucide-react';
import { UploadSettings, Album, ImageItem } from '../types';
import { formatFileSize } from '../utils/imageProcessing';
import { dbService } from '../utils/db';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ScrollArea } from './ui/scroll-area';

interface SettingsModalProps {
  isOpen: boolean;
  settings: UploadSettings;
  albums: Album[];
  images: ImageItem[];
  onClose: () => void;
  onSaveSettings: (settings: UploadSettings) => void;
  onRestoreData: (images: ImageItem[], albums: Album[]) => void;
  onClearAll: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onOpenAuth?: (mode?: 'login' | 'register') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  albums,
  images,
  onClose,
  onSaveSettings,
  onRestoreData,
  onClearAll,
  onShowToast,
  onOpenAuth,
}) => {
  const { theme, isDark, setTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [localSettings, setLocalSettings] = useState<UploadSettings>(settings);
  const [storageInfo, setStorageInfo] = useState<{ usedBytes: number; quotaBytes: number }>({
    usedBytes: 0,
    quotaBytes: 1024 * 1024 * 1024 * 2,
  });

  useEffect(() => {
    setLocalSettings({ ...settings, theme: theme });
    dbService.getStorageEstimate().then(setStorageInfo);
  }, [isOpen, settings, theme]);

  if (!isOpen) return null;

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    setLocalSettings((prev) => ({ ...prev, theme: newTheme }));
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    onShowToast('设置已保存', '全局上传偏好与主题配置已更新', 'success');
    onClose();
  };

  const handleExportBackup = () => {
    if (!isAuthenticated) {
      onShowToast('需要登录', '请先登录账号后再导出备份数据', 'warning');
      onClose();
      onOpenAuth?.('login');
      return;
    }
    const backupData = {
      version: 1,
      exportedAt: Date.now(),
      images,
      albums,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wan_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast('备份导出成功', '完整图库与相册结构已生成 JSON 备份', 'success');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthenticated) {
      onShowToast('需要登录', '请先登录账号后再恢复备份数据', 'warning');
      onClose();
      onOpenAuth?.('login');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json.images)) {
          onRestoreData(json.images, json.albums || albums);
          onShowToast('备份恢复成功', `成功导入 ${json.images.length} 张图片`, 'success');
          onClose();
        } else {
          onShowToast('导入失败', 'JSON 格式不兼容', 'error');
        }
      } catch {
        onShowToast('导入失败', '无法解析 JSON 文件', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (!isAuthenticated) {
      onShowToast('需要登录', '请先登录账号后再执行清空数据操作', 'warning');
      onClose();
      onOpenAuth?.('login');
      return;
    }
    if (window.confirm('警告：此操作将清空所有已上传图片与自定义相册，确定重置吗？')) {
      onClearAll();
      onShowToast('数据已清空', '所有图片与自定义相册已重置', 'info');
      onClose();
    }
  };

  const percentageUsed = Math.min(
    100,
    Math.max(0.1, (storageInfo.usedBytes / storageInfo.quotaBytes) * 100)
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[94vw] max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-3xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/80 text-left shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-border bg-muted/40 flex items-center justify-center text-primary shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>图床偏好与存储中心</DialogTitle>
              <DialogDescription className="mt-0.5 uppercase tracking-wide text-[11px]">
                Configure themes, storage, pre-processing & data export
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-6">
            {/* Theme Mode Selector */}
            <div className="p-5 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Palette className="w-4 h-4 text-primary" />
                  <span>界面视觉主题</span>
                </div>
                <Badge variant="subtle" className="text-[10px]">
                  ACTIVE: {isDark ? 'DARK THEME' : 'LIGHT THEME'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  id="theme-select-dark"
                  onClick={() => handleThemeChange('dark')}
                  className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    isDark
                      ? 'bg-background border-primary shadow-xs text-foreground ring-1 ring-primary'
                      : 'bg-muted/40 border-border hover:border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-amber-400">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">深色主题 (Dark)</p>
                    <p className="text-[10px] text-muted-foreground">大气沉稳 · 极致黑金</p>
                  </div>
                </button>

                <button
                  type="button"
                  id="theme-select-light"
                  onClick={() => handleThemeChange('light')}
                  className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    !isDark
                      ? 'bg-background border-primary shadow-xs text-foreground ring-1 ring-primary'
                      : 'bg-muted/40 border-border hover:border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-300 flex items-center justify-center text-indigo-600">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">亮色主题 (Light)</p>
                    <p className="text-[10px] text-muted-foreground">纯净素雅 · 通透直观</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Storage Meter */}
            <div className="p-5 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <HardDrive className="w-4 h-4 text-primary" />
                  <span>本地持久存储用量</span>
                </div>
                {isAuthenticated ? (
                  <span className="text-xs font-mono text-primary font-medium">
                    {formatFileSize(storageInfo.usedBytes)} / {formatFileSize(storageInfo.quotaBytes)}
                  </span>
                ) : (
                  <Badge variant="subtle" className="text-[10px] text-amber-500 bg-amber-500/10">
                    需登录查看
                  </Badge>
                )}
              </div>

              {isAuthenticated ? (
                <>
                  <div className="w-full h-2 rounded-full overflow-hidden bg-muted">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 rounded-full"
                      style={{ width: `${percentageUsed}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    基于高性能 IndexedDB 引擎，支持存储海量高分辨率图片，页面刷新数据永不丢失。
                  </p>
                </>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>登录账号后即可查看存储用量、容量分配与管理资产</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onClose();
                      onOpenAuth?.('login');
                    }}
                    className="h-7 text-xs rounded-full gap-1 shrink-0 cursor-pointer"
                  >
                    <LogIn className="w-3 h-3 text-primary" />
                    <span>立即登录</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Upload Configuration */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                <span>上传预处理策略</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="setting-auto-compress" className="cursor-pointer font-medium">
                      开启默认自动压缩
                    </Label>
                    <Switch
                      id="setting-auto-compress"
                      checked={localSettings.autoCompress}
                      onCheckedChange={(checked) =>
                        setLocalSettings({ ...localSettings, autoCompress: checked })
                      }
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    有效压缩尺寸，加速外链在网页中的加载。
                  </p>
                  {localSettings.autoCompress && (
                    <div className="pt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <span>质量</span>
                        <span className="text-foreground font-semibold">
                          {Math.round(localSettings.compressQuality * 100)}%
                        </span>
                      </div>
                      <Slider
                        min={0.4}
                        max={0.95}
                        step={0.05}
                        value={[localSettings.compressQuality]}
                        onValueChange={(val) =>
                          setLocalSettings({ ...localSettings, compressQuality: val[0] })
                        }
                      />
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="setting-convert-webp" className="cursor-pointer font-medium">
                      自动转换为 WebP
                    </Label>
                    <Switch
                      id="setting-convert-webp"
                      checked={localSettings.convertToWebP}
                      onCheckedChange={(checked) =>
                        setLocalSettings({ ...localSettings, convertToWebP: checked })
                      }
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    下一代高效格式，体积减少达 70%。
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-1.5">
                  <Label className="font-medium text-foreground">默认命名规范</Label>
                  <Select
                    value={localSettings.namingRule}
                    onValueChange={(val) =>
                      setLocalSettings({
                        ...localSettings,
                        namingRule: val as UploadSettings['namingRule'],
                      })
                    }
                  >
                    <SelectTrigger className="h-8 rounded-xl font-normal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="original">保留原始文件名</SelectItem>
                      <SelectItem value="timestamp">时间戳规范命名</SelectItem>
                      <SelectItem value="random">随机哈希命名</SelectItem>
                      <SelectItem value="custom">自定义前缀命名</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-1.5">
                  <Label className="font-medium text-foreground">默认存入相册</Label>
                  <Select
                    value={localSettings.defaultAlbumId}
                    onValueChange={(val) =>
                      setLocalSettings({ ...localSettings, defaultAlbumId: val })
                    }
                  >
                    <SelectTrigger className="h-8 rounded-xl font-normal">
                      <SelectValue />
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
            </div>

            {/* Backup & Restore */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
                <Database className="w-3.5 h-3.5 text-emerald-500" />
                <span>数据备份与迁移</span>
              </h4>

              <div className="flex flex-wrap gap-2.5">
                <Button
                  id="export-backup-btn"
                  variant="outline"
                  size="sm"
                  onClick={handleExportBackup}
                  className="rounded-full gap-1.5 text-xs font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  <span>导出全库数据 (JSON)</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="rounded-full gap-1.5 text-xs font-medium cursor-pointer"
                >
                  <label>
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span>导入备份恢复</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClear}
                  className="rounded-full gap-1.5 text-xs font-medium ml-auto bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>清空所有数据</span>
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="p-4 px-6 border-t border-border/80 bg-muted/20 gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-full px-5 text-xs font-medium"
          >
            取消
          </Button>
          <Button
            id="save-settings-btn"
            onClick={handleSave}
            className="rounded-full px-6 gap-1.5 text-xs font-semibold shadow-md"
          >
            <Check className="w-3.5 h-3.5" />
            <span>保存偏好</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

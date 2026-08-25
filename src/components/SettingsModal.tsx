import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Languages,
  Globe2,
} from 'lucide-react';
import { UploadSettings, Album, ImageItem } from '../types';
import { formatFileSize } from '../utils/imageProcessing';
import { dbService } from '../utils/db';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { changeLanguage } from '../i18n';
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
  const { t, i18n } = useTranslation();
  const { theme, isDark, setTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [localSettings, setLocalSettings] = useState<UploadSettings>(settings);
  const [storageInfo, setStorageInfo] = useState<{ usedBytes: number; quotaBytes: number }>({
    usedBytes: 0,
    quotaBytes: 1024 * 1024 * 1024 * 2,
  });

  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'zh';

  useEffect(() => {
    setLocalSettings({ ...settings, theme: theme });
    dbService.getStorageEstimate().then(setStorageInfo);
  }, [isOpen, settings, theme]);

  if (!isOpen) return null;

  const handleLanguageChange = (lang: 'zh' | 'en') => {
    changeLanguage(lang);
    onShowToast(
      t('toast.langSwitched', { lang: lang === 'zh' ? '简体中文' : 'English' }),
      lang === 'zh' ? '已更新界面显示语言' : 'Interface language updated',
      'success'
    );
  };

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    setLocalSettings((prev) => ({ ...prev, theme: newTheme }));
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    onShowToast(t('settings.saveDone'), t('toast.savedSettings'), 'success');
    onClose();
  };

  const handleExportBackup = () => {
    if (!isAuthenticated) {
      onShowToast(t('common.warning'), t('albums.authRequiredDesc'), 'warning');
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
    onShowToast(t('common.success'), t('settings.backupSection.exportDesc'), 'success');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthenticated) {
      onShowToast(t('common.warning'), t('albums.authRequiredDesc'), 'warning');
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
          onShowToast(t('common.success'), `Imported ${json.images.length} images`, 'success');
          onClose();
        } else {
          onShowToast(t('common.error'), 'Invalid JSON schema', 'error');
        }
      } catch {
        onShowToast(t('common.error'), 'Failed to parse JSON', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (!isAuthenticated) {
      onShowToast(t('common.warning'), t('albums.authRequiredDesc'), 'warning');
      onClose();
      onOpenAuth?.('login');
      return;
    }
    if (window.confirm(t('settings.backupSection.confirmClear'))) {
      onClearAll();
      onShowToast(t('common.info'), t('settings.backupSection.clearedSuccess'), 'info');
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
              <DialogTitle>{t('settings.title')}</DialogTitle>
              <DialogDescription className="mt-0.5 uppercase tracking-wide text-[11px]">
                {t('settings.subtitle')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-6">
            {/* Language Switcher Section */}
            <div className="p-5 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Languages className="w-4 h-4 text-primary" />
                  <span>{t('settings.languageSection.title')}</span>
                </div>
                <Badge variant="subtle" className="text-[10px] uppercase font-mono">
                  {t('settings.languageSection.current')}: {currentLang === 'zh' ? '简体中文' : 'ENGLISH'}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t('settings.languageSection.desc')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Simplified Chinese */}
                <button
                  type="button"
                  id="lang-select-zh"
                  onClick={() => handleLanguageChange('zh')}
                  className={`p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    currentLang === 'zh'
                      ? 'bg-background border-primary shadow-xs text-foreground ring-1 ring-primary'
                      : 'bg-muted/40 border-border hover:border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold flex items-center justify-center text-xs">
                      中
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">简体中文</p>
                      <p className="text-[10px] text-muted-foreground">Simplified Chinese</p>
                    </div>
                  </div>
                  {currentLang === 'zh' && (
                    <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* English */}
                <button
                  type="button"
                  id="lang-select-en"
                  onClick={() => handleLanguageChange('en')}
                  className={`p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    currentLang === 'en'
                      ? 'bg-background border-primary shadow-xs text-foreground ring-1 ring-primary'
                      : 'bg-muted/40 border-border hover:border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 font-bold flex items-center justify-center text-xs">
                      EN
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">English (US)</p>
                      <p className="text-[10px] text-muted-foreground">Standard English</p>
                    </div>
                  </div>
                  {currentLang === 'en' && (
                    <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Theme Mode Selector */}
            <div className="p-5 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Palette className="w-4 h-4 text-primary" />
                  <span>{t('settings.themeSection.title')}</span>
                </div>
                <Badge variant="subtle" className="text-[10px] uppercase font-mono">
                  {t('settings.themeSection.current')}: {isDark ? 'DARK' : 'LIGHT'}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t('settings.themeSection.desc')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                    <p className="text-xs font-bold text-foreground">{t('settings.themeSection.dark')}</p>
                    <p className="text-[10px] text-muted-foreground">{t('settings.themeSection.darkDesc')}</p>
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
                    <p className="text-xs font-bold text-foreground">{t('settings.themeSection.light')}</p>
                    <p className="text-[10px] text-muted-foreground">{t('settings.themeSection.lightDesc')}</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Storage Meter */}
            <div className="p-5 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <HardDrive className="w-4 h-4 text-primary" />
                  <span>{t('settings.storageSection.title')}</span>
                </div>
                {isAuthenticated ? (
                  <span className="text-xs font-mono text-primary font-medium">
                    {formatFileSize(storageInfo.usedBytes)} / {formatFileSize(storageInfo.quotaBytes)}
                  </span>
                ) : (
                  <Badge variant="subtle" className="text-[10px] text-amber-500 bg-amber-500/10">
                    {t('settings.storageSection.loginHint')}
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
                    {t('settings.storageSection.desc')}
                  </p>
                </>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{t('settings.storageSection.loginHint')}</span>
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
                    <span>{t('common.actions')}</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Upload Configuration */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                <span>{t('settings.uploadSection.title')}</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="setting-auto-compress" className="cursor-pointer font-medium">
                      {t('settings.uploadSection.autoCompress')}
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
                    {t('settings.uploadSection.autoCompressDesc')}
                  </p>
                  {localSettings.autoCompress && (
                    <div className="pt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <span>{t('settings.uploadSection.compressQuality')}</span>
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
                      {t('settings.uploadSection.convertToWebp')}
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
                    {t('settings.uploadSection.convertToWebpDesc')}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-1.5 sm:col-span-2">
                  <Label className="font-medium text-foreground">
                    {t('settings.uploadSection.defaultAlbum')}
                  </Label>
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
                <span>{t('settings.backupSection.title')}</span>
              </h4>

              <div className="flex flex-wrap gap-2.5">
                <Button
                  id="export-backup-btn"
                  variant="outline"
                  size="sm"
                  onClick={handleExportBackup}
                  className="rounded-full gap-1.5 text-xs font-medium cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  <span>{t('settings.backupSection.exportJson')}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="rounded-full gap-1.5 text-xs font-medium cursor-pointer"
                >
                  <label>
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span>{t('settings.backupSection.importJson')}</span>
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
                  className="rounded-full gap-1.5 text-xs font-medium ml-auto bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('settings.backupSection.clearAll')}</span>
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
            className="rounded-full px-5 text-xs font-medium cursor-pointer"
          >
            {t('common.cancel')}
          </Button>
          <Button
            id="save-settings-btn"
            onClick={handleSave}
            className="rounded-full px-6 gap-1.5 text-xs font-semibold shadow-md cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t('common.save')}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

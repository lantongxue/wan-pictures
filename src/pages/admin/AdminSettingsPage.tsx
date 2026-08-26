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
import { useTranslation } from 'react-i18next';
import { UploadQuotaSettings } from '../../types';
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
  const { t } = useTranslation();
  const { backendOnline } = useAuth();
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
    anonymous_upload_rpm: 30,
    user_upload_rpm: 200,
    naming_rule: 'uuid',
    auto_compress: false,
    compress_quality: 85,
    convert_to_webp: false,
  });
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
      const quotaRes = await adminApi.getQuotaSettings().catch(() => ({ success: false, data: null }));
      if (quotaRes.success && quotaRes.data) {
        setQuotaSettings((prev) => ({ ...prev, ...quotaRes.data }));
      }
    } catch (err: any) {
      showNotification(err.message || t('adminSettings.loadFailed'), 'error');
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
      await adminApi.saveQuotaSettings(quotaSettings);
      showNotification(t('adminSettings.quotaSaved'));
    } catch (err: any) {
      showNotification(err.message || t('adminSettings.saveFailed'), 'error');
    }
  };

  // Export Full Data Backup (JSON) — pulled live from the backend
  const handleExportBackup = async () => {
    try {
      const [imagesRes, albumsRes, tagsRes, configsRes] = await Promise.all([
        adminApi.getImages({ pageSize: 100000 }),
        adminApi.getAlbums(),
        adminApi.getTags(),
        adminApi.getStorageConfigs(),
      ]);

      if (!imagesRes.success || !albumsRes.success || !tagsRes.success || !configsRes.success) {
        showNotification(t('adminSettings.exportFailed'), 'error');
        return;
      }

      const backupData = {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        appName: 'Wan Pictures (万图)',
        source: 'backend',
        data: {
          images: imagesRes.data.items,
          albums: albumsRes.data,
          tags: tagsRes.data,
          storageConfigs: configsRes.data,
          quotaSettings,
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

      showNotification(t('adminSettings.exportSuccess'));
    } catch (err: any) {
      showNotification(err.message || t('adminSettings.exportError'), 'error');
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
              {t('adminSettings.title')}
            </h1>
            <Badge variant="subtle" className="text-[10px] font-mono">
              SYSTEM
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('adminSettings.subtitle')}
          </p>
        </div>
      </div>

      {/* 1. Environment & Architecture Spec Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl border border-border/80 bg-card space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-primary">
            <Server className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">{t('adminSettings.backendTitle')}</h3>
          </div>
          <p className="text-base font-black font-mono text-foreground">Golang 1.22 + Gin + GORM</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={`w-2 h-2 rounded-full ${
                backendOnline ? 'bg-emerald-500' : 'bg-emerald-500'
              }`}
            />
            <span>{backendOnline ? t('adminSettings.backendRunning') : t('adminSettings.backendLocal')}</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl border border-border/80 bg-card space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-500">
            <Database className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">{t('adminSettings.dbTitle')}</h3>
          </div>
          <p className="text-base font-black font-mono text-foreground">SQLite (Go Backend)</p>
          <p className="text-xs text-muted-foreground">{t('adminSettings.dbDesc')}</p>
        </div>

        <div className="p-5 rounded-3xl border border-border/80 bg-card space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-500">
            <Cpu className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">{t('adminSettings.frontendTitle')}</h3>
          </div>
          <p className="text-base font-black font-mono text-foreground">React 19 + Vite 6 + Tailwind 4</p>
          <p className="text-xs text-muted-foreground">{t('adminSettings.frontendDesc')}</p>
        </div>
      </div>

      {/* 2. Upload Quotas & Restriction Policy (Anonymous, Free, VIP) */}
      <div className="p-6 rounded-3xl border border-border/80 bg-card space-y-6 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-border/60">
          <Shield className="w-5 h-5 text-indigo-500" />
          <div>
            <h3 className="text-sm font-bold text-foreground">{t('adminSettings.quotaTitle')}</h3>
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
                      <span className="text-xs font-bold text-foreground">{t('adminSettings.anonSection')}</span>
                    </div>
                    <Badge variant="subtle" className="text-[9px] font-mono">
                      IP-BASED
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/60">
                    <span className="text-xs text-foreground font-medium">{t('adminSettings.anonUploadLabel')}</span>
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
                        {t('adminSettings.dailyLimit')}
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
                        {t('adminSettings.maxSize')}
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
                        {t('adminSettings.qpsLabel')}
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

                    <Field>
                      <FieldLabel htmlFor="guest-upload-rpm" className="text-[11px]">
                        {t('adminSettings.rpmLabel')}
                      </FieldLabel>
                      <Input
                        id="guest-upload-rpm"
                        type="number"
                        min={0}
                        max={10000}
                        value={quotaSettings.anonymous_upload_rpm ?? 30}
                        onChange={(e) =>
                          setQuotaSettings({
                            ...quotaSettings,
                            anonymous_upload_rpm: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="h-8 text-xs rounded-xl"
                      />
                    </Field>
                  </FieldGroup>
                </div>

                <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/40">
                  {t('adminSettings.anonIpHint')}
                  {t('adminSettings.anonWindowHint')}
                </p>
              </div>

              {/* 2. Free Registered Users */}
              <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-foreground">{t('adminSettings.freeSection')}</span>
                    </div>
                    <Badge variant="subtle" className="text-[9px] font-mono">
                      USER-ID
                    </Badge>
                  </div>

                  <FieldGroup className="gap-2.5 pt-1">
                    <Field>
                      <FieldLabel htmlFor="user-daily-limit" className="text-[11px]">
                        {t('adminSettings.dailyLimit')}
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
                        {t('adminSettings.maxSize')}
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
                        {t('adminSettings.freeQpsLabel')}
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

                    <Field>
                      <FieldLabel htmlFor="user-upload-rpm" className="text-[11px]">
                        {t('adminSettings.freeRpmLabel')}
                      </FieldLabel>
                      <Input
                        id="user-upload-rpm"
                        type="number"
                        min={0}
                        max={10000}
                        value={quotaSettings.user_upload_rpm ?? 200}
                        onChange={(e) =>
                          setQuotaSettings({
                            ...quotaSettings,
                            user_upload_rpm: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="h-8 text-xs rounded-xl"
                      />
                    </Field>
                  </FieldGroup>
                </div>

                <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/40">
                  {t('adminSettings.freeAccountHint')}
                  {t('adminSettings.freeWindowHint')}
                </p>
              </div>

              {/* 3. VIP Paid Users */}
              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold text-foreground">{t('adminSettings.vipSection')}</span>
                    </div>
                    <Badge variant="default" className="text-[9px] bg-amber-500 text-white font-mono">
                      RESERVED
                    </Badge>
                  </div>

                  <FieldGroup className="gap-2.5 pt-1">
                    <Field>
                      <FieldLabel htmlFor="vip-daily-limit" className="text-[11px]">
                        {t('adminSettings.dailyLimit')}
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
                        placeholder={t('adminSettings.vipDailyPlaceholder')}
                        className="h-8 text-xs rounded-xl bg-background"
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="vip-max-size" className="text-[11px]">
                        {t('adminSettings.maxSize')}
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
                  {t('adminSettings.vipNote')}
                </p>
              </div>
            </div>

            {/* System-Level Naming & Image Preprocessing Rules */}
            <div className="pt-4 border-t border-border/60 space-y-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {t('adminSettings.policyTitle')}
                </h4>
              </div>

              <FieldGroup className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field>
                  <FieldLabel htmlFor="sys-naming-rule">{t('adminSettings.namingLabel')}</FieldLabel>
                  <Select
                    value={quotaSettings.naming_rule === 'original' ? 'original' : 'uuid'}
                    onValueChange={(val: any) => {
                      setQuotaSettings({ ...quotaSettings, naming_rule: val });
                    }}
                  >
                    <SelectTrigger id="sys-naming-rule" className="w-full text-xs h-9 rounded-xl">
                      <SelectValue placeholder={t('adminSettings.namingPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uuid">{t('adminSettings.namingUuid')}</SelectItem>
                      <SelectItem value="original">{t('adminSettings.namingOriginal')}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <div className="sm:col-span-2" />
              </FieldGroup>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/60">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">{t('adminSettings.compressTitle')}</p>
                    <p className="text-[11px] text-muted-foreground">{t('adminSettings.compressDesc')}</p>
                  </div>
                  <Switch
                    checked={!!quotaSettings.auto_compress}
                    onCheckedChange={(checked) => {
                      setQuotaSettings({ ...quotaSettings, auto_compress: checked });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/60">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">{t('adminSettings.webpTitle')}</p>
                    <p className="text-[11px] text-muted-foreground">{t('adminSettings.webpDesc')}</p>
                  </div>
                  <Switch
                    checked={!!quotaSettings.convert_to_webp}
                    onCheckedChange={(checked) => {
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
                {t('adminSettings.savePolicy')}
              </Button>
            </div>
          </FieldSet>
        </form>
      </div>

      {/* 3. Database Backup */}
      <div className="p-6 rounded-3xl border border-border/80 bg-card space-y-5 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-border/60">
          <Database className="w-5 h-5 text-amber-500" />
          <div>
            <h3 className="text-sm font-bold text-foreground">{t('adminSettings.backupTitle')}</h3>
            <p className="text-xs text-muted-foreground">Full Backend Data Export</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Export JSON */}
          <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-foreground">{t('adminSettings.exportTitle')}</p>
              <p className="text-[11px] text-muted-foreground">
                {t('adminSettings.exportDesc')}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportBackup}
              disabled={loading}
              className="w-full text-xs rounded-xl gap-1.5 cursor-pointer bg-background"
            >
              <Download className={`w-3.5 h-3.5 text-primary ${loading ? 'animate-spin' : ''}`} />
              <span>{t('adminSettings.exportBtn')}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

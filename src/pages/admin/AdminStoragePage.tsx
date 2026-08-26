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
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import {
  Field,
  FieldSet,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from '../../components/ui/field';

export const AdminStoragePage: React.FC = () => {
  const { t } = useTranslation();
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
      showNotification(err.message || t('adminStorage.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const isDriverEnabled = (driver: StorageDriverType) => {
    const cfg = storageConfigs.find((c) => c.driver === driver);
    return cfg ? cfg.isEnabled !== false : true;
  };

  const handleToggleEnabled = async (driver: StorageDriverType, isEnabled: boolean) => {
    try {
      await adminApi.toggleStorageEnabled(driver, isEnabled);
      showNotification(t('adminStorage.toggleSuccess', { driver: driver.toUpperCase(), state: isEnabled ? t('adminStorage.enabled') : t('adminStorage.disabledState') }));
      loadConfigs();
    } catch (err: any) {
      showNotification(err.message || t('adminStorage.toggleFailed'), 'error');
    }
  };

  const handleSwitchActiveStorage = async (driver: StorageDriverType) => {
    if (!isDriverEnabled(driver)) {
      showNotification(t('adminStorage.setPrimaryDisabled', { driver: driver.toUpperCase() }), 'error');
      return;
    }
    try {
      await adminApi.setActiveStorage(driver);
      setActiveDriver(driver);
      showNotification(t('adminStorage.setPrimarySuccess', { driver: driver.toUpperCase() }));
      loadConfigs();
    } catch (err: any) {
      showNotification(err.message || t('adminStorage.setPrimaryFailed'), 'error');
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
        showNotification(t('adminStorage.testSuccess', { driver: driver.toUpperCase(), ms: res.latencyMs || 12 }));
      } else {
        showNotification(t('adminStorage.testFailed', { driver: driver.toUpperCase(), message: res.message }), 'error');
      }
    } catch (err: any) {
      showNotification(err.message || t('adminStorage.testError'), 'error');
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
        name: t('adminStorage.localConfigName'),
        isEnabled: isDriverEnabled('local'),
        isActive: activeDriver === 'local',
        config: localConfig,
      };
      await adminApi.saveStorageConfig(item);
      showNotification(t('adminStorage.saveLocalSuccess'));
      loadConfigs();
    } catch (err: any) {
      showNotification(err.message || t('adminStorage.saveFailed'), 'error');
    }
  };

  const handleSaveS3 = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const item: StorageConfigItem = {
        id: 2,
        driver: 's3',
        name: t('adminStorage.s3ConfigName'),
        isEnabled: isDriverEnabled('s3'),
        isActive: activeDriver === 's3',
        config: s3Config,
      };
      await adminApi.saveStorageConfig(item);
      showNotification(t('adminStorage.saveS3Success'));
      loadConfigs();
    } catch (err: any) {
      showNotification(err.message || t('adminStorage.saveFailed'), 'error');
    }
  };

  const handleSaveWebDAV = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const item: StorageConfigItem = {
        id: 3,
        driver: 'webdav',
        name: t('adminStorage.webdavConfigName'),
        isEnabled: isDriverEnabled('webdav'),
        isActive: activeDriver === 'webdav',
        config: webdavConfig,
      };
      await adminApi.saveStorageConfig(item);
      showNotification(t('adminStorage.saveWebdavSuccess'));
      loadConfigs();
    } catch (err: any) {
      showNotification(err.message || t('adminStorage.saveFailed'), 'error');
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
              {t('adminStorage.title')}
            </h1>
            <Badge variant="subtle" className="text-[10px] font-mono">
              MULTI-DRIVER
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('adminStorage.subtitle')}
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
            <span>{t('adminStorage.refresh')}</span>
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
          } ${!isDriverEnabled('local') ? 'opacity-80' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-foreground">{t('adminStorage.localTitle')}</h3>
                  {!isDriverEnabled('local') && (
                    <Badge variant="outline" className="text-[9px] text-muted-foreground border-border">
                      {t('adminStorage.disabled')}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">Local File System</p>
              </div>
            </div>

            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={isDriverEnabled('local')}
                onCheckedChange={(checked) => handleToggleEnabled('local', checked)}
                title={isDriverEnabled('local') ? t('adminStorage.enableTitleOn', { driver: 'Local' }) : t('adminStorage.enableTitleOff', { driver: 'Local' })}
              />
              {activeDriver === 'local' ? (
                <Badge variant="default" className="text-[9px] bg-blue-600">
                  ACTIVE
                </Badge>
              ) : isDriverEnabled('local') ? (
                <button
                  onClick={() => handleSwitchActiveStorage('local')}
                  className="text-[10px] text-primary hover:underline font-semibold"
                >
                  {t('adminStorage.setPrimary')}
                </button>
              ) : (
                <span className="text-[10px] text-muted-foreground">{t('adminStorage.needEnable')}</span>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {t('adminStorage.localDesc')}
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
              {testingDriver === 'local' ? t('adminStorage.testing') : t('adminStorage.testConnectivity')}
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
          } ${!isDriverEnabled('s3') ? 'opacity-80' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-foreground">{t('adminStorage.s3Title')}</h3>
                  {!isDriverEnabled('s3') && (
                    <Badge variant="outline" className="text-[9px] text-muted-foreground border-border">
                      {t('adminStorage.disabled')}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">AWS / R2 / OSS / MinIO</p>
              </div>
            </div>

            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={isDriverEnabled('s3')}
                onCheckedChange={(checked) => handleToggleEnabled('s3', checked)}
                title={isDriverEnabled('s3') ? t('adminStorage.enableTitleOn', { driver: 'S3' }) : t('adminStorage.enableTitleOff', { driver: 'S3' })}
              />
              {activeDriver === 's3' ? (
                <Badge variant="default" className="text-[9px] bg-amber-600">
                  ACTIVE
                </Badge>
              ) : isDriverEnabled('s3') ? (
                <button
                  onClick={() => handleSwitchActiveStorage('s3')}
                  className="text-[10px] text-primary hover:underline font-semibold"
                >
                  {t('adminStorage.setPrimary')}
                </button>
              ) : (
                <span className="text-[10px] text-muted-foreground">{t('adminStorage.needEnable')}</span>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {t('adminStorage.s3Desc')}
          </p>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60">
            <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[150px]">
              {s3Config.bucket ? `bucket: ${s3Config.bucket}` : t('adminStorage.noBucket')}
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
              {testingDriver === 's3' ? t('adminStorage.testing') : t('adminStorage.testConnectivity')}
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
          } ${!isDriverEnabled('webdav') ? 'opacity-80' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-foreground">{t('adminStorage.webdavTitle')}</h3>
                  {!isDriverEnabled('webdav') && (
                    <Badge variant="outline" className="text-[9px] text-muted-foreground border-border">
                      {t('adminStorage.disabled')}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">{t('adminStorage.webdavSub')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={isDriverEnabled('webdav')}
                onCheckedChange={(checked) => handleToggleEnabled('webdav', checked)}
                title={isDriverEnabled('webdav') ? t('adminStorage.enableTitleOn', { driver: 'WebDAV' }) : t('adminStorage.enableTitleOff', { driver: 'WebDAV' })}
              />
              {activeDriver === 'webdav' ? (
                <Badge variant="default" className="text-[9px] bg-emerald-600">
                  ACTIVE
                </Badge>
              ) : isDriverEnabled('webdav') ? (
                <button
                  onClick={() => handleSwitchActiveStorage('webdav')}
                  className="text-[10px] text-primary hover:underline font-semibold"
                >
                  {t('adminStorage.setPrimary')}
                </button>
              ) : (
                <span className="text-[10px] text-muted-foreground">{t('adminStorage.needEnable')}</span>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {t('adminStorage.webdavDesc')}
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
              {testingDriver === 'webdav' ? t('adminStorage.testing') : t('adminStorage.testConnectivity')}
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
                {t('adminStorage.testResultTitle', { driver: selectedDriverTab.toUpperCase(), message: testResults[selectedDriverTab].message })}
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
                  <h3 className="text-sm font-bold text-foreground">{t('adminStorage.localConfigTitle')}</h3>
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
                  <span>{t('adminStorage.localSetPrimary')}</span>
                </Button>
              )}
            </div>

            <FieldSet className="gap-4">
              <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="local-storage-path" required>
                    {t('adminStorage.storageRootLabel')}
                  </FieldLabel>
                  <Input
                    id="local-storage-path"
                    type="text"
                    required
                    value={localConfig.storagePath}
                    onChange={(e) =>
                      setLocalConfig({ ...localConfig, storagePath: e.target.value })
                    }
                    className="text-xs h-9 rounded-xl font-mono"
                  />
                  <FieldDescription>
                    {t('adminStorage.storageRootHint')}
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="local-public-prefix" required>
                    {t('adminStorage.urlPrefixLabel')}
                  </FieldLabel>
                  <Input
                    id="local-public-prefix"
                    type="text"
                    required
                    value={localConfig.publicUrlPrefix}
                    onChange={(e) =>
                      setLocalConfig({ ...localConfig, publicUrlPrefix: e.target.value })
                    }
                    className="text-xs h-9 rounded-xl font-mono"
                  />
                  <FieldDescription>
                    {t('adminStorage.urlPrefixHint')}
                  </FieldDescription>
                </Field>
              </FieldGroup>

              <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="local-subfolder-format">
                    {t('adminStorage.subfolderLabel')}
                  </FieldLabel>
                  <Input
                    id="local-subfolder-format"
                    type="text"
                    value={localConfig.subfolderFormat || 'YYYY/MM'}
                    onChange={(e) =>
                      setLocalConfig({ ...localConfig, subfolderFormat: e.target.value })
                    }
                    className="text-xs h-9 rounded-xl font-mono"
                  />
                  <FieldDescription>
                    {t('adminStorage.subfolderHint')}
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="local-max-size">
                    {t('adminStorage.maxQuotaLabel')}
                  </FieldLabel>
                  <Input
                    id="local-max-size"
                    type="number"
                    value={localConfig.maxSizeMB || 10240}
                    onChange={(e) =>
                      setLocalConfig({ ...localConfig, maxSizeMB: Number(e.target.value) })
                    }
                    className="text-xs h-9 rounded-xl font-mono"
                  />
                  <FieldDescription>
                    {t('adminStorage.maxQuotaHint')}
                  </FieldDescription>
                </Field>
              </FieldGroup>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestStorage('local')}
                  className="text-xs rounded-xl cursor-pointer"
                >
                  {testingDriver === 'local' ? t('adminStorage.testing') : t('adminStorage.testLocal')}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs rounded-xl bg-primary text-primary-foreground font-semibold cursor-pointer shadow-xs"
                >
                  {t('adminStorage.saveLocal')}
                </Button>
              </div>
            </FieldSet>
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
                  <h3 className="text-sm font-bold text-foreground">{t('adminStorage.s3ConfigTitle')}</h3>
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
                  <span>{t('adminStorage.localSetPrimary')}</span>
                </Button>
              )}
            </div>

            <FieldSet className="gap-4">
              <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="s3-endpoint" required>
                    {t('adminStorage.endpointLabel')}
                  </FieldLabel>
                  <Input
                    id="s3-endpoint"
                    type="text"
                    required
                    placeholder={t('adminStorage.endpointPlaceholder')}
                    value={s3Config.endpoint}
                    onChange={(e) => setS3Config({ ...s3Config, endpoint: e.target.value })}
                    className="text-xs h-9 rounded-xl font-mono"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="s3-bucket" required>
                    {t('adminStorage.bucketLabel')}
                  </FieldLabel>
                  <Input
                    id="s3-bucket"
                    type="text"
                    required
                    placeholder={t('adminStorage.bucketPlaceholder')}
                    value={s3Config.bucket}
                    onChange={(e) => setS3Config({ ...s3Config, bucket: e.target.value })}
                    className="text-xs h-9 rounded-xl font-mono"
                  />
                </Field>
              </FieldGroup>

              <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="s3-ak" required>
                    Access Key ID (AK)
                  </FieldLabel>
                  <Input
                    id="s3-ak"
                    type="text"
                    required
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    value={s3Config.accessKeyId}
                    onChange={(e) => setS3Config({ ...s3Config, accessKeyId: e.target.value })}
                    className="text-xs h-9 rounded-xl font-mono"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="s3-sk" required>
                    Secret Access Key (SK)
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="s3-sk"
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
                </Field>
              </FieldGroup>

              <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="s3-domain">
                    {t('adminStorage.customDomainLabel')}
                  </FieldLabel>
                  <Input
                    id="s3-domain"
                    type="text"
                    placeholder={t('adminStorage.customDomainPlaceholder')}
                    value={s3Config.customDomain}
                    onChange={(e) => setS3Config({ ...s3Config, customDomain: e.target.value })}
                    className="text-xs h-9 rounded-xl font-mono"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="s3-region">{t('adminStorage.regionLabel')}</FieldLabel>
                  <Input
                    id="s3-region"
                    type="text"
                    placeholder={t('adminStorage.regionPlaceholder')}
                    value={s3Config.region}
                    onChange={(e) => setS3Config({ ...s3Config, region: e.target.value })}
                    className="text-xs h-9 rounded-xl font-mono"
                  />
                </Field>
              </FieldGroup>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestStorage('s3')}
                  className="text-xs rounded-xl cursor-pointer"
                >
                  {testingDriver === 's3' ? t('adminStorage.testing') : t('adminStorage.testS3')}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold cursor-pointer shadow-xs"
                >
                  {t('adminStorage.saveS3')}
                </Button>
              </div>
            </FieldSet>
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
                  <h3 className="text-sm font-bold text-foreground">{t('adminStorage.webdavConfigTitle')}</h3>
                  <p className="text-xs text-muted-foreground">{t('adminStorage.webdavSubtitle2')}</p>
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
                  <span>{t('adminStorage.webdavSetPrimary')}</span>
                </Button>
              )}
            </div>

            <FieldSet className="gap-4">
              <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="dav-server" required>
                    {t('adminStorage.webdavUrlLabel')}
                  </FieldLabel>
                  <Input
                    id="dav-server"
                    type="text"
                    required
                    placeholder={t('adminStorage.webdavUrlPlaceholder')}
                    value={webdavConfig.serverUrl}
                    onChange={(e) =>
                      setWebdavConfig({ ...webdavConfig, serverUrl: e.target.value })
                    }
                    className="text-xs h-9 rounded-xl font-mono"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="dav-root">
                    {t('adminStorage.webdavRootLabel')}
                  </FieldLabel>
                  <Input
                    id="dav-root"
                    type="text"
                    placeholder={t('adminStorage.webdavRootPlaceholder')}
                    value={webdavConfig.rootPath}
                    onChange={(e) =>
                      setWebdavConfig({ ...webdavConfig, rootPath: e.target.value })
                    }
                    className="text-xs h-9 rounded-xl font-mono"
                  />
                </Field>
              </FieldGroup>

              <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="dav-user" required>
                    {t('adminStorage.webdavUserLabel')}
                  </FieldLabel>
                  <Input
                    id="dav-user"
                    type="text"
                    required
                    placeholder="alex@example.com"
                    value={webdavConfig.username}
                    onChange={(e) =>
                      setWebdavConfig({ ...webdavConfig, username: e.target.value })
                    }
                    className="text-xs h-9 rounded-xl"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="dav-pwd" required>
                    {t('adminStorage.webdavPwdLabel')}
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="dav-pwd"
                      type={showDavPassword ? 'text' : 'password'}
                      required
                      placeholder={t('adminStorage.webdavPwdPlaceholder')}
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
                </Field>
              </FieldGroup>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestStorage('webdav')}
                  className="text-xs rounded-xl cursor-pointer"
                >
                  {testingDriver === 'webdav' ? t('adminStorage.testing') : t('adminStorage.testWebdav')}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-xs"
                >
                  {t('adminStorage.saveWebdav')}
                </Button>
              </div>
            </FieldSet>
          </form>
        )}
      </div>
    </div>
  );
};

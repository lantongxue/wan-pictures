import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  Image as ImageIcon,
  HardDrive,
  FolderKanban,
  Tag as TagIcon,
  Users,
  Cloud,
  Sliders,
  ChevronRight,
  RefreshCw,
  Plus,
  ArrowRight,
  Shield,
  Server,
  Database,
  Upload,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { AdminOverviewStats } from '../../types';
import { adminApi } from '../../services/api';
import { formatFileSize } from '../../utils/imageProcessing';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useTranslation } from 'react-i18next';

export const AdminOverviewPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { backendOnline } = useAuth();
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getOverviewStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {t('admin.overview.title')}
            </h1>
            <Badge variant="subtle" className="text-[10px] font-mono">
              REAL-TIME
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('admin.overview.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadStats}
            disabled={loading}
            className="h-9 px-3 text-xs rounded-xl gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('admin.overview.refresh')}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/admin/images')}
            className="h-9 px-3.5 text-xs rounded-xl gap-1.5 cursor-pointer bg-primary text-primary-foreground font-semibold"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{t('admin.overview.manageImages')}</span>
          </Button>
        </div>
      </div>

      {/* 1. Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => navigate('/admin/images')}
          className="p-4.5 rounded-2xl border border-border/80 bg-card hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer space-y-1.5 group"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">{t('admin.overview.metricImages')}</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
              <ImageIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-foreground tracking-tight">
            {stats?.totalImages ?? 0}
          </p>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>{t('admin.overview.metricImagesDesc')}</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => navigate('/admin/storage')}
          className="p-4.5 rounded-2xl border border-border/80 bg-card hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer space-y-1.5 group"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">{t('admin.overview.metricStorage')}</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-foreground tracking-tight">
            {stats ? formatFileSize(stats.totalSize) : '0 B'}
          </p>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>{t('admin.overview.activeEngine', { engine: stats?.activeStorage.toUpperCase() || 'LOCAL' })}</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => navigate('/admin/albums')}
          className="p-4.5 rounded-2xl border border-border/80 bg-card hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer space-y-1.5 group"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">{t('admin.overview.metricAlbums')}</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-foreground tracking-tight">
            {stats?.totalAlbums ?? 0}
          </p>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>{t('admin.overview.metricAlbumsDesc')}</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => navigate('/admin/tags')}
          className="p-4.5 rounded-2xl border border-border/80 bg-card hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer space-y-1.5 group"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">{t('admin.overview.metricTags')}</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
              <TagIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-foreground tracking-tight">
            {stats?.totalTags ?? 0}
          </p>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>{t('admin.overview.metricTagsDesc')}</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => navigate('/admin/users')}
          className="p-4.5 rounded-2xl border border-border/80 bg-card hover:border-purple-500/50 hover:shadow-md transition-all cursor-pointer space-y-1.5 group col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">{t('admin.overview.metricUsers')}</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-foreground tracking-tight">
            {stats?.totalUsers ?? 0}
          </p>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>{t('admin.overview.metricUsersDesc')}</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </motion.div>
      </div>

      {/* 2. Storage Distribution & Formats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Engine Distribution */}
        <div className="p-5 sm:p-6 rounded-3xl border border-border/80 bg-card space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{t('admin.overview.storageTitle')}</h3>
                <p className="text-xs text-muted-foreground">Multi-Cloud Storage Allocations</p>
              </div>
            </div>
            <Link
              to="/admin/storage"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
            >
              <span>{t('admin.overview.configureEngine')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {/* Local Storage */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>{t('admin.overview.storageLocal')}</span>
                  {stats?.activeStorage === 'local' && (
                    <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4">
                      ACTIVE
                    </Badge>
                  )}
                </span>
                <span className="font-mono text-muted-foreground font-semibold">
                  {formatFileSize(stats?.storageUsage.local || 0)}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      stats && stats.totalSize > 0
                        ? ((stats.storageUsage.local || 0) / stats.totalSize) * 100
                        : 100
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* S3 Storage */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>{t('admin.overview.storageS3')}</span>
                  {stats?.activeStorage === 's3' && (
                    <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4">
                      ACTIVE
                    </Badge>
                  )}
                </span>
                <span className="font-mono text-muted-foreground font-semibold">
                  {formatFileSize(stats?.storageUsage.s3 || 0)}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      stats && stats.totalSize > 0
                        ? ((stats.storageUsage.s3 || 0) / stats.totalSize) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* WebDAV Storage */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>{t('admin.overview.storageWebdav')}</span>
                  {stats?.activeStorage === 'webdav' && (
                    <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4">
                      ACTIVE
                    </Badge>
                  )}
                </span>
                <span className="font-mono text-muted-foreground font-semibold">
                  {formatFileSize(stats?.storageUsage.webdav || 0)}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      stats && stats.totalSize > 0
                        ? ((stats.storageUsage.webdav || 0) / stats.totalSize) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('admin.overview.activeStorageLabel')}</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold font-mono text-foreground">
                {stats?.activeStorage.toUpperCase() || 'LOCAL'} DRIVER
              </span>
            </div>
          </div>
        </div>

        {/* File Formats Breakdown */}
        <div className="p-5 sm:p-6 rounded-3xl border border-border/80 bg-card space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{t('admin.overview.formatsTitle')}</h3>
                <p className="text-xs text-muted-foreground">MIME Format Breakdown</p>
              </div>
            </div>
            <Badge variant="subtle" className="text-[10px]">
              {t('admin.overview.formatCount', { count: Object.keys(stats?.formatStats || {}).length })}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {stats && Object.entries(stats.formatStats).map(([format, count]) => (
              <div
                key={format}
                className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-primary tracking-wider">
                    .{format}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-primary/40" />
                </div>
                <div className="mt-2">
                  <span className="text-xl font-black font-mono text-foreground">{count}</span>
                  <span className="text-[10px] text-muted-foreground ml-1">{t('admin.overview.imageUnit')}</span>
                </div>
              </div>
            ))}
            {(!stats || Object.keys(stats.formatStats).length === 0) && (
              <div className="col-span-3 text-center py-8 text-xs text-muted-foreground">
                {t('admin.overview.formatsEmpty')}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('admin.overview.supportedFormats')}</span>
            <Link to="/admin/images" className="text-primary hover:underline flex items-center gap-1 font-medium">
              <span>{t('admin.overview.viewAllAssets')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Quick Action Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Link
          to="/"
          className="p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
            <Upload className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">{t('admin.overview.quickUpload')}</p>
            <p className="text-[11px] text-muted-foreground truncate">{t('admin.overview.quickUploadDesc')}</p>
          </div>
        </Link>

        <Link
          to="/admin/albums"
          className="p-4 rounded-2xl border border-border/80 bg-card hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">{t('admin.overview.quickAlbum')}</p>
            <p className="text-[11px] text-muted-foreground truncate">{t('admin.overview.quickAlbumDesc')}</p>
          </div>
        </Link>

        <Link
          to="/admin/users"
          className="p-4 rounded-2xl border border-border/80 bg-card hover:border-purple-500/50 hover:bg-purple-500/5 transition-all flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">{t('admin.overview.quickUsers')}</p>
            <p className="text-[11px] text-muted-foreground truncate">{t('admin.overview.quickUsersDesc')}</p>
          </div>
        </Link>

        <Link
          to="/admin/settings"
          className="p-4 rounded-2xl border border-border/80 bg-card hover:border-amber-500/50 hover:bg-amber-500/5 transition-all flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Database className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">{t('admin.overview.quickBackup')}</p>
            <p className="text-[11px] text-muted-foreground truncate">{t('admin.overview.quickBackupDesc')}</p>
          </div>
        </Link>
      </div>

      {/* 4. Recent Assets Showcase */}
      <div className="p-5 sm:p-6 rounded-3xl border border-border/80 bg-card space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">{t('admin.overview.recentAssets')}</h3>
            <p className="text-xs text-muted-foreground">{t('admin.overview.recentAssetsDesc')}</p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/images')}
            className="text-xs h-8 gap-1 cursor-pointer"
          >
            <span>{t('admin.overview.enterAssetList')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {stats?.recentActivity.map((item, idx) => (
            <motion.div
              key={`recent-${item.id || idx}`}
              whileHover={{ scale: 1.03 }}
              onClick={() => navigate('/admin/images')}
              className="group relative rounded-2xl overflow-hidden border border-border/60 aspect-square bg-muted/40 cursor-pointer shadow-xs"
            >
              <img
                src={item.thumbUrl || item.dataUrl || item.url}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-left">
                <p className="text-[11px] text-white font-semibold truncate w-full">
                  {item.name}
                </p>
                <p className="text-[9px] text-white/70 font-mono">
                  {formatFileSize(item.size)}
                </p>
              </div>
            </motion.div>
          ))}
          {(!stats || stats.recentActivity.length === 0) && (
            <div className="col-span-8 text-center py-10 text-xs text-muted-foreground border border-dashed border-border/60 rounded-2xl">
              {t('admin.overview.recentEmpty')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

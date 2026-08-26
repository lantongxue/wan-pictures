import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Search,
  RefreshCw,
  Shield,
  Upload,
  Trash2,
  FolderKanban,
  HardDrive,
  KeyRound,
  Database,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  User as UserIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

interface AuditLogItem {
  id: string;
  type: 'auth' | 'upload' | 'delete' | 'storage' | 'album' | 'user' | 'system';
  operator: string;
  role: string;
  action: string;
  target: string;
  ip: string;
  status: 'success' | 'warning' | 'error';
  timestamp: number;
  details?: string;
}

const SAMPLE_LOGS: AuditLogItem[] = [
  {
    id: 'log_1',
    type: 'auth',
    operator: 'admin',
    role: 'root',
    action: '管理员登录',
    target: '管理控制台 /admin',
    ip: '127.0.0.1 (Localhost)',
    status: 'success',
    timestamp: Date.now() - 2 * 60 * 1000,
    details: '通过密码验证成功进入管理控制面板',
  },
  {
    id: 'log_2',
    type: 'storage',
    operator: 'admin',
    role: 'root',
    action: '存储引擎连通性自检',
    target: 'Amazon S3 / Cloudflare R2',
    ip: '127.0.0.1 (Localhost)',
    status: 'success',
    timestamp: Date.now() - 15 * 60 * 1000,
    details: 'S3 Ping 连通测试通过，响应耗时 32ms',
  },
  {
    id: 'log_3',
    type: 'upload',
    operator: 'creator',
    role: 'user',
    action: '批量图片入库',
    target: '壁纸精选相册 (3 张)',
    ip: '192.168.1.108',
    status: 'success',
    timestamp: Date.now() - 45 * 60 * 1000,
    details: '极速转码 WebP 并写入默认 Local 文件目录',
  },
  {
    id: 'log_4',
    type: 'user',
    operator: 'admin',
    role: 'root',
    action: '用户资料更新',
    target: '@photographer',
    ip: '127.0.0.1 (Localhost)',
    status: 'success',
    timestamp: Date.now() - 2 * 3600 * 1000,
    details: '分配普通用户角色并重置头像种子',
  },
  {
    id: 'log_5',
    type: 'album',
    operator: 'admin',
    role: 'root',
    action: '新建相册空间',
    target: '设计灵感 (#F59E0B)',
    ip: '127.0.0.1 (Localhost)',
    status: 'success',
    timestamp: Date.now() - 5 * 3600 * 1000,
    details: '创建独立相册空间并配置色标',
  },
  {
    id: 'log_6',
    type: 'system',
    operator: 'admin',
    role: 'root',
    action: '全量数据备份导出',
    target: 'wanpictures_backup.json',
    ip: '127.0.0.1 (Localhost)',
    status: 'success',
    timestamp: Date.now() - 24 * 3600 * 1000,
    details: '导出全库 12 张图片元数据及相册配置',
  },
];

export const AdminLogsPage: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLogItem[]>(SAMPLE_LOGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredLogs = logs.filter((item) => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.action.toLowerCase().includes(q) ||
        item.target.toLowerCase().includes(q) ||
        item.operator.toLowerCase().includes(q) ||
        item.ip.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {t('adminLogs.title')}
            </h1>
            <Badge variant="subtle" className="text-[10px] font-mono">
              AUDIT TRAIL
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('adminLogs.subtitle')}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setLogs(SAMPLE_LOGS)}
          className="h-9 px-3 text-xs rounded-xl gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t('adminLogs.refresh')}</span>
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('adminLogs.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9 rounded-xl"
          />
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[150px] text-xs h-9 rounded-xl">
            <SelectValue placeholder={t('adminLogs.categoryPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('adminLogs.categoryAll')}</SelectItem>
            <SelectItem value="auth">{t('adminLogs.categoryAuth')}</SelectItem>
            <SelectItem value="upload">{t('adminLogs.categoryUpload')}</SelectItem>
            <SelectItem value="storage">{t('adminLogs.categoryStorage')}</SelectItem>
            <SelectItem value="album">{t('adminLogs.categoryAlbum')}</SelectItem>
            <SelectItem value="user">{t('adminLogs.categoryUser')}</SelectItem>
            <SelectItem value="system">{t('adminLogs.categorySystem')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-muted/30 text-muted-foreground font-semibold">
                <th className="p-3.5">{t('adminLogs.colStatus')}</th>
                <th className="p-3.5">{t('adminLogs.colAction')}</th>
                <th className="p-3.5">{t('adminLogs.colOperator')}</th>
                <th className="p-3.5">{t('adminLogs.colTarget')}</th>
                <th className="p-3.5">{t('adminLogs.colDetail')}</th>
                <th className="p-3.5">{t('adminLogs.colIp')}</th>
                <th className="p-3.5">{t('adminLogs.colTime')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t('adminLogs.statusSuccess')}</span>
                    </span>
                  </td>

                  <td className="p-3.5 font-sans font-bold text-foreground">
                    {log.action}
                  </td>

                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                      <UserIcon className="w-3 h-3 text-primary" />
                      <span>@{log.operator}</span>
                    </span>
                  </td>

                  <td className="p-3.5 text-muted-foreground font-sans">
                    {log.target}
                  </td>

                  <td className="p-3.5 text-muted-foreground/80 font-sans text-[11px] max-w-[260px] truncate">
                    {log.details || '—'}
                  </td>

                  <td className="p-3.5 text-muted-foreground text-[11px]">
                    {log.ip}
                  </td>

                  <td className="p-3.5 text-muted-foreground text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground font-sans text-xs">
                    {t('adminLogs.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

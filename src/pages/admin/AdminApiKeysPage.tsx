import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  Search,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  CalendarClock,
  Clock,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AdminApiKeyItem } from '../../types';
import { adminApi } from '../../services/api';
import { copyToClipboard } from '../../utils/linkFormatter';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Paginator } from '../../components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { toast } from '../../components/ui/use-toast';

const PAGE_SIZE = 20;

export const AdminApiKeysPage: React.FC = () => {
  const { t } = useTranslation();

  const [keys, setKeys] = useState<AdminApiKeyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'revoked'>('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Revoke / view states
  const [revokingKey, setRevokingKey] = useState<AdminApiKeyItem | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [viewKey, setViewKey] = useState<AdminApiKeyItem | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    toast({
      title: message,
      variant: type === 'error' ? 'destructive' : 'success',
      duration: 3000,
    });
  };

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getApiKeys({
        q: appliedQuery,
        status: statusFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      if (res.success) {
        setKeys(res.data.items);
        setTotal(res.data.total);
      } else {
        showNotification(res.message || t('adminApiKeys.loadFailed'), 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, statusFilter, page, t]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedQuery(searchQuery.trim());
    setPage(1);
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 12) return '••••••••';
    return `${key.slice(0, 8)}${'•'.repeat(12)}${key.slice(-4)}`;
  };

  const handleCopyKey = async (key: AdminApiKeyItem) => {
    const ok = await copyToClipboard(key.key);
    if (ok) {
      setCopiedId(key.id);
      setTimeout(() => setCopiedId(null), 2000);
      showNotification(t('dev.copied'));
    } else {
      showNotification(t('dev.copyFailed'), 'error');
    }
  };

  const toggleReveal = (id: number) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRevoke = async () => {
    if (!revokingKey) return;
    setRevoking(true);
    const res = await adminApi.revokeApiKey(revokingKey.id);
    setRevoking(false);
    if (res.success) {
      showNotification(t('adminApiKeys.revokeSuccess', { name: revokingKey.name }));
      setRevokingKey(null);
      loadKeys();
    } else {
      showNotification(res.message || t('adminApiKeys.revokeFailed'), 'error');
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return t('dev.never');
    return new Date(value).toLocaleString();
  };

  // Null last-used means the key was never called — NOT "永久"
  const formatLastUsed = (value?: string | null) => {
    if (!value) return t('adminApiKeys.neverUsed');
    return new Date(value).toLocaleString();
  };

  const ownerLabel = (k: AdminApiKeyItem) => k.nickname || k.username;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {t('adminApiKeys.title')}
            </h1>
            <Badge variant="subtle" className="text-[10px] font-mono bg-indigo-500/10 text-indigo-500">
              {t('adminApiKeys.count', { count: total })}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t('adminApiKeys.subtitle')}</p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadKeys}
          disabled={loading}
          className="text-xs h-9 rounded-xl cursor-pointer gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('adminApiKeys.searchPlaceholder')}
            className="pl-9 text-xs h-9 rounded-xl"
          />
        </div>
        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val as typeof statusFilter); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px] text-xs h-9 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('adminApiKeys.filterAll')}</SelectItem>
            <SelectItem value="active">{t('adminApiKeys.filterActive')}</SelectItem>
            <SelectItem value="expired">{t('adminApiKeys.filterExpired')}</SelectItem>
            <SelectItem value="revoked">{t('adminApiKeys.filterRevoked')}</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" className="text-xs h-9 rounded-xl cursor-pointer px-5">
          {t('adminApiKeys.searchBtn')}
        </Button>
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-muted/30 text-muted-foreground font-semibold whitespace-nowrap">
                <th className="p-3.5">{t('adminApiKeys.colName')}</th>
                <th className="p-3.5">{t('adminApiKeys.colOwner')}</th>
                <th className="p-3.5 min-w-[220px]">{t('adminApiKeys.colKey')}</th>
                <th className="p-3.5 whitespace-nowrap">{t('adminApiKeys.colStatus')}</th>
                <th className="p-3.5 whitespace-nowrap">{t('dev.lastUsed')}</th>
                <th className="p-3.5 whitespace-nowrap">{t('dev.createdAt')}</th>
                <th className="p-3.5 text-right pr-4">{t('adminImages.colAction')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                    {t('dev.loading')}
                  </td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="py-14 text-center space-y-2">
                      <KeyRound className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                      <p className="text-sm font-bold text-foreground">{t('adminApiKeys.emptyTitle')}</p>
                      <p className="text-xs text-muted-foreground">{t('adminApiKeys.emptyDesc')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                keys.map((k) => {
                  const revealed = revealedIds.has(k.id);
                  const revoked = Boolean(k.isRevoked);
                  return (
                    <tr key={k.id} className={`hover:bg-muted/20 transition-colors ${revoked ? 'opacity-60' : ''}`}>
                      {/* Name */}
                      <td className="p-3.5">
                        <span className="font-semibold text-foreground">{k.name}</span>
                        <span className="block text-[10px] text-muted-foreground mt-0.5 font-mono">#{k.id}</span>
                      </td>

                      {/* Owner */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-foreground">{ownerLabel(k)}</span>
                          {k.userId === 1 && (
                            <Badge variant="subtle" className="text-[9px] px-1.5 py-0 h-4 bg-indigo-500/10 text-indigo-500 shrink-0">
                              ID {k.userId}
                            </Badge>
                          )}
                        </div>
                        <span className="block text-[10px] text-muted-foreground mt-0.5">{k.email}</span>
                      </td>

                      {/* Key (masked by default) */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono text-[11px] text-muted-foreground truncate max-w-[190px]" title={revealed ? k.key : undefined}>
                            {revealed ? k.key : maskKey(k.key)}
                          </code>
                          <button
                            type="button"
                            onClick={() => toggleReveal(k.id)}
                            className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                            title={revealed ? t('adminApiKeys.hide') : t('adminApiKeys.show')}
                          >
                            {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyKey(k)}
                            className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                            title={t('dev.copyBtn')}
                          >
                            <Copy className={`w-3.5 h-3.5 ${copiedId === k.id ? 'text-emerald-500' : ''}`} />
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 whitespace-nowrap">
                        {revoked ? (
                          <Badge variant="subtle" className="text-[9px] px-1.5 py-0 h-4 bg-rose-500/10 text-rose-500 font-medium">
                            {t('adminApiKeys.statusRevoked')}
                          </Badge>
                        ) : (
                          <Badge
                            variant="default"
                            className={`text-[9px] px-1.5 py-0 h-4 font-medium ${
                              k.isExpired ? 'bg-neutral-500/20 text-muted-foreground' : ''
                            }`}
                          >
                            {k.isExpired ? t('dev.statusExpired') : t('dev.statusActive')}
                          </Badge>
                        )}
                        {k.expiresAt && (
                          <span className="ml-1.5 text-[10px] text-muted-foreground" title={t('dev.expires')}>
                            <Clock className="w-3 h-3 inline -mt-0.5" />{' '}
                            {formatDate(k.expiresAt)}
                          </span>
                        )}
                      </td>

                      {/* Last used */}
                      <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                        <span className="inline-flex items-center gap-1" title={t('dev.lastUsed')}>
                          <Clock className="w-3 h-3" />
                          {formatLastUsed(k.lastUsedAt)}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                        <span className="inline-flex items-center gap-1" title={t('dev.createdAt')}>
                          <CalendarClock className="w-3 h-3" />
                          {formatDate(k.createdAt)}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="p-3.5 text-right pr-4 whitespace-nowrap">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewKey(k)}
                          className="text-[11px] h-7 px-2 cursor-pointer gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {t('dev.viewBtn')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={k.isExpired || revoked}
                          onClick={() => setRevokingKey(k)}
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-[11px] h-7 px-2 cursor-pointer gap-1 disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t('dev.deleteBtn')}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="border-t border-border/60 px-4">
            <Paginator
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Revoke confirm dialog */}
      <Dialog open={!!revokingKey} onOpenChange={(open) => !open && setRevokingKey(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span>{t('adminApiKeys.revokeTitle', { name: revokingKey?.name })}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t('adminApiKeys.revokeDesc', {
                name: revokingKey?.name,
                owner: revokingKey ? ownerLabel(revokingKey) : '',
              })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRevokingKey(null)}
              className="text-xs h-9 rounded-xl"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={revoking}
              onClick={handleRevoke}
              className="text-xs h-9 rounded-xl px-5 gap-1.5 cursor-pointer bg-rose-500 hover:bg-rose-600 text-white font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('dev.deleteBtn')}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Key detail dialog */}
      <Dialog open={!!viewKey} onOpenChange={(open) => !open && setViewKey(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">{viewKey ? `${t('dev.viewKeyTitle')}「${viewKey.name}」` : ''}</span>
            </DialogTitle>
            <DialogDescription>{viewKey ? `${t('adminApiKeys.owner')}: ${ownerLabel(viewKey)} (${viewKey.email})` : ''}</DialogDescription>
          </DialogHeader>

          {viewKey && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/80">
                <code className="flex-1 min-w-0 text-[13px] font-mono text-foreground select-all whitespace-nowrap overflow-x-auto">
                  {viewKey.key}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyKey(viewKey)}
                  className="shrink-0 text-xs h-8 cursor-pointer gap-1.5"
                >
                  {copiedId === viewKey.id ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === viewKey.id ? t('dev.copied') : t('dev.copyBtn')}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                  {t('dev.createdAt')}: {formatDate(viewKey.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  {t('dev.lastUsed')}: {formatLastUsed(viewKey.lastUsedAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  {t('dev.expires')}: {formatDate(viewKey.expiresAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${viewKey.isExpired ? 'text-neutral-400' : 'text-emerald-500/90'}`} />
                  {viewKey.isExpired ? t('dev.expiredText') : t('dev.statusActive')}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button type="button" onClick={() => setViewKey(null)} className="w-full h-9 text-xs cursor-pointer">
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

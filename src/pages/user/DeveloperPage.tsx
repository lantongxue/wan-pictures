import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useUser } from './UserContext';
import { devApi } from '../../services/api';
import { ApiKeyItem } from '../../types';
import { copyToClipboard } from '../../utils/linkFormatter';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Field,
  FieldSet,
  FieldGroup,
  FieldLabel,
} from '../../components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { CodeBlock } from '../../components/CodeBlock';
import {
  Code2,
  Copy,
  KeyRound,
  Plus,
  ShieldAlert,
  Trash2,
  Loader2,
  CheckCircle2,
  Clock,
  CalendarClock,
  LogIn,
  Globe,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';

// Dedicated open upload endpoint, resolved from the current page origin so
// the docs always show the real host instead of a placeholder
const uploadEndpoint = `${window.location.origin}/openapi/v1/upload`;

// Multi-language call examples (rendered with syntax highlighting)
const curlExample = `curl -X POST ${uploadEndpoint} \\
  -H "Authorization: Bearer <your-api-key>" \\
  -F "file=@photo.jpg" \\
  -F "album_id=1" \\
  -F "tags=WALLPAPER,4K,风景"`;

const pythonExample = `import requests

API_KEY = "wpk_xxxxxxxxxxxx"  # 替换为你的 API KEY

with open("photo.jpg", "rb") as f:
    resp = requests.post(
        "${uploadEndpoint}",
        headers={"Authorization": f"Bearer {API_KEY}"},
        files={"file": f},
        data={"album_id": 1, "tags": "WALLPAPER,4K,风景"},
    )

print(resp.json())`;

const nodeExample = `const fs = require("fs");

const API_KEY = "wpk_xxxxxxxxxxxx"; // 替换为你的 API KEY
const form = new FormData();
form.append("file", fs.createReadStream("photo.jpg"));
form.append("album_id", "1");
form.append("tags", "WALLPAPER,4K,风景");

const resp = await fetch("${uploadEndpoint}", {
  method: "POST",
  headers: { Authorization: \`Bearer \${API_KEY}\` },
  body: form,
});

console.log(await resp.json());`;

const jsonResponseExample = `{
  "code": 200,
  "message": "上传成功",
  "data": {
    "url": "${window.location.origin}/image/xxxx.png",
    "thumb_url": "${window.location.origin}/image/thumb/xxxx.png",
    "created_at": "2026-08-27T12:00:00Z"
  }
}`;

const EXPIRY_OPTIONS = [
  { value: 0, label: 'dev.expiryNever' },
  { value: 7, label: 'dev.expiry7' },
  { value: 30, label: 'dev.expiry30' },
  { value: 90, label: 'dev.expiry90' },
  { value: 365, label: 'dev.expiry365' },
];

export const DeveloperPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { showToast, handleOpenAuth } = useUser();

  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [expiryDays, setExpiryDays] = useState<number>(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewKey, setViewKey] = useState<ApiKeyItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ApiKeyItem | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [endpointCopied, setEndpointCopied] = useState(false);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    const res = await devApi.listKeys();
    setLoading(false);
    if (res.success) {
      setKeys(res.data);
    } else {
      showToast(t('common.error'), res.message || t('dev.loadFailed'), 'error');
    }
  }, [showToast, t]);

  useEffect(() => {
    if (isAuthenticated) {
      loadKeys();
    }
  }, [isAuthenticated, loadKeys]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast(t('common.warning'), t('dev.nameRequired'), 'warning');
      return;
    }
    setCreating(true);
    const res = await devApi.createKey({ name: name.trim(), expires_in_days: expiryDays || undefined });
    setCreating(false);
    if (res.success && res.data) {
      setKeys((prev) => [res.data!, ...prev]);
      setName('');
      setExpiryDays(0);
      setIsCreateOpen(false);
      setViewKey(res.data);
      showToast(t('dev.created'), undefined, 'success');
    } else {
      showToast(t('common.error'), res.message || t('dev.createFailed'), 'error');
    }
  };

  const handleCopyKey = async () => {
    if (!viewKey?.key) return;
    const ok = await copyToClipboard(viewKey.key);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast(t('dev.copied'), undefined, 'success');
    } else {
      showToast(t('common.error'), t('dev.copyFailed'), 'error');
    }
  };

  const handleCopyKeyValue = async (key: ApiKeyItem) => {
    if (!key.key) return;
    const ok = await copyToClipboard(key.key);
    if (ok) {
      setCopiedId(key.id);
      setTimeout(() => setCopiedId(null), 2000);
      showToast(t('dev.copied'), key.name, 'success');
    } else {
      showToast(t('common.error'), t('dev.copyFailed'), 'error');
    }
  };

  const handleConfirmRevoke = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setRevokingId(target.id);
    const res = await devApi.revokeKey(target.id);
    setRevokingId(null);
    if (res.success) {
      setKeys((prev) => prev.filter((k) => k.id !== target.id));
      setViewKey((prev) => (prev?.id === target.id ? null : prev));
      setPendingDelete(null);
      showToast(t('dev.revoked'), target.name, 'info');
    } else {
      showToast(t('common.error'), res.message || t('dev.revokeFailed'), 'error');
    }
  };

  const isExpired = (key: ApiKeyItem) => {
    return key.expiresAt ? new Date(key.expiresAt).getTime() < Date.now() : false;
  };

  const formatDate = (value?: string | null) => {
    if (!value) return t('dev.never');
    return new Date(value).toLocaleString();
  };

  const formatLastUsed = (value?: string | null) => {
    if (!value) return t('adminApiKeys.neverUsed');
    return new Date(value).toLocaleString();
  };

  const maskKey = (key: string) => {
    if (!key) return '••••••••••••••••';
    if (key.length < 12) return '•'.repeat(12);
    return `${key.slice(0, 8)}${'•'.repeat(10)}${key.slice(-4)}`;
  };

  const toggleReveal = (id: number) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyEndpoint = async () => {
    const ok = await copyToClipboard(uploadEndpoint);
    if (ok) {
      setEndpointCopied(true);
      setTimeout(() => setEndpointCopied(false), 2000);
      showToast(t('dev.copied'), uploadEndpoint, 'success');
    } else {
      showToast(t('common.error'), t('dev.copyFailed'), 'error');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto py-16">
        <Card className="text-center p-10">
          <ShieldAlert className="w-12 h-12 mx-auto text-amber-500 mb-4" />
          <CardTitle className="text-lg mb-2">{t('dev.loginRequiredTitle')}</CardTitle>
          <CardDescription className="text-sm mb-6">{t('dev.loginRequiredDesc')}</CardDescription>
          <Button onClick={() => handleOpenAuth('login')} className="mx-auto cursor-pointer">
            <LogIn className="w-4 h-4 mr-1.5" />
            {t('nav.login')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Code2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">{t('dev.title')}</h1>
          <p className="text-xs text-muted-foreground">{t('dev.subtitle')}</p>
        </div>
      </div>

      {/* Key list - Redesigned */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <KeyRound className="w-3.5 h-3.5" />
              </span>
              <span>{t('dev.listTitle')}</span>
            </CardTitle>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                disabled={keys.length >= 10}
                className="h-8 rounded-full gap-1.5 text-xs font-medium px-3.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('dev.createBtn')}</span>
                <span className="sm:hidden">新建</span>
              </Button>
              <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-background border-border/70">
                {keys.length} / 10
              </Badge>
            </div>
          </div>
          {keys.length > 0 && (
            <CardDescription className="text-xs mt-1">
              {t('dev.viewKeyDesc')}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-3 sm:p-4 bg-muted/10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs">{t('dev.loading')}</span>
            </div>
          ) : keys.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted border border-border/50 flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{t('dev.emptyList')}</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {t('dev.createDesc')}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {keys.map((key) => {
                const expired = isExpired(key);
                const revealed = revealedIds.has(key.id);
                const isCopied = copiedId === key.id;
                return (
                  <div
                    key={key.id}
                    className={`group relative rounded-2xl border bg-card p-4 sm:p-5 space-y-3.5 hover:shadow-sm transition-all ${
                      expired ? 'border-border/60 opacity-75' : 'border-border/60 hover:border-primary/20'
                    }`}
                  >
                    {/* Header: name + status + actions */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            expired
                              ? 'bg-muted border-border text-muted-foreground'
                              : 'bg-primary/10 border-primary/15 text-primary'
                          }`}
                        >
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold text-foreground truncate max-w-[140px] sm:max-w-[180px]">
                              {key.name}
                            </h4>
                            <span
                              className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                expired
                                  ? 'bg-neutral-500/10 text-muted-foreground border-neutral-500/20'
                                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  expired ? 'bg-muted-foreground' : 'bg-emerald-500 animate-pulse'
                                }`}
                              />
                              {expired ? t('dev.statusExpired') : t('dev.statusActive')}
                            </span>
                            {!expired && !key.expiresAt && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                <Clock className="w-3 h-3" />
                                {t('dev.permanent')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                            <span className="hidden sm:inline">ID {key.id}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="flex items-center gap-1 truncate">
                              <CalendarClock className="w-3 h-3 shrink-0" />
                              {formatDate(key.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={revokingId === key.id}
                          onClick={() => setPendingDelete(key)}
                          className="h-8 w-8 rounded-full text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer shrink-0"
                        >
                          {revokingId === key.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Key value - masked with reveal */}
                    <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-muted/50 border border-border/50 group-hover:bg-muted/70 transition-colors">
                      <code className="flex-1 min-w-0 text-xs sm:text-[13px] tracking-wider text-foreground truncate select-all">
                        {revealed ? key.key || '••••••••' : maskKey(key.key || '')}
                      </code>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleReveal(key.id)}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                          title={revealed ? t('adminApiKeys.hide') : t('adminApiKeys.show')}
                        >
                          {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <div className="w-px h-4 bg-border/60 mx-1" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyKeyValue(key)}
                          className={`h-7 w-7 rounded-lg cursor-pointer ${
                            isCopied ? 'text-emerald-500 bg-emerald-500/10' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {isCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewKey(key)}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer sm:hidden"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Meta grid - 3 columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/30 border border-border/40">
                        <div className="w-7 h-7 rounded-lg bg-background border border-border/50 flex items-center justify-center shrink-0">
                          <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                            {t('dev.createdAt')}
                          </p>
                          <p className="text-xs font-medium text-foreground truncate">{formatDate(key.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/30 border border-border/40">
                        <div className="w-7 h-7 rounded-lg bg-background border border-border/50 flex items-center justify-center shrink-0">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                            {t('dev.lastUsed')}
                          </p>
                          <p className="text-xs font-medium text-foreground truncate">
                            {formatLastUsed(key.lastUsedAt)}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                          expired
                            ? 'bg-rose-500/5 border-rose-500/20'
                            : !key.expiresAt
                              ? 'bg-emerald-500/5 border-emerald-500/20'
                              : 'bg-muted/30 border-border/40'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                            expired
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                              : !key.expiresAt
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                                : 'bg-background border-border/50 text-muted-foreground'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                            {t('dev.expires')}
                          </p>
                          <p
                            className={`text-xs font-medium truncate ${
                              expired ? 'text-rose-600' : !key.expiresAt ? 'text-emerald-600' : 'text-foreground'
                            }`}
                          >
                            {key.expiresAt ? formatDate(key.expiresAt) : t('dev.permanent')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage docs - Redesigned */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/40 bg-muted/20">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Code2 className="w-3.5 h-3.5" />
            </div>
            {t('dev.docsTitle')}
          </CardTitle>
          <CardDescription>{t('dev.docsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 sm:p-5 space-y-6">
            {/* API Endpoint - 突显 */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                </span>
                API 接口
                <Badge variant="outline" className="ml-1 text-[10px] bg-background">v1</Badge>
              </h4>
              <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold tracking-wide shadow-xs">
                      POST
                    </span>
                    <span className="text-xs font-medium text-foreground hidden lg:inline">/openapi/v1/upload</span>
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2 p-2.5 rounded-xl bg-background border border-border/60 text-xs sm:text-sm shadow-xs">
                    <Globe className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
                    <span className="flex-1 truncate text-foreground select-all">{uploadEndpoint}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyEndpoint}
                      className="h-7 px-2.5 rounded-full gap-1.5 shrink-0 text-xs"
                    >
                      {endpointCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {endpointCopied ? t('dev.copied') : '复制'}
                    </Button>
                  </div>
                </div>
                <div className="px-3 sm:px-4 pb-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Content-Type: multipart/form-data
                  </span>
                  <span className="hidden sm:inline text-border">•</span>
                  <span className="font-mono">Base URL: {window.location.origin}</span>
                  <span className="hidden sm:inline text-border">•</span>
                  <span className="inline-flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    需 Bearer 认证
                  </span>
                </div>
              </div>
            </div>

            {/* 认证方式 */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                </span>
                认证方式
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                  Bearer Token
                </Badge>
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                所有请求必须在 <code className="px-1.5 py-0.5 rounded bg-muted border text-xs font-mono">Header</code> 中携带{' '}
                <code className="px-1.5 py-0.5 rounded bg-background border text-xs text-foreground">
                  Authorization: Bearer &lt;your-api-key&gt;
                </code>{' '}
                ，服务端按账号角色进行配额、频控与鉴权校验，key 过期/吊销或超限将返回 <code className="text-xs font-mono">401 / 429</code>。
              </p>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-background border border-border/60 text-xs shadow-xs">
                <KeyRound className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate text-foreground select-all">Authorization: Bearer wpk_••••••••••••••••••••••••</span>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  Header
                </Badge>
              </div>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3 shrink-0" />
                请勿将密钥暴露在前端代码或公开仓库，遗失后无法找回需重新创建
              </p>
            </div>

            {/* 参数明细 */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Code2 className="w-3.5 h-3.5 text-blue-600" />
                </span>
                请求参数
                <span className="text-xs font-normal text-muted-foreground">multipart/form-data</span>
                <Badge variant="outline" className="text-[10px] ml-auto">3 个字段</Badge>
              </h4>
              <div className="rounded-2xl border border-border/60 overflow-hidden bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/60 text-muted-foreground text-[11px] uppercase tracking-wide">
                        <th className="text-left p-3 font-medium whitespace-nowrap">参数</th>
                        <th className="text-left p-3 font-medium whitespace-nowrap">类型</th>
                        <th className="text-left p-3 font-medium whitespace-nowrap">必填</th>
                        <th className="text-left p-3 font-medium min-w-[200px]">说明</th>
                        <th className="text-left p-3 font-medium hidden sm:table-cell whitespace-nowrap">示例</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      <tr className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                          file
                          <span className="ml-1.5 text-[10px] px-1 py-0 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20">必选</span>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[11px] bg-background">File</Badge>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                            <span className="w-1 h-1 rounded-full bg-rose-500" />
                            是
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground leading-relaxed">
                          图片文件，二进制流。支持 <span className="text-foreground">PNG/JPG/WEBP/GIF/SVG/AVIF/BMP/ICO</span>，单文件大小受配额限制
                        </td>
                        <td className="p-3 text-muted-foreground hidden sm:table-cell">photo.jpg</td>
                      </tr>
                      <tr className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-medium text-foreground whitespace-nowrap">album_id</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[11px] bg-background">Integer</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">否</td>
                        <td className="p-3 text-muted-foreground leading-relaxed">
                          目标相册 ID，不传则归入默认相册。需为当前账号下已存在的相册
                        </td>
                        <td className="p-3 text-muted-foreground hidden sm:table-cell">1</td>
                      </tr>
                      <tr className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-medium text-foreground whitespace-nowrap">tags</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[11px] bg-background">String</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">否</td>
                        <td className="p-3 text-muted-foreground leading-relaxed">
                          逗号分隔标签，自动大写、去重、截断至 <span className="text-foreground">10</span> 个
                        </td>
                        <td className="p-3 text-muted-foreground hidden sm:table-cell">WALLPAPER,4K,风景</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="px-3 py-2.5 bg-muted/30 border-t border-border/40 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    单次单文件
                  </span>
                  <span className="text-border">•</span>
                  <span>需携带有效 Bearer Token</span>
                  <span className="text-border hidden sm:inline">•</span>
                  <span className="hidden sm:inline">超出配额/频控返回 429</span>
                </div>
              </div>
            </div>

            {/* 响应示例 */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </span>
                响应示例
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/20">JSON</Badge>
              </h4>
              <CodeBlock code={jsonResponseExample} language="json" label="json • 200 OK — application/json" />
            </div>

            {/* 多语言示例 */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-zinc-500/10 border border-border/60 flex items-center justify-center shrink-0">
                  <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
                </span>
                调用示例
              </h4>
              <Tabs defaultValue="bash">
                <TabsList className="h-9">
                  <TabsTrigger value="bash">cURL</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                  <TabsTrigger value="javascript">Node.js</TabsTrigger>
                </TabsList>

                <TabsContent value="bash" className="mt-2.5">
                  <CodeBlock code={curlExample} language="bash" label="bash / curl" />
                </TabsContent>
                <TabsContent value="python" className="mt-2.5">
                  <CodeBlock code={pythonExample} language="python" label="Python 3" />
                </TabsContent>
                <TabsContent value="javascript" className="mt-2.5">
                  <CodeBlock code={nodeExample} language="javascript" label="Node.js 18+" />
                </TabsContent>
              </Tabs>
            </div>

            {/* 注意事项 */}
            <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 space-y-2">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                注意事项
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1.5 pl-1 leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>{t('dev.docsTagsLimit')}</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>{t('dev.docsInstant')}</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>{t('dev.docsQuota')}</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>
                    错误码：<code className="px-1 py-0.5 rounded bg-background border text-[11px] font-mono">401</code> 未授权（key 无效/过期/吊销）
                    <span className="mx-1">•</span>
                    <code className="px-1 py-0.5 rounded bg-background border text-[11px] font-mono">413</code> 文件过大
                    <span className="mx-1">•</span>
                    <code className="px-1 py-0.5 rounded bg-background border text-[11px] font-mono">429</code> 超配额/频控
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API KEY 查看 / 创建成功弹窗 */}
      <Dialog open={!!viewKey} onOpenChange={(open) => !open && setViewKey(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">
                {viewKey ? `${t('dev.viewKeyTitle')}「${viewKey.name}」` : t('dev.newKeyTitle')}
              </span>
            </DialogTitle>
            <DialogDescription>
              {viewKey?.key ? t('dev.viewKeyDesc') : ''}
            </DialogDescription>
          </DialogHeader>

          {viewKey?.key && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/80">
                <code className="flex-1 min-w-0 text-[13px] text-foreground select-all whitespace-nowrap overflow-x-auto">
                  {viewKey.key}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyKey}
                  className="shrink-0 text-xs h-8 cursor-pointer gap-1.5"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? t('dev.copied') : t('dev.copyBtn')}
                </Button>
              </div>
              <div className="flex items-center justify-between gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                  {t('dev.createdAt')}: {viewKey ? formatDate(viewKey.createdAt) : ''}
                </span>
                {viewKey?.expiresAt ? (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    {t('dev.expires')}: {formatDate(viewKey.expiresAt)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-emerald-500/90">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    {t('dev.permanent')}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-rose-500/90 font-medium flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                {t('dev.keyWarning')}
              </p>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button type="button" onClick={() => setViewKey(null)} className="w-full h-9 text-xs cursor-pointer">
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新建 KEY 弹窗 - Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && setIsCreateOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <span className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <KeyRound className="w-3.5 h-3.5" />
              </span>
              {t('dev.createTitle')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">{t('dev.createDesc')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <FieldSet className="gap-4">
              <FieldGroup className="gap-3.5">
                <Field>
                  <FieldLabel htmlFor="dev-key-name-create" required>
                    {t('dev.nameField')}
                  </FieldLabel>
                  <Input
                    id="dev-key-name-create"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('dev.namePlaceholder')}
                    maxLength={64}
                    className="text-xs h-9 rounded-xl"
                    autoFocus
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="dev-key-expiry-create">{t('dev.expiryField')}</FieldLabel>
                  <Select value={String(expiryDays)} onValueChange={(val) => setExpiryDays(Number(val))}>
                    <SelectTrigger id="dev-key-expiry-create" className="w-full text-xs h-9 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {t(opt.label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </FieldSet>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="text-xs h-9 rounded-xl flex-1 sm:flex-none"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={creating || !name.trim() || keys.length >= 10}
                className="text-xs h-9 rounded-xl gap-1.5 flex-1 sm:flex-none"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {t('dev.createBtn')}
              </Button>
            </DialogFooter>
          </form>
          {keys.length >= 10 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 mt-2">
              已达到上限（10/10），请先删除不需要的 KEY 后再创建
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 - shadcn AlertDialog */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base font-bold">
              <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <span className="truncate">
                {pendingDelete ? `${t('common.delete')} API KEY「${pendingDelete.name}」？` : t('common.delete')}
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground text-left">
              {t('dev.revokeConfirm', { name: pendingDelete?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 pt-2">
            <AlertDialogCancel
              disabled={revokingId !== null}
              className="text-xs h-9 rounded-xl"
            >
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmRevoke();
              }}
              disabled={revokingId !== null}
              className="text-xs h-9 rounded-xl px-5 gap-1.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold focus:ring-rose-500"
            >
              {revokingId !== null ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              {t('dev.deleteBtn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
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
  const [viewKey, setViewKey] = useState<ApiKeyItem | null>(null);
  const [copied, setCopied] = useState(false);

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
      showToast(t('dev.copied'), key.name, 'success');
    } else {
      showToast(t('common.error'), t('dev.copyFailed'), 'error');
    }
  };

  const handleRevoke = async (key: ApiKeyItem) => {
    if (!window.confirm(t('dev.revokeConfirm', { name: key.name }))) return;
    setRevokingId(key.id);
    const res = await devApi.revokeKey(key.id);
    setRevokingId(null);
    if (res.success) {
      setKeys((prev) => prev.filter((k) => k.id !== key.id));
      setViewKey((prev) => (prev?.id === key.id ? null : prev));
      showToast(t('dev.revoked'), key.name, 'info');
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

      {/* Create API KEY */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            {t('dev.createTitle')}
          </CardTitle>
          <CardDescription>{t('dev.createDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate}>
            <FieldSet className="gap-4">
              <FieldGroup className="gap-3.5">
                <Field>
                  <FieldLabel htmlFor="dev-key-name" required>
                    {t('dev.nameField')}
                  </FieldLabel>
                  <Input
                    id="dev-key-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('dev.namePlaceholder')}
                    maxLength={64}
                    className="text-xs h-9 rounded-xl"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="dev-key-expiry">{t('dev.expiryField')}</FieldLabel>
                  <Select
                    value={String(expiryDays)}
                    onValueChange={(val) => setExpiryDays(Number(val))}
                  >
                    <SelectTrigger id="dev-key-expiry" className="w-full text-xs h-9 rounded-xl">
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

              <Button
                type="submit"
                disabled={creating}
                className="w-full h-9 text-xs rounded-xl cursor-pointer gap-1.5"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {t('dev.createBtn')}
              </Button>
            </FieldSet>
          </form>
        </CardContent>
      </Card>

      {/* Key list */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              {t('dev.listTitle')}
            </span>
            <Badge variant="subtle" className="text-[10px] font-mono">
              {keys.length} / 10
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              {t('dev.loading')}
            </div>
          ) : keys.length === 0 ? (
            <p className="text-center py-8 text-xs text-muted-foreground">{t('dev.emptyList')}</p>
          ) : (
            keys.map((key) => {
              const expired = isExpired(key);
              return (
                <div
                  key={key.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3.5 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  {/* Left: name + creation time */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground truncate">{key.name}</span>
                      <Badge
                        variant={expired ? 'secondary' : 'default'}
                        className={`text-[9px] px-1.5 py-0 h-4 shrink-0 font-medium ${
                          expired ? 'bg-neutral-500/20 text-muted-foreground' : ''
                        }`}
                      >
                        {expired ? t('dev.statusExpired') : t('dev.statusActive')}
                      </Badge>
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground" title={t('dev.createdAt')}>
                      <CalendarClock className="w-3 h-3" />
                      {formatDate(key.createdAt)}
                    </div>
                  </div>

                  {/* Right: meta + actions */}
                  <div className="flex items-center gap-2.5 sm:gap-3 text-[10px] text-muted-foreground shrink-0">
                    <span className="hidden md:flex items-center gap-1" title={t('dev.lastUsed')}>
                      <Clock className="w-3 h-3" />
                      {formatDate(key.lastUsedAt)}
                    </span>
                    {key.expiresAt && (
                      <span className="flex items-center gap-1" title={t('dev.expires')}>
                        {expired ? t('dev.expiredText') : t('dev.expiresText', { date: formatDate(key.expiresAt) })}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyKeyValue(key)}
                      className="text-[11px] h-7 px-2 cursor-pointer gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {t('dev.copyBtn')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setViewKey(key)}
                      className="text-[11px] h-7 px-2 cursor-pointer gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {t('dev.viewBtn')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={revokingId === key.id}
                      onClick={() => handleRevoke(key)}
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-[11px] h-7 px-2 cursor-pointer"
                    >
                      {revokingId === key.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      {t('dev.deleteBtn')}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Usage docs */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" />
            {t('dev.docsTitle')}
          </CardTitle>
          <CardDescription>{t('dev.docsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2.5">
            <p className="text-sm font-semibold text-foreground">{t('dev.docsUploadTitle')}</p>
            <div className="flex items-center gap-2 text-[13px] font-mono text-muted-foreground">
              <Globe className="w-4 h-4 shrink-0 text-primary" />
              <span className="break-all">{uploadEndpoint}</span>
            </div>

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

            <ul className="text-[13px] text-muted-foreground space-y-1 pl-1">
              <li>· {t('dev.docsTagsLimit')}</li>
              <li>· {t('dev.docsInstant')}</li>
              <li>· {t('dev.docsQuota')}</li>
            </ul>
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
                <code className="flex-1 min-w-0 text-[13px] font-mono text-foreground select-all whitespace-nowrap overflow-x-auto">
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
    </div>
  );
};
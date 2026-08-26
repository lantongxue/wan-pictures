import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  User as UserIcon,
  Crown,
  Edit3,
  Trash2,
  KeyRound,
  RefreshCw,
  X,
  Check,
  AlertTriangle,
  ImageIcon,
  FolderKanban,
  Sparkles,
  Calendar,
  Eye,
  EyeOff,
  Dice5,
  CheckCircle2,
  Gauge,
} from 'lucide-react';
import { AdminUserItem, CreateUserPayload, UpdateUserPayload, User } from '../../types';
import { adminApi } from '../../services/api';
import { formatDate } from '../../utils/imageProcessing';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Paginator } from '../ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Field,
  FieldSet,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from '../ui/field';

interface UserManagementTabProps {
  currentUser: User | null;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onUserCountChange?: (count: number) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
];

export const UserManagementTab: React.FC<UserManagementTabProps> = ({
  currentUser,
  onShowToast,
  onUserCountChange,
}) => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user' | 'vip'>('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [resetPwdUser, setResetPwdUser] = useState<AdminUserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUserItem | null>(null);

  // Form States - Create
  const [createForm, setCreateForm] = useState<CreateUserPayload>({
    username: '',
    email: '',
    nickname: '',
    password: '',
    role: 'user',
    avatar: '',
    bio: '',
  });

  // Form States - Edit
  const [editForm, setEditForm] = useState<UpdateUserPayload>({
    email: '',
    nickname: '',
    role: 'user',
    avatar: '',
    bio: '',
  });

  // Per-account upload QPS/RPM override states (create & edit)
  type QpsMode = 'global' | 'unlimited' | 'custom';
  const [createQpsMode, setCreateQpsMode] = useState<QpsMode>('global');
  const [createQpsCustom, setCreateQpsCustom] = useState('5');
  const [createRpmMode, setCreateRpmMode] = useState<QpsMode>('global');
  const [createRpmCustom, setCreateRpmCustom] = useState('30');
  const [editQpsMode, setEditQpsMode] = useState<QpsMode>('global');
  const [editQpsCustom, setEditQpsCustom] = useState('5');
  const [editRpmMode, setEditRpmMode] = useState<QpsMode>('global');
  const [editRpmCustom, setEditRpmCustom] = useState('30');

  // Form States - Reset Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [roleFilter, page, pageSize]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({
        q: searchQuery,
        role: roleFilter,
        page,
        pageSize,
      });
      if (res.success) {
        setUsers(res.data.items);
        setTotal(res.data.total || 0);
        if (onUserCountChange) {
          onUserCountChange(res.data.total || 0);
        }
      }
    } catch (err: any) {
      onShowToast(t('adminUsersTab.loadFailed'), err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  // -------------------------------------------------------------
  // Create User
  // -------------------------------------------------------------
  const handleOpenCreate = () => {
    const randomSeed = Math.random().toString(36).substring(2, 8);
    setCreateForm({
      username: '',
      email: '',
      nickname: '',
      password: '',
      role: 'user',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`,
      bio: '',
    });
    setIsCreateOpen(true);
  };

  const handleRandomizeAvatar = (isCreate: boolean) => {
    const randomSeed = Math.random().toString(36).substring(2, 8);
    const newAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`;
    if (isCreate) {
      setCreateForm((prev) => ({ ...prev, avatar: newAvatar }));
    } else {
      setEditForm((prev) => ({ ...prev, avatar: newAvatar }));
    }
  };

  const resolveLimitPayload = (mode: QpsMode, custom: string): number => {
    // -1=follow global, 0=unlimited, >0=custom
    if (mode === 'global') return -1;
    if (mode === 'unlimited') return 0;
    return Math.max(1, parseInt(custom) || 1);
  };

  const initLimitMode = (value: number | null | undefined): QpsMode => {
    if (value === null || value === undefined) return 'global';
    if (Number(value) === 0) return 'unlimited';
    return 'custom';
  };

  const formatLimitLabel = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return t('adminUsersTab.global');
    if (Number(value) === 0) return '∞';
    return String(value);
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.username || !createForm.email || !createForm.password) {
      onShowToast(t('adminUsersTab.fillRequired'), t('adminUsersTab.fillRequiredDesc'), 'warning');
      return;
    }
    if (createForm.password.length < 6) {
      onShowToast(t('adminUsersTab.pwdTooShort'), t('adminUsersTab.pwdTooShortDesc'), 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.createUser({
        ...createForm,
        uploadQps: resolveLimitPayload(createQpsMode, createQpsCustom),
        uploadRpm: resolveLimitPayload(createRpmMode, createRpmCustom),
      });
      if (res.success) {
        onShowToast(t('adminUsersTab.createSuccess'), t('adminUsersTab.createSuccessDesc', { username: createForm.username }), 'success');
        setIsCreateOpen(false);
        loadUsers();
      }
    } catch (err: any) {
      onShowToast(t('adminUsersTab.createFailed'), err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Edit User
  // -------------------------------------------------------------
  const handleOpenEdit = (u: AdminUserItem) => {
    setEditingUser(u);
    setEditForm({
      email: u.email,
      nickname: u.nickname || u.username,
      role: (u.role === 'admin' || u.role === 'vip' ? u.role : 'user') as 'admin' | 'user' | 'vip',
      avatar: u.avatar || '',
      bio: u.bio || '',
    });
    if (u.uploadQps === null || u.uploadQps === undefined) {
      setEditQpsMode('global');
    } else {
      setEditQpsMode(initLimitMode(u.uploadQps));
      setEditQpsCustom(String(u.uploadQps));
    }
    if (u.uploadRpm === null || u.uploadRpm === undefined) {
      setEditRpmMode('global');
    } else {
      setEditRpmMode(initLimitMode(u.uploadRpm));
      setEditRpmCustom(String(u.uploadRpm));
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSubmitting(true);
    try {
      const res = await adminApi.updateUser(editingUser.id, {
        ...editForm,
        uploadQps: resolveLimitPayload(editQpsMode, editQpsCustom),
        uploadRpm: resolveLimitPayload(editRpmMode, editRpmCustom),
      });
      if (res.success) {
        onShowToast(t('adminUsersTab.updateSuccess'), t('adminUsersTab.updateSuccessDesc', { username: editingUser.username }), 'success');
        setEditingUser(null);
        loadUsers();
      }
    } catch (err: any) {
      onShowToast(t('adminUsersTab.updateFailed'), err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Reset Password
  // -------------------------------------------------------------
  const handleOpenResetPwd = (u: AdminUserItem) => {
    setResetPwdUser(u);
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setConfirmPassword(pwd);
    setShowPassword(true);
  };

  const handleSubmitResetPwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwdUser) return;
    if (!newPassword || newPassword.length < 6) {
      onShowToast(t('adminUsersTab.pwdTooShort2'), t('adminUsersTab.pwdTooShort2Desc'), 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      onShowToast(t('adminUsersTab.pwdMismatch'), t('adminUsersTab.pwdMismatchDesc'), 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.resetUserPassword(resetPwdUser.id, newPassword);
      if (res.success) {
        onShowToast(t('adminUsersTab.pwdReset'), t('adminUsersTab.pwdResetDesc', { username: resetPwdUser.username }), 'success');
        setResetPwdUser(null);
      }
    } catch (err: any) {
      onShowToast(t('adminUsersTab.pwdResetFailed'), err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Delete User
  // -------------------------------------------------------------
  const handleOpenDelete = (u: AdminUserItem) => {
    if (Number(u.id) === 1 || u.username === 'admin') {
      onShowToast(t('adminUsersTab.protectedAccount'), t('adminUsersTab.protectedAccountDesc'), 'warning');
      return;
    }
    if (currentUser && (u.id === currentUser.id || u.username === currentUser.username)) {
      onShowToast(t('adminUsersTab.cannotDeleteSelf'), t('adminUsersTab.cannotDeleteSelfDesc'), 'warning');
      return;
    }
    setDeletingUser(u);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    setSubmitting(true);
    try {
      const res = await adminApi.deleteUser(deletingUser.id);
      if (res.success) {
        onShowToast(t('adminUsersTab.deletedSuccess'), t('adminUsersTab.deletedSuccessDesc', { username: deletingUser.username }), 'success');
        setDeletingUser(null);
        loadUsers();
      }
    } catch (err: any) {
      onShowToast(t('adminUsersTab.deleteFailed'), err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl border border-border/80 bg-muted/20">
        {/* Search & Role Filters */}
        <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('adminUsersTab.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 rounded-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                  loadUsers();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            className="h-9 px-3 text-xs rounded-xl cursor-pointer"
          >
            {t('adminUsersTab.search')}
          </Button>

          {/* Role Filter Badges */}
          <div className="hidden md:flex items-center gap-1 ml-2 p-1 bg-background/60 border border-border/60 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setRoleFilter('all');
                setPage(1);
              }}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                roleFilter === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('adminUsersTab.filterAll', { count: total })}
            </button>
            <button
              type="button"
              onClick={() => {
                setRoleFilter('admin');
                setPage(1);
              }}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                roleFilter === 'admin'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('adminUsersTab.roleAdmin')}
            </button>
            <button
              type="button"
              onClick={() => {
                setRoleFilter('vip');
                setPage(1);
              }}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                roleFilter === 'vip'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('adminUsersTab.roleVip')}
            </button>
            <button
              type="button"
              onClick={() => {
                setRoleFilter('user');
                setPage(1);
              }}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                roleFilter === 'user'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('adminUsersTab.roleUser')}
            </button>
          </div>
        </form>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadUsers}
            disabled={loading}
            className="h-9 px-3 text-xs rounded-xl gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('adminUsersTab.refresh')}</span>
          </Button>
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-9 px-3.5 text-xs rounded-xl gap-1.5 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{t('adminUsersTab.addUser')}</span>
          </Button>
        </div>
      </div>

      {/* User Table */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs">{t('adminUsersTab.loading')}</p>
        </div>
      ) : users.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border/80 rounded-2xl bg-muted/10 space-y-3">
          <Users className="w-10 h-10 text-muted-foreground/50 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{t('adminUsersTab.emptyTitle')}</p>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? t('adminUsersTab.emptyDescSearch', { query: searchQuery }) : t('adminUsersTab.emptyDescNone')}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="text-xs rounded-xl h-8 px-3 gap-1 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{t('adminUsersTab.createFirst')}</span>
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-muted-foreground font-semibold">
                  <th className="p-3.5">{t('adminUsersTab.colUser')}</th>
                  <th className="p-3.5">{t('adminUsersTab.colRole')}</th>
                  <th className="p-3.5 min-w-[180px]">{t('adminUsersTab.colEmail')}</th>
                  <th className="p-3.5">{t('adminUsersTab.colStats')}</th>
                  <th className="p-3.5">{t('adminUsersTab.colRateLimit')}</th>
                  <th className="p-3.5 whitespace-nowrap">{t('adminUsersTab.colRegistered')}</th>
                  <th className="p-3.5 text-right pr-4">{t('adminUsersTab.colAction')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((u) => {
                  const isRoot = Number(u.id) === 1 || u.username === 'admin';
                  const isSelf = currentUser && (u.id === currentUser.id || u.username === currentUser.username);

                  return (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      {/* User */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <img
                              src={
                                u.avatar ||
                                `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                                  u.username
                                )}`
                              }
                              alt={u.username}
                              className="w-9 h-9 rounded-lg object-cover border border-border/80 bg-muted"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                                  u.username
                                )}`;
                              }}
                            />
                            {u.role === 'admin' ? (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs border-2 border-card">
                                <Shield className="w-2 h-2" />
                              </div>
                            ) : (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs border-2 border-card">
                                <UserIcon className="w-2 h-2" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-foreground truncate max-w-[140px]">
                                {u.nickname || u.username}
                              </span>
                              {isRoot && (
                                <Badge
                                  variant="subtle"
                                  className="text-[9px] px-1.5 py-0 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-semibold"
                                >
                                  ROOT
                                </Badge>
                              )}
                              {isSelf && (
                                <Badge
                                  variant="subtle"
                                  className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                >
                                  {t('adminUsersTab.selfBadge')}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-muted-foreground truncate">
                              @{u.username} · #{u.id}
                            </p>
                            {u.bio && (
                              <p className="text-[11px] text-muted-foreground/70 truncate max-w-[220px] italic">
                                "{u.bio}"
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider shrink-0 ${
                            u.role === 'admin'
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                              : u.role === 'vip'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-muted text-muted-foreground border border-border/60'
                          }`}
                        >
                          {u.role === 'admin' ? (
                            <>
                              <Shield className="w-3 h-3" />
                              {t('adminUsersTab.roleBadgeAdmin')}
                            </>
                          ) : u.role === 'vip' ? (
                            <>
                              <Crown className="w-3 h-3" />
                              {t('adminUsersTab.roleBadgeVip')}
                            </>
                          ) : (
                            <>
                              <UserIcon className="w-3 h-3" />
                              {t('adminUsersTab.roleBadgeUser')}
                            </>
                          )}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="p-3.5 text-muted-foreground">
                        <span className="inline-block truncate max-w-[200px] align-middle" title={u.email}>
                          {u.email}
                        </span>
                      </td>

                      {/* Stats */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground whitespace-nowrap">
                          <span className="flex items-center gap-1" title={t('adminUsersTab.statImagesTitle')}>
                            <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                            <span className="font-mono font-bold text-foreground">
                              {u.imageCount !== undefined ? u.imageCount : 0}
                            </span>
                            {t('adminUsersTab.statImages')}
                          </span>
                          <span className="flex items-center gap-1" title={t('adminUsersTab.statAlbumsTitle')}>
                            <FolderKanban className="w-3.5 h-3.5 text-amber-500" />
                            <span className="font-mono font-bold text-foreground">
                              {u.albumCount !== undefined ? u.albumCount : 0}
                            </span>
                            {t('adminUsersTab.statAlbums')}
                          </span>
                        </div>
                      </td>

                      {/* QPS / RPM */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-mono whitespace-nowrap ${
                            u.uploadQps !== null && u.uploadQps !== undefined || u.uploadRpm !== null && u.uploadRpm !== undefined
                              ? 'text-indigo-500'
                              : 'text-muted-foreground/60'
                          }`}
                          title={t('adminUsersTab.qpsTitle', { qps: formatLimitLabel(u.uploadQps), rpm: formatLimitLabel(u.uploadRpm) })}
                        >
                          <Gauge className="w-3 h-3" />
                          QPS {formatLimitLabel(u.uploadQps)} · RPM {formatLimitLabel(u.uploadRpm)}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1 text-[11px]" title={t('adminUsersTab.registeredTitle')}>
                          <Calendar className="w-3 h-3" />
                          {u.createdAt ? formatDate(new Date(u.createdAt).getTime()) : t('adminUsersTab.recent')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenResetPwd(u)}
                            title={t('adminUsersTab.resetPwdTitle', { username: u.username })}
                            className="h-8 px-2.5 text-xs rounded-xl gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                            {t('adminUsersTab.resetPwd')}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(u)}
                            title={t('adminUsersTab.editTitle')}
                            className="h-8 px-2.5 text-xs rounded-xl gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                            {t('adminUsersTab.edit')}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDelete(u)}
                            disabled={isRoot || isSelf}
                            title={isRoot ? t('adminUsersTab.deleteTitleRoot') : isSelf ? t('adminUsersTab.deleteTitleSelf') : t('adminUsersTab.deleteTitleNormal')}
                            className={`h-8 px-2.5 text-xs rounded-xl gap-1 cursor-pointer ${
                              isRoot || isSelf
                                ? 'opacity-30 cursor-not-allowed text-muted-foreground'
                                : 'text-rose-500 hover:text-rose-600 hover:bg-rose-500/10'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {t('adminUsersTab.delete')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && total > 0 && (
        <Paginator
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      {/* ========================================================= */}
      {/* 1. CREATE USER MODAL */}
      {/* ========================================================= */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <UserPlus className="w-4 h-4" />
              </div>
              <span>{t('adminUsersTab.createDialogTitle')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t('adminUsersTab.createDialogDesc')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitCreate} className="py-2">
            <FieldSet className="gap-4">
              {/* Username & Email */}
              <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="create-user-username" required>
                    {t('adminUsersTab.usernameLabel')}
                  </FieldLabel>
                  <Input
                    id="create-user-username"
                    type="text"
                    required
                    placeholder={t('adminUsersTab.usernamePlaceholder')}
                    value={createForm.username}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, username: e.target.value })
                    }
                    className="text-xs h-9 rounded-xl font-mono"
                  />
                  <FieldDescription>{t('adminUsersTab.usernameDesc')}</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="create-user-email" required>
                    {t('adminUsersTab.emailLabel')}
                  </FieldLabel>
                  <Input
                    id="create-user-email"
                    type="email"
                    required
                    placeholder="alex@example.com"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, email: e.target.value })
                    }
                    className="text-xs h-9 rounded-xl"
                  />
                  <FieldDescription>{t('adminUsersTab.emailDesc')}</FieldDescription>
                </Field>
              </FieldGroup>

              {/* Nickname & Role */}
              <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="create-user-nickname">{t('adminUsersTab.nicknameLabel')}</FieldLabel>
                  <Input
                    id="create-user-nickname"
                    type="text"
                    placeholder={t('adminUsersTab.nicknamePlaceholder')}
                    value={createForm.nickname}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, nickname: e.target.value })
                    }
                    className="text-xs h-9 rounded-xl"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="create-user-role">{t('adminUsersTab.roleLabel')}</FieldLabel>
                  <Select
                    value={createForm.role}
                    onValueChange={(val: 'user' | 'admin' | 'vip') =>
                      setCreateForm({ ...createForm, role: val })
                    }
                  >
                    <SelectTrigger id="create-user-role" className="w-full text-xs h-9 rounded-xl">
                      <SelectValue placeholder={t('adminUsersTab.rolePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">{t('adminUsersTab.roleOptionUser')}</SelectItem>
                      <SelectItem value="vip">{t('adminUsersTab.roleOptionVip')}</SelectItem>
                      <SelectItem value="admin">{t('adminUsersTab.roleOptionAdmin')}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              {/* Upload QPS Override */}
              <Field>
                <FieldLabel htmlFor="create-user-qps-mode">{t('adminUsersTab.qpsModeLabel')}</FieldLabel>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    value={createQpsMode}
                    onValueChange={(val: QpsMode) => setCreateQpsMode(val)}
                  >
                    <SelectTrigger id="create-user-qps-mode" className="w-full text-xs h-9 rounded-xl">
                      <SelectValue placeholder={t('adminUsersTab.limitPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">{t('adminUsersTab.limitGlobal')}</SelectItem>
                      <SelectItem value="unlimited">{t('adminUsersTab.limitUnlimited')}</SelectItem>
                      <SelectItem value="custom">{t('adminUsersTab.limitCustom')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="create-user-qps-custom"
                    type="number"
                    min={1}
                    max={1000}
                    disabled={createQpsMode !== 'custom'}
                    value={createQpsCustom}
                    onChange={(e) => setCreateQpsCustom(e.target.value)}
                    placeholder={t('adminUsersTab.qpsPlaceholder')}
                    className="text-xs h-9 rounded-xl font-mono disabled:opacity-50"
                  />
                </div>
                <FieldDescription>
                  {t('adminUsersTab.qpsDesc')}
                </FieldDescription>
              </Field>

              {/* Upload RPM Override */}
              <Field>
                <FieldLabel htmlFor="create-user-rpm-mode">{t('adminUsersTab.rpmModeLabel')}</FieldLabel>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    value={createRpmMode}
                    onValueChange={(val: QpsMode) => setCreateRpmMode(val)}
                  >
                    <SelectTrigger id="create-user-rpm-mode" className="w-full text-xs h-9 rounded-xl">
                      <SelectValue placeholder={t('adminUsersTab.limitPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">{t('adminUsersTab.limitGlobal')}</SelectItem>
                      <SelectItem value="unlimited">{t('adminUsersTab.limitUnlimited')}</SelectItem>
                      <SelectItem value="custom">{t('adminUsersTab.limitCustom')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="create-user-rpm-custom"
                    type="number"
                    min={1}
                    max={10000}
                    disabled={createRpmMode !== 'custom'}
                    value={createRpmCustom}
                    onChange={(e) => setCreateRpmCustom(e.target.value)}
                    placeholder={t('adminUsersTab.rpmPlaceholder')}
                    className="text-xs h-9 rounded-xl font-mono disabled:opacity-50"
                  />
                </div>
                <FieldDescription>
                  {t('adminUsersTab.rpmDesc')}
                </FieldDescription>
              </Field>

              {/* Password */}
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="create-user-password" required>
                    {t('adminUsersTab.pwdLabel')}
                  </FieldLabel>
                  <button
                    type="button"
                    onClick={() => {
                      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
                      let pwd = '';
                      for (let i = 0; i < 10; i++) {
                        pwd += chars.charAt(Math.floor(Math.random() * chars.length));
                      }
                      setCreateForm((prev) => ({ ...prev, password: pwd }));
                    }}
                    className="text-[11px] text-primary hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{t('adminUsersTab.genStrongPwd')}</span>
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="create-user-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder={t('adminUsersTab.pwdPlaceholder')}
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, password: e.target.value })
                    }
                    className="text-xs h-9 rounded-xl pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </Field>

              {/* Avatar Selector & Presets */}
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="create-user-avatar">{t('adminUsersTab.avatarLabel')}</FieldLabel>
                  <button
                    type="button"
                    onClick={() => handleRandomizeAvatar(true)}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Dice5 className="w-3 h-3" />
                    <span>{t('adminUsersTab.genAvatar')}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <img
                    src={createForm.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=new'}
                    alt="Preview"
                    className="w-9 h-9 rounded-xl object-cover border border-border shrink-0 bg-muted"
                  />
                  <Input
                    id="create-user-avatar"
                    type="url"
                    placeholder="https://..."
                    value={createForm.avatar}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, avatar: e.target.value })
                    }
                    className="text-xs h-9 rounded-xl font-mono flex-1"
                  />
                </div>

                {/* Quick Avatar Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground">{t('adminUsersTab.presetLabel')}</span>
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCreateForm((prev) => ({ ...prev, avatar: preset }))}
                      className={`w-6 h-6 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                        createForm.avatar === preset
                          ? 'ring-2 ring-primary border-primary'
                          : 'border-border/60 hover:opacity-80'
                      }`}
                    >
                      <img src={preset} alt="preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </Field>

              {/* Bio */}
              <Field>
                <FieldLabel htmlFor="create-user-bio">{t('adminUsersTab.bioLabel')}</FieldLabel>
                <Input
                  id="create-user-bio"
                  type="text"
                  placeholder={t('adminUsersTab.bioPlaceholder')}
                  value={createForm.bio}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, bio: e.target.value })
                  }
                  className="text-xs h-9 rounded-xl"
                />
              </Field>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-xs h-9 rounded-xl"
                >
                  {t('adminUsersTab.cancel')}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="text-xs h-9 rounded-xl px-5 gap-1.5 cursor-pointer bg-primary text-primary-foreground font-semibold"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{t('adminUsersTab.createSubmit')}</span>
                </Button>
              </DialogFooter>
            </FieldSet>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* 2. EDIT USER MODAL */}
      {/* ========================================================= */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                <Edit3 className="w-4 h-4" />
              </div>
              <span>{t('adminUsersTab.editDialogTitle', { username: editingUser?.username })}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t('adminUsersTab.editDialogDesc')}
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <form onSubmit={handleSubmitEdit} className="py-2">
              <FieldSet className="gap-4">
                {/* Readonly Username & ID */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/20 border border-border/40">
                  <div>
                    <span className="text-[11px] text-muted-foreground">{t('adminUsersTab.sysId')}</span>
                    <p className="text-xs font-mono font-bold text-foreground">#{editingUser.id}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground">{t('adminUsersTab.usernameReadonly')}</span>
                    <p className="text-xs font-mono font-bold text-foreground">@{editingUser.username}</p>
                  </div>
                </div>

                {/* Email & Nickname */}
                <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="edit-user-email" required>{t('adminUsersTab.editEmailLabel')}</FieldLabel>
                    <Input
                      id="edit-user-email"
                      type="email"
                      required
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="text-xs h-9 rounded-xl"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="edit-user-nickname">{t('adminUsersTab.editNicknameLabel')}</FieldLabel>
                    <Input
                      id="edit-user-nickname"
                      type="text"
                      value={editForm.nickname}
                      onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                      className="text-xs h-9 rounded-xl"
                    />
                  </Field>
                </FieldGroup>

                {/* Role */}
                <Field>
                  <FieldLabel htmlFor="edit-user-role">{t('adminUsersTab.editRoleLabel')}</FieldLabel>
                  <Select
                    value={editForm.role}
                    disabled={Number(editingUser.id) === 1}
                    onValueChange={(val: 'user' | 'admin' | 'vip') =>
                      setEditForm({ ...editForm, role: val })
                    }
                  >
                    <SelectTrigger
                      id="edit-user-role"
                      className={`w-full text-xs h-9 rounded-xl ${
                        Number(editingUser.id) === 1 ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      <SelectValue placeholder={t('adminUsersTab.editRolePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">{t('adminUsersTab.editRoleOptionUser')}</SelectItem>
                      <SelectItem value="vip">{t('adminUsersTab.editRoleOptionVip')}</SelectItem>
                      <SelectItem value="admin">{t('adminUsersTab.editRoleOptionAdmin')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {Number(editingUser.id) === 1 && (
                    <FieldDescription className="text-amber-500 font-medium">
                      {t('adminUsersTab.rootRoleNote')}
                    </FieldDescription>
                  )}
                </Field>

                {/* Upload QPS Override */}
                <Field>
                  <FieldLabel htmlFor="edit-user-qps-mode">{t('adminUsersTab.editQpsModeLabel')}</FieldLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      value={editQpsMode}
                      onValueChange={(val: QpsMode) => setEditQpsMode(val)}
                    >
                      <SelectTrigger id="edit-user-qps-mode" className="w-full text-xs h-9 rounded-xl">
                        <SelectValue placeholder={t('adminUsersTab.editLimitPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">{t('adminUsersTab.limitGlobal')}</SelectItem>
                        <SelectItem value="unlimited">{t('adminUsersTab.limitUnlimited')}</SelectItem>
                        <SelectItem value="custom">{t('adminUsersTab.limitCustom')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="edit-user-qps-custom"
                      type="number"
                      min={1}
                      max={1000}
                      disabled={editQpsMode !== 'custom'}
                      value={editQpsCustom}
                      onChange={(e) => setEditQpsCustom(e.target.value)}
                      placeholder={t('adminUsersTab.qpsPlaceholder')}
                      className="text-xs h-9 rounded-xl font-mono disabled:opacity-50"
                    />
                  </div>
                  <FieldDescription>
                    {t('adminUsersTab.qpsDesc')}
                  </FieldDescription>
                </Field>

                {/* Upload RPM Override */}
                <Field>
                  <FieldLabel htmlFor="edit-user-rpm-mode">{t('adminUsersTab.editRpmModeLabel')}</FieldLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      value={editRpmMode}
                      onValueChange={(val: QpsMode) => setEditRpmMode(val)}
                    >
                      <SelectTrigger id="edit-user-rpm-mode" className="w-full text-xs h-9 rounded-xl">
                        <SelectValue placeholder={t('adminUsersTab.editLimitPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">{t('adminUsersTab.limitGlobal')}</SelectItem>
                        <SelectItem value="unlimited">{t('adminUsersTab.limitUnlimited')}</SelectItem>
                        <SelectItem value="custom">{t('adminUsersTab.limitCustom')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="edit-user-rpm-custom"
                      type="number"
                      min={1}
                      max={10000}
                      disabled={editRpmMode !== 'custom'}
                      value={editRpmCustom}
                      onChange={(e) => setEditRpmCustom(e.target.value)}
                      placeholder={t('adminUsersTab.rpmPlaceholder')}
                      className="text-xs h-9 rounded-xl font-mono disabled:opacity-50"
                    />
                  </div>
                  <FieldDescription>
                    {t('adminUsersTab.rpmDesc')}
                  </FieldDescription>
                </Field>

                {/* Avatar Selector */}
                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="edit-user-avatar">{t('adminUsersTab.editAvatarLabel')}</FieldLabel>
                    <button
                      type="button"
                      onClick={() => handleRandomizeAvatar(false)}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Dice5 className="w-3 h-3" />
                      <span>{t('adminUsersTab.editGenAvatar')}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <img
                      src={editForm.avatar || editingUser.avatar || ''}
                      alt="Preview"
                      className="w-9 h-9 rounded-xl object-cover border border-border shrink-0 bg-muted"
                    />
                    <Input
                      id="edit-user-avatar"
                      type="url"
                      value={editForm.avatar}
                      onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })}
                      className="text-xs h-9 rounded-xl font-mono flex-1"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-muted-foreground">{t('adminUsersTab.presetLabel')}</span>
                    {AVATAR_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditForm((prev) => ({ ...prev, avatar: preset }))}
                        className={`w-6 h-6 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                          editForm.avatar === preset
                            ? 'ring-2 ring-primary border-primary'
                            : 'border-border/60 hover:opacity-80'
                        }`}
                      >
                        <img src={preset} alt="preset" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Bio */}
                <Field>
                  <FieldLabel htmlFor="edit-user-bio">{t('adminUsersTab.editBioLabel')}</FieldLabel>
                  <Input
                    id="edit-user-bio"
                    type="text"
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    className="text-xs h-9 rounded-xl"
                  />
                </Field>

                <DialogFooter className="gap-2 sm:gap-0 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingUser(null)}
                    className="text-xs h-9 rounded-xl"
                  >
                    {t('adminUsersTab.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className="text-xs h-9 rounded-xl px-5 gap-1.5 cursor-pointer bg-primary text-primary-foreground font-semibold"
                  >
                    {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{t('adminUsersTab.editSave')}</span>
                  </Button>
                </DialogFooter>
              </FieldSet>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* 3. RESET PASSWORD MODAL */}
      {/* ========================================================= */}
      <Dialog open={!!resetPwdUser} onOpenChange={(open) => !open && setResetPwdUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                <KeyRound className="w-4 h-4" />
              </div>
              <span>{t('adminUsersTab.resetPwdTitle', { username: resetPwdUser?.username })}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t('adminUsersTab.resetPwdDesc')}
            </DialogDescription>
          </DialogHeader>

          {resetPwdUser && (
            <form onSubmit={handleSubmitResetPwd} className="py-2">
              <FieldSet className="gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{t('adminUsersTab.resetPwdNote')}</p>
                </div>

                <FieldGroup className="gap-3.5">
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor="reset-user-password" required>
                        {t('adminUsersTab.newPwdLabel')}
                      </FieldLabel>
                      <button
                        type="button"
                        onClick={handleGenerateRandomPassword}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{t('adminUsersTab.autoGen')}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="reset-user-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder={t('adminUsersTab.newPwdPlaceholder')}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="text-xs h-9 rounded-xl pr-9 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="reset-user-confirm-pwd" required>
                      {t('adminUsersTab.confirmPwdLabel')}
                    </FieldLabel>
                    <Input
                      id="reset-user-confirm-pwd"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder={t('adminUsersTab.confirmPwdPlaceholder')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="text-xs h-9 rounded-xl font-mono"
                    />
                  </Field>
                </FieldGroup>

                <DialogFooter className="gap-2 sm:gap-0 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setResetPwdUser(null)}
                    className="text-xs h-9 rounded-xl"
                  >
                    {t('adminUsersTab.resetCancel')}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className="text-xs h-9 rounded-xl px-5 gap-1.5 cursor-pointer bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
                  >
                    {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{t('adminUsersTab.resetConfirm')}</span>
                  </Button>
                </DialogFooter>
              </FieldSet>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* 4. DELETE USER MODAL */}
      {/* ========================================================= */}
      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent className="sm:max-w-md border-rose-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-500">
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                <Trash2 className="w-4 h-4" />
              </div>
              <span>{t('adminUsersTab.deleteTitle')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t('adminUsersTab.deleteWarning')}
            </DialogDescription>
          </DialogHeader>

          {deletingUser && (
            <div className="space-y-3 py-2">
              <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <img
                    src={deletingUser.avatar || ''}
                    alt={deletingUser.username}
                    className="w-8 h-8 rounded-lg object-cover bg-muted"
                  />
                  <div>
                    <p className="font-bold text-foreground">{deletingUser.nickname || deletingUser.username}</p>
                    <p className="font-mono text-muted-foreground">@{deletingUser.username} · {deletingUser.email}</p>
                  </div>
                </div>
                <p className="text-muted-foreground pt-1 border-t border-border/40">
                  {t('adminUsersTab.deleteConfirmText', { username: deletingUser.username })}
                  {t('adminUsersTab.deleteConfirmDesc')}
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingUser(null)}
                  className="text-xs h-9 rounded-xl"
                >
                  {t('adminUsersTab.deleteCancel')}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={submitting}
                  onClick={handleConfirmDelete}
                  className="text-xs h-9 rounded-xl px-5 gap-1.5 cursor-pointer font-semibold shadow-xs"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{t('adminUsersTab.deleteConfirm')}</span>
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

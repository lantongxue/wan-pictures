import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  User as UserIcon,
  Mail,
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
} from 'lucide-react';
import { AdminUserItem, CreateUserPayload, UpdateUserPayload, User } from '../../types';
import { adminApi } from '../../services/api';
import { formatDate } from '../../utils/imageProcessing';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
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
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');

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

  // Form States - Reset Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({
        q: searchQuery,
        role: roleFilter,
      });
      if (res.success) {
        setUsers(res.data);
        if (onUserCountChange) {
          onUserCountChange(res.data.length);
        }
      }
    } catch (err: any) {
      onShowToast('获取用户列表失败', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.username || !createForm.email || !createForm.password) {
      onShowToast('请填写必填项', '用户名、邮箱和初始密码不能为空', 'warning');
      return;
    }
    if (createForm.password.length < 6) {
      onShowToast('密码太短', '密码长度至少需 6 位字符', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.createUser(createForm);
      if (res.success) {
        onShowToast('用户创建成功', `用户 @${createForm.username} 已成功添加`, 'success');
        setIsCreateOpen(false);
        loadUsers();
      }
    } catch (err: any) {
      onShowToast('创建失败', err.message, 'error');
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
      role: u.role,
      avatar: u.avatar || '',
      bio: u.bio || '',
    });
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSubmitting(true);
    try {
      const res = await adminApi.updateUser(editingUser.id, editForm);
      if (res.success) {
        onShowToast('用户信息更新成功', `用户 @${editingUser.username} 的资料已保存`, 'success');
        setEditingUser(null);
        loadUsers();
      }
    } catch (err: any) {
      onShowToast('更新失败', err.message, 'error');
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
      onShowToast('密码过短', '新密码长度至少需 6 位字符', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      onShowToast('密码不匹配', '两次输入的密码不一致', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.resetUserPassword(resetPwdUser.id, newPassword);
      if (res.success) {
        onShowToast('密码已重置', `用户 @${resetPwdUser.username} 的登录密码已更新`, 'success');
        setResetPwdUser(null);
      }
    } catch (err: any) {
      onShowToast('重置密码失败', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Delete User
  // -------------------------------------------------------------
  const handleOpenDelete = (u: AdminUserItem) => {
    if (Number(u.id) === 1 || u.username === 'admin') {
      onShowToast('受保护账户', '不能删除超级管理员 (Root) 账号', 'warning');
      return;
    }
    if (currentUser && (u.id === currentUser.id || u.username === currentUser.username)) {
      onShowToast('无法删除自己', '不能删除当前登录的管理员账号', 'warning');
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
        onShowToast('用户已删除', `用户 @${deletingUser.username} 的账号及关联权限已清除`, 'success');
        setDeletingUser(null);
        loadUsers();
      }
    } catch (err: any) {
      onShowToast('删除失败', err.message, 'error');
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
              placeholder="搜索用户名、昵称、邮箱或简介..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 rounded-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
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
            搜索
          </Button>

          {/* Role Filter Badges */}
          <div className="hidden md:flex items-center gap-1 ml-2 p-1 bg-background/60 border border-border/60 rounded-xl">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                roleFilter === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              全部 ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('admin')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                roleFilter === 'admin'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              管理员
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('user')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                roleFilter === 'user'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              普通用户
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
            <span>刷新</span>
          </Button>
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-9 px-3.5 text-xs rounded-xl gap-1.5 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>新增用户</span>
          </Button>
        </div>
      </div>

      {/* User Card Grid */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs">加载用户数据中...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border/80 rounded-2xl bg-muted/10 space-y-3">
          <Users className="w-10 h-10 text-muted-foreground/50 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">没有找到匹配的用户</p>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? `未找到包含 "${searchQuery}" 的用户` : '系统中暂无用户数据'}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="text-xs rounded-xl h-8 px-3 gap-1 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>创建第一个用户</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map((u) => {
            const isRoot = Number(u.id) === 1 || u.username === 'admin';
            const isSelf = currentUser && (u.id === currentUser.id || u.username === currentUser.username);

            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative flex flex-col justify-between p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-md transition-all space-y-4"
              >
                {/* Top User Info */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={
                            u.avatar ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                              u.username
                            )}`
                          }
                          alt={u.username}
                          className="w-12 h-12 rounded-xl object-cover border border-border/80 bg-muted shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                              u.username
                            )}`;
                          }}
                        />
                        {u.role === 'admin' ? (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs border-2 border-card">
                            <Shield className="w-2.5 h-2.5" />
                          </div>
                        ) : (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs border-2 border-card">
                            <UserIcon className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-foreground truncate max-w-[140px]">
                            {u.nickname || u.username}
                          </h4>
                          {isRoot && (
                            <Badge
                              variant="subtle"
                              className="text-[10px] px-1.5 py-0 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-semibold"
                            >
                              ROOT
                            </Badge>
                          )}
                          {isSelf && (
                            <Badge
                              variant="subtle"
                              className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            >
                              当前登录
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-mono text-muted-foreground truncate">
                          @{u.username}
                        </p>
                      </div>
                    </div>

                    {/* Role Pill */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider shrink-0 ${
                        u.role === 'admin'
                          ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                          : 'bg-muted text-muted-foreground border border-border/60'
                      }`}
                    >
                      {u.role === 'admin' ? (
                        <>
                          <Shield className="w-3 h-3" />
                          <span>管理员</span>
                        </>
                      ) : (
                        <>
                          <UserIcon className="w-3 h-3" />
                          <span>用户</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Email & Bio */}
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{u.email}</span>
                    </div>

                    {u.bio ? (
                      <p className="text-xs text-foreground/80 line-clamp-2 italic bg-muted/20 p-2 rounded-xl border border-border/40">
                        "{u.bio}"
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">暂无个人签名简介</p>
                    )}
                  </div>
                </div>

                {/* Stats & Meta Footer */}
                <div className="space-y-3 pt-3 border-t border-border/60">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-[11px] font-medium" title="该用户图片总数">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-mono font-bold text-foreground">
                          {u.imageCount !== undefined ? u.imageCount : 0}
                        </span>
                        <span>图</span>
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-medium" title="该用户相册总数">
                        <FolderKanban className="w-3.5 h-3.5 text-amber-500" />
                        <span className="font-mono font-bold text-foreground">
                          {u.albumCount !== undefined ? u.albumCount : 0}
                        </span>
                        <span>相册</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70" title="注册时间">
                      <Calendar className="w-3 h-3" />
                      <span>{u.createdAt ? formatDate(new Date(u.createdAt).getTime()) : '近期'}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenResetPwd(u)}
                      title="重置登录密码"
                      className="h-8 px-2.5 text-xs rounded-xl gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                      <span>改密</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(u)}
                      title="编辑用户资料与权限"
                      className="h-8 px-2.5 text-xs rounded-xl gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                      <span>编辑</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDelete(u)}
                      disabled={isRoot || isSelf}
                      title={isRoot ? '超级管理员不可删除' : isSelf ? '不能删除自己' : '删除用户账号'}
                      className={`h-8 px-2.5 text-xs rounded-xl gap-1 cursor-pointer ${
                        isRoot || isSelf
                          ? 'opacity-30 cursor-not-allowed text-muted-foreground'
                          : 'text-rose-500 hover:text-rose-600 hover:bg-rose-500/10'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>删除</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
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
              <span>新增系统用户</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              创建新账户并分配初始角色权限与密码
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitCreate} className="space-y-4 py-2">
            {/* Username & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <span>用户名</span>
                  <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  placeholder="如: designer_alex"
                  value={createForm.username}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, username: e.target.value })
                  }
                  className="text-xs h-9 rounded-xl mt-1 font-mono"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">登录唯一账号，支持字母数字</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <span>电子邮箱</span>
                  <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="email"
                  required
                  placeholder="alex@example.com"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  className="text-xs h-9 rounded-xl mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">用于通知与找回凭证</p>
              </div>
            </div>

            {/* Nickname & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">展示昵称</label>
                <Input
                  type="text"
                  placeholder="如: 视觉设计师 Alex"
                  value={createForm.nickname}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, nickname: e.target.value })
                  }
                  className="text-xs h-9 rounded-xl mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">分配角色权限</label>
                <div className="mt-1">
                  <Select
                    value={createForm.role}
                    onValueChange={(val: 'user' | 'admin') =>
                      setCreateForm({ ...createForm, role: val })
                    }
                  >
                    <SelectTrigger className="w-full text-xs h-9 rounded-xl">
                      <SelectValue placeholder="选择权限" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">普通用户 (User)</SelectItem>
                      <SelectItem value="admin">管理员 (Admin)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span>初始登录密码</span>
                  <span className="text-rose-500">*</span>
                </span>
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
                  <span>随机生成强密码</span>
                </button>
              </label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="至少 6 位字符"
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
            </div>

            {/* Avatar Selector & Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground">头像地址 URL</label>
                <button
                  type="button"
                  onClick={() => handleRandomizeAvatar(true)}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Dice5 className="w-3 h-3" />
                  <span>随机生成 Bot 机器人头像</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <img
                  src={createForm.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=new'}
                  alt="Preview"
                  className="w-9 h-9 rounded-xl object-cover border border-border shrink-0 bg-muted"
                />
                <Input
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
                <span className="text-[11px] text-muted-foreground">预设:</span>
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
            </div>

            {/* Bio */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">个人简介 / 备注</label>
              <Input
                type="text"
                placeholder="填写用户在图床系统的角色说明或个性签名"
                value={createForm.bio}
                onChange={(e) =>
                  setCreateForm({ ...createForm, bio: e.target.value })
                }
                className="text-xs h-9 rounded-xl mt-1"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="text-xs h-9 rounded-xl"
              >
                取消
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="text-xs h-9 rounded-xl px-5 gap-1.5 cursor-pointer bg-primary text-primary-foreground font-semibold"
              >
                {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>创建用户</span>
              </Button>
            </DialogFooter>
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
              <span>编辑用户: @{editingUser?.username}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              修改个人基本资料与系统权限分配
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <form onSubmit={handleSubmitEdit} className="space-y-4 py-2">
              {/* Readonly Username & ID */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/20 border border-border/40">
                <div>
                  <span className="text-[11px] text-muted-foreground">系统 ID</span>
                  <p className="text-xs font-mono font-bold text-foreground">#{editingUser.id}</p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">用户名 (不可更改)</span>
                  <p className="text-xs font-mono font-bold text-foreground">@{editingUser.username}</p>
                </div>
              </div>

              {/* Email & Nickname */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">电子邮箱</label>
                  <Input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="text-xs h-9 rounded-xl mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">展示昵称</label>
                  <Input
                    type="text"
                    value={editForm.nickname}
                    onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                    className="text-xs h-9 rounded-xl mt-1"
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground">系统角色权限</label>
                <div className="mt-1">
                  <Select
                    value={editForm.role}
                    disabled={Number(editingUser.id) === 1}
                    onValueChange={(val: 'user' | 'admin') =>
                      setEditForm({ ...editForm, role: val })
                    }
                  >
                    <SelectTrigger
                      className={`w-full text-xs h-9 rounded-xl ${
                        Number(editingUser.id) === 1 ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      <SelectValue placeholder="选择权限" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">普通用户 (User)</SelectItem>
                      <SelectItem value="admin">系统管理员 (Admin)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {Number(editingUser.id) === 1 && (
                  <p className="text-[10px] text-amber-500 mt-1">超级管理员 (Root) 拥有永久管理权限，不可更改角色</p>
                )}
              </div>

              {/* Avatar Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">头像地址 URL</label>
                  <button
                    type="button"
                    onClick={() => handleRandomizeAvatar(false)}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Dice5 className="w-3 h-3" />
                    <span>随机生成头像</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <img
                    src={editForm.avatar || editingUser.avatar || ''}
                    alt="Preview"
                    className="w-9 h-9 rounded-xl object-cover border border-border shrink-0 bg-muted"
                  />
                  <Input
                    type="url"
                    value={editForm.avatar}
                    onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })}
                    className="text-xs h-9 rounded-xl font-mono flex-1"
                  />
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground">预设:</span>
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
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground">简介签名</label>
                <Input
                  type="text"
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="text-xs h-9 rounded-xl mt-1"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingUser(null)}
                  className="text-xs h-9 rounded-xl"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="text-xs h-9 rounded-xl px-5 gap-1.5 cursor-pointer bg-primary text-primary-foreground font-semibold"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>保存修改</span>
                </Button>
              </DialogFooter>
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
              <span>重置用户密码: @{resetPwdUser?.username}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              直接为用户设置新的登录密码
            </DialogDescription>
          </DialogHeader>

          {resetPwdUser && (
            <form onSubmit={handleSubmitResetPwd} className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>重置后旧密码将立即失效，用户下次需要使用新密码登录系统。</p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">新密码 (至少 6 位)</label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>自动生成</span>
                  </button>
                </div>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="输入新登录密码"
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
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">确认新密码</label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="再次输入以确认"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="text-xs h-9 rounded-xl mt-1 font-mono"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setResetPwdUser(null)}
                  className="text-xs h-9 rounded-xl"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="text-xs h-9 rounded-xl px-5 gap-1.5 cursor-pointer bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>确认重置密码</span>
                </Button>
              </DialogFooter>
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
              <span>确认删除用户</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              此操作不可撤销，请谨慎处理
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
                  确定要删除用户 <strong className="text-foreground">@{deletingUser.username}</strong> 吗？
                  该用户将失去系统访问权限。
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingUser(null)}
                  className="text-xs h-9 rounded-xl"
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={submitting}
                  onClick={handleConfirmDelete}
                  className="text-xs h-9 rounded-xl px-5 gap-1.5 cursor-pointer font-semibold shadow-xs"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>确认永久删除</span>
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Shield, Mail, Calendar, LogOut, Check, RefreshCw } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { user, logout, updateProfile, backendOnline } = useAuth();
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '');
      setBio(user.bio || '');
    }
  }, [user]);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateProfile({
      nickname: nickname.trim(),
      bio: bio.trim(),
    });
    setIsSaving(false);
    if (res.success) {
      onShowToast('个人信息已更新', undefined, 'success');
      onClose();
    } else {
      onShowToast('更新失败', res.message, 'error');
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
    onShowToast('已退出登录', '欢迎下次使用万图 (Wan Pictures)', 'info');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border border-border/80 bg-card">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-transparent p-6 border-b border-border/60">
          <div className="flex items-center gap-4">
            <img
              src={user.avatar}
              alt={user.nickname || user.username}
              className="w-14 h-14 rounded-full border-2 border-primary/40 bg-background shadow-xs"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold truncate">
                  {user.nickname || user.username}
                </DialogTitle>
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-[10px]">
                  {user.role === 'admin' ? '管理员' : '标准用户'}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 truncate">
                <Mail className="w-3 h-3 shrink-0" />
                <span>{user.email}</span>
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-username" className="text-xs font-medium text-muted-foreground">
              用户账号 (不可更改)
            </Label>
            <Input
              id="profile-username"
              value={user.username}
              disabled
              className="text-xs h-9 bg-muted/50 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-nickname" className="text-xs font-medium text-foreground">
              显示昵称
            </Label>
            <Input
              id="profile-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入显示昵称"
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-bio" className="text-xs font-medium text-foreground">
              个人简介
            </Label>
            <Input
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="一句话介绍自己..."
              className="text-xs h-9"
            />
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1.5 text-[11px] text-muted-foreground">
            <div className="flex justify-between items-center">
              <span>数据存储模式:</span>
              <span className="font-medium text-foreground">
                {backendOnline ? '云端数据库同步' : '本地安全存储'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>服务连接状态:</span>
              <span className={backendOnline ? 'text-emerald-500 font-medium' : 'text-emerald-500 font-medium'}>
                {backendOnline ? '🟢 云端服务正常' : '🟢 本地环境已就绪'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-xs h-8 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              退出登录
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs h-8 cursor-pointer"
              >
                取消
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="text-xs h-8 cursor-pointer gap-1"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                保存设置
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

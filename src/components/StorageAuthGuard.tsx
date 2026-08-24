import React from 'react';
import {
  Lock,
  HardDrive,
  FolderKanban,
  Sparkles,
  LogIn,
  UserPlus,
  ShieldCheck,
  Zap,
  Layers,
  ArrowRight,
  Compass,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useAuth } from '../context/AuthContext';

interface StorageAuthGuardProps {
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onGoToPlaza: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const StorageAuthGuard: React.FC<StorageAuthGuardProps> = ({
  onOpenAuth,
  onGoToPlaza,
  onShowToast,
}) => {
  const { login } = useAuth();

  const handleQuickDemoLogin = async (role: 'admin' | 'designer') => {
    onShowToast('正在快速登录...', `以 ${role === 'admin' ? '管理员' : '创作者'} 身份登录`, 'info');
    const res = await login({
      account: role === 'admin' ? 'admin' : 'designer',
      password: 'password123',
    });
    if (res.success) {
      onShowToast(
        '登录成功！',
        `已解锁个人存储空间与相册管理功能 (${role === 'admin' ? '管理员账号' : '创作者账号'})`,
        'success'
      );
    } else {
      onShowToast('登录失败', res.message || '请手动登录', 'error');
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 py-4">
      {/* Grand Security Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-12 text-center backdrop-blur-2xl shadow-xs">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.08)_0%,_transparent_70%)]" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none bg-primary/10" />

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
          {/* Badge */}
          <Badge variant="subtle" className="gap-1.5 py-1 px-3.5 mb-5 text-xs text-amber-500 bg-amber-500/10 border-amber-500/20">
            <Lock className="w-3.5 h-3.5" />
            <span>私有存储空间与相册已受权限保护</span>
          </Badge>

          {/* Heading */}
          <h1 className="text-2xl sm:text-4xl font-light tracking-tight text-foreground mb-3">
            登录后查看并操作{' '}
            <span className="font-semibold text-foreground underline decoration-primary/40 underline-offset-8">
              Storage 存储与相册
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-8 max-w-xl">
            万图 (Wan Pictures) 提供个人独立的云端/本地存储空间、高分辨率资产归档与相册分类体系。为了保障您的资产安全与隐私，请先登录账户以解锁上传与个人存储全部功能。
          </p>

          {/* Main Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
            <Button
              id="guard-login-btn"
              onClick={() => onOpenAuth('login')}
              className="flex-1 rounded-full py-5 text-xs font-semibold uppercase tracking-wider gap-2 shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>立即登录账号</span>
            </Button>

            <Button
              id="guard-register-btn"
              variant="outline"
              onClick={() => onOpenAuth('register')}
              className="flex-1 rounded-full py-5 text-xs font-semibold uppercase tracking-wider gap-2 hover:bg-muted transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-primary" />
              <span>注册新用户</span>
            </Button>
          </div>

          {/* Quick Demo Login Bar */}
          <div className="mt-8 pt-6 border-t border-border/60 w-full max-w-md">
            <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground mb-3 flex items-center justify-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>快速一键体验 (无需手动输入)</span>
            </p>
            <div className="flex gap-2.5">
              <Button
                id="guard-quick-admin-btn"
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDemoLogin('admin')}
                className="flex-1 rounded-xl text-xs font-medium py-4 border-dashed hover:border-primary/60 transition-all cursor-pointer"
              >
                体验 Admin (管理员)
              </Button>
              <Button
                id="guard-quick-designer-btn"
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDemoLogin('designer')}
                className="flex-1 rounded-xl text-xs font-medium py-4 border-dashed hover:border-primary/60 transition-all cursor-pointer"
              >
                体验 Designer (创作者)
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="p-6 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-md space-y-3">
          <div className="w-10 h-10 rounded-2xl border border-border bg-primary/10 flex items-center justify-center text-primary">
            <HardDrive className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">50GB 个人存储空间</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            支持拖拽上传、剪贴板快速粘贴、PNG/WebP/SVG等多格式解析，实时监控存储用量与容量分配。
          </p>
        </div>

        <div className="p-6 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-md space-y-3">
          <div className="w-10 h-10 rounded-2xl border border-border bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <FolderKanban className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">自定义相册与分类归档</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            按项目创建个性化相册空间、自定义色标与描述，支持批量转移、分类导出与相册权限管理。
          </p>
        </div>

        <div className="p-6 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-md space-y-3">
          <div className="w-10 h-10 rounded-2xl border border-border bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">JWT 后端安全鉴权</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            内置 Golang 1.22 + Gin + GORM 后端认证与 Bcrypt 密码哈希，保障数据私密性与外链分发效率。
          </p>
        </div>
      </div>

      {/* Alternative CTA: Browse Plaza */}
      <div className="p-5 rounded-2xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-foreground">想先浏览精选公开图片？</p>
            <p className="text-muted-foreground text-[11px]">图片广场支持无需登录即可浏览瀑布流画廊与公开外链语法</p>
          </div>
        </div>

        <Button
          id="guard-go-plaza-btn"
          variant="outline"
          size="sm"
          onClick={onGoToPlaza}
          className="rounded-full gap-1.5 font-medium shrink-0 cursor-pointer"
        >
          <span>进入图片广场</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

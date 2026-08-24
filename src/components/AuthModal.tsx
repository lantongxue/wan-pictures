import React, { useState } from 'react';
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
import {
  User as UserIcon,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  Server,
  CheckCircle2,
  AlertCircle,
  LogIn,
  UserPlus,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onShowToast,
}) => {
  const { login, register, backendOnline, checkBackend } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [loginAccount, setLoginAccount] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('wan');

  const handleModeChange = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setErrorMsg(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginAccount.trim() || !loginPassword) {
      setErrorMsg('请填写账号与密码');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await login({
      account: loginAccount.trim(),
      password: loginPassword,
    });

    setLoading(false);

    if (res.success) {
      onShowToast(
        '欢迎回来！',
        res.isLocalFallback
          ? '登录成功 (本地演示模式)'
          : 'Golang + Gin 后端验证成功，已签发 JWT Token',
        'success'
      );
      onClose();
    } else {
      setErrorMsg(res.message || '登录失败，请检查账号密码');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regEmail.trim() || !regPassword) {
      setErrorMsg('请完整填写必填字段');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('密码长度不能少于 6 位');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const avatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
      avatarSeed || regUsername
    )}`;

    const res = await register({
      username: regUsername.trim(),
      email: regEmail.trim(),
      password: regPassword,
      nickname: regNickname.trim() || regUsername.trim(),
      avatar: avatarUrl,
    });

    setLoading(false);

    if (res.success) {
      onShowToast(
        '注册成功！',
        res.isLocalFallback
          ? '新用户已创建并自动登录'
          : '用户已写入 GORM 数据库并完成密码 Bcrypt 加密',
        'success'
      );
      onClose();
    } else {
      setErrorMsg(res.message || '注册失败，请更换用户名或邮箱');
    }
  };

  const fillQuickDemo = (accountType: 'admin' | 'designer') => {
    if (accountType === 'admin') {
      setLoginAccount('admin');
      setLoginPassword('password123');
    } else {
      setLoginAccount('designer');
      setLoginPassword('password123');
    }
    setErrorMsg(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border border-border/80 bg-card">
        {/* Header Header Pattern */}
        <div className="bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-transparent p-6 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  {mode === 'login' ? '用户登录' : '创建新账号'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Golang + Gin + GORM 后端认证体系
                </DialogDescription>
              </div>
            </div>

            {/* Backend status badge */}
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  backendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="text-[11px] font-mono text-muted-foreground">
                {backendOnline ? 'Go API :8080' : 'Local Fallback'}
              </span>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 p-1 mt-4 rounded-xl bg-muted/80 border border-border/60">
            <button
              id="auth-tab-login"
              type="button"
              onClick={() => handleModeChange('login')}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>登录已有账号</span>
            </button>
            <button
              id="auth-tab-register"
              type="button"
              onClick={() => handleModeChange('register')}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>注册新账号</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-account" className="text-xs font-medium text-foreground">
                  用户名 / 注册邮箱
                </Label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-account"
                    type="text"
                    required
                    value={loginAccount}
                    onChange={(e) => setLoginAccount(e.target.value)}
                    placeholder="输入用户名或邮箱 (如 admin)"
                    className="pl-9 text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="login-password" className="text-xs font-medium text-foreground">
                  账户密码
                </Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="输入密码"
                    className="pl-9 pr-9 text-xs h-9"
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

              <Button
                id="submit-login-btn"
                type="submit"
                disabled={loading}
                className="w-full mt-2 h-9 text-xs font-medium cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    验证并登录中...
                  </span>
                ) : (
                  '立即登录'
                )}
              </Button>

              {/* Quick test accounts */}
              <div className="mt-4 pt-3 border-t border-border/50">
                <p className="text-[11px] text-muted-foreground mb-2 flex items-center justify-between">
                  <span>快速填充体验账号:</span>
                  <span className="text-[10px] font-mono opacity-70">密码: password123</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fillQuickDemo('admin')}
                    className="flex-1 text-[11px] h-7 cursor-pointer"
                  >
                    填入 Admin (管理员)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fillQuickDemo('designer')}
                    className="flex-1 text-[11px] h-7 cursor-pointer"
                  >
                    填入 Designer (创作者)
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-username" className="text-xs font-medium text-foreground">
                    用户名 <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reg-username"
                      type="text"
                      required
                      value={regUsername}
                      onChange={(e) => {
                        setRegUsername(e.target.value);
                        setAvatarSeed(e.target.value || 'wan');
                      }}
                      placeholder="字母/数字 (≥3位)"
                      className="pl-9 text-xs h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-nickname" className="text-xs font-medium text-foreground">
                    昵称 / 显示名
                  </Label>
                  <Input
                    id="reg-nickname"
                    type="text"
                    value={regNickname}
                    onChange={(e) => setRegNickname(e.target.value)}
                    placeholder="如: 摄影师小陈"
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-email" className="text-xs font-medium text-foreground">
                  电子邮箱 <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-email"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="pl-9 text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-password" className="text-xs font-medium text-foreground">
                  登录密码 <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="不少于 6 个字符 (Bcrypt加密)"
                    className="pl-9 pr-9 text-xs h-9"
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

              {/* Avatar Preview */}
              <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 bg-muted/30">
                <img
                  src={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
                    avatarSeed || 'wan'
                  )}`}
                  alt="Avatar preview"
                  className="w-10 h-10 rounded-full border border-border/80 bg-background shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-foreground">自动生成的矢量头像</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    根据用户名自动哈希生成独一无二的专属标识
                  </p>
                </div>
              </div>

              <Button
                id="submit-register-btn"
                type="submit"
                disabled={loading}
                className="w-full mt-2 h-9 text-xs font-medium cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    正在注册并创建账户...
                  </span>
                ) : (
                  '立即注册并登录'
                )}
              </Button>
            </form>
          )}

          {/* Go Backend Stack Info Footer */}
          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Server className="w-3 h-3 text-blue-500" />
              Golang 1.22 + Gin + GORM
            </span>
            <span>JWT Token 72h 有效</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

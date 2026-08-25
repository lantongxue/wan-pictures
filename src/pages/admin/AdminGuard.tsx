import React, { useState } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, LogIn, ArrowLeft, AlertCircle, RefreshCw, KeyRound, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';

import {
  Field,
  FieldSet,
  FieldGroup,
  FieldLabel,
  FieldError,
} from '../../components/ui/field';

export const AdminGuard: React.FC = () => {
  const { user, isAuthenticated, login, backendOnline } = useAuth();
  const navigate = useNavigate();

  // Inline Quick Admin Login State
  const [account, setAccount] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleQuickAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await login(account.trim(), password);
      if (!res.success) {
        setLoginError(res.message || '登录失败，请检查账号密码');
      }
    } catch (err: any) {
      setLoginError(err.message || '登录发生异常');
    } finally {
      setLoginLoading(false);
    }
  };

  // 1. Not Logged In -> Show Admin Gateway Login Card
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs mb-2">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              万图管理中心 · 身份验证
            </h1>
            <p className="text-xs text-muted-foreground">
              Wan Pictures Admin Console · 请输入管理员凭证进入系统
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <FieldError className="mt-0 text-destructive">{loginError}</FieldError>
            </div>
          )}

          <form onSubmit={handleQuickAdminLogin}>
            <FieldSet className="gap-4">
              <FieldGroup className="gap-3.5">
                <Field>
                  <FieldLabel htmlFor="admin-login-account" required className="gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-primary" />
                    <span>管理员账号 / 邮箱</span>
                  </FieldLabel>
                  <Input
                    id="admin-login-account"
                    type="text"
                    required
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder="例如: admin"
                    className="h-10 text-xs rounded-xl bg-muted/40 font-mono"
                  />
                </Field>

                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="admin-login-password" required className="gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-primary" />
                      <span>管理密码</span>
                    </FieldLabel>
                    <span className="text-[11px] text-muted-foreground/80">默认测试: password123</span>
                  </div>
                  <Input
                    id="admin-login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 text-xs rounded-xl bg-muted/40 font-mono"
                  />
                </Field>
              </FieldGroup>

              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full h-10 rounded-xl text-xs font-bold gap-2 cursor-pointer shadow-md bg-primary hover:bg-primary/90 text-primary-foreground mt-1"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>验证管理员凭证中...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>登录并进入管理控制台</span>
                  </>
                )}
              </Button>
            </FieldSet>
          </form>

          <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs">
            <Link
              to="/"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回图床前台</span>
            </Link>

            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{backendOnline ? '云端服务在线' : '本地安全模式'}</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Logged In But Not Admin (Role === 'user') -> Show 403 Forbidden Page
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl border border-destructive/30 bg-destructive/5 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 mx-auto flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              403 访问受限 · 需要管理员权限
            </h2>
            <p className="text-xs text-muted-foreground">
              当前登录账号 <strong className="text-foreground font-mono">@{user.username}</strong> 仅具有普通用户权限，无法访问后台管理中心。
            </p>
          </div>

          <div className="p-3 rounded-xl bg-card border border-border/80 text-left text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">当前角色:</span>
              <Badge variant="subtle" className="text-[10px] font-mono">
                {user.role}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">所需角色:</span>
              <Badge variant="default" className="text-[10px] font-mono">
                admin
              </Badge>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full sm:flex-1 h-9 rounded-xl text-xs gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回前台主页</span>
            </Button>
            <Button
              onClick={() => {
                // Logout and return to admin login screen
                login('admin', 'password123');
              }}
              className="w-full sm:flex-1 h-9 rounded-xl text-xs gap-1.5 cursor-pointer bg-primary text-primary-foreground"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>切换管理员账号</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated & Admin -> Render Admin Pages via Outlet
  return <Outlet />;
};

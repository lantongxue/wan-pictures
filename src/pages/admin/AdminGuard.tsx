import React, { useState } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, LogIn, ArrowLeft, AlertCircle, RefreshCw, KeyRound, User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { user, isAuthenticated, login, logout, backendOnline } = useAuth();
  const navigate = useNavigate();

  // Inline Admin Login State
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await login({ account: account.trim(), password });
      if (!res.success) {
        setLoginError(res.message || t('admin.guard.loginFailed'));
      }
    } catch (err: any) {
      setLoginError(err.message || t('admin.guard.loginError'));
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
              {t('admin.guard.title')}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t('admin.guard.subtitle')}
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <FieldError className="mt-0 text-destructive">{loginError}</FieldError>
            </div>
          )}

          <form onSubmit={handleAdminLogin}>
            <FieldSet className="gap-4">
              <FieldGroup className="gap-3.5">
                <Field>
                  <FieldLabel htmlFor="admin-login-account" required className="gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-primary" />
                    <span>{t('admin.guard.labelAccount')}</span>
                  </FieldLabel>
                  <Input
                    id="admin-login-account"
                    type="text"
                    required
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder={t('admin.guard.placeholderAccount')}
                    className="h-10 text-xs rounded-xl bg-muted/40 font-mono"
                  />
                </Field>

                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="admin-login-password" required className="gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-primary" />
                      <span>{t('admin.guard.labelPassword')}</span>
                    </FieldLabel>
                  </div>
                  <Input
                    id="admin-login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('admin.guard.placeholderPassword')}
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
                    <span>{t('admin.guard.verifying')}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{t('admin.guard.loginButton')}</span>
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
              <span>{t('admin.guard.backWorkspace')}</span>
            </Link>

            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{backendOnline ? t('admin.guard.cloudOnline') : t('admin.guard.localMode')}</span>
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
              {t('admin.guard.forbiddenTitle')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t('admin.guard.forbiddenDesc', { username: user.username })}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-card border border-border/80 text-left text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('admin.guard.currentRole')}:</span>
              <Badge variant="subtle" className="text-[10px] font-mono">
                {user.role}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('admin.guard.requiredRole')}:</span>
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
              <span>{t('admin.guard.backHome')}</span>
            </Button>
            <Button
              onClick={logout}
              variant="destructive"
              className="w-full sm:flex-1 h-9 rounded-xl text-xs gap-1.5 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{t('admin.guard.logoutSwitch')}</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated & Admin -> Render Admin Pages via Outlet
  return <Outlet />;
};

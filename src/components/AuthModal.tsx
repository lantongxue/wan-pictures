import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Field,
  FieldSet,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldSeparator,
} from './ui/field';
import {
  User as UserIcon,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  Server,
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
  const { t } = useTranslation();
  const { login, register } = useAuth();

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
      setErrorMsg(t('auth.fillAccountPassword'));
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
        t('auth.loginSuccess'),
        t('auth.loginSuccessDesc'),
        'success'
      );
      onClose();
    } else {
      setErrorMsg(res.message || t('auth.loginFailed'));
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regEmail.trim() || !regPassword) {
      setErrorMsg(t('auth.fillRequired'));
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg(t('auth.passwordLength'));
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
        t('auth.registerSuccess'),
        t('auth.registerSuccessDesc'),
        'success'
      );
      onClose();
    } else {
      setErrorMsg(res.message || t('auth.registerFailed'));
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
        {/* Header Pattern */}
        <div className="bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-transparent p-6 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  {mode === 'login' ? t('auth.userLogin') : t('auth.createNewAccount')}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {t('auth.authSubtitle')}
                </DialogDescription>
              </div>
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
              <span>{t('auth.loginTab')}</span>
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
              <span>{t('auth.registerTab')}</span>
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
              <FieldSet>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="login-account">
                      {t('auth.accountLabel')}
                    </FieldLabel>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-account"
                        type="text"
                        required
                        value={loginAccount}
                        onChange={(e) => setLoginAccount(e.target.value)}
                        placeholder={t('auth.accountPlaceholder')}
                        className="pl-9 text-xs h-9"
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="login-password">
                      {t('auth.passwordLabel')}
                    </FieldLabel>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder={t('auth.passwordPlaceholder')}
                        className="pl-9 pr-9 text-xs h-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </Field>
                </FieldGroup>

                <Button
                  id="submit-login-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 text-xs font-medium cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {t('auth.loggingIn')}
                    </span>
                  ) : (
                    t('auth.login')
                  )}
                </Button>

                {/* Quick test accounts */}
                <FieldSeparator />
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2 flex items-center justify-between">
                    <span>{t('auth.quickDemo')}</span>
                    <span className="text-[10px] font-mono opacity-70">pwd: password123</span>
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fillQuickDemo('admin')}
                      className="flex-1 text-[11px] h-7 cursor-pointer"
                    >
                      Admin
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fillQuickDemo('designer')}
                      className="flex-1 text-[11px] h-7 cursor-pointer"
                    >
                      Designer
                    </Button>
                  </div>
                </div>
              </FieldSet>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <FieldSet>
                <FieldGroup>
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel htmlFor="reg-username" required>
                        {t('auth.usernameLabel')}
                      </FieldLabel>
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
                          placeholder={t('auth.usernamePlaceholder')}
                          className="pl-9 text-xs h-9"
                        />
                      </div>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="reg-nickname">
                        {t('auth.nicknameLabel')}
                      </FieldLabel>
                      <Input
                        id="reg-nickname"
                        type="text"
                        value={regNickname}
                        onChange={(e) => setRegNickname(e.target.value)}
                        placeholder={t('auth.nicknamePlaceholder')}
                        className="text-xs h-9"
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="reg-email" required>
                      {t('auth.emailLabel')}
                    </FieldLabel>
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
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="reg-password" required>
                      {t('auth.passwordLabel')}
                    </FieldLabel>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder={t('auth.passwordMinPlaceholder')}
                        className="pl-9 pr-9 text-xs h-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <FieldDescription>
                      {t('auth.passwordDesc')}
                    </FieldDescription>
                  </Field>
                </FieldGroup>

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
                    <p className="text-[11px] font-medium text-foreground">{t('auth.avatarTitle')}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {t('auth.avatarDesc')}
                    </p>
                  </div>
                </div>

                <Button
                  id="submit-register-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 text-xs font-medium cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {t('auth.registering')}
                    </span>
                  ) : (
                    t('auth.register')
                  )}
                </Button>
              </FieldSet>
            </form>
          )}

          {/* Security & Sync Info Footer */}
          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Server className="w-3 h-3 text-blue-500" />
              {t('auth.encryptedStorage')}
            </span>
            <span>{t('auth.multiSync')}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

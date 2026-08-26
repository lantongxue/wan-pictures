import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Lock,
  HardDrive,
  FolderKanban,
  LogIn,
  UserPlus,
  ShieldCheck,
  ArrowRight,
  Compass,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface StorageAuthGuardProps {
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onGoToPlaza: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const StorageAuthGuard: React.FC<StorageAuthGuardProps> = ({
  onOpenAuth,
  onGoToPlaza,
}) => {
  const { t } = useTranslation();

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
            <span>{t('guard.badge')}</span>
          </Badge>

          {/* Heading */}
          <h1 className="text-2xl sm:text-4xl font-light tracking-tight text-foreground mb-3">
            {t('guard.title')}{' '}
            <span className="font-semibold text-foreground underline decoration-primary/40 underline-offset-8">
              Storage & Albums
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-8 max-w-xl">
            {t('guard.desc')}
          </p>

          {/* Main Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
            <Button
              id="guard-login-btn"
              onClick={() => onOpenAuth('login')}
              className="flex-1 rounded-full py-5 text-xs font-semibold uppercase tracking-wider gap-2 shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{t('guard.loginBtn')}</span>
            </Button>

            <Button
              id="guard-register-btn"
              variant="outline"
              onClick={() => onOpenAuth('register')}
              className="flex-1 rounded-full py-5 text-xs font-semibold uppercase tracking-wider gap-2 hover:bg-muted transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-primary" />
              <span>{t('guard.registerBtn')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Feature Highlights Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="p-6 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-md space-y-3">
          <div className="w-10 h-10 rounded-2xl border border-border bg-primary/10 flex items-center justify-center text-primary">
            <HardDrive className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{t('guard.feat1Title')}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('guard.feat1Desc')}
          </p>
        </div>

        <div className="p-6 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-md space-y-3">
          <div className="w-10 h-10 rounded-2xl border border-border bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <FolderKanban className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{t('guard.feat2Title')}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('guard.feat2Desc')}
          </p>
        </div>

        <div className="p-6 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-md space-y-3">
          <div className="w-10 h-10 rounded-2xl border border-border bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{t('guard.feat3Title')}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('guard.feat3Desc')}
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
            <p className="font-semibold text-foreground">{t('guard.plazaPromptTitle')}</p>
            <p className="text-muted-foreground text-[11px]">{t('guard.plazaPromptDesc')}</p>
          </div>
        </div>

        <Button
          id="guard-go-plaza-btn"
          variant="outline"
          size="sm"
          onClick={onGoToPlaza}
          className="rounded-full gap-1.5 font-medium shrink-0 cursor-pointer"
        >
          <span>{t('guard.enterPlaza')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

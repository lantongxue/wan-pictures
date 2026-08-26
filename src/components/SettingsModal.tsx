import React from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Check, Sun, Moon, Palette, Languages } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { changeLanguage } from '../i18n';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { t, i18n } = useTranslation();
  const { isDark, setTheme } = useTheme();

  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'zh';

  if (!isOpen) return null;

  const handleLanguageChange = (lang: 'zh' | 'en') => {
    changeLanguage(lang);
    onShowToast(
      t('toast.langSwitched', { lang: lang === 'zh' ? '简体中文' : 'English' }),
      lang === 'zh' ? '已更新界面显示语言' : 'Interface language updated',
      'success'
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[94vw] max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-3xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/80 text-left shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-border bg-muted/40 flex items-center justify-center text-primary shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>{t('settings.title')}</DialogTitle>
              <DialogDescription className="mt-0.5 uppercase tracking-wide text-[11px]">
                {t('settings.subtitle')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Language Switcher Section */}
          <div className="p-5 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Languages className="w-4 h-4 text-primary" />
                <span>{t('settings.languageSection.title')}</span>
              </div>
              <Badge variant="subtle" className="text-[10px] uppercase font-mono">
                {t('settings.languageSection.current')}: {currentLang === 'zh' ? '简体中文' : 'ENGLISH'}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t('settings.languageSection.desc')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Simplified Chinese */}
              <button
                type="button"
                id="lang-select-zh"
                onClick={() => handleLanguageChange('zh')}
                className={`p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                  currentLang === 'zh'
                    ? 'bg-background border-primary shadow-xs text-foreground ring-1 ring-primary'
                    : 'bg-muted/40 border-border hover:border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold flex items-center justify-center text-xs">
                    中
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">简体中文</p>
                    <p className="text-[10px] text-muted-foreground">Simplified Chinese</p>
                  </div>
                </div>
                {currentLang === 'zh' && (
                  <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>

              {/* English */}
              <button
                type="button"
                id="lang-select-en"
                onClick={() => handleLanguageChange('en')}
                className={`p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                  currentLang === 'en'
                    ? 'bg-background border-primary shadow-xs text-foreground ring-1 ring-primary'
                    : 'bg-muted/40 border-border hover:border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 font-bold flex items-center justify-center text-xs">
                    EN
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">English (US)</p>
                    <p className="text-[10px] text-muted-foreground">Standard English</p>
                  </div>
                </div>
                {currentLang === 'en' && (
                  <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Theme Mode Selector */}
          <div className="p-5 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Palette className="w-4 h-4 text-primary" />
                <span>{t('settings.themeSection.title')}</span>
              </div>
              <Badge variant="subtle" className="text-[10px] uppercase font-mono">
                {t('settings.themeSection.current')}: {isDark ? 'DARK' : 'LIGHT'}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t('settings.themeSection.desc')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                id="theme-select-dark"
                onClick={() => setTheme('dark')}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  isDark
                    ? 'bg-background border-primary shadow-xs text-foreground ring-1 ring-primary'
                    : 'bg-muted/40 border-border hover:border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-amber-400">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{t('settings.themeSection.dark')}</p>
                  <p className="text-[10px] text-muted-foreground">{t('settings.themeSection.darkDesc')}</p>
                </div>
              </button>

              <button
                type="button"
                id="theme-select-light"
                onClick={() => setTheme('light')}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  !isDark
                    ? 'bg-background border-primary shadow-xs text-foreground ring-1 ring-primary'
                    : 'bg-muted/40 border-border hover:border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-300 flex items-center justify-center text-indigo-600">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{t('settings.themeSection.light')}</p>
                  <p className="text-[10px] text-muted-foreground">{t('settings.themeSection.lightDesc')}</p>
                </div>
              </button>
            </div>
          </div>

          {/* Backend note */}
          <p className="text-[11px] text-muted-foreground text-center">
            上传配额、压缩与命名策略由服务器全局统一管理，如需调整请联系管理员。
          </p>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 px-6 border-t border-border/80 bg-muted/20 gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-full px-5 text-xs font-medium cursor-pointer"
          >
            {t('common.cancel')}
          </Button>
          <Button
            id="save-settings-btn"
            onClick={onClose}
            className="rounded-full px-6 gap-1.5 text-xs font-semibold shadow-md cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t('common.save')}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

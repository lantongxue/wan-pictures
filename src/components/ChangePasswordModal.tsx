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
import { Label } from './ui/label';
import { useAuth } from '../context/AuthContext';
import { KeyRound, RefreshCw, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { t } = useTranslation();
  const { changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswords(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      onShowToast(t('common.error'), t('profile.passwordRequired'), 'warning');
      return;
    }
    if (newPassword.length < 6) {
      onShowToast(t('common.error'), t('profile.passwordTooShort'), 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      onShowToast(t('common.error'), t('profile.passwordMismatch'), 'warning');
      return;
    }

    setIsSubmitting(true);
    const res = await changePassword({
      old_password: currentPassword,
      new_password: newPassword,
    });
    setIsSubmitting(false);

    if (res.success) {
      onShowToast(t('profile.passwordChanged'), t('profile.passwordChangedDesc'), 'success');
      resetForm();
      onClose();
    } else {
      onShowToast(t('common.error'), res.message, 'error');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border border-border/80 bg-card">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600/10 via-orange-600/10 to-transparent p-6 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-bold">{t('profile.changePasswordTitle')}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 shrink-0" />
                <span>{t('profile.changePasswordDesc')}</span>
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pwd-current" className="text-xs font-medium text-muted-foreground">
              {t('profile.currentPasswordField')}
            </Label>
            <Input
              id="pwd-current"
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t('profile.currentPasswordPlaceholder')}
              autoComplete="current-password"
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pwd-new" className="text-xs font-medium text-muted-foreground">
              {t('profile.newPasswordField')}
            </Label>
            <Input
              id="pwd-new"
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('profile.newPasswordPlaceholder')}
              autoComplete="new-password"
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pwd-confirm" className="text-xs font-medium text-muted-foreground">
              {t('profile.confirmPasswordField')}
            </Label>
            <Input
              id="pwd-confirm"
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('profile.confirmPasswordPlaceholder')}
              autoComplete="new-password"
              className="text-xs h-9"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPasswords((v) => !v)}
              className="text-xs h-8 text-muted-foreground hover:text-foreground cursor-pointer gap-1.5"
            >
              {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPasswords ? t('auth.hidePassword') : t('auth.showPassword')}
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-xs h-8 cursor-pointer"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="text-xs h-8 cursor-pointer gap-1"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <KeyRound className="w-3.5 h-3.5" />
                )}
                {t('profile.changePasswordBtn')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
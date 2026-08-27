import React, { useState } from 'react';
import { Users, UserPlus, Shield, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { UserManagementTab } from '../../components/admin/UserManagementTab';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from '../../components/ui/use-toast';

export const AdminUsersPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [userCount, setUserCount] = useState<number>(3);

  const showNotification = (title: string, desc?: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    toast({
      title,
      description: desc,
      variant:
        type === 'error' ? 'destructive' : type === 'warning' ? 'warning' : type === 'success' ? 'success' : 'default',
      duration: 3500,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {t('adminUsers.title')}
            </h1>
            <Badge variant="subtle" className="text-[10px] font-mono bg-indigo-500/10 text-indigo-500">
              {t('adminUsers.count', { count: userCount })}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('adminUsers.subtitle')}
          </p>
        </div>
      </div>

      {/* Embedded User Management Component */}
      <UserManagementTab
        currentUser={user}
        onShowToast={showNotification}
        onUserCountChange={setUserCount}
      />
    </div>
  );
};

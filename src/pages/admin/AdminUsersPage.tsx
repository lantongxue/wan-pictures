import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, UserPlus, Shield, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserManagementTab } from '../../components/admin/UserManagementTab';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

export const AdminUsersPage: React.FC = () => {
  const { user } = useAuth();
  const [userCount, setUserCount] = useState<number>(3);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (title: string, desc?: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    setFeedback({ message: title + (desc ? `: ${desc}` : ''), type: type === 'error' ? 'error' : 'success' });
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500 text-white'
                : 'bg-rose-500 text-white'
            }`}
          >
            <span>{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              用户与权限体系管理
            </h1>
            <Badge variant="subtle" className="text-[10px] font-mono bg-indigo-500/10 text-indigo-500">
              {userCount} 位用户
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            团队租户账号管理、角色权限分配 (Admin / User)、随机强密码重置与安全防护
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

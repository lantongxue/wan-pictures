import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  LayoutDashboard,
  Image as ImageIcon,
  FolderKanban,
  Tag as TagIcon,
  HardDrive,
  Users,
  Settings,
  FileText,
  ArrowLeft,
  Sun,
  Moon,
  Languages,
  LogOut,
  Menu,
  X,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { changeLanguage } from '../i18n';
import { formatFileSize } from '../utils/imageProcessing';
import { adminApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  group: 'dashboard' | 'assets' | 'infrastructure' | 'security' | 'system';
}

export const AdminLayout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, backendOnline, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [stats, setStats] = useState<{
    totalImages: number;
    totalAlbums: number;
    totalTags: number;
    totalUsers: number;
    totalSize: number;
    activeStorage: string;
  } | null>(null);

  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'zh';

  const fetchQuickStats = async () => {
    try {
      const res = await adminApi.getOverviewStats();
      if (res.success) {
        setStats({
          totalImages: res.data.totalImages,
          totalAlbums: res.data.totalAlbums,
          totalTags: res.data.totalTags,
          totalUsers: res.data.totalUsers,
          totalSize: res.data.totalSize,
          activeStorage: res.data.activeStorage,
        });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchQuickStats();
  }, [location.pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const navItems: NavItem[] = [
    {
      to: '/admin/overview',
      label: t('admin.layout.navOverview'),
      icon: LayoutDashboard,
      group: 'dashboard',
    },
    {
      to: '/admin/images',
      label: t('admin.layout.navImages'),
      icon: ImageIcon,
      badge: stats?.totalImages,
      group: 'assets',
    },
    {
      to: '/admin/albums',
      label: t('admin.layout.navAlbums'),
      icon: FolderKanban,
      badge: stats?.totalAlbums,
      group: 'assets',
    },
    {
      to: '/admin/tags',
      label: t('admin.layout.navTags'),
      icon: TagIcon,
      badge: stats?.totalTags,
      group: 'assets',
    },
    {
      to: '/admin/storage',
      label: t('admin.layout.navStorage'),
      icon: HardDrive,
      badge: stats?.activeStorage ? stats.activeStorage.toUpperCase() : 'LOCAL',
      group: 'infrastructure',
    },
    {
      to: '/admin/users',
      label: t('admin.layout.navUsers'),
      icon: Users,
      badge: stats?.totalUsers,
      group: 'security',
    },
    {
      to: '/admin/settings',
      label: t('admin.layout.navSettings'),
      icon: Settings,
      group: 'system',
    },
    {
      to: '/admin/logs',
      label: t('admin.layout.navLogs'),
      icon: FileText,
      group: 'system',
    },
  ];

  const handleToggleLang = () => {
    const nextLang = currentLang === 'zh' ? 'en' : 'zh';
    changeLanguage(nextLang);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Get current page title for breadcrumbs
  const currentNavItem = navItems.find((item) => location.pathname.startsWith(item.to));
  const currentPageTitle = currentNavItem
    ? currentNavItem.label
    : t('admin.layout.defaultPageTitle');

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-card text-card-foreground">
      {/* Brand Header */}
      <div className="p-5 border-b border-border/80 flex items-center justify-between shrink-0">
        <Link to="/admin/overview" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-tight text-foreground">
                WAN PICTURES
              </span>
              <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 font-mono font-bold">
                ADMIN
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">{t('admin.layout.brandSubtitle')}</p>
          </div>
        </Link>

        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Group 1: 控制面板 */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            {t('admin.layout.groupDashboard')}
          </div>
          {navItems
            .filter((item) => item.group === 'dashboard')
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <Badge
                      variant="subtle"
                      className="text-[10px] px-1.5 py-0 font-mono"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </NavLink>
              );
            })}
        </div>

        {/* Group 2: 资产管理 */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            {t('admin.layout.groupAssets')}
          </div>
          {navItems
            .filter((item) => item.group === 'assets')
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <Badge
                      variant="subtle"
                      className="text-[10px] px-1.5 py-0 font-mono"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </NavLink>
              );
            })}
        </div>

        {/* Group 3: 基础设施 */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            {t('admin.layout.groupInfrastructure')}
          </div>
          {navItems
            .filter((item) => item.group === 'infrastructure')
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
        </div>

        {/* Group 4: 安全与权限 */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            {t('admin.layout.groupSecurity')}
          </div>
          {navItems
            .filter((item) => item.group === 'security')
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <Badge
                      variant="subtle"
                      className="text-[10px] px-1.5 py-0 font-mono"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </NavLink>
              );
            })}
        </div>

        {/* Group 5: 系统运维 */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            {t('admin.layout.groupSystem')}
          </div>
          {navItems
            .filter((item) => item.group === 'system')
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                </NavLink>
              );
            })}
        </div>
      </div>

      {/* Sidebar Footer Info Card */}
      <div className="p-4 border-t border-border/80 bg-muted/20 shrink-0 space-y-3">
        <div className="p-3 rounded-2xl border border-border/60 bg-background/50 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-primary" />
              <span>{t('admin.layout.footerStorageTotal')}</span>
            </span>
            <span className="font-mono font-bold text-foreground text-[11px]">
              {stats ? formatFileSize(stats.totalSize) : '0 B'}
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  ((stats?.totalSize || 0) / (50 * 1024 * 1024 * 1024)) * 100
                )}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  backendOnline ? 'bg-emerald-500' : 'bg-emerald-500'
                }`}
              />
              <span>
                {backendOnline
                  ? t('admin.layout.footerBackendOnline')
                  : t('admin.layout.footerBackendOffline')}
              </span>
            </span>
            <span className="font-mono text-muted-foreground/60">v1.1.0</span>
          </div>
        </div>

        {/* Back to Workspace button */}
        <Link
          to="/"
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/80 text-xs font-semibold text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('admin.layout.backWorkspace')}</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div
      className={`min-h-screen flex font-sans transition-colors duration-200 ${
        isDark ? 'bg-[#050505] text-white' : 'bg-neutral-50 text-neutral-900'
      }`}
    >
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border/80 shrink-0 sticky top-0 h-screen z-30 shadow-xs">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl lg:hidden"
            >
              {renderSidebarContent()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Right Area: Header + Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Navigation Bar */}
        <header className="sticky top-0 z-20 h-16 border-b border-border/80 bg-background/90 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between gap-4">
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden h-9 w-9 rounded-xl cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </Button>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-1.5 text-xs">
              <Link
                to="/"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium flex items-center gap-1"
              >
                <span>{t('admin.layout.breadcrumbHome')}</span>
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
              <Link
                to="/admin/overview"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                <span>{t('admin.layout.breadcrumbAdmin')}</span>
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
              <span className="font-bold text-foreground">{currentPageTitle}</span>
            </div>
          </div>

          {/* Right: Quick Controls & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Action: Front Link */}
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/80 bg-muted/40 hover:bg-muted/80 text-xs font-semibold text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-primary" />
              <span>{t('admin.layout.frontWorkspace')}</span>
            </Link>

            {/* Backend Health Badge */}
            <div
              className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                backendOnline
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {backendOnline
                  ? t('admin.layout.statusOnline')
                  : t('admin.layout.statusOffline')}
              </span>
            </div>

            {/* Language Switcher */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleToggleLang}
              className="h-9 w-9 rounded-xl cursor-pointer"
              title={t('admin.layout.langTooltip')}
            >
              <Languages className="w-4 h-4" />
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-xl cursor-pointer"
              title={t('admin.layout.themeTooltip')}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </Button>

            {/* Admin User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full border border-border/80 bg-muted/40 hover:bg-muted/70 transition-all cursor-pointer">
                  <img
                    src={
                      user?.avatar ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || 'admin'}`
                    }
                    alt={user?.username}
                    className="w-7 h-7 rounded-full object-cover border border-border bg-muted"
                  />
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold text-foreground leading-none">
                      {user?.nickname || user?.username}
                    </p>
                    <p className="text-[10px] font-mono text-primary leading-none mt-0.5">
                      {user?.role?.toUpperCase()}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-2xl">
                <div className="px-3 py-2 border-b border-border/60">
                  <p className="text-xs font-bold text-foreground">{user?.nickname || user?.username}</p>
                  <p className="text-[11px] font-mono text-muted-foreground truncate">
                    @{user?.username}
                  </p>
                </div>
                <DropdownMenuItem
                  onClick={() => navigate('/admin/users')}
                  className="flex items-center gap-2 text-xs px-2.5 py-2 rounded-xl cursor-pointer"
                >
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{t('admin.layout.menuUserManagement')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/admin/settings')}
                  className="flex items-center gap-2 text-xs px-2.5 py-2 rounded-xl cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <span>{t('admin.layout.menuSettings')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-xs px-2.5 py-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('admin.layout.menuLogout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Sub-Route Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Search,
  Upload,
  FolderKanban,
  Settings,
  LayoutGrid,
  Grid2X2,
  List,
  HardDrive,
  Heart,
  X,
  Sun,
  Moon,
  Compass,
  Layers,
  User as UserIcon,
  LogIn,
  Shield,
  Server,
  Lock,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
} from 'lucide-react';
import { Album, ViewMode, FilterOptions } from '../types';
import { formatFileSize } from '../utils/imageProcessing';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';

interface NavbarProps {
  currentTab: 'workspace' | 'plaza';
  onTabChange: (tab: 'workspace' | 'plaza') => void;
  totalImagesCount: number;
  totalStorageBytes: number;
  albums: Album[];
  filters: FilterOptions;
  onFilterChange: (filters: Partial<FilterOptions>) => void;
  onOpenUpload: () => void;
  onOpenAlbums: () => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenProfile: () => void;
  onShowToast?: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  totalImagesCount,
  totalStorageBytes,
  albums,
  filters,
  onFilterChange,
  onOpenUpload,
  onOpenAlbums,
  onOpenSettings,
  onOpenAdmin,
  onOpenAuth,
  onOpenProfile,
  onShowToast,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated, backendOnline, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus mobile search input when opened
  useEffect(() => {
    if (isMobileSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isMobileSearchOpen]);

  // Close mobile menus on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsMobileSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    if (onShowToast) {
      onShowToast('已退出登录', '欢迎下次使用万图 (Wan Pictures)', 'info');
    }
  };

  const storagePercentage = Math.min(
    100,
    (totalStorageBytes / (50 * 1024 * 1024 * 1024)) * 100
  );

  return (
    <TooltipProvider delayDuration={200}>
      <header
        id="main-navbar"
        className="sticky top-0 z-40 w-full backdrop-blur-2xl transition-colors duration-200 border-b border-border/80 bg-background/90 text-foreground shadow-xs"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-15 sm:h-18 gap-2 sm:gap-4">
            {/* Brand & Logo + Primary Tabs */}
            <div className="flex items-center gap-2 sm:gap-5 shrink-0">
              <div
                onClick={() => {
                  onTabChange('workspace');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer select-none"
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-lg sm:text-2xl font-black tracking-tighter text-foreground">
                    WAN PICTURES<span className="text-primary text-2xl sm:text-3xl leading-none">.</span>
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                    万图
                  </span>
                </div>
                <Badge variant="subtle" className="hidden xl:inline-flex text-[10px]">
                  PRO VISION
                </Badge>
              </div>

              {/* Main Navigation Segment Switcher (Desktop & Tablet) */}
              <div className="hidden sm:flex items-center p-1 rounded-full border border-border/80 bg-muted/40">
                <button
                  id="nav-tab-plaza"
                  onClick={() => onTabChange('plaza')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    currentTab === 'plaza'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-blue-500" />
                  <span>图片广场</span>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                  </span>
                </button>

                <button
                  id="nav-tab-workspace"
                  onClick={() => onTabChange('workspace')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    currentTab === 'workspace'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-primary" />
                  <span>上传</span>
                </button>
              </div>
            </div>

            {/* Search Bar with Input (Desktop) */}
            <div className="flex-1 max-w-md hidden md:block">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="global-search-input"
                  type="text"
                  value={filters.searchQuery}
                  onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
                  placeholder={currentTab === 'plaza' ? '搜索广场资产、标签或格式...' : '搜索资产名称 / 格式 / 标签...'}
                  className="pl-9 pr-8 rounded-full border-border/80 bg-muted/40 focus-visible:bg-background tracking-wide h-9 text-xs"
                />
                {filters.searchQuery && (
                  <button
                    id="clear-search-btn"
                    onClick={() => onFilterChange({ searchQuery: '' })}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Action Hub - Desktop Icons & Mobile Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Mobile Search Toggle Button */}
              <Button
                id="mobile-search-toggle-btn"
                variant={isMobileSearchOpen || filters.searchQuery ? 'default' : 'outline'}
                size="icon"
                onClick={() => setIsMobileSearchOpen((prev) => !prev)}
                className={`md:hidden rounded-full h-8 w-8 sm:h-9 sm:w-9 relative cursor-pointer ${
                  filters.searchQuery && !isMobileSearchOpen ? 'text-primary border-primary/50' : ''
                }`}
                aria-label="搜索"
              >
                <Search className="w-3.5 h-3.5" />
                {filters.searchQuery && !isMobileSearchOpen && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </Button>

              {/* Desktop User Dropdown Menu (Logged-in) or Login Button */}
              <div className="hidden sm:block">
                {isAuthenticated && user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        id="nav-user-dropdown-btn"
                        className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border border-border/80 bg-muted/40 hover:bg-muted/70 data-[state=open]:bg-muted/80 data-[state=open]:border-primary/50 transition-all cursor-pointer select-none outline-none"
                      >
                        <img
                          src={user.avatar}
                          alt={user.nickname || user.username}
                          className="w-6 h-6 rounded-full border border-border bg-background object-cover shrink-0"
                        />
                        <span className="text-xs font-medium max-w-[90px] truncate hidden md:inline text-foreground">
                          {user.nickname || user.username}
                        </span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            backendOnline ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground transition-transform duration-200" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      sideOffset={8}
                      className="w-72 p-2 rounded-2xl shadow-xl border border-border/80 bg-popover/95 backdrop-blur-xl"
                    >
                      {/* User Identity Header */}
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/40 mb-2">
                        <img
                          src={user.avatar}
                          alt={user.nickname || user.username}
                          className="w-10 h-10 rounded-full border-2 border-primary/30 bg-background object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-foreground truncate">
                              {user.nickname || user.username}
                            </p>
                            <Badge
                              variant={user.role === 'admin' ? 'default' : 'secondary'}
                              className="text-[9px] px-1.5 py-0 h-4 shrink-0 font-medium"
                            >
                              {user.role === 'admin' ? '管理员' : '标准用户'}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                backendOnline ? 'bg-emerald-500' : 'bg-emerald-500'
                              }`}
                            />
                            <span
                              className={`text-[10px] font-medium ${
                                backendOnline ? 'text-emerald-500' : 'text-emerald-500'
                              }`}
                            >
                              {backendOnline ? '云端服务在线' : '本地存储模式'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Storage Usage & Status Box */}
                      <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2 mb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <HardDrive className="w-3.5 h-3.5 text-primary" />
                            <span>存储空间情况</span>
                          </div>
                          <Badge variant="subtle" className="text-[10px] font-mono px-1.5 py-0">
                            {totalImagesCount} 张图片
                          </Badge>
                        </div>

                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-mono font-semibold text-foreground">
                            {formatFileSize(totalStorageBytes)}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            / 50 GB
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-muted/80 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-primary rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.max(1.5, storagePercentage)}%`,
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>已用 {storagePercentage.toFixed(1)}%</span>
                          <span>可用 {formatFileSize(Math.max(0, 50 * 1024 * 1024 * 1024 - totalStorageBytes))}</span>
                        </div>
                      </div>

                      <DropdownMenuSeparator className="my-1" />

                      {/* Menu Actions */}
                      <DropdownMenuGroup className="space-y-0.5">
                        <DropdownMenuItem
                          id="dropdown-item-profile"
                          onClick={onOpenProfile}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer"
                        >
                          <UserIcon className="w-4 h-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-foreground">个人资料 (Profile)</span>
                            <p className="text-[10px] text-muted-foreground font-normal">修改昵称、简介与查看账号权限</p>
                          </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          id="dropdown-item-albums"
                          onClick={onOpenAlbums}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer"
                        >
                          <FolderKanban className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-foreground">相册分类管理</span>
                            <p className="text-[10px] text-muted-foreground font-normal">当前拥有 {albums.length} 个相册</p>
                          </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          id="dropdown-item-settings"
                          onClick={onOpenSettings}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer"
                        >
                          <Settings className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-foreground">偏好与存储配置</span>
                            <p className="text-[10px] text-muted-foreground font-normal">格式转换、水印与备份重置</p>
                          </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          id="dropdown-item-admin"
                          onClick={onOpenAdmin}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium bg-primary/5 text-primary hover:bg-primary/10 cursor-pointer"
                        >
                          <Shield className="w-4 h-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold">后台管理中心 (Admin)</span>
                              <Badge variant="default" className="text-[8px] px-1 py-0 h-3.5">
                                管理员
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-normal">
                              全量资产管理 / 标签合并 / S3 / WebDAV 调度
                            </p>
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuGroup>

                      <DropdownMenuSeparator className="my-1" />

                      {/* Logout Option */}
                      <DropdownMenuItem
                        id="dropdown-item-logout"
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 focus:text-rose-600 focus:bg-rose-500/10 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>退出登录 (Logout)</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    id="nav-login-btn"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenAuth('login')}
                    className="rounded-full gap-1.5 text-xs h-9 px-3.5 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5 text-primary" />
                    <span>登录</span>
                  </Button>
                )}
              </div>

              {/* Theme Toggle Button (Light / Dark) - Placed after User/Login */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    id="theme-toggle-btn"
                    variant="outline"
                    size="icon"
                    onClick={toggleTheme}
                    className="rounded-full shadow-none cursor-pointer h-8 w-8 sm:h-9 sm:w-9"
                    aria-label="切换明暗主题"
                  >
                    {isDark ? (
                      <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                    ) : (
                      <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isDark ? '切换至亮色模式' : '切换至深色模式'}
                </TooltipContent>
              </Tooltip>

              {/* Mobile Hamburger / Sheet Menu Trigger Button */}
              <Button
                id="mobile-menu-toggle-btn"
                variant={isMobileMenuOpen ? 'default' : 'outline'}
                size="icon"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className="sm:hidden rounded-full h-8 w-8 relative cursor-pointer"
                aria-label="打开移动端导航菜单"
              >
                {isMobileMenuOpen ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Menu className="w-4 h-4" />
                )}
                {isAuthenticated && !isMobileMenuOpen && (
                  <span
                    className={`absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-background ${
                      backendOnline ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Expandable Search Bar */}
          <AnimatePresence>
            {isMobileSearchOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden overflow-hidden border-t border-border/50 py-2.5"
              >
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      ref={searchInputRef}
                      id="mobile-global-search-input"
                      type="text"
                      value={filters.searchQuery}
                      onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
                      placeholder={currentTab === 'plaza' ? '搜索广场资产、标签或格式...' : '搜索资产名称 / 格式 / 标签...'}
                      className="pl-8.5 pr-8 rounded-full border-border/80 bg-muted/40 focus-visible:bg-background h-9 text-xs w-full"
                    />
                    {filters.searchQuery && (
                      <button
                        id="mobile-clear-search-btn"
                        onClick={() => onFilterChange({ searchQuery: '' })}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label="清空搜索"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsMobileSearchOpen(false);
                      if (filters.searchQuery) {
                        onFilterChange({ searchQuery: '' });
                      }
                    }}
                    className="rounded-full text-xs h-9 px-2.5 shrink-0 text-muted-foreground"
                  >
                    取消
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile Main Tab Switcher (Visible on small screens) */}
          <div className="sm:hidden grid grid-cols-2 gap-1.5 pb-2.5 pt-0.5">
            <button
              id="mobile-nav-tab-plaza"
              onClick={() => {
                onTabChange('plaza');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer border ${
                currentTab === 'plaza'
                  ? 'bg-primary/10 text-primary border-primary/30 shadow-xs'
                  : 'bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-blue-500" />
              <span>图片广场</span>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
              </span>
            </button>

            <button
              id="mobile-nav-tab-workspace"
              onClick={() => {
                onTabChange('workspace');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer border ${
                currentTab === 'workspace'
                  ? 'bg-primary/10 text-primary border-primary/30 shadow-xs'
                  : 'bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/60'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-primary" />
              <span>上传与工作台</span>
            </button>
          </div>

          {/* Sub-bar for Workspace Mode (Album Filters & View Switcher) */}
          {currentTab === 'workspace' && isAuthenticated && (
            <div className="py-2 flex items-center justify-between gap-2 border-t border-border/40">
              {/* Quick Album Filter Pills (Horizontally scrollable with touch) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0 mask-fade-edges">
                <button
                  id="album-filter-all"
                  onClick={() => onFilterChange({ albumId: 'all' })}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    filters.albumId === 'all'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/50'
                  }`}
                >
                  全部 ({totalImagesCount})
                </button>

                {albums.map((alb) => (
                  <button
                    key={alb.id}
                    id={`album-filter-${alb.id}`}
                    onClick={() => onFilterChange({ albumId: alb.id })}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                      filters.albumId === alb.id
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/50'
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: alb.color }}
                    />
                    {alb.name}
                  </button>
                ))}

                <button
                  id="filter-favorites-toggle"
                  onClick={() => onFilterChange({ favoritesOnly: !filters.favoritesOnly })}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    filters.favoritesOnly
                      ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                      : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/50'
                  }`}
                >
                  <Heart
                    className={`w-3 h-3 ${
                      filters.favoritesOnly ? 'fill-rose-500 text-rose-500' : ''
                    }`}
                  />
                  <span>精选</span>
                </button>
              </div>

              {/* View Mode Switcher (Compact on mobile) */}
              <div className="flex items-center gap-0.5 shrink-0 p-0.5 rounded-full border border-border/80 bg-muted/40">
                <button
                  id="view-mode-masonry"
                  onClick={() => onFilterChange({ viewMode: 'masonry' })}
                  className={`p-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                    filters.viewMode === 'masonry'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label="瀑布流视图"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>

                <button
                  id="view-mode-grid"
                  onClick={() => onFilterChange({ viewMode: 'grid' })}
                  className={`p-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                    filters.viewMode === 'grid'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label="网格视图"
                >
                  <Grid2X2 className="w-3.5 h-3.5" />
                </button>

                <button
                  id="view-mode-list"
                  onClick={() => onFilterChange({ viewMode: 'list' })}
                  className={`p-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                    filters.viewMode === 'list'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label="列表视图"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Slide-down Drawer / Sheet Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="sm:hidden fixed inset-0 top-[108px] bg-black/60 backdrop-blur-sm z-40"
              />

              {/* Menu Panel */}
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="sm:hidden relative z-50 border-t border-border/80 bg-background/98 backdrop-blur-2xl shadow-2xl px-4 py-4 space-y-3.5 max-h-[calc(100vh-120px)] overflow-y-auto"
              >
                {/* User Identity or Guest Banner */}
                {isAuthenticated && user ? (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60">
                    <img
                      src={user.avatar}
                      alt={user.nickname || user.username}
                      className="w-11 h-11 rounded-full border-2 border-primary/30 bg-background object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-foreground truncate">
                          {user.nickname || user.username}
                        </p>
                        <Badge
                          variant={user.role === 'admin' ? 'default' : 'secondary'}
                          className="text-[9px] px-1.5 py-0 h-4 shrink-0 font-medium"
                        >
                          {user.role === 'admin' ? '管理员' : '标准用户'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            backendOnline ? 'bg-emerald-500' : 'bg-emerald-500'
                          }`}
                        />
                        <span
                          className={`text-[10px] font-medium ${
                            backendOnline ? 'text-emerald-500' : 'text-emerald-500'
                          }`}
                        >
                          {backendOnline ? '服务已连接' : '本地存储'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">未登录账号</p>
                        <p className="text-[10px] text-muted-foreground">登录后解锁多端同步与相册归档</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenAuth('login');
                      }}
                      className="rounded-full text-xs h-8 px-3 cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5 mr-1" />
                      登录
                    </Button>
                  </div>
                )}

                {/* Storage Meter (Available for logged-in or demo) */}
                <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <HardDrive className="w-3.5 h-3.5 text-primary" />
                      <span>存储空间概览</span>
                    </div>
                    <Badge variant="subtle" className="text-[10px] font-mono px-1.5 py-0">
                      {totalImagesCount} 张图片
                    </Badge>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-mono font-semibold text-foreground">
                      {formatFileSize(totalStorageBytes)}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      / 50 GB
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-muted/80 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-primary rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(1.5, storagePercentage)}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>已用 {storagePercentage.toFixed(1)}%</span>
                    <span>可用 {formatFileSize(Math.max(0, 50 * 1024 * 1024 * 1024 - totalStorageBytes))}</span>
                  </div>
                </div>

                {/* Navigation & Action Links */}
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenAlbums();
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium bg-muted/20 hover:bg-muted/50 border border-border/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <FolderKanban className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="text-foreground">相册分类管理</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="subtle" className="text-[10px] px-1.5 py-0">
                        {albums.length}
                      </Badge>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium bg-muted/20 hover:bg-muted/50 border border-border/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-foreground">偏好设置与数据中心</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>

                  {isAuthenticated && (
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium bg-muted/20 hover:bg-muted/50 border border-border/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <UserIcon className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-foreground">个人资料与账户</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenAdmin();
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium bg-primary/10 hover:bg-primary/15 border border-primary/30 text-primary transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Shield className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-semibold">后台管理中心 (Admin)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="default" className="text-[9px] px-1 py-0">
                        管理
                      </Badge>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                </div>

                {/* Theme & Logout Footer */}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleTheme}
                    className="rounded-xl flex-1 justify-center gap-1.5 text-xs h-9 cursor-pointer"
                  >
                    {isDark ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>亮色模式</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-indigo-600" />
                        <span>深色模式</span>
                      </>
                    )}
                  </Button>

                  {isAuthenticated ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      className="rounded-xl flex-1 justify-center gap-1.5 text-xs h-9 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/30 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>退出登录</span>
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenAuth('login');
                      }}
                      className="rounded-xl flex-1 justify-center gap-1.5 text-xs h-9 cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>立即登录</span>
                    </Button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>
    </TooltipProvider>
  );
};

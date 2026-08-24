/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Upload,
  Layers,
  Heart,
  Settings as SettingsIcon,
  Search,
  Plus
} from 'lucide-react';

import {
  ImageItem,
  Album,
  UploadSettings,
  UploadQueueItem,
  FilterOptions,
  ToastMessage,
  ViewMode
} from './types';

import { dbService, DEFAULT_ALBUMS, DEFAULT_SETTINGS } from './utils/db';
import { processImageUpload, getImageMetadata } from './utils/imageProcessing';
import { INITIAL_SAMPLE_IMAGES } from './data/sampleImages';
import { ThemeProvider, useTheme } from './context/ThemeContext';

import { Navbar } from './components/Navbar';
import { UploadHero } from './components/UploadHero';
import { UploadModal } from './components/UploadModal';
import { LinkGeneratorModal } from './components/LinkGeneratorModal';
import { GalleryGrid } from './components/GalleryGrid';
import { ImagePlaza } from './components/ImagePlaza';
import { ImageLightbox } from './components/ImageLightbox';
import { AlbumManagerModal } from './components/AlbumManagerModal';
import { BatchActionBar } from './components/BatchActionBar';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { StorageAuthGuard } from './components/StorageAuthGuard';
import { ToastContainer } from './components/Toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import { Badge } from './components/ui/badge';

function WanPicturesApp() {
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();

  // Navigation Tab State
  const [currentTab, setCurrentTab] = useState<'workspace' | 'plaza'>('workspace');

  // Database States
  const [images, setImages] = useState<ImageItem[]>([]);
  const [albums, setAlbums] = useState<Album[]>(DEFAULT_ALBUMS);
  const [settings, setSettings] = useState<UploadSettings>(DEFAULT_SETTINGS);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Upload States
  const [uploadTargetAlbumId, setUploadTargetAlbumId] = useState<string>('default');
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Modals & Inspection States
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkModalImages, setLinkModalImages] = useState<ImageItem[]>([]);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<ImageItem | null>(null);

  // Selection & Filters
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterOptions>({
    albumId: 'all',
    searchQuery: '',
    formatFilter: 'all',
    favoritesOnly: false,
    sortBy: 'date-desc',
    viewMode: 'masonry',
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (title: string, description?: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
      const newToast: ToastMessage = { id, title, description, type };
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshAllData = useCallback(async () => {
    try {
      const [allAlbums, allImages, allSettings] = await Promise.all([
        dbService.getAllAlbums(),
        dbService.getAllImages(),
        dbService.getSettings(),
      ]);
      setAlbums(allAlbums);
      setImages(allImages);
      setSettings(allSettings);
    } catch (e) {
      console.error('Failed to refresh data', e);
    }
  }, []);

  // Initialize DB and load initial data
  useEffect(() => {
    async function init() {
      try {
        await dbService.initDefaults();
        const loadedAlbums = await dbService.getAllAlbums();
        let loadedImages = await dbService.getAllImages();
        const loadedSettings = await dbService.getSettings();

        // If fresh database with no images, load sample showcase images
        if (loadedImages.length === 0) {
          await dbService.saveImages(INITIAL_SAMPLE_IMAGES);
          loadedImages = INITIAL_SAMPLE_IMAGES;
        }

        setAlbums(loadedAlbums.length > 0 ? loadedAlbums : DEFAULT_ALBUMS);
        setImages(loadedImages);
        setSettings(loadedSettings);
        setUploadTargetAlbumId(loadedSettings.defaultAlbumId || 'default');
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setImages(INITIAL_SAMPLE_IMAGES);
      } finally {
        setIsDbLoaded(true);
      }
    }
    init();
  }, []);

  // Global Clipboard Paste Listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Don't trigger if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.clipboardData && e.clipboardData.items) {
        const files: File[] = [];
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              const ext = item.type.split('/')[1] || 'png';
              const namedFile = new File([file], `screenshot_${Date.now()}.${ext}`, {
                type: item.type,
              });
              files.push(namedFile);
            }
          }
        }

        if (files.length > 0) {
          e.preventDefault();
          if (!isAuthenticated) {
            showToast('需要登录', '请先登录账号后再上传和存储图片', 'warning');
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
            return;
          }
          showToast('已捕获剪贴板截图', `正在上传 ${files.length} 张图片...`, 'info');
          handleFilesSelected(files);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [uploadTargetAlbumId, settings, isAuthenticated]);

  // Handle Files Selected / Dragged
  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;

    if (!isAuthenticated) {
      showToast('需要登录', '请先登录账号后再上传和管理存储资产', 'warning');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    const newQueueItems: UploadQueueItem[] = files.map((file) => ({
      id: 'queue_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'pending',
      previewUrl: URL.createObjectURL(file),
    }));

    setUploadQueue(newQueueItems);
    setIsUploadModalOpen(true);

    const processedResults: ImageItem[] = [];

    for (let i = 0; i < newQueueItems.length; i++) {
      const qItem = newQueueItems[i];
      setUploadQueue((prev) =>
        prev.map((item) => (item.id === qItem.id ? { ...item, status: 'processing' } : item))
      );

      try {
        const processedImage = await processImageUpload(qItem.file, settings, uploadTargetAlbumId);
        await dbService.saveImage(processedImage);
        processedResults.push(processedImage);

        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === qItem.id
              ? { ...item, status: 'done', resultItem: processedImage, progress: 100 }
              : item
          )
        );
      } catch (err) {
        console.error('Failed to process image:', err);
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === qItem.id
              ? { ...item, status: 'error', error: '图片解析异常' }
              : item
          )
        );
      }
    }

    // Refresh images in state
    const allImages = await dbService.getAllImages();
    setImages(allImages);

    if (processedResults.length > 0) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3B82F6', '#6366F1', '#10B981'],
      });

      showToast(
        '上传解析成功',
        `已成功处理 ${processedResults.length} 张图片，点击可查看外链`,
        'success'
      );
      setLinkModalImages(processedResults);
    }
  };

  // Handle URL Import
  const handleUrlImport = async (url: string) => {
    if (!isAuthenticated) {
      showToast('需要登录', '请先登录账号后再导入和保存图片', 'warning');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    showToast('正在抓取网络图片...', url, 'info');
    try {
      const meta = await getImageMetadata(url);
      const extMatch = url.match(/\.([a-zA-Z0-9]+)(\?|$)/);
      const ext = extMatch ? extMatch[1] : 'jpg';
      const filename = `remote_${Date.now()}.${ext}`;

      const newImage: ImageItem = {
        id: 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: filename,
        originalName: filename,
        size: 350000,
        type: `image/${ext}`,
        extension: ext,
        width: meta.width,
        height: meta.height,
        aspectRatio: meta.aspectRatio,
        dataUrl: meta.dataUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        albumId: uploadTargetAlbumId || 'default',
        tags: ['REMOTE', ext.toUpperCase()],
        favorite: false,
        colorPalette: meta.colors,
      };

      await dbService.saveImage(newImage);
      const all = await dbService.getAllImages();
      setImages(all);
      setLinkModalImages([newImage]);
      setIsLinkModalOpen(true);
      showToast('网络图片导入成功', newImage.name, 'success');
    } catch (err) {
      console.error(err);
      showToast('导入失败', '远程图片地址无效或存在跨域限制', 'error');
    }
  };

  // Image CRUD actions
  const handleDeleteImage = async (id: string) => {
    if (!isAuthenticated) {
      showToast('操作受限', '请先登录账号后再删除图片资产', 'warning');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    await dbService.deleteImage(id);
    setImages((prev) => prev.filter((img) => img.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (previewImage?.id === id) {
      setPreviewImage(null);
    }
    showToast('图片已删除', undefined, 'info');
  };

  const handleToggleFavorite = async (id: string) => {
    if (!isAuthenticated) {
      showToast('操作受限', '请先登录账号后再收藏图片', 'warning');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    const target = images.find((i) => i.id === id);
    if (!target) return;
    const updated = await dbService.updateImage(id, { favorite: !target.favorite });
    setImages((prev) => prev.map((img) => (img.id === id ? updated : img)));
    if (previewImage?.id === id) {
      setPreviewImage(updated);
    }
    showToast(updated.favorite ? '已加入精选收藏' : '已移出收藏', target.name, 'info');
  };

  const handleUpdateImage = async (id: string, updates: Partial<ImageItem>) => {
    if (!isAuthenticated) {
      showToast('操作受限', '请先登录账号后再编辑图片信息', 'warning');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    const updated = await dbService.updateImage(id, updates);
    setImages((prev) => prev.map((img) => (img.id === id ? updated : img)));
    if (previewImage?.id === id) {
      setPreviewImage(updated);
    }
  };

  // Album actions
  const handleCreateAlbum = async (album: Album) => {
    if (!isAuthenticated) {
      showToast('操作受限', '请先登录账号后再创建相册', 'warning');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    await dbService.saveAlbum(album);
    const all = await dbService.getAllAlbums();
    setAlbums(all);
  };

  const handleUpdateAlbum = async (album: Album) => {
    if (!isAuthenticated) {
      showToast('操作受限', '请先登录账号后再修改相册', 'warning');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    await dbService.saveAlbum(album);
    const all = await dbService.getAllAlbums();
    setAlbums(all);
  };

  const handleDeleteAlbum = async (id: string) => {
    if (!isAuthenticated) {
      showToast('操作受限', '请先登录账号后再删除相册', 'warning');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    await dbService.deleteAlbum(id);
    const [allAlbums, allImages] = await Promise.all([
      dbService.getAllAlbums(),
      dbService.getAllImages(),
    ]);
    setAlbums(allAlbums);
    setImages(allImages);
    if (filters.albumId === id) {
      setFilters((prev) => ({ ...prev, albumId: 'all' }));
    }
  };

  // Batch actions
  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(filteredImages.map((i) => i.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBatchMoveToAlbum = async (targetAlbumId: string) => {
    if (!isAuthenticated) {
      showToast('操作受限', '请先登录账号后再移动资产', 'warning');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    const selectedList = images.filter((i) => selectedIds.has(i.id));
    for (const item of selectedList) {
      await dbService.updateImage(item.id, { albumId: targetAlbumId });
    }
    const all = await dbService.getAllImages();
    setImages(all);
    setSelectedIds(new Set());
  };

  const handleBatchDelete = async () => {
    if (!isAuthenticated) {
      showToast('操作受限', '请先登录账号后再批量删除', 'warning');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    const ids: string[] = Array.from(selectedIds);
    if (window.confirm(`确定批量删除选中的 ${ids.length} 张图片吗？`)) {
      await dbService.deleteImages(ids);
      setImages((prev) => prev.filter((img) => !selectedIds.has(img.id)));
      setSelectedIds(new Set());
      showToast('批量删除成功', `已删除 ${ids.length} 项`, 'info');
    }
  };

  const handleOpenBatchLinks = () => {
    const selectedList = images.filter((i) => selectedIds.has(i.id));
    if (selectedList.length > 0) {
      setLinkModalImages(selectedList);
      setIsLinkModalOpen(true);
    }
  };

  // Filter & Search Logic
  const filteredImages = useMemo(() => {
    let result = [...images];

    // Filter by Album
    if (filters.albumId !== 'all') {
      result = result.filter((img) => img.albumId === filters.albumId);
    }

    // Filter by Favorites
    if (filters.favoritesOnly) {
      result = result.filter((img) => img.favorite);
    }

    // Filter by Format
    if (filters.formatFilter !== 'all') {
      const f = filters.formatFilter.toLowerCase();
      result = result.filter(
        (img) =>
          img.extension.toLowerCase().includes(f) ||
          img.type.toLowerCase().includes(f)
      );
    }

    // Filter by Dimension: Width
    if (filters.minWidth && filters.minWidth > 0) {
      result = result.filter((img) => (img.width || 0) >= (filters.minWidth || 0));
    }
    if (filters.maxWidth && filters.maxWidth > 0) {
      result = result.filter((img) => (img.width || 0) <= (filters.maxWidth || 0));
    }

    // Filter by Dimension: Height
    if (filters.minHeight && filters.minHeight > 0) {
      result = result.filter((img) => (img.height || 0) >= (filters.minHeight || 0));
    }
    if (filters.maxHeight && filters.maxHeight > 0) {
      result = result.filter((img) => (img.height || 0) <= (filters.maxHeight || 0));
    }

    // Filter by Aspect Ratio
    if (filters.aspectRatioFilter && filters.aspectRatioFilter !== 'all') {
      result = result.filter((img) => {
        const w = img.width || 1;
        const h = img.height || 1;
        const ratio = w / h;
        if (filters.aspectRatioFilter === 'landscape') {
          return ratio > 1.08;
        } else if (filters.aspectRatioFilter === 'portrait') {
          return ratio < 0.92;
        } else if (filters.aspectRatioFilter === 'square') {
          return ratio >= 0.92 && ratio <= 1.08;
        }
        return true;
      });
    }

    // Filter by Search Query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        (img) =>
          img.name.toLowerCase().includes(q) ||
          img.extension.toLowerCase().includes(q) ||
          (img.tags && img.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // Sorting
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'date-asc':
          return a.createdAt - b.createdAt;
        case 'size-desc':
          return b.size - a.size;
        case 'size-asc':
          return a.size - b.size;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'date-desc':
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return result;
  }, [images, filters]);

  const totalStorageBytes = useMemo(() => {
    return images.reduce((sum, img) => sum + (img.size || 0), 0);
  }, [images]);

  const selectedImagesList = useMemo(() => {
    return images.filter((i) => selectedIds.has(i.id));
  }, [images, selectedIds]);

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-blue-500 selection:text-white ${
        isDark ? 'bg-[#050505] text-white' : 'bg-neutral-50 text-neutral-900'
      }`}
    >
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Main Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        totalImagesCount={images.length}
        totalStorageBytes={totalStorageBytes}
        albums={albums}
        filters={filters}
        onFilterChange={(newFilters) => setFilters((prev) => ({ ...prev, ...newFilters }))}
        onOpenUpload={() => {
          if (!isAuthenticated) {
            showToast('需要登录', '请先登录账号后再上传和管理存储资产', 'warning');
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
            return;
          }
          if (currentTab === 'plaza') {
            document.getElementById('hidden-file-input')?.click();
          } else {
            const dropzone = document.getElementById('dropzone-area');
            if (dropzone) dropzone.scrollIntoView({ behavior: 'smooth' });
            else document.getElementById('hidden-file-input')?.click();
          }
        }}
        onOpenAlbums={() => {
          if (!isAuthenticated) {
            showToast('需要登录', '请先登录账号后再查看和管理相册', 'warning');
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
            return;
          }
          setIsAlbumModalOpen(true);
        }}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenAuth={(mode = 'login') => {
          setAuthModalMode(mode);
          setIsAuthModalOpen(true);
        }}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onShowToast={showToast}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'plaza' ? (
          /* Dedicated Image Plaza / Waterfall Page */
          <ImagePlaza
            images={images}
            albums={albums}
            onPreview={setPreviewImage}
            onToggleFavorite={handleToggleFavorite}
            onOpenBatchLinks={handleOpenBatchLinks}
            onShowToast={showToast}
            onOpenUpload={() => {
              if (!isAuthenticated) {
                showToast('需要登录', '请先登录账号后再上传图片', 'warning');
                setAuthModalMode('login');
                setIsAuthModalOpen(true);
                return;
              }
              document.getElementById('hidden-file-input')?.click();
            }}
          />
        ) : !isAuthenticated ? (
          /* Locked Storage & Album Guard */
          <StorageAuthGuard
            onOpenAuth={(mode = 'login') => {
              setAuthModalMode(mode);
              setIsAuthModalOpen(true);
            }}
            onGoToPlaza={() => setCurrentTab('plaza')}
            onShowToast={showToast}
          />
        ) : (
          /* Workspace Dashboard: Upload Hero + Asset Gallery */
          <>
            {/* Grand Hero Upload Zone */}
            <UploadHero
              onFilesSelected={handleFilesSelected}
              onUrlImport={handleUrlImport}
              albums={albums}
              selectedAlbumId={uploadTargetAlbumId}
              onAlbumChange={setUploadTargetAlbumId}
              settings={settings}
              onSettingsChange={(newSettings) => {
                setSettings(newSettings);
                dbService.saveSettings(newSettings);
              }}
            />

            {/* Gallery Library Section */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2
                    className={`text-xl sm:text-2xl font-light tracking-tight flex items-center gap-2 ${
                      isDark ? 'text-white' : 'text-neutral-950'
                    }`}
                  >
                    <span>图库资产管理</span>
                    <Badge variant="subtle" className="text-xs font-mono">
                      {filteredImages.length} 项
                    </Badge>
                  </h2>
                  <p
                    className={`text-xs uppercase tracking-wide mt-0.5 ${
                      isDark ? 'text-white/40' : 'text-neutral-500'
                    }`}
                  >
                    Multi-format compiler, batch exporter, zoom/pan inspector & custom album spaces
                  </p>
                </div>
              </div>

              <GalleryGrid
                images={filteredImages}
                albums={albums}
                filters={filters}
                onFilterChange={(newFilters) => setFilters((prev) => ({ ...prev, ...newFilters }))}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onClearSelection={handleClearSelection}
                onPreview={setPreviewImage}
                onDelete={handleDeleteImage}
                onToggleFavorite={handleToggleFavorite}
                onShowToast={showToast}
                onOpenUpload={() => document.getElementById('hidden-file-input')?.click()}
              />
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer
        className={`w-full border-t py-8 px-4 text-center text-xs mt-12 transition-colors ${
          isDark
            ? 'border-white/10 bg-[#050505] text-white/40'
            : 'border-neutral-200 bg-white text-neutral-500'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className={`font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>万图 Wan Pictures</span>
            <span>— 极简大气的现代 Web 图床与相册管理系统</span>
          </div>
          <p className={isDark ? 'text-white/30' : 'text-neutral-400'}>
            支持拖拽上传 · 剪贴板快速粘贴 · 自动出链 · 亮色/深色主题自由切换 · 本地高性能存储
          </p>
        </div>
      </footer>

      {/* Floating Batch Action Bar - only when authenticated */}
      {isAuthenticated && (
        <BatchActionBar
          selectedImages={selectedImagesList}
          albums={albums}
          onClearSelection={handleClearSelection}
          onOpenBatchLinks={handleOpenBatchLinks}
          onBatchMoveToAlbum={handleBatchMoveToAlbum}
          onBatchDelete={handleBatchDelete}
          onShowToast={showToast}
        />
      )}

      {/* Upload Progress Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        queue={uploadQueue}
        onClose={() => setIsUploadModalOpen(false)}
        onViewLinks={() => {
          setIsUploadModalOpen(false);
          setIsLinkModalOpen(true);
        }}
        onRemoveItem={(id) => setUploadQueue((prev) => prev.filter((i) => i.id !== id))}
      />

      {/* Link Generator & Copy Hub */}
      <LinkGeneratorModal
        isOpen={isLinkModalOpen}
        images={linkModalImages}
        onClose={() => setIsLinkModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Fullscreen Lightbox & Inspector */}
      <ImageLightbox
        image={previewImage}
        images={filteredImages}
        albums={albums}
        onClose={() => setPreviewImage(null)}
        onNavigate={setPreviewImage}
        onUpdateImage={handleUpdateImage}
        onDelete={handleDeleteImage}
        onToggleFavorite={handleToggleFavorite}
        onShowToast={showToast}
      />

      {/* Album Manager Modal */}
      <AlbumManagerModal
        isOpen={isAlbumModalOpen}
        albums={albums}
        images={images}
        onClose={() => setIsAlbumModalOpen(false)}
        onCreateAlbum={handleCreateAlbum}
        onUpdateAlbum={handleUpdateAlbum}
        onDeleteAlbum={handleDeleteAlbum}
        onShowToast={showToast}
        onOpenAuth={(mode = 'login') => {
          setAuthModalMode(mode);
          setIsAuthModalOpen(true);
        }}
      />

      {/* Settings & Storage Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        settings={settings}
        albums={albums}
        images={images}
        onClose={() => setIsSettingsModalOpen(false)}
        onSaveSettings={(s) => {
          setSettings(s);
          dbService.saveSettings(s);
        }}
        onRestoreData={async (restoredImages, restoredAlbums) => {
          await dbService.saveImages(restoredImages);
          for (const alb of restoredAlbums) {
            await dbService.saveAlbum(alb);
          }
          setImages(restoredImages);
          setAlbums(restoredAlbums);
        }}
        onClearAll={async () => {
          await dbService.clearAllData();
          setImages([]);
          setAlbums(DEFAULT_ALBUMS);
          setSelectedIds(new Set());
          showToast('图库已清空重置', undefined, 'info');
        }}
        onShowToast={showToast}
        onOpenAuth={(mode = 'login') => {
          setAuthModalMode(mode);
          setIsAuthModalOpen(true);
        }}
      />

      {/* User Login & Register Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onShowToast={showToast}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Admin Management Center (CRUD Images, Tags, Albums, S3/WebDAV Storage Drivers) */}
      <AdminPanelModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onShowToast={showToast}
        onRefreshData={refreshAllData}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WanPicturesApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

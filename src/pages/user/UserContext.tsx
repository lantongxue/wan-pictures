import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';
import {
  ImageItem,
  Album,
  UploadSettings,
  UploadQueueItem,
  UploadQuotaInfo,
  FilterOptions,
  ToastMessage,
} from '../../types';
import { uploadApi } from '../../services/api';
import { dbService, DEFAULT_ALBUMS, DEFAULT_SETTINGS } from '../../utils/db';
import { processImageUpload, getImageMetadata, partitionAllowedImages, isAllowedImageType, extractExtension } from '../../utils/imageProcessing';
import { INITIAL_SAMPLE_IMAGES } from '../../data/sampleImages';
import { useAuth } from '../../context/AuthContext';

export interface UserContextType {
  // Database States
  images: ImageItem[];
  setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>;
  albums: Album[];
  setAlbums: React.Dispatch<React.SetStateAction<Album[]>>;
  settings: UploadSettings;
  setSettings: React.Dispatch<React.SetStateAction<UploadSettings>>;
  isDbLoaded: boolean;

  // Navigation / Tabs
  currentTab: 'workspace' | 'plaza';
  handleTabChange: (tab: 'workspace' | 'plaza') => void;

  // Upload States
  uploadTargetAlbumId: string;
  setUploadTargetAlbumId: (id: string) => void;
  uploadQueue: UploadQueueItem[];
  setUploadQueue: React.Dispatch<React.SetStateAction<UploadQueueItem[]>>;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;

  // Backend-driven upload quota (GET /api/v1/upload/quota), null when backend offline
  quotaInfo: UploadQuotaInfo | null;
  refreshQuota: () => Promise<UploadQuotaInfo | null>;

  // Modals & Inspection States
  isLinkModalOpen: boolean;
  setIsLinkModalOpen: (open: boolean) => void;
  linkModalImages: ImageItem[];
  setLinkModalImages: (images: ImageItem[]) => void;
  isAlbumModalOpen: boolean;
  setIsAlbumModalOpen: (open: boolean) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'register';
  setAuthModalMode: (mode: 'login' | 'register') => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  previewImage: ImageItem | null;
  setPreviewImage: (image: ImageItem | null) => void;

  // Selection & Filters
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  filteredImages: ImageItem[];
  selectedImagesList: ImageItem[];
  totalStorageBytes: number;

  // Toasts
  toasts: ToastMessage[];
  showToast: (title: string, description?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  dismissToast: (id: string) => void;

  // Handlers
  handleFilesSelected: (files: File[]) => Promise<void>;
  handleUrlImport: (url: string) => Promise<void>;
  handleDeleteImage: (id: string) => Promise<void>;
  handleToggleFavorite: (id: string) => Promise<void>;
  handleUpdateImage: (id: string, updates: Partial<ImageItem>) => Promise<void>;
  handleCreateAlbum: (album: Album) => Promise<void>;
  handleUpdateAlbum: (album: Album) => Promise<void>;
  handleDeleteAlbum: (id: string) => Promise<void>;
  handleToggleSelect: (id: string, e: React.MouseEvent) => void;
  handleSelectAll: () => void;
  handleClearSelection: () => void;
  handleBatchMoveToAlbum: (targetAlbumId: string) => Promise<void>;
  handleBatchDelete: () => Promise<void>;
  handleOpenBatchLinks: () => void;

  // Quick Open Modal helpers
  handleOpenUpload: () => void;
  handleOpenAlbums: () => void;
  handleOpenSettings: () => void;
  handleOpenAuth: (mode?: 'login' | 'register') => void;
  handleOpenProfile: () => void;
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation Tab State (synced with route: default is plaza)
  const currentTab: 'workspace' | 'plaza' = location.pathname.startsWith('/workspace') ? 'workspace' : 'plaza';

  const handleTabChange = useCallback(
    (tab: 'workspace' | 'plaza') => {
      if (tab === 'workspace') {
        navigate('/workspace');
      } else {
        navigate('/');
      }
    },
    [navigate]
  );

  // Database States
  const [images, setImages] = useState<ImageItem[]>([]);
  const [albums, setAlbums] = useState<Album[]>(DEFAULT_ALBUMS);
  const [settings, setSettings] = useState<UploadSettings>(DEFAULT_SETTINGS);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Upload States
  const [uploadTargetAlbumId, setUploadTargetAlbumId] = useState<string>('default');
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<UploadQuotaInfo | null>(null);

  // Modals & Inspection States
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkModalImages, setLinkModalImages] = useState<ImageItem[]>([]);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
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

  // Fetch upload quota policy from backend (restrictions live entirely server-side)
  const refreshQuota = useCallback(async (): Promise<UploadQuotaInfo | null> => {
    const res = await uploadApi.getQuota().catch(() => null);
    const next = res?.data || null;
    setQuotaInfo(next);
    return next;
  }, []);

  // Keep quota in sync with login state (anonymous vs user/vip/admin policy)
  useEffect(() => {
    refreshQuota();
  }, [refreshQuota, isAuthenticated]);

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

  // Handle Files Selected / Dragged — real upload pipeline against the Go backend
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      // MIME whitelist: PNG / JPG / WEBP / GIF / SVG / AVIF / BMP / ICO only
      const { accepted: validFiles, rejected } = partitionAllowedImages(files);
      if (rejected.length > 0) {
        showToast(
          t('common.warning'),
          t('uploadModal.unsupportedSkipped', { count: rejected.length }),
          'warning'
        );
      }
      if (validFiles.length === 0) return;

      // Read quota policy from GET /api/v1/upload/quota.
      // Only used to guide UX (e.g. anonymous gate); the backend remains the
      // single source of truth for every restriction.
      const quotaRes = await uploadApi.getQuota().catch(() => null);
      if (quotaRes?.data) {
        setQuotaInfo(quotaRes.data);
        if (!isAuthenticated && !quotaRes.data.allow_anonymous) {
          showToast(t('albums.authRequiredTitle'), '管理员已关闭匿名上传，请先登录账号后再上传图片', 'warning');
          setAuthModalMode('login');
          setIsAuthModalOpen(true);
          return;
        }
      }

      const newQueueItems: UploadQueueItem[] = validFiles.map((file) => ({
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
      let instantCount = 0;

      for (let i = 0; i < newQueueItems.length; i++) {
        const qItem = newQueueItems[i];
        setUploadQueue((prev) =>
          prev.map((item) => (item.id === qItem.id ? { ...item, status: 'processing', progress: 10 } : item))
        );

        try {
          // Step 1: SHA-256 fingerprint for instant-upload (秒传) preflight
          const fileHash = await uploadApi.computeSHA256(qItem.file);

          // Step 2: Instant upload preflight against backend dedup index
          const checkRes = await uploadApi.checkHash({
            hash: fileHash,
            size: qItem.file.size,
            name: qItem.file.name,
            albumId: uploadTargetAlbumId,
          });

          if (checkRes.isBackendOnline && !checkRes.success) {
            // Backend rejected the preflight (quota exceeded / policy error)
            setUploadQueue((prev) =>
              prev.map((item) =>
                item.id === qItem.id ? { ...item, status: 'error', error: checkRes.message } : item
              )
            );
            showToast('上传受阻', checkRes.message, 'warning');
            continue;
          }

          if (
            checkRes.isBackendOnline &&
            checkRes.success &&
            checkRes.exists &&
            checkRes.image
          ) {
            // Instant Deduplication Success! (⚡ 秒传触发)
            await dbService.saveImage(checkRes.image);
            processedResults.push(checkRes.image);
            instantCount++;

            setUploadQueue((prev) =>
              prev.map((item) =>
                item.id === qItem.id
                  ? {
                      ...item,
                      status: 'done',
                      progress: 100,
                      isInstant: true,
                      resultItem: checkRes.image,
                    }
                  : item
              )
            );
            continue;
          }

          // Step 3: Real multipart upload with progress tracking
          const uploadRes = await uploadApi.uploadFile(qItem.file, uploadTargetAlbumId, (percent) => {
            setUploadQueue((prev) =>
              prev.map((item) =>
                item.id === qItem.id ? { ...item, progress: Math.max(10, percent) } : item
              )
            );
          });

          if (uploadRes.success && uploadRes.image) {
            await dbService.saveImage(uploadRes.image);
            processedResults.push(uploadRes.image);
            if (uploadRes.isInstant) instantCount++;

            setUploadQueue((prev) =>
              prev.map((item) =>
                item.id === qItem.id
                  ? {
                      ...item,
                      status: 'done',
                      progress: 100,
                      isInstant: !!uploadRes.isInstant,
                      resultItem: uploadRes.image,
                    }
                  : item
              )
            );
            continue;
          }

          // Step 4: Failure — every limit decision comes from the backend
          if (uploadRes.isBackendOnline) {
            setUploadQueue((prev) =>
              prev.map((item) =>
                item.id === qItem.id
                  ? { ...item, status: 'error', error: uploadRes.message }
                  : item
              )
            );
            showToast('上传受阻', uploadRes.message, 'warning');
            continue;
          }

          // Backend unreachable → offline fallback caches the asset locally
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
        } catch (err: any) {
          console.error('Failed to process image:', err);
          setUploadQueue((prev) =>
            prev.map((item) =>
              item.id === qItem.id
                ? { ...item, status: 'error', error: err.message || '上传处理异常' }
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
          t('uploadModal.titleDone'),
          instantCount > 0
            ? `成功上传 ${processedResults.length} 张图片（包含 ${instantCount} 张 ⚡ 秒传去重）`
            : t('uploadModal.progressSubtitle', { done: processedResults.length, total: processedResults.length }),
          'success'
        );
        setLinkModalImages(processedResults);
      }

      // Sync latest quota counters from backend after the batch
      refreshQuota();
    },
    [isAuthenticated, uploadTargetAlbumId, settings, showToast, t, refreshQuota]
  );

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
          if (item.type.startsWith('image/') && isAllowedImageType(item.type)) {
            const file = item.getAsFile();
            if (file) {
              const ext = extractExtension('', item.type);
              const namedFile = new File([file], `screenshot_${Date.now()}.${ext}`, {
                type: item.type,
              });
              files.push(namedFile);
            }
          }
        }

        if (files.length > 0) {
          e.preventDefault();
          showToast(t('common.info'), `Capturing ${files.length} images...`, 'info');
          handleFilesSelected(files);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [uploadTargetAlbumId, settings, t, showToast, handleFilesSelected]);

  // Handle URL Import
  const handleUrlImport = useCallback(
    async (url: string) => {
      if (!isAuthenticated) {
        showToast(t('albums.authRequiredTitle'), t('albums.authRequiredDesc'), 'warning');
        setAuthModalMode('login');
        setIsAuthModalOpen(true);
        return;
      }
      showToast(t('hero.importUrl'), url, 'info');
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
        showToast(t('common.success'), newImage.name, 'success');
      } catch (err) {
        console.error(err);
        showToast(t('common.error'), 'Failed to import remote URL', 'error');
      }
    },
    [isAuthenticated, showToast, t, uploadTargetAlbumId]
  );

  // Image CRUD actions
  const handleDeleteImage = useCallback(
    async (id: string) => {
      if (!isAuthenticated) {
        showToast(t('albums.authRequiredTitle'), t('albums.authRequiredDesc'), 'warning');
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
      setPreviewImage((prev) => (prev?.id === id ? null : prev));
      showToast(t('toast.deleteSuccess'), undefined, 'info');
    },
    [isAuthenticated, showToast, t]
  );

  const handleToggleFavorite = useCallback(
    async (id: string) => {
      if (!isAuthenticated) {
        showToast(t('albums.authRequiredTitle'), t('albums.authRequiredDesc'), 'warning');
        setAuthModalMode('login');
        setIsAuthModalOpen(true);
        return;
      }
      const target = images.find((i) => i.id === id);
      if (!target) return;
      const updated = await dbService.updateImage(id, { favorite: !target.favorite });
      setImages((prev) => prev.map((img) => (img.id === id ? updated : img)));
      setPreviewImage((prev) => (prev?.id === id ? updated : prev));
      showToast(updated.favorite ? t('card.favorite') : t('card.unfavorite'), target.name, 'info');
    },
    [isAuthenticated, images, showToast, t]
  );

  const handleUpdateImage = useCallback(
    async (id: string, updates: Partial<ImageItem>) => {
      if (!isAuthenticated) {
        showToast(t('albums.authRequiredTitle'), t('albums.authRequiredDesc'), 'warning');
        setAuthModalMode('login');
        setIsAuthModalOpen(true);
        return;
      }
      const updated = await dbService.updateImage(id, updates);
      setImages((prev) => prev.map((img) => (img.id === id ? updated : img)));
      setPreviewImage((prev) => (prev?.id === id ? updated : prev));
    },
    [isAuthenticated, showToast, t]
  );

  // Album actions
  const handleCreateAlbum = useCallback(
    async (album: Album) => {
      if (!isAuthenticated) {
        showToast(t('albums.authRequiredTitle'), t('albums.authRequiredDesc'), 'warning');
        setAuthModalMode('login');
        setIsAuthModalOpen(true);
        return;
      }
      await dbService.saveAlbum(album);
      const all = await dbService.getAllAlbums();
      setAlbums(all);
    },
    [isAuthenticated, showToast, t]
  );

  const handleUpdateAlbum = useCallback(
    async (album: Album) => {
      if (!isAuthenticated) {
        showToast(t('albums.authRequiredTitle'), t('albums.authRequiredDesc'), 'warning');
        setAuthModalMode('login');
        setIsAuthModalOpen(true);
        return;
      }
      await dbService.saveAlbum(album);
      const all = await dbService.getAllAlbums();
      setAlbums(all);
    },
    [isAuthenticated, showToast, t]
  );

  const handleDeleteAlbum = useCallback(
    async (id: string) => {
      if (!isAuthenticated) {
        showToast(t('albums.authRequiredTitle'), t('albums.authRequiredDesc'), 'warning');
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
      setFilters((prev) => (prev.albumId === id ? { ...prev, albumId: 'all' } : prev));
    },
    [isAuthenticated, showToast, t]
  );

  // Batch actions
  const handleToggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredImages.map((i) => i.id)));
  }, [filteredImages]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBatchMoveToAlbum = useCallback(
    async (targetAlbumId: string) => {
      if (!isAuthenticated) {
        showToast(t('albums.authRequiredTitle'), t('albums.authRequiredDesc'), 'warning');
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
    },
    [isAuthenticated, images, selectedIds, showToast, t]
  );

  const handleBatchDelete = useCallback(async () => {
    if (!isAuthenticated) {
      showToast(t('albums.authRequiredTitle'), t('albums.authRequiredDesc'), 'warning');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    const ids: string[] = Array.from(selectedIds);
    if (window.confirm(`Confirm batch delete ${ids.length} images?`)) {
      await dbService.deleteImages(ids);
      setImages((prev) => prev.filter((img) => !selectedIds.has(img.id)));
      setSelectedIds(new Set());
      showToast(t('toast.batchDeleteSuccess', { count: ids.length }), undefined, 'info');
    }
  }, [isAuthenticated, selectedIds, showToast, t]);

  const handleOpenBatchLinks = useCallback(() => {
    const selectedList = images.filter((i) => selectedIds.has(i.id));
    if (selectedList.length > 0) {
      setLinkModalImages(selectedList);
      setIsLinkModalOpen(true);
    }
  }, [images, selectedIds]);

  // Quick Open Modal helpers
  const handleOpenUpload = useCallback(() => {
    if (!isAuthenticated) {
      showToast(t('albums.authRequiredTitle'), t('albums.authRequiredDesc'), 'warning');
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
  }, [isAuthenticated, currentTab, showToast, t]);

  const handleOpenAlbums = useCallback(() => {
    if (!isAuthenticated) {
      showToast(t('albums.authRequiredTitle'), t('albums.authRequiredDesc'), 'warning');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    setIsAlbumModalOpen(true);
  }, [isAuthenticated, showToast, t]);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, []);

  const handleOpenAuth = useCallback((mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const handleOpenProfile = useCallback(() => {
    setIsProfileModalOpen(true);
  }, []);

  const value: UserContextType = {
    images,
    setImages,
    albums,
    setAlbums,
    settings,
    setSettings,
    isDbLoaded,
    currentTab,
    handleTabChange,
    uploadTargetAlbumId,
    setUploadTargetAlbumId,
    uploadQueue,
    setUploadQueue,
    isUploadModalOpen,
    setIsUploadModalOpen,
    quotaInfo,
    refreshQuota,
    isLinkModalOpen,
    setIsLinkModalOpen,
    linkModalImages,
    setLinkModalImages,
    isAlbumModalOpen,
    setIsAlbumModalOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    isProfileModalOpen,
    setIsProfileModalOpen,
    previewImage,
    setPreviewImage,
    selectedIds,
    setSelectedIds,
    filters,
    setFilters,
    filteredImages,
    selectedImagesList,
    totalStorageBytes,
    toasts,
    showToast,
    dismissToast,
    handleFilesSelected,
    handleUrlImport,
    handleDeleteImage,
    handleToggleFavorite,
    handleUpdateImage,
    handleCreateAlbum,
    handleUpdateAlbum,
    handleDeleteAlbum,
    handleToggleSelect,
    handleSelectAll,
    handleClearSelection,
    handleBatchMoveToAlbum,
    handleBatchDelete,
    handleOpenBatchLinks,
    handleOpenUpload,
    handleOpenAlbums,
    handleOpenSettings,
    handleOpenAuth,
    handleOpenProfile,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Image as ImageIcon,
  Search,
  Trash2,
  Edit3,
  ExternalLink,
  Copy,
  Check,
  FolderKanban,
  HardDrive,
  RefreshCw,
  LayoutGrid,
  List,
  CheckSquare,
  Square,
  Tag as TagIcon,
  X,
  Filter,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import { ImageItem, Album, TagItem, StorageDriverType } from '../../types';
import { adminApi, DEFAULT_ALBUM_ID } from '../../services/api';
import { formatFileSize, formatDate } from '../../utils/imageProcessing';
import { toAbsoluteImageUrl } from '../../utils/linkFormatter';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Paginator } from '../../components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Field,
  FieldSet,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from '../../components/ui/field';

export const AdminImagesPage: React.FC = () => {
  const { t } = useTranslation();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<number | 'all' | 'unassigned'>('all');
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals & Drawers
  const [editingImage, setEditingImage] = useState<ImageItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editAlbum, setEditAlbum] = useState<number>(DEFAULT_ALBUM_ID);
  const [editTags, setEditTags] = useState('');
  const [previewImage, setPreviewImage] = useState<ImageItem | null>(null);

  // Batch Modals
  const [isBatchMoveOpen, setIsBatchMoveOpen] = useState(false);
  const [batchTargetAlbum, setBatchTargetAlbum] = useState<number>(DEFAULT_ALBUM_ID);
  const [isBatchTagOpen, setIsBatchTagOpen] = useState(false);
  const [batchNewTag, setBatchNewTag] = useState('');

  // Toast / Feedback message
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [imgRes, albRes, tagRes] = await Promise.all([
        adminApi.getImages({
          q: searchQuery,
          albumId: selectedAlbum,
          storageDriver: selectedDriver,
          sortBy,
          page,
          pageSize,
        }),
        adminApi.getAlbums(),
        adminApi.getTags(),
      ]);
      if (imgRes.success) {
        setImages(imgRes.data.items);
        setTotal(imgRes.data.total || 0);
      }
      if (albRes.success) setAlbums(albRes.data);
      if (tagRes.success) setTags(tagRes.data);
    } catch (err: any) {
      showNotification(err.message || t('adminImages.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedAlbum, selectedDriver, sortBy, page, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  // Selection handlers
  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === images.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(images.map((i) => i.id));
    }
  };

  // Actions
  const handleCopyLink = (img: ImageItem) => {
    const url = toAbsoluteImageUrl(img.url || img.dataUrl);
    navigator.clipboard.writeText(url);
    setCopiedId(img.id);
    showNotification(t('adminImages.copySuccess', { name: img.name }));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenEdit = (img: ImageItem) => {
    setEditingImage(img);
    setEditName(img.name);
    setEditAlbum(Number(img.albumId) || DEFAULT_ALBUM_ID);
    setEditTags(img.tags ? img.tags.join(', ') : '');
  };

  const handleSaveEdit = async () => {
    if (!editingImage) return;
    try {
      const parsedTags = editTags
        .split(/[,，]/)
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean);

      const res = await adminApi.updateImage(editingImage.id, {
        name: editName.trim() || editingImage.name,
        albumId: editAlbum,
        tags: parsedTags,
      });
      if (!res.success) {
        showNotification(res.message || t('adminImages.saveFailed'), 'error');
        return;
      }

      showNotification(t('adminImages.saved'));
      setEditingImage(null);
      loadData();
    } catch (err: any) {
      showNotification(err.message || t('adminImages.saveFailed'), 'error');
    }
  };

  const handleDeleteImage = async (id: number, name: string) => {
    if (!confirm(t('adminImages.confirmDelete', { name }))) return;
    try {
      const res = await adminApi.deleteImage(id);
      if (!res.success) {
        showNotification(res.message || t('adminImages.deleteFailed'), 'error');
        return;
      }
      showNotification(t('adminImages.deleted'));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      loadData();
    } catch (err: any) {
      showNotification(err.message || t('adminImages.deleteFailed'), 'error');
    }
  };

  // Batch actions
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(t('adminImages.confirmBatchDelete', { count: selectedIds.length }))) return;
    try {
      await adminApi.batchImageAction(selectedIds, 'delete');
      showNotification(t('adminImages.batchDeleted', { count: selectedIds.length }));
      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      showNotification(err.message || t('adminImages.batchDeleteFailed'), 'error');
    }
  };

  const handleBatchMove = async () => {
    if (selectedIds.length === 0 || !batchTargetAlbum) return;
    try {
      await adminApi.batchImageAction(selectedIds, 'move', { albumId: batchTargetAlbum });
      showNotification(t('adminImages.batchMoved', { count: selectedIds.length }));
      setIsBatchMoveOpen(false);
      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      showNotification(err.message || t('adminImages.batchMoveFailed'), 'error');
    }
  };

  const handleBatchAddTag = async () => {
    if (selectedIds.length === 0 || !batchNewTag.trim()) return;
    try {
      await adminApi.batchImageAction(selectedIds, 'tag', { tagToAdd: batchNewTag.trim() });
      showNotification(t('adminImages.batchTagged', { count: selectedIds.length, tag: batchNewTag.toUpperCase() }));
      setIsBatchTagOpen(false);
      setBatchNewTag('');
      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      showNotification(err.message || t('adminImages.batchTagFailed'), 'error');
    }
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

      {/* Page Title & Stats Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {t('adminImages.title')}
            </h1>
            <Badge variant="subtle" className="text-[10px] font-mono">
              {t('adminImages.count', { count: total })}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('adminImages.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center p-1 rounded-xl border border-border/80 bg-muted/30">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-background shadow-xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={t('adminImages.viewTable')}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-background shadow-xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={t('adminImages.viewGrid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 px-3 text-xs rounded-xl gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('adminImages.refresh')}</span>
          </Button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-3 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('adminImages.searchPlaceholder')}
                className="pl-9 text-xs h-9 rounded-xl"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setPage(1);
                    loadData();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button type="submit" size="sm" className="h-9 px-3 text-xs rounded-xl cursor-pointer">
              {t('adminImages.search')}
            </Button>
          </form>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Album Filter */}
            <Select
              value={selectedAlbum === 'all' ? 'all' : String(selectedAlbum)}
              onValueChange={(val) => {
                setSelectedAlbum(val === 'all' ? 'all' : Number(val));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px] text-xs h-9 rounded-xl">
                <SelectValue placeholder={t('adminImages.albumAll')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('adminImages.albumAll')}</SelectItem>
                {albums.map((alb) => (
                  <SelectItem key={alb.id} value={String(alb.id)}>
                    {alb.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Storage Driver Filter */}
            <Select
              value={selectedDriver}
              onValueChange={(val) => {
                setSelectedDriver(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[130px] text-xs h-9 rounded-xl">
                <SelectValue placeholder={t('adminImages.enginePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('adminImages.engineAll')}</SelectItem>
                <SelectItem value="local">{t('adminImages.engineLocal')}</SelectItem>
                <SelectItem value="s3">{t('adminImages.engineS3')}</SelectItem>
                <SelectItem value="webdav">{t('adminImages.engineWebdav')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Filter */}
            <Select
              value={sortBy}
              onValueChange={(val) => {
                setSortBy(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px] text-xs h-9 rounded-xl">
                <SelectValue placeholder={t('adminImages.sortPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">{t('adminImages.sortDateDesc')}</SelectItem>
                <SelectItem value="date-asc">{t('adminImages.sortDateAsc')}</SelectItem>
                <SelectItem value="size-desc">{t('adminImages.sortSizeDesc')}</SelectItem>
                <SelectItem value="size-asc">{t('adminImages.sortSizeAsc')}</SelectItem>
                <SelectItem value="name-asc">{t('adminImages.sortNameAsc')}</SelectItem>
                <SelectItem value="views-desc">{t('adminImages.sortViewsDesc')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected Batch Action Bar */}
        {selectedIds.length > 0 && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-[11px] font-mono">
                {t('adminImages.selectedCount', { count: selectedIds.length })}
              </Badge>
              <span className="text-muted-foreground hidden sm:inline">
                {t('adminImages.batchHint')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBatchMoveOpen(true)}
                className="h-8 text-xs rounded-lg gap-1.5 cursor-pointer bg-background"
              >
                <FolderKanban className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('adminImages.batchMove')}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBatchTagOpen(true)}
                className="h-8 text-xs rounded-lg gap-1.5 cursor-pointer bg-background"
              >
                <TagIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('adminImages.batchTag')}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchDelete}
                className="h-8 text-xs rounded-lg gap-1.5 cursor-pointer text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('adminImages.batchDelete')}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                className="h-8 text-xs rounded-lg text-muted-foreground cursor-pointer"
              >
                {t('adminImages.clearSelection')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Images Content: Table or Grid */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">{t('adminImages.loading')}</p>
        </div>
      ) : images.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border/80 rounded-3xl bg-muted/10 space-y-3">
          <ImageIcon className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">{t('adminImages.emptyTitle')}</p>
            <p className="text-xs text-muted-foreground">
              {t('adminImages.emptyDesc')}
            </p>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-muted-foreground font-semibold">
                  <th className="p-3.5 w-10 text-center">
                    <button
                      onClick={handleSelectAll}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {selectedIds.length === images.length ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3.5">{t('adminImages.colThumb')}</th>
                  <th className="p-3.5 min-w-[200px]">{t('adminImages.colName')}</th>
                  <th className="p-3.5">{t('adminImages.colAlbum')}</th>
                  <th className="p-3.5">{t('adminImages.colEngine')}</th>
<th className="p-3.5">{t('adminImages.colSpec')}</th>
                 <th className="p-3.5">{t('adminImages.colViews')}</th>
                 <th className="p-3.5">{t('adminImages.colSize')}</th>
                  <th className="p-3.5">{t('adminImages.colTags')}</th>
                  <th className="p-3.5">{t('adminImages.colTime')}</th>
                  <th className="p-3.5 text-right pr-4">{t('adminImages.colAction')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {images.map((img) => {
                  const isSelected = selectedIds.includes(img.id);
                  const alb = albums.find((a) => a.id === img.albumId);

                  return (
                    <tr
                      key={img.id}
                      className={`hover:bg-muted/20 transition-colors ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleToggleSelect(img.id)}
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Thumbnail */}
                      <td className="p-3.5">
                        <div
                          onClick={() => setPreviewImage(img)}
                          className="w-12 h-12 rounded-xl overflow-hidden border border-border/80 bg-muted/40 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={img.thumbUrl || img.dataUrl || img.url}
                            alt={img.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>

                      {/* Name */}
                      <td className="p-3.5">
                        <div className="font-semibold text-foreground truncate max-w-[240px]">
                          {img.name}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground truncate max-w-[240px]">
                          {img.originalName || img.name}
                        </div>
                      </td>

                      {/* Album */}
                      <td className="p-3.5">
                        <Badge
                          variant="subtle"
                          className="text-[11px] font-medium"
                          style={{
                            borderColor: alb?.color ? `${alb.color}40` : undefined,
                            color: alb?.color,
                          }}
                        >
                          {alb?.name || t('adminImages.defaultAlbum')}
                        </Badge>
                      </td>

                      {/* Storage Driver */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                            img.storageDriver === 's3'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : img.storageDriver === 'webdav'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          <HardDrive className="w-2.5 h-2.5" />
                          <span>{img.storageDriver || 'local'}</span>
                        </span>
                      </td>

                      {/* Dimension */}
                      <td className="p-3.5 font-mono text-muted-foreground text-[11px]">
                        {img.width && img.height ? `${img.width} × ${img.height}` : '—'}
                      </td>

                      {/* Views */}
                      <td className="p-3.5 font-mono text-muted-foreground text-[11px]">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {img.viewCount ?? 0}
                        </span>
                      </td>

                      {/* Size */}
                      <td className="p-3.5 font-mono text-foreground font-semibold text-[11px]">
                        {formatFileSize(img.size)}
                      </td>

                      {/* Tags */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 flex-wrap max-w-[180px]">
                          {img.tags && img.tags.length > 0 ? (
                            img.tags.slice(0, 2).map((t, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60 font-mono"
                              >
                                #{t}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60">—</span>
                          )}
                          {img.tags && img.tags.length > 2 && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              +{img.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="p-3.5 text-muted-foreground text-[11px] font-mono">
                        {formatDate(img.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyLink(img)}
                            className="h-8 w-8 rounded-lg cursor-pointer text-muted-foreground hover:text-foreground"
                            title={t('adminImages.copyLink')}
                          >
                            {copiedId === img.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(img)}
                            className="h-8 w-8 rounded-lg cursor-pointer text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                            title={t('adminImages.editMeta')}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteImage(img.id, img.name)}
                            className="h-8 w-8 rounded-lg cursor-pointer text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                            title={t('adminImages.deleteAsset')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARD VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((img) => {
            const isSelected = selectedIds.includes(img.id);
            const alb = albums.find((a) => a.id === img.albumId);

            return (
              <div
                key={img.id}
                className={`group relative rounded-2xl border bg-card overflow-hidden transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border/80 hover:border-border hover:shadow-md'
                }`}
              >
                {/* Image Preview Container */}
                <div className="relative aspect-4/3 bg-muted/40 overflow-hidden cursor-pointer">
                  <img
                    src={img.thumbUrl || img.dataUrl || img.url}
                    alt={img.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onClick={() => setPreviewImage(img)}
                  />

                  {/* Top Overlay Badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(img.id);
                      }}
                      className="pointer-events-auto p-1 rounded-lg bg-black/60 text-white backdrop-blur-xs hover:scale-110 transition-transform cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs">
                      {img.extension || img.type.split('/')[1] || 'IMG'}
                    </span>
                  </div>
                </div>

                {/* Card Info Body */}
                <div className="p-3 space-y-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-foreground truncate" title={img.name}>
                      {img.name}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono mt-0.5">
                      <span>{formatFileSize(img.size)}</span>
                      <span>{img.width && img.height ? `${img.width}x${img.height}` : ''}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                    <span className="text-[11px] text-muted-foreground truncate max-w-[90px]">
                      {alb?.name || t('adminImages.defaultAlbum')}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono shrink-0">
                      <Eye className="w-3 h-3" />
                      {img.viewCount ?? 0}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyLink(img)}
                        className="h-7 w-7 rounded-lg cursor-pointer"
                      >
                        {copiedId === img.id ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(img)}
                        className="h-7 w-7 rounded-lg cursor-pointer text-blue-500"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteImage(img.id, img.name)}
                        className="h-7 w-7 rounded-lg cursor-pointer text-rose-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > 0 && (
        <Paginator
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      {/* ========================================================= */}
      {/* 1. EDIT IMAGE METADATA MODAL */}
      {/* ========================================================= */}
      <Dialog open={!!editingImage} onOpenChange={(open) => !open && setEditingImage(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Edit3 className="w-4 h-4 text-primary" />
              <span>{t('adminImages.editTitle')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t('adminImages.editDesc')}
            </DialogDescription>
          </DialogHeader>

          {editingImage && (
            <div className="py-2 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60">
                <img
                  src={editingImage.dataUrl || editingImage.url}
                  alt={editingImage.name}
                  className="w-14 h-14 rounded-xl object-cover border border-border shrink-0"
                />
                <div className="min-w-0 text-xs space-y-0.5 font-mono">
                  <p className="font-bold text-foreground truncate">{editingImage.name}</p>
                  <p className="text-muted-foreground">{formatFileSize(editingImage.size)}</p>
                  <p className="text-primary">{editingImage.width} × {editingImage.height} PX</p>
                </div>
              </div>

              <FieldSet className="gap-4">
                <FieldGroup className="gap-3.5">
                  <Field>
                    <FieldLabel htmlFor="edit-img-name" required>{t('adminImages.nameLabel')}</FieldLabel>
                    <Input
                      id="edit-img-name"
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-xs h-9 rounded-xl font-mono"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="edit-img-album">{t('adminImages.albumLabel')}</FieldLabel>
                    <Select value={String(editAlbum)} onValueChange={(val) => setEditAlbum(Number(val))}>
                      <SelectTrigger id="edit-img-album" className="w-full text-xs h-9 rounded-xl">
                        <SelectValue placeholder={t('adminImages.albumPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {albums.map((alb) => (
                          <SelectItem key={alb.id} value={String(alb.id)}>
                            {alb.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="edit-img-tags">
                      {t('adminImages.tagsLabel')}
                    </FieldLabel>
                    <Input
                      id="edit-img-tags"
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder={t('adminImages.tagsPlaceholder')}
                      className="text-xs h-9 rounded-xl font-mono uppercase"
                    />
                    <FieldDescription>
                      {t('adminImages.tagsHint')}
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingImage(null)}
              className="text-xs rounded-xl cursor-pointer"
            >
              {t('adminImages.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              className="text-xs rounded-xl cursor-pointer bg-primary text-primary-foreground font-semibold"
            >
              {t('adminImages.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* 2. BATCH MOVE TO ALBUM MODAL */}
      {/* ========================================================= */}
      <Dialog open={isBatchMoveOpen} onOpenChange={setIsBatchMoveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{t('adminImages.batchMoveTitle')}</DialogTitle>
            <DialogDescription className="text-xs">
              {t('adminImages.batchMoveDesc', { count: selectedIds.length })}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="batch-move-album">{t('adminImages.batchMoveAlbumLabel')}</FieldLabel>
                  <Select value={String(batchTargetAlbum)} onValueChange={(val) => setBatchTargetAlbum(Number(val))}>
                    <SelectTrigger id="batch-move-album" className="w-full text-xs h-9 rounded-xl">
                      <SelectValue placeholder={t('adminImages.batchMoveAlbumPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {albums.map((alb) => (
                        <SelectItem key={alb.id} value={String(alb.id)}>
                          {alb.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBatchMoveOpen(false)}
              className="text-xs rounded-xl"
            >
              {t('adminImages.batchMoveCancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleBatchMove}
              className="text-xs rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              {t('adminImages.batchMoveConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* 3. BATCH ADD TAG MODAL */}
      {/* ========================================================= */}
      <Dialog open={isBatchTagOpen} onOpenChange={setIsBatchTagOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{t('adminImages.batchTagTitle')}</DialogTitle>
            <DialogDescription className="text-xs">
              {t('adminImages.batchTagDesc', { count: selectedIds.length })}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="batch-new-tag" required>{t('adminImages.batchTagLabel')}</FieldLabel>
                  <Input
                    id="batch-new-tag"
                    type="text"
                    placeholder={t('adminImages.batchTagPlaceholder')}
                    value={batchNewTag}
                    onChange={(e) => setBatchNewTag(e.target.value)}
                    className="text-xs h-9 rounded-xl font-mono uppercase"
                  />
                  <FieldDescription>
                    {t('adminImages.batchTagHint')}
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBatchTagOpen(false)}
              className="text-xs rounded-xl"
            >
              {t('adminImages.batchTagCancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleBatchAddTag}
              className="text-xs rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              {t('adminImages.batchTagConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* 4. IMAGE LIGHTBOX / INSPECTOR MODAL */}
      {/* ========================================================= */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-6">
          {previewImage && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black/90 flex items-center justify-center min-h-[300px] max-h-[500px]">
                <img
                  src={previewImage.dataUrl || previewImage.url}
                  alt={previewImage.name}
                  className="max-h-[500px] w-auto object-contain"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">{previewImage.name}</h3>
                  <p className="text-xs font-mono text-muted-foreground">
                    {previewImage.originalName} · {formatFileSize(previewImage.size)} · {previewImage.width}×{previewImage.height}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyLink(previewImage)}
                    className="text-xs rounded-xl gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('adminImages.copyDirectLink')}</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = previewImage.dataUrl || previewImage.url || '';
                      a.download = previewImage.name;
                      a.click();
                    }}
                    className="text-xs rounded-xl gap-1.5 cursor-pointer bg-primary text-primary-foreground font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t('adminImages.downloadOriginal')}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

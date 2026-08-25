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
import { adminApi } from '../../services/api';
import { formatFileSize, formatDate } from '../../utils/imageProcessing';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
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

export const AdminImagesPage: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals & Drawers
  const [editingImage, setEditingImage] = useState<ImageItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editAlbum, setEditAlbum] = useState('');
  const [editTags, setEditTags] = useState('');
  const [previewImage, setPreviewImage] = useState<ImageItem | null>(null);

  // Batch Modals
  const [isBatchMoveOpen, setIsBatchMoveOpen] = useState(false);
  const [batchTargetAlbum, setBatchTargetAlbum] = useState('default');
  const [isBatchTagOpen, setIsBatchTagOpen] = useState(false);
  const [batchNewTag, setBatchNewTag] = useState('');

  // Toast / Feedback message
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
        }),
        adminApi.getAlbums(),
        adminApi.getTags(),
      ]);
      if (imgRes.success) setImages(imgRes.data.items);
      if (albRes.success) setAlbums(albRes.data);
      if (tagRes.success) setTags(tagRes.data);
    } catch (err: any) {
      showNotification(err.message || '加载图片失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedAlbum, selectedDriver, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
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
    const url = img.url || img.dataUrl;
    navigator.clipboard.writeText(url);
    setCopiedId(img.id);
    showNotification(`已复制 "${img.name}" 直链`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenEdit = (img: ImageItem) => {
    setEditingImage(img);
    setEditName(img.name);
    setEditAlbum(img.albumId || 'default');
    setEditTags(img.tags ? img.tags.join(', ') : '');
  };

  const handleSaveEdit = async () => {
    if (!editingImage) return;
    try {
      const parsedTags = editTags
        .split(/[,，]/)
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean);

      await adminApi.updateImage(editingImage.id, {
        name: editName.trim() || editingImage.name,
        albumId: editAlbum,
        tags: parsedTags,
      });

      showNotification('图片属性已保存');
      setEditingImage(null);
      loadData();
    } catch (err: any) {
      showNotification(err.message || '保存失败', 'error');
    }
  };

  const handleDeleteImage = async (id: string, name: string) => {
    if (!confirm(`确定要彻底删除图片 "${name}" 吗？此操作无法撤销。`)) return;
    try {
      await adminApi.deleteImage(id);
      showNotification('图片已删除');
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      loadData();
    } catch (err: any) {
      showNotification(err.message || '删除失败', 'error');
    }
  };

  // Batch actions
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`确定要批量删除选中的 ${selectedIds.length} 个图片资产吗？`)) return;
    try {
      await adminApi.batchImageAction(selectedIds, 'delete');
      showNotification(`已批量删除 ${selectedIds.length} 个资产`);
      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      showNotification(err.message || '批量删除失败', 'error');
    }
  };

  const handleBatchMove = async () => {
    if (selectedIds.length === 0 || !batchTargetAlbum) return;
    try {
      await adminApi.batchImageAction(selectedIds, 'move', { albumId: batchTargetAlbum });
      showNotification(`已将 ${selectedIds.length} 个图片移入新相册`);
      setIsBatchMoveOpen(false);
      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      showNotification(err.message || '移动相册失败', 'error');
    }
  };

  const handleBatchAddTag = async () => {
    if (selectedIds.length === 0 || !batchNewTag.trim()) return;
    try {
      await adminApi.batchImageAction(selectedIds, 'tag', { tagToAdd: batchNewTag.trim() });
      showNotification(`已为 ${selectedIds.length} 个图片添加标签 #${batchNewTag.toUpperCase()}`);
      setIsBatchTagOpen(false);
      setBatchNewTag('');
      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      showNotification(err.message || '添加标签失败', 'error');
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
              图片资产全量管理
            </h1>
            <Badge variant="subtle" className="text-[10px] font-mono">
              {images.length} 项资产
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            全生命周期管理、多维度检索、元数据批量编辑与存储驱动归档
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
              title="表格视图"
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
              title="卡片网格视图"
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
            <span>刷新</span>
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
                placeholder="搜索资产文件名、原始名称、标签、格式..."
                className="pl-9 text-xs h-9 rounded-xl"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    loadData();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button type="submit" size="sm" className="h-9 px-3 text-xs rounded-xl cursor-pointer">
              搜索
            </Button>
          </form>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Album Filter */}
            <Select value={selectedAlbum} onValueChange={setSelectedAlbum}>
              <SelectTrigger className="w-[140px] text-xs h-9 rounded-xl">
                <SelectValue placeholder="全部相册" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部相册</SelectItem>
                {albums.map((alb) => (
                  <SelectItem key={alb.id} value={alb.id}>
                    {alb.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Storage Driver Filter */}
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger className="w-[130px] text-xs h-9 rounded-xl">
                <SelectValue placeholder="存储引擎" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部引擎</SelectItem>
                <SelectItem value="local">本地 Local</SelectItem>
                <SelectItem value="s3">Amazon S3 / OSS</SelectItem>
                <SelectItem value="webdav">WebDAV 网盘</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Filter */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] text-xs h-9 rounded-xl">
                <SelectValue placeholder="排序规则" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">最新上传优先</SelectItem>
                <SelectItem value="date-asc">最早上传优先</SelectItem>
                <SelectItem value="size-desc">文件体积从大到小</SelectItem>
                <SelectItem value="size-asc">文件体积从小到大</SelectItem>
                <SelectItem value="name-asc">文件名 (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected Batch Action Bar */}
        {selectedIds.length > 0 && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-[11px] font-mono">
                已选中 {selectedIds.length} 项
              </Badge>
              <span className="text-muted-foreground hidden sm:inline">
                可执行批量移动相册、批量打标或批量删除
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
                <span>移动至相册</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBatchTagOpen(true)}
                className="h-8 text-xs rounded-lg gap-1.5 cursor-pointer bg-background"
              >
                <TagIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>批量添加标签</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchDelete}
                className="h-8 text-xs rounded-lg gap-1.5 cursor-pointer text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>批量删除</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                className="h-8 text-xs rounded-lg text-muted-foreground cursor-pointer"
              >
                取消选中
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Images Content: Table or Grid */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">正在加载图片资产数据...</p>
        </div>
      ) : images.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border/80 rounded-3xl bg-muted/10 space-y-3">
          <ImageIcon className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">没有找到匹配的图片资产</p>
            <p className="text-xs text-muted-foreground">
              请调整筛选相册、存储引擎或关键词重新检索
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
                  <th className="p-3.5">缩略图</th>
                  <th className="p-3.5 min-w-[200px]">文件名与扩展</th>
                  <th className="p-3.5">归属相册</th>
                  <th className="p-3.5">存储引擎</th>
                  <th className="p-3.5">规格尺寸</th>
                  <th className="p-3.5">文件大小</th>
                  <th className="p-3.5">标签属性</th>
                  <th className="p-3.5">上传时间</th>
                  <th className="p-3.5 text-right pr-4">操作</th>
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
                            src={img.dataUrl || img.url}
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
                          {alb?.name || '默认相册'}
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
                            title="复制链接"
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
                            title="编辑元数据"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteImage(img.id, img.name)}
                            className="h-8 w-8 rounded-lg cursor-pointer text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                            title="删除资产"
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
                    src={img.dataUrl || img.url}
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
                      {alb?.name || '默认相册'}
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

      {/* ========================================================= */}
      {/* 1. EDIT IMAGE METADATA MODAL */}
      {/* ========================================================= */}
      <Dialog open={!!editingImage} onOpenChange={(open) => !open && setEditingImage(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Edit3 className="w-4 h-4 text-primary" />
              <span>编辑图片资产属性</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              修改资产展示名称、所属相册空间及分类标签
            </DialogDescription>
          </DialogHeader>

          {editingImage && (
            <div className="space-y-4 py-2">
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

              <div>
                <label className="text-xs font-semibold text-muted-foreground">图片文件名</label>
                <Input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-xs h-9 rounded-xl mt-1 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">归属相册空间</label>
                <div className="mt-1">
                  <Select value={editAlbum} onValueChange={setEditAlbum}>
                    <SelectTrigger className="w-full text-xs h-9 rounded-xl">
                      <SelectValue placeholder="选择相册" />
                    </SelectTrigger>
                    <SelectContent>
                      {albums.map((alb) => (
                        <SelectItem key={alb.id} value={alb.id}>
                          {alb.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  分类标签 (以逗号分隔)
                </label>
                <Input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="例如: WALLPAPER, 4K, DESIGN"
                  className="text-xs h-9 rounded-xl mt-1 font-mono uppercase"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingImage(null)}
              className="text-xs rounded-xl cursor-pointer"
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              className="text-xs rounded-xl cursor-pointer bg-primary text-primary-foreground font-semibold"
            >
              保存修改
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
            <DialogTitle className="text-base font-bold">批量移动相册</DialogTitle>
            <DialogDescription className="text-xs">
              将选中的 {selectedIds.length} 个资产移入指定相册空间
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Select value={batchTargetAlbum} onValueChange={setBatchTargetAlbum}>
              <SelectTrigger className="w-full text-xs h-9 rounded-xl">
                <SelectValue placeholder="选择目标相册" />
              </SelectTrigger>
              <SelectContent>
                {albums.map((alb) => (
                  <SelectItem key={alb.id} value={alb.id}>
                    {alb.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBatchMoveOpen(false)}
              className="text-xs rounded-xl"
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleBatchMove}
              className="text-xs rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              确认移动
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
            <DialogTitle className="text-base font-bold">批量添加标签</DialogTitle>
            <DialogDescription className="text-xs">
              为选中的 {selectedIds.length} 个资产统一追加属性标签
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Input
              type="text"
              placeholder="输入标签名 (如 4K / DESIGN)"
              value={batchNewTag}
              onChange={(e) => setBatchNewTag(e.target.value)}
              className="text-xs h-9 rounded-xl font-mono uppercase"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBatchTagOpen(false)}
              className="text-xs rounded-xl"
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleBatchAddTag}
              className="text-xs rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              确认追加
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
                    <span>复制直链</span>
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
                    <span>下载原图</span>
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

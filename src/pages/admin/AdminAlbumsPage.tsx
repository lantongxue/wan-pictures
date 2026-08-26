import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderKanban,
  Plus,
  Edit3,
  Trash2,
  Image as ImageIcon,
  HardDrive,
  RefreshCw,
  Sparkles,
  Check,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Album, ImageItem } from '../../types';
import { adminApi, DEFAULT_ALBUM_ID } from '../../services/api';
import { formatFileSize, formatDate } from '../../utils/imageProcessing';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
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

const COLOR_PRESETS = [
  '#6366F1', // Indigo
  '#3B82F6', // Blue
  '#0EA5E9', // Sky
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#64748B', // Slate
];

export const AdminAlbumsPage: React.FC = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);

  // Form states - Create
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createColor, setCreateColor] = useState('#6366F1');

  // Form states - Edit
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editColor, setEditColor] = useState('#6366F1');
  const [editCoverUrl, setEditCoverUrl] = useState('');

  // Notification feedback
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [albRes, imgRes] = await Promise.all([
        adminApi.getAlbums(),
        adminApi.getImages({ pageSize: 1000 }),
      ]);
      if (albRes.success) setAlbums(albRes.data);
      if (imgRes.success) setImages(imgRes.data.items);
    } catch (err: any) {
      showNotification(err.message || '加载相册失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;

    try {
      const newAlbum: Omit<Album, 'id'> = {
        name: createName.trim(),
        description: createDesc.trim(),
        color: createColor,
        createdAt: Date.now(),
      };
      const res = await adminApi.saveAlbum(newAlbum);
      if (!res.success) {
        showNotification(res.message || '创建失败', 'error');
        return;
      }
      showNotification(`相册 "${newAlbum.name}" 创建成功`);
      setCreateName('');
      setCreateDesc('');
      setIsCreateOpen(false);
      loadData();
    } catch (err: any) {
      showNotification(err.message || '创建失败', 'error');
    }
  };

  const handleOpenEdit = (alb: Album) => {
    setEditingAlbum(alb);
    setEditName(alb.name);
    setEditDesc(alb.description || '');
    setEditColor(alb.color || '#6366F1');
    setEditCoverUrl(alb.coverImageUrl || '');
  };

  const handleSaveEdit = async () => {
    if (!editingAlbum) return;

    try {
      const updated: Album = {
        ...editingAlbum,
        name: editName.trim() || editingAlbum.name,
        description: editDesc.trim(),
        color: editColor,
        coverImageUrl: editCoverUrl.trim(),
      };
      const res = await adminApi.updateAlbum(updated);
      if (!res.success) {
        showNotification(res.message || '保存失败', 'error');
        return;
      }
      showNotification(`相册 "${updated.name}" 已更新`);
      setEditingAlbum(null);
      loadData();
    } catch (err: any) {
      showNotification(err.message || '保存失败', 'error');
    }
  };

  const handleDeleteAlbum = async (alb: Album) => {
    if (alb.isDefault || alb.id === DEFAULT_ALBUM_ID) {
      showNotification('系统默认相册不可删除', 'error');
      return;
    }
    if (
      !confirm(
        `确定要删除相册 "${alb.name}" 吗？相册内的图片将被安全移动至系统默认相册。`
      )
    )
      return;

    try {
      const res = await adminApi.deleteAlbum(alb.id);
      if (!res.success) {
        showNotification(res.message || '删除相册失败', 'error');
        return;
      }
      showNotification(`相册 "${alb.name}" 已删除，图片已转入默认相册`);
      loadData();
    } catch (err: any) {
      showNotification(err.message || '删除相册失败', 'error');
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              相册空间与归档管理
            </h1>
            <Badge variant="subtle" className="text-[10px] font-mono">
              {albums.length} 个空间
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            分类管理视觉资产相册空间、自定义封面色彩与容量统计
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-9 px-3.5 text-xs rounded-xl gap-1.5 cursor-pointer bg-primary text-primary-foreground font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建相册空间</span>
          </Button>
        </div>
      </div>

      {/* Album Cards Grid */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">正在加载相册空间数据...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {albums.map((alb) => {
            const albumImages = images.filter((img) => img.albumId === alb.id);
            const count = alb.imageCount !== undefined ? alb.imageCount : albumImages.length;
            const totalBytes =
              alb.totalSize !== undefined
                ? alb.totalSize
                : albumImages.reduce((sum, img) => sum + (img.size || 0), 0);
            const coverImage = alb.coverImageUrl || albumImages[0]?.dataUrl || albumImages[0]?.url;

            return (
              <motion.div
                key={alb.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative rounded-3xl border border-border/80 bg-card overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between"
              >
                {/* Top Colored Header / Banner */}
                <div
                  className="h-28 relative overflow-hidden flex items-end p-4"
                  style={{
                    backgroundColor: alb.color ? `${alb.color}20` : '#6366F120',
                  }}
                >
                  {/* Decorative Background Glow */}
                  <div
                    className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl opacity-40"
                    style={{ backgroundColor: alb.color || '#6366F1' }}
                  />

                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={alb.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <FolderKanban
                      className="w-16 h-16 absolute -right-2 -bottom-2 opacity-15"
                      style={{ color: alb.color || '#6366F1' }}
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />

                  {/* Album Color Pill & Default Badge */}
                  <div className="relative z-10 flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full border-2 border-card shadow-xs"
                        style={{ backgroundColor: alb.color || '#6366F1' }}
                      />
                      <span
                        className="text-xs font-black tracking-wider uppercase drop-shadow-xs"
                        style={{ color: alb.color || '#6366F1' }}
                      >
                        {alb.id}
                      </span>
                    </div>

                    {alb.isDefault && (
                      <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4">
                        DEFAULT
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Album Details Body */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground truncate" title={alb.name}>
                      {alb.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                      {alb.description || '暂无详细描述，属于自定义主题归档空间。'}
                    </p>
                  </div>

                  {/* Metrics Footer */}
                  <div className="space-y-3 pt-3 border-t border-border/60">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-primary" />
                        <span className="font-mono font-bold text-foreground">{count}</span>
                        <span>张图片</span>
                      </span>

                      <span className="flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="font-mono font-semibold text-foreground">
                          {formatFileSize(totalBytes)}
                        </span>
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(alb)}
                        className="h-8 px-2.5 text-xs rounded-xl gap-1 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>编辑</span>
                      </Button>

                      {!alb.isDefault && alb.id !== DEFAULT_ALBUM_ID && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAlbum(alb)}
                          className="h-8 px-2.5 text-xs rounded-xl gap-1 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>删除</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. CREATE ALBUM MODAL */}
      {/* ========================================================= */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <FolderKanban className="w-4 h-4 text-primary" />
              <span>创建相册空间</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              新建专属主题图片空间，支持自定义主题色与归档分类
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAlbum} className="py-2">
            <FieldSet className="gap-4">
              <FieldGroup className="gap-3.5">
                <Field>
                  <FieldLabel htmlFor="create-album-name" required>相册名称</FieldLabel>
                  <Input
                    id="create-album-name"
                    type="text"
                    required
                    placeholder="例如: 手机与桌面高清壁纸"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="text-xs h-9 rounded-xl font-medium"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="create-album-desc">描述说明 (选填)</FieldLabel>
                  <Input
                    id="create-album-desc"
                    type="text"
                    placeholder="简要说明此相册空间归纳的图片类型"
                    value={createDesc}
                    onChange={(e) => setCreateDesc(e.target.value)}
                    className="text-xs h-9 rounded-xl"
                  />
                </Field>

                {/* Color preset picker */}
                <Field>
                  <FieldLabel>相册主题色</FieldLabel>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCreateColor(color)}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          createColor === color ? 'ring-2 ring-foreground scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {createColor === color && <Check className="w-4 h-4 text-white drop-shadow-xs" />}
                      </button>
                    ))}
                  </div>
                </Field>
              </FieldGroup>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-xs rounded-xl"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs rounded-xl bg-primary text-primary-foreground font-semibold"
                >
                  立即创建
                </Button>
              </DialogFooter>
            </FieldSet>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* 2. EDIT ALBUM MODAL */}
      {/* ========================================================= */}
      <Dialog open={!!editingAlbum} onOpenChange={(open) => !open && setEditingAlbum(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Edit3 className="w-4 h-4 text-primary" />
              <span>编辑相册空间</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              修改相册名称、描述、封面链接及主题色标
            </DialogDescription>
          </DialogHeader>

          {editingAlbum && (
            <div className="py-2">
              <FieldSet className="gap-4">
                <FieldGroup className="gap-3.5">
                  <Field>
                    <FieldLabel htmlFor="edit-album-name" required>相册名称</FieldLabel>
                    <Input
                      id="edit-album-name"
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-xs h-9 rounded-xl font-medium"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="edit-album-desc">相册描述</FieldLabel>
                    <Input
                      id="edit-album-desc"
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="text-xs h-9 rounded-xl"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="edit-album-cover">
                      封面图片地址 (URL / DataURI)
                    </FieldLabel>
                    <Input
                      id="edit-album-cover"
                      type="text"
                      placeholder="https://... 或留空自动采用第一张图片"
                      value={editCoverUrl}
                      onChange={(e) => setEditCoverUrl(e.target.value)}
                      className="text-xs h-9 rounded-xl font-mono"
                    />
                    <FieldDescription>
                      留空将自动采用该空间内第一张图片作为封面
                    </FieldDescription>
                  </Field>

                  {/* Color picker */}
                  <Field>
                    <FieldLabel>主题色标</FieldLabel>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditColor(color)}
                          className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            editColor === color ? 'ring-2 ring-foreground scale-110' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                        >
                          {editColor === color && <Check className="w-4 h-4 text-white drop-shadow-xs" />}
                        </button>
                      ))}
                    </div>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingAlbum(null)}
              className="text-xs rounded-xl"
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              className="text-xs rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              保存相册
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

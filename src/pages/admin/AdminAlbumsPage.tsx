import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
import { useTranslation } from 'react-i18next';
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
import { toast } from '../../components/ui/use-toast';

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
  const { t } = useTranslation();
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
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    toast({
      title: message,
      variant: type === 'error' ? 'destructive' : 'success',
      duration: 3000,
    });
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
      showNotification(err.message || t('adminAlbums.loadFailed'), 'error');
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
        showNotification(res.message || t('adminAlbums.createFailed'), 'error');
        return;
      }
      showNotification(t('adminAlbums.createSuccess', { name: newAlbum.name }));
      setCreateName('');
      setCreateDesc('');
      setIsCreateOpen(false);
      loadData();
    } catch (err: any) {
      showNotification(err.message || t('adminAlbums.createFailed'), 'error');
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
        showNotification(res.message || t('adminAlbums.saveFailed'), 'error');
        return;
      }
      showNotification(t('adminAlbums.updateSuccess', { name: updated.name }));
      setEditingAlbum(null);
      loadData();
    } catch (err: any) {
      showNotification(err.message || t('adminAlbums.saveFailed'), 'error');
    }
  };

  const handleDeleteAlbum = async (alb: Album) => {
    if (alb.isDefault || alb.id === DEFAULT_ALBUM_ID) {
      showNotification(t('adminAlbums.defaultAlbumNotDeletable'), 'error');
      return;
    }
    if (
      !confirm(
        t('adminAlbums.confirmDelete', { name: alb.name })
      )
    )
      return;

    try {
      const res = await adminApi.deleteAlbum(alb.id);
      if (!res.success) {
        showNotification(res.message || t('adminAlbums.deleteFailed'), 'error');
        return;
      }
      showNotification(t('adminAlbums.deletedSuccess', { name: alb.name }));
      loadData();
    } catch (err: any) {
      showNotification(err.message || t('adminAlbums.deleteFailed'), 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {t('adminAlbums.title')}
            </h1>
            <Badge variant="subtle" className="text-[10px] font-mono">
              {t('adminAlbums.count', { count: albums.length })}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('adminAlbums.subtitle')}
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
            <span>{t('adminAlbums.refresh')}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-9 px-3.5 text-xs rounded-xl gap-1.5 cursor-pointer bg-primary text-primary-foreground font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('adminAlbums.create')}</span>
          </Button>
        </div>
      </div>

      {/* Album Cards Grid */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">{t('adminAlbums.loading')}</p>
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
            const coverImage = alb.coverImageUrl || albumImages[0]?.thumbUrl || albumImages[0]?.dataUrl || albumImages[0]?.url;

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
                      {alb.description || t('adminAlbums.noDesc')}
                    </p>
                  </div>

                  {/* Metrics Footer */}
                  <div className="space-y-3 pt-3 border-t border-border/60">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-primary" />
                        <span className="font-mono font-bold text-foreground">{count}</span>
                        <span>{t('adminAlbums.imageUnit')}</span>
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
                        <span>{t('adminAlbums.edit')}</span>
                      </Button>

                      {!alb.isDefault && alb.id !== DEFAULT_ALBUM_ID && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAlbum(alb)}
                          className="h-8 px-2.5 text-xs rounded-xl gap-1 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t('adminAlbums.delete')}</span>
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
              <span>{t('adminAlbums.createDialogTitle')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t('adminAlbums.createDialogDesc')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAlbum} className="py-2">
            <FieldSet className="gap-4">
              <FieldGroup className="gap-3.5">
                <Field>
                  <FieldLabel htmlFor="create-album-name" required>{t('adminAlbums.nameLabel')}</FieldLabel>
                  <Input
                    id="create-album-name"
                    type="text"
                    required
                    placeholder={t('adminAlbums.namePlaceholder')}
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="text-xs h-9 rounded-xl font-medium"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="create-album-desc">{t('adminAlbums.descLabel')}</FieldLabel>
                  <Input
                    id="create-album-desc"
                    type="text"
                    placeholder={t('adminAlbums.descPlaceholder')}
                    value={createDesc}
                    onChange={(e) => setCreateDesc(e.target.value)}
                    className="text-xs h-9 rounded-xl"
                  />
                </Field>

                {/* Color preset picker */}
                <Field>
                  <FieldLabel>{t('adminAlbums.colorLabel')}</FieldLabel>
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
                  {t('adminAlbums.cancel')}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs rounded-xl bg-primary text-primary-foreground font-semibold"
                >
                  {t('adminAlbums.createSubmit')}
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
              <span>{t('adminAlbums.editDialogTitle')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t('adminAlbums.editDialogDesc')}
            </DialogDescription>
          </DialogHeader>

          {editingAlbum && (
            <div className="py-2">
              <FieldSet className="gap-4">
                <FieldGroup className="gap-3.5">
                  <Field>
                    <FieldLabel htmlFor="edit-album-name" required>{t('adminAlbums.editNameLabel')}</FieldLabel>
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
                    <FieldLabel htmlFor="edit-album-desc">{t('adminAlbums.editDescLabel')}</FieldLabel>
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
                      {t('adminAlbums.coverUrlLabel')}
                    </FieldLabel>
                    <Input
                      id="edit-album-cover"
                      type="text"
                      placeholder={t('adminAlbums.coverUrlPlaceholder')}
                      value={editCoverUrl}
                      onChange={(e) => setEditCoverUrl(e.target.value)}
                      className="text-xs h-9 rounded-xl font-mono"
                    />
                    <FieldDescription>
                      {t('adminAlbums.coverUrlHint')}
                    </FieldDescription>
                  </Field>

                  {/* Color picker */}
                  <Field>
                    <FieldLabel>{t('adminAlbums.editColorLabel')}</FieldLabel>
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
              {t('adminAlbums.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              className="text-xs rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              {t('adminAlbums.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FolderPlus,
  Folder,
  Trash2,
  Edit2,
  Check,
  X,
  Layers,
  Lock,
  LogIn,
  AlertTriangle,
} from 'lucide-react';
import { Album, ImageItem } from '../types';
import { formatFileSize } from '../utils/imageProcessing';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { ScrollArea } from './ui/scroll-area';

interface AlbumManagerModalProps {
  isOpen: boolean;
  albums: Album[];
  images: ImageItem[];
  onClose: () => void;
  onCreateAlbum: (album: Omit<Album, 'id'>) => void;
  onUpdateAlbum: (album: Album) => void;
  onDeleteAlbum: (id: number) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onOpenAuth?: (mode?: 'login' | 'register') => void;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#14B8A6', // Teal
];

export const AlbumManagerModal: React.FC<AlbumManagerModalProps> = ({
  isOpen,
  albums,
  images,
  onClose,
  onCreateAlbum,
  onUpdateAlbum,
  onDeleteAlbum,
  onShowToast,
  onOpenAuth,
}) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');
  const [newAlbumColor, setNewAlbumColor] = useState(PRESET_COLORS[0]);

  const [editingAlbumId, setEditingAlbumId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Album | null>(null);

  if (!isOpen) return null;

  if (!isAuthenticated) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[94vw] max-w-md p-6 overflow-hidden sm:rounded-3xl border border-border/80 bg-card text-center">
          <div className="flex flex-col items-center justify-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <DialogTitle className="text-lg font-bold">{t('albumModal.loginRequiredTitle')}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground max-w-xs mx-auto">
                {t('albumModal.loginRequiredDesc')}
              </DialogDescription>
            </div>
            <div className="flex gap-2.5 w-full pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="flex-1 text-xs h-9 rounded-full cursor-pointer"
              >
                {t('common.close')}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenAuth?.('login');
                }}
                className="flex-1 text-xs h-9 rounded-full gap-1.5 cursor-pointer shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('auth.login')}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewAlbumName('');
    setNewAlbumDesc('');
    setNewAlbumColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
  };

  const handleConfirmCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;

    const newAlbum: Omit<Album, 'id'> = {
      name: newAlbumName.trim(),
      description: newAlbumDesc.trim() || undefined,
      color: newAlbumColor,
      createdAt: Date.now(),
    };

    onCreateAlbum(newAlbum);
    onShowToast(t('albumModal.createSuccess'), newAlbum.name, 'success');
    setIsCreating(false);
  };

  const handleStartEdit = (album: Album) => {
    setEditingAlbumId(album.id);
    setEditName(album.name);
    setEditColor(album.color);
  };

  const handleSaveEdit = (album: Album) => {
    if (!editName.trim()) return;
    onUpdateAlbum({
      ...album,
      name: editName.trim(),
      color: editColor || album.color,
    });
    onShowToast(t('albumModal.updateSuccess'), editName.trim(), 'success');
    setEditingAlbumId(null);
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    onDeleteAlbum(pendingDelete.id);
    onShowToast(t('albumModal.deletedSuccess'), pendingDelete.name, 'info');
    setPendingDelete(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[94vw] max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-3xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/80 text-left shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-border bg-muted/40 flex items-center justify-center text-primary shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>{t('albumModal.title')}</DialogTitle>
              <DialogDescription className="mt-0.5 uppercase tracking-wide text-[11px]">
                {t('albumModal.subtitle')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-4">
            {/* Create button / form */}
            {!isCreating ? (
              <Button
                id="create-album-trigger-btn"
                variant="outline"
                onClick={handleStartCreate}
                className="w-full py-5 border-dashed rounded-2xl gap-2 font-medium uppercase tracking-wider text-xs cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 text-primary" />
                <span>{t('albumModal.createBtn')}</span>
              </Button>
            ) : (
              <form
                onSubmit={handleConfirmCreate}
                className="p-5 rounded-2xl border border-border bg-muted/30 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    {t('albumModal.createTitle')}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCreating(false)}
                    className="h-6 w-6 rounded-full text-muted-foreground cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-album-name-input" className="text-[10px] font-medium uppercase">
                      {t('albumModal.nameLabel')}
                    </Label>
                    <Input
                      id="new-album-name-input"
                      type="text"
                      required
                      placeholder={t('albumModal.namePlaceholder')}
                      value={newAlbumName}
                      onChange={(e) => setNewAlbumName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-album-desc-input" className="text-[10px] font-medium uppercase">
                      {t('albumModal.descLabel')}
                    </Label>
                    <Input
                      id="new-album-desc-input"
                      type="text"
                      placeholder={t('albumModal.descPlaceholder')}
                      value={newAlbumDesc}
                      onChange={(e) => setNewAlbumDesc(e.target.value)}
                    />
                  </div>
                </div>

                {/* Color selection */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-medium uppercase">{t('albumModal.colorLabel')}</Label>
                  <div className="flex items-center gap-2.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewAlbumColor(c)}
                        className={`w-6 h-6 rounded-full transition-all cursor-pointer ${
                          newAlbumColor === c
                            ? 'scale-125 ring-2 ring-primary ring-offset-2'
                            : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreating(false)}
                    className="rounded-full text-xs font-medium cursor-pointer"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    id="confirm-create-album-btn"
                    type="submit"
                    size="sm"
                    className="rounded-full text-xs font-semibold cursor-pointer"
                  >
                    {t('albumModal.saveBtn')}
                  </Button>
                </div>
              </form>
            )}

            {/* Albums List */}
            <div className="space-y-2.5">
              {albums.map((album) => {
                const albumImages = images.filter((img) => img.albumId === album.id);
                const totalBytes = albumImages.reduce((sum, img) => sum + img.size, 0);
                const isEditing = editingAlbumId === album.id;

                return (
                  <div
                    key={album.id}
                    className="p-4 rounded-2xl border border-border/80 bg-muted/20 flex items-center justify-between gap-3"
                  >
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 h-8"
                        />
                        <div className="flex items-center gap-1.5">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditColor(c)}
                              className={`w-4 h-4 rounded-full cursor-pointer ${
                                editColor === c ? 'ring-2 ring-primary ring-offset-1' : 'opacity-60'
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSaveEdit(album)}
                          className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingAlbumId(null)}
                          className="h-8 w-8 text-muted-foreground cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-border/60"
                            style={{ backgroundColor: `${album.color}20`, color: album.color }}
                          >
                            <Folder className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-medium truncate text-foreground">
                                {album.name}
                              </h4>
                              {album.isDefault && (
                                <Badge variant="subtle" className="text-[9px]">
                                  DEFAULT
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] font-mono mt-0.5 text-muted-foreground">
                              {albumImages.length} {t('common.items')} · {formatFileSize(totalBytes)}
                              {album.description && ` · ${album.description}`}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartEdit(album)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                            title={t('albumModal.editTooltip')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          {!album.isDefault && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPendingDelete(album)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              title={t('albumModal.deleteTooltip')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="p-4 px-6 border-t border-border/80 bg-muted/20 shrink-0">
          <Button
            onClick={onClose}
            className="rounded-full px-6 uppercase tracking-wider text-xs font-bold cursor-pointer"
          >
            {t('common.done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      {/* Delete album confirm - shadcn AlertDialog */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <span className="truncate">{pendingDelete?.name ?? ''}</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground text-left">
              {pendingDelete ? t('albumModal.confirmDeletePrompt', { name: pendingDelete.name }) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 pt-2">
            <AlertDialogCancel className="text-xs h-9 rounded-xl">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              className="text-xs h-9 rounded-xl px-5 gap-1.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold focus:ring-rose-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('common.delete')}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

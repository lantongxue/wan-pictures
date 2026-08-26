import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UploadCloud,
  Layers,
  Sparkles,
  Globe,
  Gauge,
} from 'lucide-react';
import { Album } from '../types';
import { useUser } from '../pages/user/UserContext';
import { partitionAllowedImages } from '../utils/imageProcessing';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface UploadHeroProps {
  onFilesSelected: (files: File[]) => void;
  albums: Album[];
  selectedAlbumId: number;
  onAlbumChange: (albumId: number) => void;
}

export const UploadHero: React.FC<UploadHeroProps> = ({
  onFilesSelected,
  albums,
  selectedAlbumId,
  onAlbumChange,
}) => {
  const { t } = useTranslation();
  const { quotaInfo, showToast } = useUser();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const notifyRejected = (count: number) => {
    showToast(
      t('common.warning'),
      t('uploadModal.unsupportedSkipped', { count }),
      'warning'
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const { accepted: validFiles, rejected } = partitionAllowedImages(Array.from(e.dataTransfer.files));
      if (rejected.length > 0) {
        notifyRejected(rejected.length);
      }
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const { accepted: validFiles, rejected } = partitionAllowedImages(Array.from(e.target.files));
      if (rejected.length > 0) {
        notifyRejected(rejected.length);
      }
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
      e.target.value = '';
    }
  };

  const formatTags = ['PNG', 'JPG', 'WEBP', 'GIF', 'SVG', 'AVIF', 'BMP', 'ICO'];

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-10 mb-8 backdrop-blur-2xl shadow-xs transition-colors">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.06)_0%,_transparent_70%)]" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none bg-primary/10" />

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center">
        {/* Title & Badge */}
        <Badge variant="subtle" className="gap-1.5 py-1 px-3.5 mb-4">
          <Sparkles className="w-3 h-3 text-primary" />
          <span>{t('hero.engineBadge')}</span>
        </Badge>

        <h1 className="text-2xl sm:text-4xl font-light tracking-tight text-foreground mb-2">
          {t('hero.title')}{' '}
          <span className="font-semibold text-foreground">
            {t('hero.titleHighlight')}
          </span>
        </h1>
        <p className="text-xs sm:text-sm max-w-2xl mb-8 uppercase tracking-wide text-muted-foreground">
          {t('hero.formatSupport')} · {t('hero.clipboardSupport')}{' '}
          <kbd className="px-2 py-0.5 rounded-lg border border-border bg-muted/60 text-foreground font-mono text-[10px]">
            Ctrl + V
          </kbd>
        </p>

        {/* Dropzone Container */}
        <div
          id="dropzone-area"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full group relative cursor-pointer rounded-3xl border border-dashed transition-all duration-300 p-8 sm:p-12 flex flex-col items-center justify-center overflow-hidden ${
            isDragOver
              ? 'border-primary bg-primary/10 scale-[1.01] shadow-xl'
              : 'border-border hover:border-primary/50 bg-muted/30 hover:bg-muted/50'
          }`}
        >
          {/* Background watermark */}
          <h2 className="text-[72px] sm:text-[110px] font-black leading-none tracking-tighter select-none absolute pointer-events-none -translate-y-2 text-foreground/5">
            {t('hero.dropWatermark')}
          </h2>

          <input
            id="hidden-file-input"
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif,image/bmp,image/x-icon,.png,.jpg,.jpeg,.webp,.gif,.svg,.avif,.bmp,.ico"
            className="hidden"
            onChange={handleFileInputChange}
          />

          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-border/80 bg-background flex items-center justify-center backdrop-blur-md group-hover:scale-105 group-hover:border-primary group-hover:text-primary transition-all shadow-xs text-foreground">
              <UploadCloud className="w-8 h-8 sm:w-9 sm:h-9" />
            </div>

            <div className="text-center">
              <p className="text-base sm:text-lg font-light tracking-wide text-foreground">
                {t('hero.dragPrompt')}
              </p>
              <p className="text-[11px] uppercase tracking-widest mt-1 text-muted-foreground">
                {t('hero.batchTip')}
              </p>
            </div>

            <Button
              type="button"
              className="mt-2 rounded-full px-8 py-3 uppercase tracking-widest shadow-md text-xs font-bold cursor-pointer"
            >
              {t('hero.selectBtn')}
            </Button>

            {/* Supported Format Pills */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
              {formatTags.map((fmt) => (
                <Badge
                  key={fmt}
                  variant="outline"
                  className="bg-background/80 text-muted-foreground border-border/60"
                >
                  {fmt}
                </Badge>
              ))}
            </div>

            {/* Live quota policy reported by backend (GET /api/v1/upload/quota).
                Restrictions themselves are enforced server-side. */}
            {quotaInfo && (
              <p className="mt-3 flex items-center gap-1.5 text-[11px] tracking-wide text-muted-foreground">
                <Gauge className="w-3 h-3 text-primary" />
                {quotaInfo.daily_limit > 0
                  ? t('hero.quotaHint', {
                      max: quotaInfo.single_max_size_mb,
                      remaining: Math.max(quotaInfo.remaining_today, 0),
                      limit: quotaInfo.daily_limit,
                    })
                  : t('hero.quotaUnlimited', { max: quotaInfo.single_max_size_mb })}
              </p>
            )}
          </div>
        </div>

        {/* Quick Toolbar below Dropzone */}
        <div className="w-full flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-border/60 text-xs text-muted-foreground">
          {/* Target Album Selection */}
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-[11px] uppercase tracking-wider text-foreground font-medium">
              {t('hero.targetAlbum')}:
            </span>
            <div className="w-44">
              <Select value={String(selectedAlbumId)} onValueChange={(val) => onAlbumChange(Number(val))}>
                <SelectTrigger id="upload-album-select" className="h-8 rounded-full">
                  <SelectValue placeholder={t('hero.selectAlbumPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {albums.map((alb) => (
                    <SelectItem key={alb.id} value={String(alb.id)}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: alb.color }}
                        />
                        {alb.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

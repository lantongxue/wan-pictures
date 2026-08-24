import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Copy,
  Check,
  Download,
  Trash2,
  Heart,
  FileCode,
} from 'lucide-react';
import { ImageItem, Album } from '../types';
import { formatFileSize, formatDate } from '../utils/imageProcessing';
import { copyToClipboard } from '../utils/linkFormatter';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';

interface ImageCardProps {
  image: ImageItem;
  album?: Album;
  isSelected: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onPreview: (image: ImageItem) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  viewMode: 'masonry' | 'grid' | 'list';
}

export const ImageCard: React.FC<ImageCardProps> = ({
  image,
  album,
  isSelected,
  onSelect,
  onPreview,
  onDelete,
  onToggleFavorite,
  onShowToast,
  viewMode,
}) => {
  const { t } = useTranslation();
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const handleCopyLink = async (e: React.MouseEvent, type: 'url' | 'markdown') => {
    e.stopPropagation();
    const text = type === 'markdown' ? `![${image.name}](${image.dataUrl})` : image.dataUrl;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedFormat(type);
      onShowToast(
        type === 'markdown' ? t('card.copyMarkdownSuccess') : t('card.copyUrlSuccess'),
        image.name,
        'success'
      );
      setTimeout(() => setCopiedFormat(null), 1800);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = image.dataUrl;
    a.download = image.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast(t('common.downloading'), image.name, 'info');
  };

  // List View Rendering
  if (viewMode === 'list') {
    return (
      <div
        id={`image-card-${image.id}`}
        onClick={() => onPreview(image)}
        className={`group flex items-center gap-4 p-3.5 rounded-2xl border transition-all cursor-pointer ${
          isSelected
            ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary'
            : 'bg-card border-border/80 hover:border-border hover:bg-muted/30 shadow-2xs'
        }`}
      >
        {/* Checkbox */}
        <div
          className="flex items-center justify-center p-1 z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            id={`select-image-${image.id}`}
            checked={isSelected}
            onCheckedChange={(_checked) => {
              onSelect(image.id, { stopPropagation: () => {} } as any);
            }}
            aria-label={isSelected ? t('gallery.deselectAll') : t('gallery.selectAll')}
            className="w-5 h-5 rounded-md border-border/80 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        </div>

        {/* Thumbnail */}
        <div className="w-14 h-14 rounded-xl border border-border overflow-hidden shrink-0 relative bg-background">
          <img
            src={image.dataUrl}
            alt={image.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Name & Metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-medium truncate transition-colors text-foreground group-hover:text-primary">
              {image.name}
            </h4>
            {image.compressed && (
              <Badge variant="subtle" className="text-[9px] text-emerald-600 bg-emerald-500/10">
                {t('card.optimized')}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-mono text-muted-foreground">
            <span className="text-foreground">{image.extension.toUpperCase()}</span>
            <span>·</span>
            <span>{formatFileSize(image.size)}</span>
            <span>·</span>
            <span>
              {image.width} × {image.height}
            </span>
            <span>·</span>
            <span>{formatDate(image.createdAt)}</span>
            {album && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1 text-foreground">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: album.color }}
                  />
                  {album.name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleFavorite(image.id)}
            className={`h-8 w-8 rounded-full cursor-pointer ${
              image.favorite
                ? 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/20'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={image.favorite ? t('card.unfavorite') : t('card.favorite')}
          >
            <Heart className={`w-3.5 h-3.5 ${image.favorite ? 'fill-rose-500' : ''}`} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={(e) => handleCopyLink(e, 'markdown')}
            className="h-8 rounded-full gap-1 text-xs font-mono cursor-pointer"
            title={t('card.copyMarkdown')}
          >
            {copiedFormat === 'markdown' ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <FileCode className="w-3 h-3 text-muted-foreground" />
            )}
            <span className="hidden sm:inline">MD</span>
          </Button>

          <Button
            size="sm"
            onClick={(e) => handleCopyLink(e, 'url')}
            className="h-8 rounded-full gap-1 text-xs font-mono font-bold shadow-xs cursor-pointer"
            title={t('card.copyUrl')}
          >
            {copiedFormat === 'url' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">URL</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            title={t('card.download')}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(image.id)}
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
            title={t('card.delete')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // Masonry or Grid Card Rendering
  return (
    <div
      id={`image-card-${image.id}`}
      onClick={() => onPreview(image)}
      className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer ${
        isSelected
          ? 'bg-primary/5 ring-2 ring-primary border-primary shadow-lg'
          : 'bg-card hover:border-border/80 border-border/60 shadow-xs hover:shadow-md'
      }`}
    >
      {/* Image Container */}
      <div
        className={`relative w-full overflow-hidden flex items-center justify-center bg-muted/40 ${
          viewMode === 'grid' ? 'aspect-[4/3]' : ''
        }`}
      >
        <img
          src={image.dataUrl}
          alt={image.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-full block object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top Badges & Select Overlay */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-20 pointer-events-none">
          <div
            className="pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              id={`select-image-${image.id}`}
              checked={isSelected}
              onCheckedChange={(_checked) => {
                onSelect(image.id, { stopPropagation: () => {} } as any);
              }}
              aria-label={isSelected ? t('gallery.deselectAll') : t('gallery.selectAll')}
              className={`w-6 h-6 rounded-md backdrop-blur-md transition-all shadow-xs ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-black/40 border-white/40 text-white data-[state=unchecked]:bg-black/40 data-[state=unchecked]:border-white/40'
              }`}
            />
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            {album && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-md bg-black/70 border border-white/10 text-white/90 flex items-center gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: album.color }}
                />
                {album.name}
              </span>
            )}
            <Badge variant="secondary" className="text-[10px] font-mono uppercase bg-black/70 text-white/80 border-white/10">
              {image.extension}
            </Badge>
          </div>
        </div>

        {/* Hover Quick Action Overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3.5 z-10 pointer-events-none"
        >
          <div
            className="flex items-center justify-between gap-1.5 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                onClick={(e) => handleCopyLink(e, 'url')}
                className="h-7 px-3 rounded-full text-xs font-bold uppercase gap-1 shadow-md cursor-pointer"
                title={t('card.copyUrl')}
              >
                {copiedFormat === 'url' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{t('card.copyUrl')}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={(e) => handleCopyLink(e, 'markdown')}
                className="h-7 px-3 rounded-full text-xs font-medium gap-1 bg-black/70 text-white hover:bg-black border-white/20 backdrop-blur-sm cursor-pointer"
                title={t('card.copyMarkdown')}
              >
                {copiedFormat === 'markdown' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <FileCode className="w-3 h-3" />
                )}
                <span>MD</span>
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleFavorite(image.id)}
                className={`h-7 w-7 rounded-full backdrop-blur-md bg-black/60 border border-white/10 hover:bg-black/80 cursor-pointer ${
                  image.favorite ? 'text-rose-400' : 'text-white/70 hover:text-white'
                }`}
                title={image.favorite ? t('card.unfavorite') : t('card.favorite')}
              >
                <Heart className={`w-3.5 h-3.5 ${image.favorite ? 'fill-rose-400' : ''}`} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="h-7 w-7 rounded-full backdrop-blur-md bg-black/60 border border-white/10 text-white/70 hover:text-white hover:bg-black/80 cursor-pointer"
                title={t('card.download')}
              >
                <Download className="w-3.5 h-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(image.id)}
                className="h-7 w-7 rounded-full backdrop-blur-md bg-black/60 border border-white/10 text-white/60 hover:text-destructive hover:bg-black/80 cursor-pointer"
                title={t('card.delete')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Card Info Footer */}
      <div className="p-3.5 border-t border-border/60 bg-muted/20">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium truncate transition-colors text-foreground group-hover:text-primary">
            {image.name}
          </p>
          <span className="text-[10px] font-mono shrink-0 text-muted-foreground">
            {formatFileSize(image.size)}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] mt-1 font-mono text-muted-foreground">
          <span>
            {image.width} × {image.height}
          </span>
          <span>{formatDate(image.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

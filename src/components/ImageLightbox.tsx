import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Heart,
  Trash2,
  Palette,
} from 'lucide-react';
import { ImageItem, Album, LinkFormatType } from '../types';
import { formatFileSize, formatDate } from '../utils/imageProcessing';
import {
  LINK_FORMAT_OPTIONS,
  formatSingleImageLink,
  copyToClipboard,
} from '../utils/linkFormatter';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './ui/dialog';

interface ImageLightboxProps {
  image: ImageItem | null;
  images: ImageItem[];
  albums: Album[];
  onClose: () => void;
  onNavigate: (image: ImageItem) => void;
  onUpdateImage: (id: number, updates: Partial<ImageItem>) => void;
  onDelete: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  image,
  images,
  albums,
  onClose,
  onNavigate,
  onUpdateImage,
  onDelete,
  onToggleFavorite,
  onShowToast,
}) => {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showInfo, setShowInfo] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState<LinkFormatType>('markdown');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    if (image) {
      setZoom(1);
      setRotation(0);
      setEditedName(image.name);
      setIsEditingName(false);
    }
  }, [image?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!image) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [image?.id, images]);

  if (!image) return null;

  const currentIndex = images.findIndex((i) => i.id === image.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const handlePrev = () => {
    if (hasPrev) onNavigate(images[currentIndex - 1]);
  };

  const handleNext = () => {
    if (hasNext) onNavigate(images[currentIndex + 1]);
  };

  const handleCopyLink = async (format: LinkFormatType) => {
    const text = formatSingleImageLink(image, format);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedFormat(format);
      onShowToast(t('lightbox.copySuccess'), `${format.toUpperCase()}`, 'success');
      setTimeout(() => setCopiedFormat(null), 1800);
    }
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== image.name) {
      onUpdateImage(image.id, { name: editedName.trim() });
      onShowToast(t('lightbox.renameSuccess'), editedName.trim(), 'success');
    }
    setIsEditingName(false);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = image.dataUrl;
    a.download = image.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast(t('common.downloading'), image.name, 'info');
  };

  return (
    <Dialog open={!!image} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        id="image-lightbox-modal"
        hideCloseButton
        className="w-[96vw] max-w-7xl h-[94vh] max-h-[94vh] p-0 flex flex-col gap-0 overflow-hidden sm:rounded-3xl border border-border/80 shadow-2xl bg-background/98 backdrop-blur-2xl"
      >
        <DialogTitle className="sr-only">{image.name} {t('lightbox.title')}</DialogTitle>
        <DialogDescription className="sr-only">
          {t('lightbox.subtitle')}
        </DialogDescription>

        {/* Top Floating Control Bar */}
        <div className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-border/80 bg-background/90 z-20 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Badge variant="subtle" className="text-xs font-mono shrink-0 hidden sm:inline-flex">
              {currentIndex + 1} / {images.length}
            </Badge>
            <div className="flex items-center gap-2 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    autoFocus
                    className="h-8 text-xs font-mono rounded-full w-44 sm:w-60"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveName}
                    className="text-xs text-primary font-mono uppercase h-8 px-2 cursor-pointer"
                  >
                    {t('common.save')}
                  </Button>
                </div>
              ) : (
                <h3
                  onClick={() => setIsEditingName(true)}
                  className="text-xs sm:text-sm font-medium truncate cursor-pointer hover:text-primary transition-colors text-foreground"
                  title={t('lightbox.clickToRename')}
                >
                  {image.name}
                </h3>
              )}
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
              className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
              title={t('lightbox.zoomOut')}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((z) => Math.min(3.0, z + 0.2))}
              className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
              title={t('lightbox.zoomIn')}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
              title={t('lightbox.rotateCw')}
            >
              <RotateCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleFavorite(image.id)}
              className={`rounded-full h-8 w-8 cursor-pointer ${
                image.favorite
                  ? 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={image.favorite ? t('card.unfavorite') : t('card.favorite')}
            >
              <Heart className={`w-4 h-4 ${image.favorite ? 'fill-rose-500 text-rose-500' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
              title={t('lightbox.download')}
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant={showInfo ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setShowInfo(!showInfo)}
              className="rounded-full h-8 w-8 cursor-pointer"
              title={t('lightbox.info')}
            >
              <Info className="w-4 h-4" />
            </Button>
            <Button
              id="close-lightbox-btn"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full h-8 w-8 ml-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 min-h-0 relative flex flex-col md:flex-row overflow-hidden">
          {/* Navigation arrow Left */}
          {hasPrev && (
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-background/80 hover:bg-background backdrop-blur-md shadow-xl border-border cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}

          {/* Navigation arrow Right */}
          {hasNext && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              className="absolute right-4 md:right-[calc(20rem+1rem)] lg:right-[calc(24rem+1rem)] top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-background/80 hover:bg-background backdrop-blur-md shadow-xl border-border cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}

          {/* Image viewport */}
          <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-muted/20">
            <img
              src={image.dataUrl}
              alt={image.name}
              referrerPolicy="no-referrer"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-out',
              }}
              className="max-h-full max-w-full object-contain rounded-xl shadow-lg will-change-transform"
            />
          </div>

          {/* Side Info & Link Inspector Drawer */}
          {showInfo && (
            <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-border/80 bg-card/90 flex flex-col min-h-0 max-h-[40vh] md:max-h-full shrink-0 z-20 backdrop-blur-2xl">
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-5 space-y-5">
                  <div>
                    <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-2.5 text-muted-foreground">
                      {t('lightbox.linkExport')}
                    </h4>

                    {/* Format selection */}
                    <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                      {LINK_FORMAT_OPTIONS.map((opt) => (
                        <Button
                          key={opt.type}
                          variant={selectedFormat === opt.type ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedFormat(opt.type)}
                          className="rounded-full text-[10px] font-mono uppercase h-7 px-2 cursor-pointer"
                        >
                          {opt.type.toUpperCase()}
                        </Button>
                      ))}
                    </div>

                    {/* Formatted Link Box */}
                    <div className="p-3.5 rounded-2xl border border-border/80 bg-background/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-muted-foreground">
                          {LINK_FORMAT_OPTIONS.find((o) => o.type === selectedFormat)?.label}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleCopyLink(selectedFormat)}
                          className="rounded-full gap-1 h-6 text-xs font-bold uppercase px-2.5 shadow-xs cursor-pointer"
                        >
                          {copiedFormat === selectedFormat ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>{t('common.copied')}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>{t('common.copy')}</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs font-mono break-all select-all leading-relaxed max-h-24 overflow-y-auto text-foreground">
                        {formatSingleImageLink(image, selectedFormat)}
                      </p>
                    </div>
                  </div>

                  {/* Metadata Details */}
                  <div>
                    <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-2.5 text-muted-foreground">
                      {t('lightbox.specs')}
                    </h4>
                    <div className="space-y-2 text-xs border border-border/80 rounded-2xl p-3.5 bg-background/80">
                      <div className="flex justify-between py-1 border-b border-border/60">
                        <span className="text-muted-foreground">{t('lightbox.resolution')}</span>
                        <span className="font-mono text-foreground">
                          {image.width} × {image.height} px
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/60">
                        <span className="text-muted-foreground">{t('lightbox.fileSize')}</span>
                        <span className="font-mono text-foreground">
                          {formatFileSize(image.size)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/60">
                        <span className="text-muted-foreground">{t('lightbox.formatType')}</span>
                        <span className="font-mono uppercase text-foreground">
                          {image.extension} ({image.type})
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/60">
                        <span className="text-muted-foreground">{t('lightbox.aspectRatio')}</span>
                        <span className="font-mono text-foreground">
                          {image.aspectRatio.toFixed(2)} : 1
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/60">
                        <span className="text-muted-foreground">{t('lightbox.uploadTime')}</span>
                        <span className="font-mono text-foreground">
                          {formatDate(image.createdAt)}
                        </span>
                      </div>

                      {/* Album select */}
                      <div className="flex justify-between items-center py-1">
                        <span className="text-muted-foreground">{t('lightbox.album')}</span>
                        <div className="w-36">
                          <Select
                            value={String(image.albumId)}
                            onValueChange={(val) => onUpdateImage(image.id, { albumId: Number(val) })}
                          >
                            <SelectTrigger className="h-7 text-xs rounded-full font-normal">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {albums.map((alb) => (
                                <SelectItem key={alb.id} value={String(alb.id)}>
                                  {alb.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-2.5 text-muted-foreground">
                      {t('lightbox.tags')}
                    </h4>
                    <div className="flex flex-wrap gap-1.5 border border-border/80 rounded-2xl p-3.5 bg-background/80 min-h-[2.25rem]">
                      {image.tags && image.tags.length > 0 ? (
                        image.tags.map((tag, idx) => (
                          <span
                            key={`lightbox-tag-${tag}-${idx}`}
                            className="px-2.5 py-1 rounded-full text-[11px] font-mono border border-border/60 bg-muted/40 text-foreground transition-colors"
                          >
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono text-muted-foreground/60">
                          {t('lightbox.noTags')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Color Palette */}
                  {image.colorPalette && image.colorPalette.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5 text-muted-foreground">
                        <Palette className="w-3 h-3 text-primary" />
                        <span>{t('lightbox.colorPalette')}</span>
                      </h4>
                      <div className="flex items-center gap-2">
                        {image.colorPalette.map((color, idx) => (
                          <div
                            key={idx}
                            onClick={async () => {
                              await copyToClipboard(color);
                              onShowToast(t('lightbox.copiedColor'), color, 'success');
                            }}
                            className="flex-1 h-8 rounded-xl cursor-pointer border border-border flex items-center justify-center text-[9px] font-mono font-bold text-white shadow-xs hover:scale-105 transition-transform"
                            style={{ backgroundColor: color }}
                            title={`${t('lightbox.copyColor')} ${color}`}
                          >
                            {color}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Bottom Actions */}
              <div className="p-4 border-t border-border/80 flex items-center justify-between shrink-0 bg-background/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onDelete(image.id);
                    onClose();
                  }}
                  className="rounded-full gap-1.5 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('common.delete')}</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleDownload}
                  className="rounded-full gap-1.5 px-4 text-xs font-bold uppercase tracking-wider shadow-md cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('lightbox.download')}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

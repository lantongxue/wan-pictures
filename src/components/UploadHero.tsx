import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UploadCloud,
  Layers,
  Sparkles,
  Sliders,
  Globe,
} from 'lucide-react';
import { Album, UploadSettings } from '../types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
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
  onUrlImport: (url: string) => void;
  albums: Album[];
  selectedAlbumId: string;
  onAlbumChange: (albumId: string) => void;
  settings: UploadSettings;
  onSettingsChange: (settings: UploadSettings) => void;
}

export const UploadHero: React.FC<UploadHeroProps> = ({
  onFilesSelected,
  onUrlImport,
  albums,
  selectedAlbumId,
  onAlbumChange,
  settings,
  onSettingsChange,
}) => {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const validFiles = Array.from(e.dataTransfer.files).filter((file: File) =>
        file.type.startsWith('image/') ||
        /\.(png|jpe?g|webp|gif|svg|avif|bmp|ico|tiff)$/i.test(file.name)
      );
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles: File[] = Array.from(e.target.files);
      onFilesSelected(validFiles);
      e.target.value = '';
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (remoteUrl.trim()) {
      onUrlImport(remoteUrl.trim());
      setRemoteUrl('');
      setIsUrlModalOpen(false);
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
            accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.svg,.avif,.bmp,.ico,.tiff"
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
              <Select value={selectedAlbumId} onValueChange={onAlbumChange}>
                <SelectTrigger id="upload-album-select" className="h-8 rounded-full">
                  <SelectValue placeholder={t('hero.selectAlbumPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {albums.map((alb) => (
                    <SelectItem key={alb.id} value={alb.id}>
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

          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              id="import-url-trigger"
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUrlModalOpen(true)}
              className="rounded-full gap-1.5 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>{t('hero.importUrl')}</span>
            </Button>

            <Button
              id="toggle-upload-options-btn"
              type="button"
              variant={showOptions ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowOptions(!showOptions)}
              className="rounded-full gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('hero.preprocessStrategy')}</span>
            </Button>
          </div>
        </div>

        {/* Collapsible Upload Pre-processing Options */}
        {showOptions && (
          <div className="w-full mt-4 p-5 rounded-2xl border border-border/80 bg-muted/30 text-left grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs animate-in fade-in-50 duration-200">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="opt-auto-compress" className="cursor-pointer font-medium">
                  {t('hero.autoCompress')}
                </Label>
                <Switch
                  id="opt-auto-compress"
                  checked={settings.autoCompress}
                  onCheckedChange={(checked) =>
                    onSettingsChange({ ...settings, autoCompress: checked })
                  }
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t('hero.autoCompressDesc')}
              </p>
              {settings.autoCompress && (
                <div className="pt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span>{t('hero.compressQuality')}</span>
                    <span className="text-foreground font-semibold">
                      {Math.round(settings.compressQuality * 100)}%
                    </span>
                  </div>
                  <Slider
                    id="opt-compress-quality"
                    min={0.4}
                    max={0.95}
                    step={0.05}
                    value={[settings.compressQuality]}
                    onValueChange={(val) =>
                      onSettingsChange({ ...settings, compressQuality: val[0] })
                    }
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="opt-convert-webp" className="cursor-pointer font-medium">
                  {t('hero.convertToWebp')}
                </Label>
                <Switch
                  id="opt-convert-webp"
                  checked={settings.convertToWebP}
                  onCheckedChange={(checked) =>
                    onSettingsChange({ ...settings, convertToWebP: checked })
                  }
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t('hero.convertToWebpDesc')}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="font-medium text-foreground">{t('hero.namingRule')}</Label>
              <Select
                value={settings.namingRule}
                onValueChange={(val) =>
                  onSettingsChange({
                    ...settings,
                    namingRule: val as UploadSettings['namingRule'],
                  })
                }
              >
                <SelectTrigger id="opt-naming-rule" className="h-8 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">{t('hero.namingOriginal')}</SelectItem>
                  <SelectItem value="timestamp">{t('hero.namingTimestamp')}</SelectItem>
                  <SelectItem value="random">{t('hero.namingRandom')}</SelectItem>
                  <SelectItem value="custom">{t('hero.namingCustom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Remote URL Import Dialog */}
      <Dialog open={isUrlModalOpen} onOpenChange={setIsUrlModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <span>{t('hero.importUrlTitle')}</span>
            </DialogTitle>
            <DialogDescription>
              {t('hero.importUrlDesc')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUrlSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="remote-url-input">{t('hero.importUrlLabel')}</Label>
              <Input
                id="remote-url-input"
                type="url"
                required
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="font-mono text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                id="cancel-url-import-btn"
                type="button"
                variant="outline"
                onClick={() => setIsUrlModalOpen(false)}
                className="rounded-full cursor-pointer"
              >
                {t('common.cancel')}
              </Button>
              <Button
                id="confirm-url-import-btn"
                type="submit"
                className="rounded-full cursor-pointer"
              >
                {t('hero.startImport')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

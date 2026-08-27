import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Compass,
  Search,
  Heart,
  Copy,
  FileCode,
  Download,
  Maximize2,
  Check,
  Tag,
  Upload,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { ImageItem, Album, SortOption, AspectRatioFilter } from '../types';
import { copyToClipboard, toAbsoluteImageUrl } from '../utils/linkFormatter';
import { DimensionFilterPopover } from './DimensionFilterPopover';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface ImagePlazaProps {
  images: ImageItem[];
  albums: Album[];
  onPreview: (image: ImageItem) => void;
  onToggleFavorite: (id: number) => void;
  onOpenBatchLinks?: (images: ImageItem[]) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onOpenUpload: () => void;
}

export const ImagePlaza: React.FC<ImagePlazaProps> = ({
  images,
  albums,
  onPreview,
  onToggleFavorite,
  onOpenBatchLinks,
  onShowToast,
  onOpenUpload,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [minWidth, setMinWidth] = useState<number | undefined>(undefined);
  const [maxWidth, setMaxWidth] = useState<number | undefined>(undefined);
  const [minHeight, setMinHeight] = useState<number | undefined>(undefined);
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  const [aspectRatioFilter, setAspectRatioFilter] = useState<AspectRatioFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [columnCount, setColumnCount] = useState<3 | 4 | 5 | 2>(4);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const albumMap = useMemo(() => new Map(albums.map((a) => [a.id, a])), [albums]);

  // Aggregate all unique tags from all images
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    images.forEach((img) => {
      if (img.tags && Array.isArray(img.tags)) {
        img.tags.forEach((t) => {
          if (t && t.trim()) tagSet.add(t.trim());
        });
      }
    });
    return Array.from(tagSet);
  }, [images]);

  // Filtered & Sorted Images for Plaza
  const plazaImages = useMemo(() => {
    let result = [...images];

    // Filter by Tag
    if (selectedTag !== 'all') {
      result = result.filter(
        (img) => img.tags && img.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase())
      );
    }

    // Filter by Dimension: Width
    if (minWidth && minWidth > 0) {
      result = result.filter((img) => (img.width || 0) >= (minWidth || 0));
    }
    if (maxWidth && maxWidth > 0) {
      result = result.filter((img) => (img.width || 0) <= (maxWidth || 0));
    }

    // Filter by Dimension: Height
    if (minHeight && minHeight > 0) {
      result = result.filter((img) => (img.height || 0) >= (minHeight || 0));
    }
    if (maxHeight && maxHeight > 0) {
      result = result.filter((img) => (img.height || 0) <= (maxHeight || 0));
    }

    // Filter by Aspect Ratio
    if (aspectRatioFilter && aspectRatioFilter !== 'all') {
      result = result.filter((img) => {
        const w = img.width || 1;
        const h = img.height || 1;
        const ratio = w / h;
        if (aspectRatioFilter === 'landscape') {
          return ratio > 1.08;
        } else if (aspectRatioFilter === 'portrait') {
          return ratio < 0.92;
        } else if (aspectRatioFilter === 'square') {
          return ratio >= 0.92 && ratio <= 1.08;
        }
        return true;
      });
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (img) =>
          img.name.toLowerCase().includes(q) ||
          img.extension.toLowerCase().includes(q) ||
          (img.tags && img.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return a.createdAt - b.createdAt;
        case 'size-desc':
          return b.size - a.size;
        case 'size-asc':
          return a.size - b.size;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'views-desc':
          return (b.viewCount ?? 0) - (a.viewCount ?? 0);
        case 'dimension-desc':
          return (b.width * b.height) - (a.width * a.height);
        case 'date-desc':
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return result;
  }, [images, selectedTag, minWidth, maxWidth, minHeight, maxHeight, aspectRatioFilter, searchQuery, sortBy]);

  const handleCopyLink = async (img: ImageItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(toAbsoluteImageUrl(img.dataUrl));
    if (success) {
      setCopiedId(img.id);
      onShowToast(t('card.copyUrlSuccess'), img.name, 'success');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCopyMarkdown = async (img: ImageItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const md = `![${img.name}](${toAbsoluteImageUrl(img.dataUrl)})`;
    const success = await copyToClipboard(md);
    if (success) {
      setCopiedId(img.id);
      onShowToast(t('card.copyMarkdownSuccess'), md, 'success');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDownload = (img: ImageItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = img.dataUrl;
    a.download = img.name || `image_${img.id}.${img.extension || 'png'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast(t('common.downloading'), img.name, 'info');
  };

  // Reset all plaza filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedTag('all');
    setMinWidth(undefined);
    setMaxWidth(undefined);
    setMinHeight(undefined);
    setMaxHeight(undefined);
    setAspectRatioFilter('all');
    setSortBy('date-desc');
  };

  // Determine CSS column classes based on selected columnCount
  const getColumnClasses = () => {
    switch (columnCount) {
      case 2:
        return 'columns-1 sm:columns-2 gap-5 sm:gap-6';
      case 3:
        return 'columns-1 sm:columns-2 md:columns-3 gap-4 sm:gap-5';
      case 5:
        return 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3.5 sm:gap-4';
      case 4:
      default:
        return 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 sm:gap-5';
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div id="image-plaza-page" className="w-full space-y-8 animate-in fade-in duration-300">
        {/* Plaza Header Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-muted/40 p-6 sm:p-10 shadow-xs">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Compass className="w-5 h-5" />
                </span>
                <Badge variant="subtle" className="text-[11px] font-mono tracking-wider">
                  {t('plaza.badge')}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
                {t('plaza.title')}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t('plaza.subtitle')}
              </p>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                id="plaza-upload-btn"
                onClick={onOpenUpload}
                className="rounded-full gap-2 px-5 font-semibold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{t('plaza.uploadToPlaza')}</span>
              </Button>
            </div>
          </div>

          {/* Plaza Interactive Control Bar */}
          <div className="mt-8 pt-6 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Input */}
              <div className="relative w-full sm:w-72 md:w-80">
                <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="plaza-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('plaza.searchPlaceholder')}
                  className="pl-9 pr-8 rounded-full border-border/80 bg-background/60 focus-visible:bg-background h-8 text-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Dimension Filter Popover */}
              <DimensionFilterPopover
                minWidth={minWidth}
                maxWidth={maxWidth}
                minHeight={minHeight}
                maxHeight={maxHeight}
                aspectRatioFilter={aspectRatioFilter}
                onChange={(dim) => {
                  setMinWidth(dim.minWidth);
                  setMaxWidth(dim.maxWidth);
                  setMinHeight(dim.minHeight);
                  setMaxHeight(dim.maxHeight);
                  setAspectRatioFilter(dim.aspectRatioFilter || 'all');
                }}
                triggerVariant="outline"
                className="h-8"
              />

              {/* Sort Order Selector */}
              <div className="w-36 sm:w-40">
                <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
                  <SelectTrigger className="h-8 rounded-full text-xs font-normal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">{t('plaza.sortDateDesc')}</SelectItem>
                    <SelectItem value="date-asc">{t('plaza.sortDateAsc')}</SelectItem>
                    <SelectItem value="dimension-desc">{t('plaza.sortDimensionDesc')}</SelectItem>
                    <SelectItem value="size-desc">{t('plaza.sortSizeDesc')}</SelectItem>
                    <SelectItem value="name-asc">{t('plaza.sortNameAsc')}</SelectItem>
                    <SelectItem value="views-desc">{t('plaza.sortViewsDesc')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right Controls: Column Density */}
            <div className="hidden sm:flex items-center gap-1 p-1 rounded-full border border-border/80 bg-background/70 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    id="plaza-col-2"
                    onClick={() => setColumnCount(2)}
                    className={`px-2 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                      columnCount === 2 ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    2
                  </button>
                </TooltipTrigger>
                <TooltipContent>{t('plaza.col2')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    id="plaza-col-3"
                    onClick={() => setColumnCount(3)}
                    className={`px-2 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                      columnCount === 3 ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    3
                  </button>
                </TooltipTrigger>
                <TooltipContent>{t('plaza.col3')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    id="plaza-col-4"
                    onClick={() => setColumnCount(4)}
                    className={`px-2 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                      columnCount === 4 ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    4
                  </button>
                </TooltipTrigger>
                <TooltipContent>{t('plaza.col4')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    id="plaza-col-5"
                    onClick={() => setColumnCount(5)}
                    className={`px-2 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                      columnCount === 5 ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    5
                  </button>
                </TooltipTrigger>
                <TooltipContent>{t('plaza.col5')}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Quick Tag Pills Row */}
          <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground shrink-0 mr-1">
              <Tag className="w-3 h-3" />
              <span>{t('plaza.tags')}</span>
            </div>

            <button
              id="tag-filter-all"
              onClick={() => setSelectedTag('all')}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all cursor-pointer ${
                selectedTag === 'all'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/40'
              }`}
            >
              {t('plaza.allTags')}
            </button>

            {allTags.map((tag) => (
              <button
                key={tag}
                id={`tag-filter-${tag}`}
                onClick={() => setSelectedTag(selectedTag === tag ? 'all' : tag)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/40'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>

          {(selectedTag !== 'all' || searchQuery || minWidth || maxWidth || minHeight || maxHeight || (aspectRatioFilter && aspectRatioFilter !== 'all')) && (
            <div className="mt-3 flex items-center justify-end">
              <button
                onClick={handleResetFilters}
                className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{t('plaza.resetFilters')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Results Counter Sub-header */}
        <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-medium flex-wrap">
            <span>{t('plaza.showingCounter', { shown: plazaImages.length, total: images.length })}</span>
            {selectedTag !== 'all' && (
              <Badge variant="subtle" className="text-[10px]">
                {t('plaza.tags')} #{selectedTag}
              </Badge>
            )}
            {(minWidth || maxWidth || minHeight || maxHeight || (aspectRatioFilter && aspectRatioFilter !== 'all')) && (
              <Badge variant="subtle" className="text-[10px] bg-primary/10 text-primary border border-primary/20">
                {t('dimension.activeLabel')}: {minWidth ? `≥${minWidth}w ` : ''}{minHeight ? `≥${minHeight}h ` : ''}
              </Badge>
            )}
          </div>
          <span className="hidden sm:inline text-[11px]">
            {t('plaza.cardHint')}
          </span>
        </div>

        {/* Empty State */}
        {plazaImages.length === 0 && (
          <div className="text-center py-24 px-4 rounded-3xl border border-dashed border-border/80 flex flex-col items-center bg-card/30">
            <div className="w-16 h-16 rounded-full border border-border bg-muted/40 flex items-center justify-center mb-4 text-muted-foreground">
              <Compass className="w-8 h-8 opacity-60" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {t('plaza.emptyTitle')}
            </h3>
            <p className="text-xs mt-1.5 max-w-sm text-muted-foreground">
              {t('plaza.emptyDesc')}
            </p>
            <div className="flex items-center gap-3 mt-6">
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="rounded-full text-xs font-medium cursor-pointer"
              >
                {t('plaza.resetFilters')}
              </Button>
              <Button
                onClick={onOpenUpload}
                className="rounded-full text-xs font-semibold shadow-md cursor-pointer"
              >
                {t('plaza.uploadToPlaza')}
              </Button>
            </div>
          </div>
        )}

        {/* True Masonry Waterfall Flow */}
        {plazaImages.length > 0 && (
          <div className={`${getColumnClasses()} space-y-4 sm:space-y-5`}>
            {plazaImages.map((img) => {
              const album = albumMap.get(img.albumId);
              const isCopied = copiedId === img.id;
              const isHighRes = (img.width >= 1920 && img.height >= 1080) || (img.width * img.height >= 2000000);

              return (
                <div
                  key={img.id}
                  id={`plaza-card-${img.id}`}
                  onClick={() => onPreview(img)}
                  className="break-inside-avoid group relative rounded-2xl overflow-hidden border border-border/60 bg-card hover:border-border/80 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer"
                >
                  {/* Image Container */}
                  <div className="relative w-full overflow-hidden flex items-center justify-center bg-muted/40 min-h-[120px]">
                    <img
                      src={img.thumbUrl || img.dataUrl}
                      alt={img.originalName || img.name}
                      loading="lazy"
                      className="w-full h-auto block object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />

                    {/* Top Badges & Favorite Overlay */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-20 pointer-events-none">
                      <div className="flex items-center gap-1.5 pointer-events-auto">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-mono uppercase bg-black/70 text-white/90 border-white/10 backdrop-blur-md"
                        >
                          {img.extension}
                        </Badge>
                        {isHighRes && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-primary/90 backdrop-blur-md text-white">
                            HD
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono backdrop-blur-md bg-black/60 text-white/80 border border-white/10 hidden sm:inline-block">
                          {img.width}×{img.height}
                        </span>
                      </div>

                      {/* Favorite Button */}
                      <button
                        id={`plaza-fav-${img.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(img.id);
                        }}
                        className={`w-7 h-7 rounded-full backdrop-blur-md flex items-center justify-center transition-all cursor-pointer pointer-events-auto shadow-xs border ${
                          img.favorite
                            ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                            : 'bg-black/40 hover:bg-black/60 text-white/80 hover:text-white border-white/20'
                        }`}
                        title={img.favorite ? t('card.unfavorite') : t('card.favorite')}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${img.favorite ? 'fill-current' : ''}`}
                        />
                      </button>
                    </div>

                    {/* Hover Quick Action Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3.5 z-10 pointer-events-none">
                      <div
                        className="flex items-center justify-between gap-1.5 pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            onClick={(e) => handleCopyLink(img, e)}
                            className="h-7 px-3 rounded-full text-xs font-bold uppercase gap-1 shadow-md cursor-pointer"
                            title={t('card.copyUrl')}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                                <span>{t('common.copied')}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>{t('card.copyUrl')}</span>
                              </>
                            )}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleCopyMarkdown(img, e)}
                            className="h-7 px-2.5 rounded-full text-xs font-medium gap-1 bg-black/70 text-white hover:bg-black border-white/20 backdrop-blur-sm cursor-pointer"
                            title={t('card.copyMarkdown')}
                          >
                            <FileCode className="w-3 h-3" />
                            <span>{t('card.copyMarkdown')}</span>
                          </Button>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDownload(img, e)}
                            className="h-7 w-7 rounded-full backdrop-blur-md bg-black/60 border border-white/10 text-white/80 hover:text-white hover:bg-black/80 cursor-pointer"
                            title={t('card.download')}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onPreview(img)}
                            className="h-7 w-7 rounded-full backdrop-blur-md bg-black/60 border border-white/10 text-white/80 hover:text-white hover:bg-black/80 cursor-pointer"
                            title={t('lightbox.previewTitle')}
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Info Footer */}
                  <div className="p-3.5 border-t border-border/60 bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className="text-xs font-medium truncate text-foreground group-hover:text-primary transition-colors flex-1"
                        title={img.originalName || img.name}
                      >
                        {img.originalName || img.name}
                      </p>
                      {album && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 flex items-center gap-1 border border-border/60 bg-background/80"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: album.color }}
                          />
                          <span className="text-muted-foreground">{album.name}</span>
                        </span>
                      )}
                    </div>

                    {/* Tags Strip */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                      <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground shrink-0">
                        <Eye className="w-3 h-3" />
                        {img.viewCount ?? 0}
                      </span>
                      <span className="text-muted-foreground/30 shrink-0">·</span>
                      {img.tags && img.tags.slice(0, 3).map((tag, tagIdx) => (
                        <span
                          key={`plaza-card-${img.id}-tag-${tag}-${tagIdx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTag(tag);
                          }}
                          className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

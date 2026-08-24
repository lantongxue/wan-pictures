import React from 'react';
import {
  ArrowUpDown,
  Images,
} from 'lucide-react';
import { ImageItem, Album, FilterOptions, SortOption } from '../types';
import { ImageCard } from './ImageCard';
import { DimensionFilterPopover } from './DimensionFilterPopover';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface GalleryGridProps {
  images: ImageItem[];
  albums: Album[];
  filters: FilterOptions;
  onFilterChange: (filters: Partial<FilterOptions>) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, e: React.MouseEvent) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onPreview: (image: ImageItem) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info') => void;
  onOpenUpload: () => void;
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({
  images,
  albums,
  filters,
  onFilterChange,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onPreview,
  onDelete,
  onToggleFavorite,
  onShowToast,
  onOpenUpload,
}) => {
  const albumMap = new Map(albums.map((a) => [a.id, a]));

  const formatFilters = [
    { label: '全部格式', value: 'all' },
    { label: 'PNG', value: 'png' },
    { label: 'JPG/JPEG', value: 'jpg' },
    { label: 'WEBP', value: 'webp' },
    { label: 'GIF 动图', value: 'gif' },
    { label: 'SVG 矢量', value: 'svg' },
  ];

  const sortOptions: { label: string; value: SortOption }[] = [
    { label: '上传时间 (最新优先)', value: 'date-desc' },
    { label: '上传时间 (最早优先)', value: 'date-asc' },
    { label: '文件大小 (从大到小)', value: 'size-desc' },
    { label: '文件大小 (从小到大)', value: 'size-asc' },
    { label: '名称排序 (A - Z)', value: 'name-asc' },
  ];

  const isAllSelected = images.length > 0 && images.every((img) => selectedIds.has(img.id));
  const selectedVisibleCount = images.filter((img) => selectedIds.has(img.id)).length;

  return (
    <div className="w-full space-y-6">
      {/* Filter and Sorting Sub-toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:px-5 rounded-full border border-border/80 bg-card/80 backdrop-blur-md text-xs shadow-xs">
        {/* Format Pills & Dimension Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="mr-1 text-[10px] uppercase tracking-widest font-medium hidden sm:inline text-muted-foreground">
            FORMAT:
          </span>
          {formatFilters.map((f) => (
            <Button
              key={f.value}
              id={`filter-format-${f.value}`}
              variant={filters.formatFilter === f.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onFilterChange({ formatFilter: f.value })}
              className="px-3 py-1 h-7 rounded-full font-medium text-[11px] uppercase tracking-wider"
            >
              {f.label}
            </Button>
          ))}

          <div className="h-4 w-px bg-border/80 mx-1 hidden sm:block" />

          {/* Dimension Filter Popover */}
          <DimensionFilterPopover
            minWidth={filters.minWidth}
            maxWidth={filters.maxWidth}
            minHeight={filters.minHeight}
            maxHeight={filters.maxHeight}
            aspectRatioFilter={filters.aspectRatioFilter}
            onChange={(dimFilters) => onFilterChange(dimFilters)}
          />
        </div>

        {/* Right side controls: Select all & Sort */}
        <div className="flex items-center gap-3">
          {images.length > 0 && (
            <div
              id="toggle-select-all-container"
              className="flex items-center gap-2 px-2.5 py-1 rounded-full hover:bg-muted/60 transition-colors border border-transparent hover:border-border/60 select-none"
            >
              <Checkbox
                id="toggle-select-all-checkbox"
                checked={
                  isAllSelected
                    ? true
                    : selectedVisibleCount > 0
                    ? 'indeterminate'
                    : false
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    onSelectAll();
                  } else {
                    onClearSelection();
                  }
                }}
                aria-label={isAllSelected ? '取消全选图片' : '全选当前图片'}
                className="w-4 h-4 rounded-md cursor-pointer"
              />
              <label
                htmlFor="toggle-select-all-checkbox"
                className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground font-medium cursor-pointer py-0.5"
              >
                {isAllSelected
                  ? '取消全选'
                  : selectedVisibleCount > 0
                  ? `全选 (${selectedVisibleCount}/${images.length})`
                  : '全选'}
              </label>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            <div className="w-44">
              <Select
                value={filters.sortBy}
                onValueChange={(val) => onFilterChange({ sortBy: val as SortOption })}
              >
                <SelectTrigger className="h-7 rounded-full text-xs font-normal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {images.length === 0 && (
        <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-border/80 flex flex-col items-center bg-card/40">
          <div className="w-16 h-16 rounded-full border border-border bg-muted/30 flex items-center justify-center mb-4 text-muted-foreground">
            <Images className="w-8 h-8" />
          </div>
          <h3 className="text-base font-light tracking-wide uppercase text-foreground">
            No Assets Found
          </h3>
          <p className="text-xs mt-1 max-w-sm text-muted-foreground">
            Try adjusting your search criteria, album categories, or drag-and-drop to upload new media.
          </p>
          <Button
            onClick={onOpenUpload}
            className="mt-6 px-6 rounded-full text-xs font-bold uppercase tracking-widest shadow-md"
          >
            Upload Now
          </Button>
        </div>
      )}

      {/* Images Container */}
      {images.length > 0 && (
        <>
          {filters.viewMode === 'list' ? (
            <div className="space-y-2.5">
              {images.map((img) => (
                <ImageCard
                  key={img.id}
                  image={img}
                  album={albumMap.get(img.albumId)}
                  isSelected={selectedIds.has(img.id)}
                  onSelect={onToggleSelect}
                  onPreview={onPreview}
                  onDelete={onDelete}
                  onToggleFavorite={onToggleFavorite}
                  onShowToast={onShowToast}
                  viewMode="list"
                />
              ))}
            </div>
          ) : filters.viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {images.map((img) => (
                <ImageCard
                  key={img.id}
                  image={img}
                  album={albumMap.get(img.albumId)}
                  isSelected={selectedIds.has(img.id)}
                  onSelect={onToggleSelect}
                  onPreview={onPreview}
                  onDelete={onDelete}
                  onToggleFavorite={onToggleFavorite}
                  onShowToast={onShowToast}
                  viewMode="grid"
                />
              ))}
            </div>
          ) : (
            /* Masonry Mode */
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 sm:gap-6 space-y-4 sm:space-y-6">
              {images.map((img) => (
                <div key={img.id} className="break-inside-avoid">
                  <ImageCard
                    image={img}
                    album={albumMap.get(img.albumId)}
                    isSelected={selectedIds.has(img.id)}
                    onSelect={onToggleSelect}
                    onPreview={onPreview}
                    onDelete={onDelete}
                    onToggleFavorite={onToggleFavorite}
                    onShowToast={onShowToast}
                    viewMode="masonry"
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Maximize2,
  RotateCcw,
  RectangleHorizontal,
  RectangleVertical,
  Square,
  LayoutGrid,
} from 'lucide-react';
import { AspectRatioFilter } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Field,
  FieldSet,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from './ui/field';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

interface DimensionFilterPopoverProps {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  aspectRatioFilter?: AspectRatioFilter;
  onChange: (filters: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    aspectRatioFilter?: AspectRatioFilter;
  }) => void;
  className?: string;
  triggerVariant?: 'default' | 'outline' | 'ghost' | 'secondary';
  triggerSize?: 'default' | 'sm' | 'lg' | 'icon';
}

export const DimensionFilterPopover: React.FC<DimensionFilterPopoverProps> = ({
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  aspectRatioFilter = 'all',
  onChange,
  className = '',
  triggerVariant = 'ghost',
  triggerSize = 'sm',
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [localMinW, setLocalMinW] = useState<string>(minWidth ? String(minWidth) : '');
  const [localMaxW, setLocalMaxW] = useState<string>(maxWidth ? String(maxWidth) : '');
  const [localMinH, setLocalMinH] = useState<string>(minHeight ? String(minHeight) : '');
  const [localMaxH, setLocalMaxH] = useState<string>(maxHeight ? String(maxHeight) : '');
  const [localAspect, setLocalAspect] = useState<AspectRatioFilter>(aspectRatioFilter || 'all');

  const PRESET_RESOLUTIONS = [
    { label: t('dimension.preset4k'), desc: '≥ 3840×2160', minW: 3840, minH: 2160 },
    { label: t('dimension.preset2k'), desc: '≥ 2560×1440', minW: 2560, minH: 1440 },
    { label: t('dimension.preset1080p'), desc: '≥ 1920×1080', minW: 1920, minH: 1080 },
    { label: t('dimension.preset720p'), desc: '≥ 1280×720', minW: 1280, minH: 720 },
    { label: t('dimension.presetSquare'), desc: '1:1', aspect: 'square' as AspectRatioFilter },
  ];

  // Keep local state synced when props change
  useEffect(() => {
    setLocalMinW(minWidth ? String(minWidth) : '');
    setLocalMaxW(maxWidth ? String(maxWidth) : '');
    setLocalMinH(minHeight ? String(minHeight) : '');
    setLocalMaxH(maxHeight ? String(maxHeight) : '');
    setLocalAspect(aspectRatioFilter || 'all');
  }, [minWidth, maxWidth, minHeight, maxHeight, aspectRatioFilter]);

  const hasActiveDimensionFilters = Boolean(
    minWidth || maxWidth || minHeight || maxHeight || (aspectRatioFilter && aspectRatioFilter !== 'all')
  );

  const handleApply = () => {
    const parseNum = (val: string) => {
      const n = parseInt(val.trim(), 10);
      return isNaN(n) || n <= 0 ? undefined : n;
    };

    onChange({
      minWidth: parseNum(localMinW),
      maxWidth: parseNum(localMaxW),
      minHeight: parseNum(localMinH),
      maxHeight: parseNum(localMaxH),
      aspectRatioFilter: localAspect,
    });
    setIsOpen(false);
  };

  const handleClear = () => {
    setLocalMinW('');
    setLocalMaxW('');
    setLocalMinH('');
    setLocalMaxH('');
    setLocalAspect('all');
    onChange({
      minWidth: undefined,
      maxWidth: undefined,
      minHeight: undefined,
      maxHeight: undefined,
      aspectRatioFilter: 'all',
    });
    setIsOpen(false);
  };

  const handlePresetSelect = (preset: typeof PRESET_RESOLUTIONS[0]) => {
    if (preset.aspect) {
      setLocalAspect(preset.aspect);
      setLocalMinW('');
      setLocalMaxW('');
      setLocalMinH('');
      setLocalMaxH('');
      onChange({
        minWidth: undefined,
        maxWidth: undefined,
        minHeight: undefined,
        maxHeight: undefined,
        aspectRatioFilter: preset.aspect,
      });
      setIsOpen(false);
    } else {
      setLocalMinW(String(preset.minW));
      setLocalMaxW('');
      setLocalMinH(String(preset.minH));
      setLocalMaxH('');
      setLocalAspect('all');
      onChange({
        minWidth: preset.minW,
        maxWidth: undefined,
        minHeight: preset.minH,
        maxHeight: undefined,
        aspectRatioFilter: 'all',
      });
      setIsOpen(false);
    }
  };

  // Generate badge label for active filters
  const getActiveFilterLabel = () => {
    if (!hasActiveDimensionFilters) return null;
    const parts: string[] = [];
    if (minWidth && minHeight && !maxWidth && !maxHeight) {
      parts.push(`≥ ${minWidth}×${minHeight}`);
    } else {
      if (minWidth || maxWidth) {
        parts.push(`W:${minWidth || 0}-${maxWidth || '∞'}`);
      }
      if (minHeight || maxHeight) {
        parts.push(`H:${minHeight || 0}-${maxHeight || '∞'}`);
      }
    }
    if (aspectRatioFilter === 'landscape') parts.push(t('dimension.landscape'));
    if (aspectRatioFilter === 'portrait') parts.push(t('dimension.portrait'));
    if (aspectRatioFilter === 'square') parts.push('1:1');

    return parts.join(', ');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          id="dimension-filter-trigger-btn"
          variant={hasActiveDimensionFilters ? 'default' : triggerVariant}
          size={triggerSize}
          className={`h-7 px-2.5 rounded-full text-xs font-medium gap-1.5 transition-all cursor-pointer ${
            hasActiveDimensionFilters
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          } ${className}`}
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>{t('dimension.activeLabel')}</span>
          {hasActiveDimensionFilters && (
            <span className="max-w-[120px] truncate text-[10px] bg-primary-foreground/20 text-primary-foreground px-1.5 py-0.2 rounded-full">
              {getActiveFilterLabel()}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[360px] sm:w-[380px] p-4 rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-xl shadow-xl space-y-4 text-xs"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
            <Maximize2 className="w-4 h-4 text-primary" />
            <span>{t('dimension.title')}</span>
          </div>
          {hasActiveDimensionFilters && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-muted-foreground hover:text-rose-500 flex items-center gap-0.5 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('dimension.reset')}</span>
            </button>
          )}
        </div>

        {/* Form Body with Field components */}
        <FieldSet className="gap-3.5">
          <FieldGroup className="gap-3">
            {/* Aspect Ratio Selector */}
            <Field className="gap-1.5">
              <FieldLabel className="text-[11px] text-muted-foreground uppercase font-medium tracking-wider">
                {t('dimension.aspectRatio')}
              </FieldLabel>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 border border-border/50">
                <button
                  type="button"
                  onClick={() => setLocalAspect('all')}
                  className={`flex-1 py-1.5 px-1.5 rounded-lg text-center text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    localAspect === 'all'
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  <span>{t('dimension.allAspects')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocalAspect('landscape')}
                  className={`flex-[1.25] py-1.5 px-2 rounded-lg text-center text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    localAspect === 'landscape'
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <RectangleHorizontal className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  <span>{t('dimension.landscape')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocalAspect('portrait')}
                  className={`flex-[1.1] py-1.5 px-1.5 rounded-lg text-center text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    localAspect === 'portrait'
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <RectangleVertical className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  <span>{t('dimension.portrait')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocalAspect('square')}
                  className={`flex-1 py-1.5 px-1.5 rounded-lg text-center text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    localAspect === 'square'
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <Square className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  <span>{t('dimension.square')}</span>
                </button>
              </div>
            </Field>

            {/* Width Range Field */}
            <Field className="gap-1.5">
              <FieldLabel htmlFor="dim-filter-min-w" className="text-[11px] text-muted-foreground uppercase font-medium tracking-wider">
                {t('dimension.widthRange')}
              </FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  id="dim-filter-min-w"
                  type="number"
                  placeholder={t('dimension.minWidth')}
                  value={localMinW}
                  onChange={(e) => setLocalMinW(e.target.value)}
                  className="h-8 text-xs rounded-xl bg-background/80"
                  min={0}
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  id="dim-filter-max-w"
                  type="number"
                  placeholder={t('dimension.maxWidth')}
                  value={localMaxW}
                  onChange={(e) => setLocalMaxW(e.target.value)}
                  className="h-8 text-xs rounded-xl bg-background/80"
                  min={0}
                />
              </div>
            </Field>

            {/* Height Range Field */}
            <Field className="gap-1.5">
              <FieldLabel htmlFor="dim-filter-min-h" className="text-[11px] text-muted-foreground uppercase font-medium tracking-wider">
                {t('dimension.heightRange')}
              </FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  id="dim-filter-min-h"
                  type="number"
                  placeholder={t('dimension.minHeight')}
                  value={localMinH}
                  onChange={(e) => setLocalMinH(e.target.value)}
                  className="h-8 text-xs rounded-xl bg-background/80"
                  min={0}
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  id="dim-filter-max-h"
                  type="number"
                  placeholder={t('dimension.maxHeight')}
                  value={localMaxH}
                  onChange={(e) => setLocalMaxH(e.target.value)}
                  className="h-8 text-xs rounded-xl bg-background/80"
                  min={0}
                />
              </div>
            </Field>
          </FieldGroup>

          {/* Presets Field */}
          <FieldSeparator />
          <Field className="gap-1.5">
            <FieldLabel className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">
              {t('dimension.presets')}
            </FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_RESOLUTIONS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className="px-2 py-1 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted hover:border-primary/50 text-[11px] text-foreground transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>{preset.label}</span>
                  <span className="text-[9px] text-muted-foreground font-mono">({preset.desc})</span>
                </button>
              ))}
            </div>
          </Field>
        </FieldSet>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="rounded-full text-xs h-8 px-3 text-muted-foreground cursor-pointer"
          >
            {t('dimension.clearConditions')}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            className="rounded-full text-xs h-8 px-4 font-semibold shadow-xs cursor-pointer"
          >
            {t('dimension.applyFilters')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

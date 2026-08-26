import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileImage,
  Copy,
  Tag,
  Palette,
  Plus,
  Save,
} from 'lucide-react';
import { UploadQueueItem } from '../types';
import { formatFileSize } from '../utils/imageProcessing';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';

const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 32;
const MAX_PALETTE_COLORS = 12;

// Preset swatch board for quick color-tone selection
const PRESET_PALETTE: string[] = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#f43f5e',
  '#94a3b8',
  '#64748b',
  '#334155',
  '#0f172a',
];

interface UploadModalProps {
  isOpen: boolean;
  queue: UploadQueueItem[];
  onClose: () => void;
  onViewLinks: () => void;
  onRemoveItem: (id: string) => void;
  onSaveMetadata: (
    queueItemId: string,
    imageId: number,
    updates: { tags?: string[]; colorPalette?: string[] }
  ) => Promise<boolean>;
}

interface MetaDraft {
  tags: string[];
  colorPalette: string[];
  tagInput: string;
}

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  queue,
  onClose,
  onViewLinks,
  onRemoveItem,
  onSaveMetadata,
}) => {
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState<Record<string, MetaDraft>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const totalCount = queue.length;
  const doneCount = queue.filter((i) => i.status === 'done').length;
  const isAllDone = totalCount > 0 && doneCount === totalCount;

  // Lazily derive an editable draft from the uploaded result
  const getDraft = (item: UploadQueueItem): MetaDraft => {
    if (drafts[item.id]) return drafts[item.id];
    return {
      tags: [...(item.resultItem?.tags || [])],
      colorPalette: [...(item.resultItem?.colorPalette || [])],
      tagInput: '',
    };
  };

  const updateDraft = (itemId: string, patch: Partial<MetaDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [itemId]: { ...getDraftById(itemId), ...patch },
    }));
    setSavedIds((prev) => {
      if (!prev.has(itemId)) return prev;
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  // Resolve the latest draft without stale-closure issues inside callbacks
  const getDraftById = (itemId: string): MetaDraft => {
    const item = queue.find((i) => i.id === itemId);
    if (!item) return { tags: [], colorPalette: [], tagInput: '' };
    return drafts[itemId] || getDraft(item);
  };

  const addTag = (item: UploadQueueItem) => {
    const draft = getDraft(item);
    const raw = draft.tagInput.trim().replace(/,+$/, '');
    if (!raw) return;
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    const next = [...draft.tags];
    for (const part of parts) {
      if (next.length >= MAX_TAGS) break;
      const clipped = part.slice(0, MAX_TAG_LENGTH);
      if (!next.some((tg) => tg.toLowerCase() === clipped.toLowerCase())) {
        next.push(clipped);
      }
    }
    updateDraft(item.id, { tags: next, tagInput: '' });
  };

  const removeTag = (item: UploadQueueItem, tag: string) => {
    const draft = getDraft(item);
    updateDraft(item.id, { tags: draft.tags.filter((tg) => tg !== tag) });
  };

  const toggleColor = (item: UploadQueueItem, hex: string) => {
    const draft = getDraft(item);
    if (draft.colorPalette.includes(hex)) {
      updateDraft(item.id, { colorPalette: draft.colorPalette.filter((c) => c !== hex) });
    } else if (draft.colorPalette.length < MAX_PALETTE_COLORS) {
      updateDraft(item.id, { colorPalette: [...draft.colorPalette, hex] });
    }
  };

  const addCustomColor = (item: UploadQueueItem, hex: string) => {
    const draft = getDraft(item);
    if (!draft.colorPalette.includes(hex) && draft.colorPalette.length < MAX_PALETTE_COLORS) {
      updateDraft(item.id, { colorPalette: [...draft.colorPalette, hex] });
    }
  };

  const isDirty = (item: UploadQueueItem) => {
    if (!item.resultItem) return false;
    const draft = getDraft(item);
    return (
      !arraysEqual(draft.tags, item.resultItem.tags || []) ||
      !arraysEqual(draft.colorPalette, item.resultItem.colorPalette || [])
    );
  };

  const handleSave = async (item: UploadQueueItem) => {
    if (!item.resultItem || savingIds.has(item.id)) return;
    const draft = getDraft(item);
    setSavingIds((prev) => new Set(prev).add(item.id));
    try {
      const ok = await onSaveMetadata(item.id, item.resultItem.id, {
        tags: draft.tags,
        colorPalette: draft.colorPalette,
      });
      if (ok) {
        setSavedIds((prev) => new Set(prev).add(item.id));
      }
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[94vw] max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-3xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/80 text-left shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full border border-border bg-muted/40 flex items-center justify-center shrink-0">
              {isAllDone ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <UploadCloud className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle>
                {isAllDone ? t('uploadModal.completedTitle') : t('uploadModal.uploadingTitle')}
              </DialogTitle>
              <DialogDescription className="mt-0.5 uppercase tracking-wide text-[11px]">
                {t('uploadModal.counter', { done: doneCount, total: totalCount })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Global Progress Bar */}
        <div className="w-full h-1.5 bg-muted shrink-0">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-300"
            style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
          />
        </div>

        {/* Queue Items List */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-3">
            <AnimatePresence>
              {queue.map((item) => {
                const isSaving = savingIds.has(item.id);
                const isSaved = savedIds.has(item.id);
                const dirty = isDirty(item);
                const draft = getDraft(item);

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-3.5 rounded-2xl border border-border/80 bg-muted/20"
                  >
                    {/* Top Row: thumbnail + info + actions */}
                    <div className="flex items-center gap-3">
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-border flex items-center justify-center bg-background">
                        {item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileImage className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold truncate text-foreground">
                            {item.resultItem?.name || item.name}
                          </p>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {formatFileSize(item.resultItem?.size || item.size)}
                          </span>
                        </div>

                        {/* Status subtitle */}
                        <div className="flex items-center gap-2 mt-1">
                          {item.status === 'processing' && (
                            <span className="flex items-center gap-1 text-[11px] text-primary">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              {t('uploadModal.processing')}
                            </span>
                          )}
                          {item.status === 'done' && (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              {item.isInstant ? '秒传成功' : t('uploadModal.parseSuccess')}
                              {item.isInstant && (
                                <Badge variant="subtle" className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold ml-1">
                                  ⚡ 秒传
                                </Badge>
                              )}
                              {item.resultItem?.compressed && (
                                <Badge variant="subtle" className="text-[9px] text-emerald-600 ml-1">
                                  {t('uploadModal.compressedBadge')}
                                </Badge>
                              )}
                            </span>
                          )}
                          {item.status === 'error' && (
                            <span className="flex items-center gap-1 text-[11px] text-destructive">
                              <AlertCircle className="w-3 h-3" />
                              {item.error || t('uploadModal.uploadFailed')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action button */}
                      {item.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveItem(item.id)}
                          className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Post-upload Metadata Editor (done items only) */}
                    {item.status === 'done' && item.resultItem && (
                      <div className="mt-3 pt-3 border-t border-border/60 space-y-3">
                        {/* Tags */}
                        <div>
                          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                            <Tag className="w-3 h-3" />
                            <span>{t('uploadModal.metaTagsLabel')}</span>
                            <span className="font-mono normal-case tracking-normal">
                              ({draft.tags.length}/{MAX_TAGS})
                            </span>
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {draft.tags.map((tag) => (
                              <span
                                key={`tag-${item.id}-${tag}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
                              >
                                #{tag}
                                <button
                                  type="button"
                                  onClick={() => removeTag(item, tag)}
                                  className="hover:text-destructive cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                            <Input
                              value={draft.tagInput}
                              onChange={(e) => updateDraft(item.id, { tagInput: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ',') {
                                  e.preventDefault();
                                  addTag(item);
                                }
                              }}
                              onBlur={() => draft.tagInput.trim() && addTag(item)}
                              maxLength={MAX_TAG_LENGTH}
                              placeholder={t('uploadModal.metaTagsPlaceholder')}
                              disabled={draft.tags.length >= MAX_TAGS}
                              className="h-7 flex-1 min-w-[140px] text-xs rounded-full"
                            />
                          </div>
                        </div>

                        {/* Color Palette (色系) */}
                        <div>
                          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                            <Palette className="w-3 h-3" />
                            <span>{t('uploadModal.metaPaletteLabel')}</span>
                            <span className="font-mono normal-case tracking-normal">
                              ({draft.colorPalette.length}/{MAX_PALETTE_COLORS})
                            </span>
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {PRESET_PALETTE.map((hex) => {
                              const selected = draft.colorPalette.includes(hex);
                              return (
                                <button
                                  key={`swatch-${item.id}-${hex}`}
                                  id={`swatch-${item.id}-${hex.replace('#', '')}`}
                                  type="button"
                                  title={hex}
                                  onClick={() => toggleColor(item, hex)}
                                  className={`w-6 h-6 rounded-lg border transition-all cursor-pointer hover:scale-110 ${
                                    selected
                                      ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-110'
                                      : 'border-black/10 dark:border-white/10 opacity-80 hover:opacity-100'
                                  }`}
                                  style={{ backgroundColor: hex }}
                                />
                              );
                            })}

                            {/* Custom color picker */}
                            <label
                              className="relative w-6 h-6 rounded-lg border border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary hover:text-primary text-muted-foreground transition-colors overflow-hidden"
                              title={t('uploadModal.metaCustomColor')}
                            >
                              <Plus className="w-3 h-3 pointer-events-none" />
                              <input
                                type="color"
                                value="#3b82f6"
                                onChange={(e) => addCustomColor(item, e.target.value.toUpperCase())}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                            </label>
                          </div>

                          {/* Selected colors summary */}
                          {draft.colorPalette.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 mt-2">
                              {draft.colorPalette.map((hex) => (
                                <span
                                  key={`sel-${item.id}-${hex}`}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-muted/70 border border-border/60 text-muted-foreground"
                                >
                                  <span
                                    className="w-2.5 h-2.5 rounded-full border border-black/10 dark:border-white/10"
                                    style={{ backgroundColor: hex }}
                                  />
                                  {hex}
                                  <button
                                    type="button"
                                    onClick={() => toggleColor(item, hex)}
                                    className="hover:text-destructive cursor-pointer"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Save row */}
                        <div className="flex items-center justify-end gap-2">
                          {isSaved && !dirty && (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-medium mr-auto">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {t('uploadModal.metaSaved')}
                            </span>
                          )}
                          <Button
                            size="sm"
                            disabled={!dirty || isSaving}
                            onClick={() => handleSave(item)}
                            className={`h-7 rounded-full px-4 text-xs font-semibold gap-1.5 ${
                              dirty
                                ? 'cursor-pointer shadow-md'
                                : 'cursor-not-allowed opacity-50'
                            }`}
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {t('uploadModal.metaSavingBtn')}
                              </>
                            ) : (
                              <>
                                <Save className="w-3 h-3" />
                                {t('uploadModal.metaSaveBtn')}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <DialogFooter className="p-4 px-6 border-t border-border/80 bg-muted/20 flex flex-row items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-muted-foreground">
            {isAllDone ? t('uploadModal.allDonePrompt') : t('uploadModal.waitingPrompt')}
          </span>

          <div className="flex items-center gap-2">
            <Button
              id="cancel-all-upload-btn"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-full px-5 text-xs font-mono cursor-pointer"
            >
              {isAllDone ? t('common.done') : t('uploadModal.backgroundBtn')}
            </Button>

            {isAllDone && (
              <Button
                id="view-generated-links-btn"
                size="sm"
                onClick={onViewLinks}
                className="rounded-full gap-1.5 px-6 text-xs font-bold uppercase tracking-wider shadow-md cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{t('uploadModal.viewLinksBtn')}</span>
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

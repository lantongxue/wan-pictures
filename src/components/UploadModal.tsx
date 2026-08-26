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

interface UploadModalProps {
  isOpen: boolean;
  queue: UploadQueueItem[];
  onClose: () => void;
  onViewLinks: () => void;
  onRemoveItem: (id: string) => void;
  onSaveMetadata: (
    queueItemId: string,
    imageId: number,
    updates: { tags?: string[] }
  ) => Promise<boolean>;
}

interface MetaDraft {
  tags: string[];
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

  if (!isOpen) return null;

  const totalCount = queue.length;
  const doneCount = queue.filter((i) => i.status === 'done').length;
  const isAllDone = totalCount > 0 && doneCount === totalCount;

  // Lazily derive an editable draft from the uploaded result
  const getDraft = (item: UploadQueueItem): MetaDraft => {
    if (drafts[item.id]) return drafts[item.id];
    return {
      tags: [...(item.resultItem?.tags || [])],
      tagInput: '',
    };
  };

  const updateDraft = (itemId: string, patch: Partial<MetaDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [itemId]: { ...getDraftById(itemId), ...patch },
    }));
  };

  // Resolve the latest draft without stale-closure issues inside callbacks
  const getDraftById = (itemId: string): MetaDraft => {
    const item = queue.find((i) => i.id === itemId);
    if (!item) return { tags: [], tagInput: '' };
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

  const isDirty = (item: UploadQueueItem) => {
    if (!item.resultItem) return false;
    const draft = getDraft(item);
    return !arraysEqual(draft.tags, item.resultItem.tags || []);
  };

  // Finish: close the modal and asynchronously submit every dirty tag draft.
  // The saves run in the background; their results surface via toasts.
  const handleFinish = () => {
    for (const item of queue) {
      if (item.status === 'done' && item.resultItem && isDirty(item)) {
        const draft = getDraft(item);
        void onSaveMetadata(item.id, item.resultItem.id, { tags: draft.tags });
      }
    }
    onClose();
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

                        {/* Hint: tags are saved when the dialog is finished */}
                        <p className="text-[10px] text-muted-foreground">
                          {t('uploadModal.metaSaveHint')}
                        </p>
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
              onClick={handleFinish}
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

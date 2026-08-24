import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Copy,
  Check,
  Code,
  QrCode,
  FileCode2,
  X,
} from 'lucide-react';
import { ImageItem, LinkFormatType } from '../types';
import {
  LINK_FORMAT_OPTIONS,
  formatSingleImageLink,
  formatBatchImageLinks,
  copyToClipboard,
} from '../utils/linkFormatter';
import { generateSimpleQRCode } from '../utils/imageProcessing';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ScrollArea } from './ui/scroll-area';

interface LinkGeneratorModalProps {
  isOpen: boolean;
  images: ImageItem[];
  onClose: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const LinkGeneratorModal: React.FC<LinkGeneratorModalProps> = ({
  isOpen,
  images,
  onClose,
  onShowToast,
}) => {
  const { t } = useTranslation();
  const [selectedFormat, setSelectedFormat] = useState<LinkFormatType>('markdown');
  const [batchSeparator, setBatchSeparator] = useState<'\n' | '\n\n' | 'markdown_list'>('\n');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[selectedImageIndex] || images[0];

  const handleCopySingle = async (img: ImageItem, format: LinkFormatType) => {
    const text = formatSingleImageLink(img, format);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(`${img.id}-${format}`);
      onShowToast(t('common.copied'), `${img.name} (${format.toUpperCase()})`, 'success');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCopyBatch = async () => {
    const text = formatBatchImageLinks(images, selectedFormat, batchSeparator);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId('batch');
      onShowToast(t('linkGen.copyAllSuccess'), t('linkGen.copyAllDesc', { count: images.length, format: selectedFormat.toUpperCase() }), 'success');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const qrCodeDataUrl = generateSimpleQRCode(currentImage.dataUrl, 200);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[94vw] max-w-3xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-3xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/80 text-left shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-border bg-muted/40 flex items-center justify-center text-foreground shrink-0">
              <Code className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                <span>{t('linkGen.title')}</span>
                <Badge variant="subtle" className="text-[10px]">
                  {images.length} {t('common.items')}
                </Badge>
              </DialogTitle>
              <DialogDescription className="mt-0.5 uppercase tracking-wide text-[11px]">
                {t('linkGen.subtitle')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Format Selector Tab Bar */}
        <div className="px-6 py-2.5 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {LINK_FORMAT_OPTIONS.map((opt) => (
              <Button
                key={opt.type}
                id={`format-tab-${opt.type}`}
                variant={selectedFormat === opt.type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFormat(opt.type)}
                className="rounded-full h-8 font-medium text-xs gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-6">
            {/* Active Preview & Batch Output */}
            <div className="border border-border/80 rounded-2xl p-5 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  {t('linkGen.codePreview')} ({images.length === 1 ? t('linkGen.single') : t('linkGen.batchMerge')})
                </span>
                <div className="flex items-center gap-2">
                  {images.length > 1 && (
                    <div className="w-40">
                      <Select
                        value={batchSeparator}
                        onValueChange={(v) =>
                          setBatchSeparator(v as '\n' | '\n\n' | 'markdown_list')
                        }
                      >
                        <SelectTrigger className="h-7 text-[11px] rounded-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="\n">{t('linkGen.sepSingleLine')}</SelectItem>
                          <SelectItem value="\n\n">{t('linkGen.sepDoubleLine')}</SelectItem>
                          <SelectItem value="markdown_list">{t('linkGen.sepMdList')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button
                    id="batch-copy-main-btn"
                    size="sm"
                    onClick={handleCopyBatch}
                    className="rounded-full gap-1.5 px-4 font-bold shadow-md cursor-pointer"
                  >
                    {copiedId === 'batch' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t('linkGen.copiedAll')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t('linkGen.copyAll')}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <pre className="p-4 border border-border/80 rounded-xl text-xs font-mono max-h-36 overflow-y-auto whitespace-pre-wrap break-all select-all leading-relaxed bg-background text-foreground shadow-2xs">
                {formatBatchImageLinks(images, selectedFormat, batchSeparator)}
              </pre>
            </div>

            {/* Individual Image Cards with Quick Copy per Row */}
            <div>
              <h4 className="text-[10px] font-mono uppercase tracking-[0.25em] mb-3 text-muted-foreground font-semibold">
                {t('linkGen.individualLinks')}
              </h4>

              <div className="space-y-2.5">
                {images.map((img, idx) => {
                  const formattedLink = formatSingleImageLink(img, selectedFormat);
                  const isSelected = selectedImageIndex === idx;

                  return (
                    <div
                      key={img.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center gap-3 ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-xs'
                          : 'border-border/80 bg-muted/20 hover:border-border'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div
                        onClick={() => setSelectedImageIndex(idx)}
                        className="w-12 h-12 rounded-xl border border-border overflow-hidden shrink-0 cursor-pointer relative group bg-background"
                      >
                        <img
                          src={img.dataUrl}
                          alt={img.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>

                      {/* Link text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium truncate text-foreground">
                            {img.name}
                          </span>
                          <Badge variant="subtle" className="text-[10px]">
                            {img.extension}
                          </Badge>
                        </div>
                        <p className="text-[11px] font-mono truncate mt-1 px-3 py-1.5 rounded-lg border border-border/60 bg-background text-muted-foreground">
                          {formattedLink}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <Button
                          id={`copy-item-btn-${img.id}`}
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopySingle(img, selectedFormat)}
                          className="rounded-full gap-1.5 h-8 font-mono text-xs cursor-pointer"
                        >
                          {copiedId === `${img.id}-${selectedFormat}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span>{t('common.copied')}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{t('common.copy')}</span>
                            </>
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedImageIndex(idx);
                            setShowQrCode(true);
                          }}
                          className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                          title={t('linkGen.qrTitle')}
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* QR Code Section */}
            {showQrCode && (
              <div className="p-5 rounded-2xl border border-border bg-muted/30 flex flex-col items-center text-center">
                <div className="flex items-center justify-between w-full mb-3">
                  <span className="text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 text-foreground font-semibold">
                    <QrCode className="w-4 h-4 text-primary" />
                    <span>{t('linkGen.qrTitle')}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowQrCode(false)}
                    className="rounded-full h-6 w-6 text-muted-foreground cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {qrCodeDataUrl && (
                  <div className="p-3.5 bg-white rounded-2xl shadow-md inline-block my-2 border border-neutral-200">
                    <img
                      src={qrCodeDataUrl}
                      alt="Image QR Code"
                      className="w-36 h-36 object-contain"
                    />
                  </div>
                )}
                <p className="text-xs mt-1 max-w-sm truncate font-mono text-muted-foreground">
                  {currentImage.name}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="p-4 px-6 border-t border-border/80 bg-muted/20 shrink-0">
          <Button
            id="close-link-modal-footer-btn"
            variant="outline"
            onClick={onClose}
            className="rounded-full px-6 uppercase tracking-wider text-xs font-bold cursor-pointer"
          >
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

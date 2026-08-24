import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Archive,
  FolderInput,
  Trash2,
  X,
  CheckCircle2,
  FileCode,
} from 'lucide-react';
import JSZip from 'jszip';
import { ImageItem, Album } from '../types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface BatchActionBarProps {
  selectedImages: ImageItem[];
  albums: Album[];
  onClearSelection: () => void;
  onOpenBatchLinks: () => void;
  onBatchMoveToAlbum: (albumId: string) => void;
  onBatchDelete: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info') => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedImages,
  albums,
  onClearSelection,
  onOpenBatchLinks,
  onBatchMoveToAlbum,
  onBatchDelete,
  onShowToast,
}) => {
  const [isZipping, setIsZipping] = useState(false);

  if (selectedImages.length === 0) return null;

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      onShowToast('正在打包压缩包...', `共 ${selectedImages.length} 张图片`, 'info');

      const zip = new JSZip();

      for (const img of selectedImages) {
        if (img.dataUrl.startsWith('data:')) {
          const base64Data = img.dataUrl.split(',')[1];
          zip.file(img.name, base64Data, { base64: true });
        } else {
          try {
            const resp = await fetch(img.dataUrl);
            const blob = await resp.blob();
            zip.file(img.name, blob);
          } catch {
            zip.file(`${img.name}.url.txt`, img.dataUrl);
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wan_batch_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onShowToast('打包下载成功', 'ZIP 文件已生成并开始下载', 'success');
    } catch (err) {
      console.error(err);
      onShowToast('打包失败', '部分远程图片无法跨域下载', 'error' as any);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div
      id="batch-action-dock"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[90%] sm:w-auto"
    >
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.95 }}
        className="flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-full border border-border/80 bg-background/95 text-foreground shadow-2xl backdrop-blur-2xl text-xs"
      >
        {/* Count pill */}
        <Badge variant="subtle" className="gap-1.5 px-3 py-1 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
          <span>{selectedImages.length} SELECTED</span>
        </Badge>

        {/* Batch Copy Links */}
        <Button
          id="batch-copy-links-btn"
          size="sm"
          onClick={onOpenBatchLinks}
          className="rounded-full gap-1.5 px-4 uppercase tracking-wider font-bold shadow-md"
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>生成外链</span>
        </Button>

        {/* Move to Album Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              id="batch-move-album-btn"
              variant="outline"
              size="sm"
              className="rounded-full gap-1.5"
            >
              <FolderInput className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">移至相册</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>选择目标相册</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {albums.map((alb) => (
              <DropdownMenuItem
                key={alb.id}
                onClick={() => {
                  onBatchMoveToAlbum(alb.id);
                  onShowToast('相册转移成功', `已移入 "${alb.name}"`, 'success');
                }}
                className="gap-2"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: alb.color }}
                />
                <span className="truncate">{alb.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Batch Download ZIP */}
        <Button
          id="batch-zip-btn"
          variant="outline"
          size="sm"
          disabled={isZipping}
          onClick={handleDownloadZip}
          className="rounded-full gap-1.5"
        >
          <Archive className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden sm:inline">
            {isZipping ? '打包中...' : '打包 ZIP'}
          </span>
        </Button>

        {/* Batch Delete */}
        <Button
          id="batch-delete-btn"
          variant="destructive"
          size="sm"
          onClick={onBatchDelete}
          className="rounded-full gap-1.5 bg-destructive/15 text-destructive hover:bg-destructive/25 shadow-none border border-destructive/30"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">删除</span>
        </Button>

        {/* Clear Selection */}
        <Button
          id="clear-selection-btn"
          variant="ghost"
          size="icon"
          onClick={onClearSelection}
          className="rounded-full h-8 w-8 ml-auto text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
};

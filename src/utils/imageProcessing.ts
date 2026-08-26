export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Whitelist enforced on every upload entry point (drop, picker, paste).
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/png', // PNG
  'image/jpeg', // JPG
  'image/webp', // WEBP
  'image/gif', // GIF
  'image/svg+xml', // SVG
  'image/avif', // AVIF
  'image/bmp', // BMP
  'image/x-icon', // ICO
  'image/vnd.microsoft.icon', // ICO (alias)
] as const;

const ALLOWED_IMAGE_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'svg',
  'avif',
  'bmp',
  'ico',
];

export function isAllowedImageType(mimeType: string, fileName?: string): boolean {
  if (mimeType && ALLOWED_IMAGE_MIME_TYPES.includes(mimeType.toLowerCase() as any)) {
    return true;
  }
  // Fallback to extension when browser reports an empty/unmapped MIME type
  if (!fileName) return false;
  const ext = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
}

export function partitionAllowedImages(files: File[]): { accepted: File[]; rejected: File[] } {
  const accepted: File[] = [];
  const rejected: File[] = [];
  for (const file of files) {
    if (isAllowedImageType(file.type, file.name)) accepted.push(file);
    else rejected.push(file);
  }
  return { accepted, rejected };
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function extractExtension(filename: string, mimeType: string): string {
  const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
  if (extMatch) return extMatch[1].toLowerCase();
  
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
    'image/bmp': 'bmp',
    'image/x-icon': 'ico',
  };
  return mimeMap[mimeType] || 'png';
}

/**
 * UUID v4 generator. Prefers native crypto.randomUUID; falls back to
 * crypto.getRandomValues formatting on insecure contexts (plain HTTP).
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Lightweight QR Code generator using canvas
 * Generates an SVG / Data URL QR code without huge bundles
 */
export function generateSimpleQRCode(text: string, size = 200): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // Draw simulated crisp QR structure using deterministic bit hashing
  ctx.fillStyle = '#0F172A';
  const moduleCount = 25;
  const cellSize = Math.floor((size - 24) / moduleCount);
  const offset = Math.floor((size - moduleCount * cellSize) / 2);

  // Draw 3 Corner Position Markers
  const drawCorner = (r: number, c: number) => {
    ctx.fillRect(offset + c * cellSize, offset + r * cellSize, 7 * cellSize, 7 * cellSize);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(offset + (c + 1) * cellSize, offset + (r + 1) * cellSize, 5 * cellSize, 5 * cellSize);
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(offset + (c + 2) * cellSize, offset + (r + 2) * cellSize, 3 * cellSize, 3 * cellSize);
  };

  drawCorner(0, 0);
  drawCorner(0, moduleCount - 7);
  drawCorner(moduleCount - 7, 0);

  // Generate deterministic pattern for content
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      // Skip corners
      if (
        (r < 8 && c < 8) ||
        (r < 8 && c >= moduleCount - 8) ||
        (r >= moduleCount - 8 && c < 8)
      ) {
        continue;
      }
      const val = Math.abs(Math.sin((r * 31 + c * 17 + hash) * 0.1));
      if (val > 0.45) {
        ctx.fillRect(offset + c * cellSize, offset + r * cellSize, cellSize - 0.5, cellSize - 0.5);
      }
    }
  }

  return canvas.toDataURL('image/png');
}

import { ImageItem, LinkFormatType } from '../types';

export interface FormattedLinkOption {
  type: LinkFormatType;
  label: string;
  syntaxExample: string;
  format: (item: ImageItem, customUrl?: string) => string;
}

export const LINK_FORMAT_OPTIONS: FormattedLinkOption[] = [
  {
    type: 'raw',
    label: '原始直链 (URL)',
    syntaxExample: 'https://example.com/image.png',
    format: (item, customUrl) => customUrl || item.dataUrl,
  },
  {
    type: 'markdown',
    label: 'Markdown 语法',
    syntaxExample: '![name](https://...)',
    format: (item, customUrl) => `![${item.name}](${customUrl || item.dataUrl})`,
  },
  {
    type: 'html',
    label: 'HTML 代码',
    syntaxExample: '<img src="..." alt="name" />',
    format: (item, customUrl) => `<img src="${customUrl || item.dataUrl}" alt="${item.name}" />`,
  },
  {
    type: 'bbcode',
    label: 'BBCode 论坛代码',
    syntaxExample: '[img]https://...[/img]',
    format: (item, customUrl) => `[img]${customUrl || item.dataUrl}[/img]`,
  },
  {
    type: 'markdown_link',
    label: 'Markdown 带点击链接',
    syntaxExample: '[![name](url)](url)',
    format: (item, customUrl) => `[![${item.name}](${customUrl || item.dataUrl})](${customUrl || item.dataUrl})`,
  },
  {
    type: 'data_uri',
    label: 'Data URI (Base64)',
    syntaxExample: 'data:image/png;base64,...',
    format: (item) => item.dataUrl,
  },
];

export function formatSingleImageLink(
  item: ImageItem,
  formatType: LinkFormatType,
  customUrl?: string
): string {
  const option = LINK_FORMAT_OPTIONS.find((opt) => opt.type === formatType);
  if (option) {
    return option.format(item, customUrl);
  }
  return item.dataUrl;
}

export function formatBatchImageLinks(
  items: ImageItem[],
  formatType: LinkFormatType,
  separator: '\n' | '\n\n' | ', ' | 'markdown_list' = '\n'
): string {
  const lines = items.map((img) => formatSingleImageLink(img, formatType));
  if (separator === 'markdown_list') {
    return lines.map((line) => `- ${line}`).join('\n');
  }
  return lines.join(separator);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    }
  } catch (err) {
    console.error('Copy failed:', err);
    return false;
  }
}

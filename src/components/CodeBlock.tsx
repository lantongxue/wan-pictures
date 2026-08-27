import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Highlight, themes, type Language } from 'prism-react-renderer';
import { copyToClipboard } from '../utils/linkFormatter';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language: string;
  label?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, label }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative rounded-xl border border-border/70 overflow-hidden bg-[#0d1117]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/10 bg-white/[0.03]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {label || language}
        </span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? t('common.copied') : t('common.copy')}
        </button>
      </div>

      {/* Highlighted code */}
      <Highlight theme={themes.vsDark} code={code.trim()} language={language as Language}>
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono"
            style={{ ...style, background: 'transparent' }}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
};
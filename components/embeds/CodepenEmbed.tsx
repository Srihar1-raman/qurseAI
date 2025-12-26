'use client';

import React, { useMemo } from 'react';

interface CodepenEmbedProps {
  code: string;
  type: 'codepen' | 'codesandbox';
  className?: string;
}

export const CodepenEmbed: React.FC<CodepenEmbedProps> = React.memo(({ code, type, className = '' }) => {
  const embedUrl = useMemo(() => {
    if (type === 'codepen') {
      // Parse CodePen format: username | slug | tabs | theme
      const parts = code.split('|').map(p => p.trim());
      const [slug, ...options] = parts;

      const optionsStr = options.join(',');
      return `https://codepen.io/${slug}/embed/${optionsStr ? `?${optionsStr}` : ''}`;
    } else {
      // CodeSandbox format: just the sandbox ID or URL
      const sandboxId = code.includes('codesandbox.io') ? code.split('/').pop() : code;
      return `https://codesandbox.io/embed/${sandboxId}?fontsize=14&hidenavigation=1&theme=dark`;
    }
  }, [code, type]);

  return (
    <div className={`my-6 rounded-lg overflow-hidden border border-border ${className}`}>
      <iframe
        src={embedUrl}
        title={type === 'codepen' ? 'CodePen embed' : 'CodeSandbox embed'}
        className="w-full"
        style={{ height: type === 'codepen' ? '400px' : '500px' }}
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
});

CodepenEmbed.displayName = 'CodepenEmbed';

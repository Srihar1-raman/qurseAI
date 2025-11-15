'use client';

import { memo } from 'react';

function Footer() {
  return (
    <footer 
      className="text-center"
      style={{
        padding: '10px 20px',
        fontSize: '13px',
        color: 'var(--color-text-secondary)',
      }}
    >
      <a 
        href="/info?section=terms" 
        className="hover:underline"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Terms
      </a>
      {' • '}
      <a 
        href="/info?section=privacy" 
        className="hover:underline"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Privacy Policy
      </a>
      {' • '}
      <a 
        href="/info?section=cookies" 
        className="hover:underline"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Cookies
      </a>
    </footer>
  );
}

export default memo(Footer);

'use client';

import React from 'react';
import Image from 'next/image';

interface AuthBackgroundProps {
  showMobile?: boolean;
}

/**
 * Auth page background image component using Next.js Image optimization
 * Handles both mobile and desktop backgrounds
 */
export function AuthBackground({ showMobile = false }: AuthBackgroundProps) {
  if (showMobile) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          filter: 'blur(3px) brightness(0.6)',
        }}
      >
        <Image
          src="/images/login-page.jpeg"
          alt=""
          fill
          priority
          quality={75}
          sizes="100vw"
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="image-section"
      style={{
        width: '66.667%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Image
        src="/images/login-page.jpeg"
        alt=""
        fill
        priority
        quality={80}
        sizes="(max-width: 768px) 0vw, 66vw"
        style={{
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />
    </div>
  );
}

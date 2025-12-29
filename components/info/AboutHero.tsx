'use client';

import React, { useEffect, useState } from 'react';
import { ModelIconCarousel as UIModelIconCarousel } from '@/components/ui/ModelIconCarousel';

/**
 * About page hero section with background image, parallax effect, and model carousel
 * Uses the same blend technique as the rate limit popup
 */
export function AboutHero() {
  const [transformY, setTransformY] = useState(0);
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  // Track scroll for subtle parallax effect with RAF for smoothness
  useEffect(() => {
    let rafId: number;
    let currentScrollY = 0;

    const handleScroll = () => {
      currentScrollY = window.scrollY;
    };

    // Use RAF to update transform for smooth 60fps parallax
    const updateParallax = () => {
      // Parallax: background moves at 30% of scroll speed (subtle)
      setTransformY(currentScrollY * 0.3);
      rafId = requestAnimationFrame(updateParallax);
    };

    // Start the RAF loop
    rafId = requestAnimationFrame(updateParallax);

    // Passive scroll listener for performance
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const handleIconHover = (iconName: string | null, mouseX: number, mouseY: number) => {
    if (iconName) {
      setHoveredIcon(iconName);
      setCursorPosition({ x: mouseX, y: mouseY });
    } else {
      setHoveredIcon(null);
    }
  };

  // Track mouse movement globally when an icon is hovered
  useEffect(() => {
    if (!hoveredIcon) return;

    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [hoveredIcon]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        minHeight: '600px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible', // Changed to visible so bottom fade extends into content
      }}
    >
      {/* Background image layer with gradient fade at top and bottom */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 'calc(100% + 100px)', // Extend 100px below for bottom fade
          backgroundImage: 'url(/images/login-page.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.15,
          zIndex: 0,
          pointerEvents: 'none',
          // Smooth parallax using transform (GPU accelerated)
          transform: `translateY(${transformY}px)`,
          willChange: 'transform',
          // Mask for gradient fade at top and bottom
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 75%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 75%, transparent 100%)',
        }}
      />

      {/* Content layer - centered */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '768px',
          padding: '20px',
          marginTop: '-180px', // Move content up
        }}
      >
        {/* Qurse logo - Reenie Beanie, very large */}
        <h1
          className="font-reenie"
          style={{
            fontSize: 'clamp(80px, 15vw, 140px)', // Responsive: 80px min, 140px max
            fontWeight: 400,
            color: 'var(--color-text)',
            marginBottom: '40px',
            lineHeight: '1.05',
            textAlign: 'center',
          }}
        >
          Qurse
        </h1>

        {/* Model Icon Carousel */}
        <UIModelIconCarousel
          isOpen={true}
          onIconHover={handleIconHover}
          speedNormal={20000}
          speedHover={30000}
          containerStyle={{
            width: '100%',
            height: '100px',
          }}
          iconSize={52}
          iconContainerSize={64}
          gap="16px"
          itemMinWidth="80px"
          maskFade="60px"
        />

        {/* Subtitle - Normal font */}
        <p
          style={{
            fontSize: 'clamp(24px, 4vw, 28px)', // Responsive font size - bigger
            fontWeight: 400,
            color: 'var(--color-text-secondary)',
            marginTop: '16px',
            textAlign: 'center',
            letterSpacing: '0.3px',
            lineHeight: '1.4',
          }}
        >
          AI web inference for the{' '}
          <span
            style={{
              fontStyle: 'italic',
              color: 'var(--color-text)',
            }}
          >
            fast
          </span>
        </p>
      </div>

      {/* Tooltip */}
      {hoveredIcon && (
        <div
          style={{
            position: 'fixed',
            left: `${cursorPosition.x}px`,
            top: `${cursorPosition.y + 20}px`,
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-text)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {hoveredIcon}
        </div>
      )}
    </div>
  );
}

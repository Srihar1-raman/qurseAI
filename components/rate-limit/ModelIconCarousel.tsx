'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { RATE_LIMIT_CONSTANTS, PREMIUM_MODELS } from './constants';

export interface ModelIconCarouselProps {
  isOpen: boolean;
}

/**
 * Shared carousel component for premium model icons
 * Handles smooth animation, hover effects, and tooltip display
 */
export function ModelIconCarousel({ isOpen }: ModelIconCarouselProps) {
  const { resolvedTheme, mounted } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const [hoveredIconName, setHoveredIconName] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);

  // Smooth carousel animation with speed transitions
  useEffect(() => {
    if (!isOpen) return;

    let lastTime = performance.now();
    let accumulatedTime = animationProgress * (isHovered ? RATE_LIMIT_CONSTANTS.CAROUSEL_SPEED_HOVER : RATE_LIMIT_CONSTANTS.CAROUSEL_SPEED_NORMAL);

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
        lastTime = currentTime;
      }

      const deltaTime = Math.min(currentTime - lastTime, 100); // Cap delta to prevent large jumps
      lastTime = currentTime;

      const duration = isHovered ? RATE_LIMIT_CONSTANTS.CAROUSEL_SPEED_HOVER : RATE_LIMIT_CONSTANTS.CAROUSEL_SPEED_NORMAL;
      const speed = 1 / duration;

      accumulatedTime += deltaTime;
      const progress = (accumulatedTime * speed) % 1;

      setAnimationProgress(progress);
      animationRef.current = requestAnimationFrame(animate);
    };

    startTimeRef.current = performance.now();
    lastTime = performance.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isOpen, isHovered, animationProgress]);

  // Global mouse move listener for tooltip positioning
  useEffect(() => {
    if (!isOpen || !hoveredIcon) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isOpen, hoveredIcon]);

  return (
    <>
      {/* Tooltip at cursor position - rendered at root level */}
      {hoveredIcon && hoveredIconName && (
        <div
          style={{
            position: 'fixed',
            left: `${mousePosition.x + RATE_LIMIT_CONSTANTS.TOOLTIP_OFFSET}px`,
            top: `${mousePosition.y + RATE_LIMIT_CONSTANTS.TOOLTIP_OFFSET}px`,
            pointerEvents: 'none',
            zIndex: 10001,
            fontSize: RATE_LIMIT_CONSTANTS.TOOLTIP_FONT_SIZE,
            color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-bg)',
            padding: RATE_LIMIT_CONSTANTS.TOOLTIP_PADDING,
            borderRadius: RATE_LIMIT_CONSTANTS.TOOLTIP_BORDER_RADIUS,
            border: '1px solid var(--color-border)',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
        >
          {hoveredIconName}
        </div>
      )}

      {/* Carousel container */}
      <div
        style={{
          position: 'relative',
          top: RATE_LIMIT_CONSTANTS.CAROUSEL_OFFSET_TOP,
          width: 'calc(100% + 40px)',
          height: RATE_LIMIT_CONSTANTS.CAROUSEL_HEIGHT,
          margin: RATE_LIMIT_CONSTANTS.SECTION_MARGIN,
          overflow: 'hidden',
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          setHoveredIcon(null);
          setHoveredIconName(null);
        }}
        onMouseMove={(e) => {
          if (hoveredIcon) {
            setMousePosition({ x: e.clientX, y: e.clientY });
          }
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            maskImage: `linear-gradient(to right, transparent 0px, black ${RATE_LIMIT_CONSTANTS.CAROUSEL_MASK_FADE}, black calc(100% - ${RATE_LIMIT_CONSTANTS.CAROUSEL_MASK_FADE}), transparent 100%)`,
            WebkitMaskImage: `linear-gradient(to right, transparent 0px, black ${RATE_LIMIT_CONSTANTS.CAROUSEL_MASK_FADE}, black calc(100% - ${RATE_LIMIT_CONSTANTS.CAROUSEL_MASK_FADE}), transparent 100%)`,
          }}
        >
          <div
            className="carousel-container"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: RATE_LIMIT_CONSTANTS.CAROUSEL_GAP,
              width: 'max-content',
              transform: `translate3d(-${animationProgress * 50}%, 0, 0)`,
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            {/* Duplicate set for seamless loop */}
            {[...PREMIUM_MODELS, ...PREMIUM_MODELS].map((model, index) => {
              const iconKey = `${model.icon}-${index}`;
              return (
                <div
                  key={iconKey}
                  onMouseEnter={(e) => {
                    setIsHovered(true);
                    setHoveredIcon(iconKey);
                    setHoveredIconName(model.name);
                    setMousePosition({ x: e.clientX, y: e.clientY });
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: RATE_LIMIT_CONSTANTS.CAROUSEL_ITEM_MIN_WIDTH,
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: `${RATE_LIMIT_CONSTANTS.CAROUSEL_ICON_CONTAINER_SIZE}px`,
                      height: `${RATE_LIMIT_CONSTANTS.CAROUSEL_ICON_CONTAINER_SIZE}px`,
                    }}
                  >
                    <Image
                      src={getIconPath(model.icon, resolvedTheme, false, mounted)}
                      alt={model.name}
                      width={RATE_LIMIT_CONSTANTS.CAROUSEL_ICON_SIZE}
                      height={RATE_LIMIT_CONSTANTS.CAROUSEL_ICON_SIZE}
                      style={{
                        opacity: 0.8,
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}


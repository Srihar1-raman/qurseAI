'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { PREMIUM_MODELS } from '@/components/rate-limit/constants';

export interface ModelIconCarouselProps {
  /** Whether the carousel is active/visible */
  isOpen: boolean;
  /** Callback when icon is hovered (iconName, mouseX, mouseY) */
  onIconHover?: (iconName: string | null, mouseX: number, mouseY: number) => void;
  /** Custom models to display (defaults to PREMIUM_MODELS) */
  models?: ReadonlyArray<{ name: string; icon: string }>;
  /** Animation speed when not hovered (milliseconds) */
  speedNormal?: number;
  /** Animation speed when hovered (milliseconds) */
  speedHover?: number;
  /** Container styling */
  containerStyle?: React.CSSProperties;
  /** Icon size in pixels */
  iconSize?: number;
  /** Icon container size in pixels */
  iconContainerSize?: number;
  /** Gap between icons */
  gap?: string;
  /** Minimum width per icon item */
  itemMinWidth?: string;
  /** Mask fade distance for edges */
  maskFade?: string;
}

/**
 * Reusable carousel component for displaying model icons
 * Handles smooth animation, hover effects, and tooltip callbacks
 */
export function ModelIconCarousel({
  isOpen,
  onIconHover,
  models = PREMIUM_MODELS,
  speedNormal = 20000, // 20s
  speedHover = 30000, // 30s
  containerStyle,
  iconSize = 52,
  iconContainerSize = 64,
  gap = '16px',
  itemMinWidth = '80px',
  maskFade = '60px',
}: ModelIconCarouselProps) {
  const { resolvedTheme, mounted } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);

  // Smooth carousel animation with speed transitions
  useEffect(() => {
    if (!isOpen) return;

    let lastTime = performance.now();
    let accumulatedTime = animationProgress * (isHovered ? speedHover : speedNormal);

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
        lastTime = currentTime;
      }

      const deltaTime = Math.min(currentTime - lastTime, 100); // Cap delta to prevent large jumps
      lastTime = currentTime;

      const duration = isHovered ? speedHover : speedNormal;
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
  }, [isOpen, isHovered, animationProgress, speedNormal, speedHover]);

  const defaultContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    ...containerStyle,
  };

  return (
    <div
      style={defaultContainerStyle}
      onMouseLeave={() => {
        setIsHovered(false);
        if (onIconHover) {
          onIconHover(null, 0, 0);
        }
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          maskImage: `linear-gradient(to right, transparent 0px, black ${maskFade}, black calc(100% - ${maskFade}), transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to right, transparent 0px, black ${maskFade}, black calc(100% - ${maskFade}), transparent 100%)`,
        }}
      >
        <div
          className="carousel-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: gap,
            width: 'max-content',
            transform: `translate3d(-${animationProgress * 50}%, 0, 0)`,
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {/* Duplicate set for seamless loop */}
          {[...models, ...models].map((model, index) => {
            const iconKey = `${model.icon}-${index}`;
            return (
              <div
                key={iconKey}
                onMouseEnter={(e) => {
                  setIsHovered(true);
                  if (onIconHover) {
                    onIconHover(model.name, e.clientX, e.clientY);
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: itemMinWidth,
                  transition: 'all 0.3s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: `${iconContainerSize}px`,
                    height: `${iconContainerSize}px`,
                  }}
                >
                  <Image
                    src={getIconPath(model.icon, resolvedTheme, false, mounted)}
                    alt={model.name}
                    width={iconSize}
                    height={iconSize}
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
  );
}


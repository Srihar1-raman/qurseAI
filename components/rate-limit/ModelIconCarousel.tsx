'use client';

import React from 'react';
import { ModelIconCarousel as UIModelIconCarousel } from '@/components/ui/ModelIconCarousel';
import { RATE_LIMIT_CONSTANTS } from './constants';

export interface ModelIconCarouselProps {
  isOpen: boolean;
  onIconHover?: (iconName: string | null, mouseX: number, mouseY: number) => void;
}

/**
 * Rate limit popup-specific wrapper for ModelIconCarousel
 * Applies rate limit popup styling defaults
 */
export function ModelIconCarousel({ isOpen, onIconHover }: ModelIconCarouselProps) {
  return (
    <UIModelIconCarousel
      isOpen={isOpen}
      onIconHover={onIconHover}
      speedNormal={RATE_LIMIT_CONSTANTS.CAROUSEL_SPEED_NORMAL}
      speedHover={RATE_LIMIT_CONSTANTS.CAROUSEL_SPEED_HOVER}
      containerStyle={{
        top: RATE_LIMIT_CONSTANTS.CAROUSEL_OFFSET_TOP,
        width: 'calc(100% + 40px)',
        height: RATE_LIMIT_CONSTANTS.CAROUSEL_HEIGHT,
        margin: RATE_LIMIT_CONSTANTS.SECTION_MARGIN,
      }}
      iconSize={RATE_LIMIT_CONSTANTS.CAROUSEL_ICON_SIZE}
      iconContainerSize={RATE_LIMIT_CONSTANTS.CAROUSEL_ICON_CONTAINER_SIZE}
      gap={RATE_LIMIT_CONSTANTS.CAROUSEL_GAP}
      itemMinWidth={RATE_LIMIT_CONSTANTS.CAROUSEL_ITEM_MIN_WIDTH}
      maskFade={RATE_LIMIT_CONSTANTS.CAROUSEL_MASK_FADE}
    />
  );
}


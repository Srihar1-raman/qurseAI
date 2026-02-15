import fs from 'fs';
import path from 'path';

const ICONS_DIR = path.join(process.cwd(), 'public/icon');
const OUTPUT_DIR = path.join(process.cwd(), 'components/icons');

const svgFiles = fs.readdirSync(ICONS_DIR)
  .filter(file => file.endsWith('.svg'));

console.log(`Found ${svgFiles.length} SVG files to convert...`);

svgFiles.forEach(file => {
  const iconName = file.replace('.svg', '');
  const iconNamePascal = iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const svgContent = fs.readFileSync(path.join(ICONS_DIR, file), 'utf-8');

  // Extract all path data and attributes
  const pathMatches = svgContent.match(/<path[^>]*d="([^"]*)"[^>]*\/>/g);

  if (!pathMatches) {
    console.warn(`  ⚠️  Skipping ${file}: No paths found`);
    return;
  }

  // Parse each path to get its attributes
  const paths = pathMatches.map(match => {
    const pathMatch = match.match(/<path([^>]*)\/>/);
    if (!pathMatch) return null;

    const attrs = pathMatch[1];

    // Extract all attributes
    const fillMatch = attrs.match(/fill="([^"]*)"/);
    const strokeMatch = attrs.match(/stroke="([^"]*)"/);
    const strokeWidthMatch = attrs.match(/stroke-width="([^"]*)"/);

    return {
      d: attrs.match(/d="([^"]*)"/)?.[1] || '',
      fill: fillMatch?.[1],
      stroke: strokeMatch?.[1],
      strokeWidth: strokeWidthMatch?.[1] || '2',
    };
  }).filter((p): p is NonNullable<typeof p> => p !== null);

  // Determine if icon is filled or outlined
  const hasFill = paths.some(p => p.fill && p.fill !== 'none');
  const hasStroke = paths.some(p => p.stroke && p.stroke !== 'none');

  const componentContent = `'use client';

import { BaseIcon } from './BaseIcon';
import type { BaseIconProps } from './BaseIcon';

export function ${iconNamePascal}Icon({ className, size, style, theme, isActive, isInverted, ...props }: BaseIconProps) {
  return (
    <BaseIcon
      className={className}
      size={size}
      style={style}
      theme={theme}
      isActive={isActive}
      isInverted={isInverted}
      {...props}
    >
${paths.map(p => {
  // For filled icons, use fill="currentColor" and stroke="none"
  // For outline icons, use stroke="currentColor" and fill="none"
  if (hasFill && p.fill && p.fill !== 'none') {
    return `      <path d="${p.d}" fill="currentColor" stroke="none" />`;
  } else if (hasStroke && p.stroke && p.stroke !== 'none') {
    return `      <path d="${p.d}" fill="none" stroke="currentColor" strokeWidth="${p.strokeWidth}" />`;
  } else {
    // Fallback: outline style
    return `      <path d="${p.d}" fill="none" stroke="currentColor" strokeWidth="${p.strokeWidth}" />`;
  }
}).join('\n')}
    </BaseIcon>
  );
}
`;

  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${iconNamePascal}Icon.tsx`),
    componentContent
  );

  console.log(`  ✓ Converted: ${iconName} → ${iconNamePascal}Icon`);
});

console.log(`\n✅ Successfully converted ${svgFiles.length} icon files!`);
console.log(`📁 Output directory: ${OUTPUT_DIR}`);
console.log(`\n⚠️  Don't forget to update components/icons/index.ts to export all icons!`);

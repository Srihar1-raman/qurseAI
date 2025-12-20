# Pricing Page - Icon Placeholders

## Overview
The pricing page has been implemented with placeholder icons. The following locations need actual icons to be added:

## Free Plan Card (`components/pricing/FreePlanCard.tsx`)

### Feature Icons (Lines ~80-85)
Each feature has a placeholder div that needs to be replaced with an actual icon:

1. **Limited Messages** - Line ~80
   - Suggested icon: `getIconPath('message', resolvedTheme, false, mounted)`
   - Or use a message/chat icon

2. **Access to Free Models** - Line ~80
   - Suggested icon: `getIconPath('model', resolvedTheme, false, mounted)`
   - Or use a robot/AI icon

3. **Limited Access to Chat Modes** - Line ~80
   - Suggested icon: `getIconPath('mode', resolvedTheme, false, mounted)`
   - Or use a gear/settings icon

4. **Limited Uploads** - Line ~80
   - Suggested icon: `getIconPath('upload', resolvedTheme, false, mounted)`
   - Or use a file/upload icon

**Current placeholder:**
```tsx
<div
  style={{
    width: '20px',
    height: '20px',
    minWidth: '20px',
    marginTop: '2px',
    backgroundColor: 'var(--color-primary)',
    borderRadius: '4px',
    opacity: 0.7,
  }}
/>
```

**Replace with:**
```tsx
<Image
  src={getIconPath('icon-name', resolvedTheme, false, mounted)}
  alt={feature.title}
  width={20}
  height={20}
  style={{ opacity: 0.9 }}
/>
```

## Pro Plan Card (`components/pricing/ProPlanCard.tsx`)

### Feature Icons (Lines ~120-125)
Same structure as Free Plan Card - replace placeholders with:

1. **Access to All Models** - Line ~120
   - Suggested icon: `getIconPath('model', resolvedTheme, false, mounted)`
   - Or use a robot/AI icon

2. **Unlimited Chat Completions** - Line ~120
   - Suggested icon: `getIconPath('message', resolvedTheme, false, mounted)`
   - Or use an infinity/unlimited icon

3. **Increased File Uploads** - Line ~120
   - Suggested icon: `getIconPath('upload', resolvedTheme, false, mounted)`
   - Or use a file/upload icon

4. **Priority Support** - Line ~120
   - Suggested icon: `getIconPath('support', resolvedTheme, false, mounted)`
   - Or use a headset/support icon

**Same replacement pattern as Free Plan Card.**

## Notes

- All icons should use the `getIconPath` utility for theme-aware icons
- Icon size: 20x20px (as per current placeholder)
- Opacity: 0.9 (slightly transparent for visual consistency)
- Make sure to import `Image` from `next/image` and `getIconPath` from `@/lib/icon-utils`
- Also need to import `useTheme` hook for `resolvedTheme` and `mounted`

## Example Complete Replacement

```tsx
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';

// Inside component:
const { resolvedTheme, mounted } = useTheme();

// Replace placeholder with:
<Image
  src={getIconPath('message', resolvedTheme, false, mounted)}
  alt="Limited Messages"
  width={20}
  height={20}
  style={{ opacity: 0.9 }}
/>
```


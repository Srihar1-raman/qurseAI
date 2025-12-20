# 📝 Markdown Rendering Analysis & Implementation Plan

**Date:** 2025-01-18  
**Purpose:** Analyze current vs Scira's markdown rendering, plan implementation

---

## 🔍 Current State (Qurse)

### What Exists
- **File:** `components/chat/MarkdownRenderer.tsx` (610 lines)
- **Status:** ❌ **Currently DISABLED** (commented out in `ChatMessage.tsx`)
- **Current Display:** Raw text with `whiteSpace: 'pre-wrap'` (no markdown rendering)

### Current Implementation Details

**Libraries Used:**
- `marked-react` - Markdown parser
- `react-latex-next` - LaTeX rendering
- `react-syntax-highlighter` - Code syntax highlighting (Prism themes)
- `katex` - LaTeX CSS

**Features:**
- ✅ Code blocks with syntax highlighting
- ✅ Inline code with copy functionality
- ✅ LaTeX support (block and inline)
- ✅ Tables, lists, headings, blockquotes
- ✅ Streaming detection (disables highlighting during streaming)
- ✅ Performance optimizations (memoization, stable keys)

**Issues:**
- ⚠️ Currently disabled (not being used)
- ⚠️ Uses heavy `react-syntax-highlighter` library
- ⚠️ Complex streaming detection logic
- ⚠️ No citation handling
- ⚠️ No link previews
- ⚠️ No table CSV export
- ⚠️ No monetary amount protection

---

## 🎯 Scira's Implementation (Reference)

### File Structure
- **Main File:** `components/markdown.tsx` (1,126 lines)
- **Exports:** 
  - `MarkdownRenderer` (main component)
  - `VirtualMarkdownRenderer` (for very large content)
  - `OptimizedMarkdownRenderer` (default, auto-selects best strategy)

### Key Libraries

1. **`sugar-high`** - Lightweight syntax highlighting
   - Much lighter than `react-syntax-highlighter`
   - Synchronous highlighting
   - Better performance

2. **`marked-react`** - Markdown parser (same as Qurse)

3. **`react-latex-next`** - LaTeX rendering (same as Qurse)

4. **`Geist_Mono`** - Google Font for monospace code

5. **Shadcn UI Components:**
   - `HoverCard` - Link previews
   - `Table` - Enhanced table rendering
   - `Tooltip` - UI feedback
   - `Button` - Action buttons

### Advanced Features

#### 1. **Sophisticated Content Preprocessing** (`useProcessedContent` hook)

**Processing Order:**
1. **Extract & Protect Code Blocks** (first!)
   - Fenced code blocks: ` ```code``` `
   - Inline code: `` `code` ``
   - Replaced with placeholders: `CODEBLOCK0END`

2. **Extract & Protect Monetary Amounts** (before LaTeX!)
   - Pattern: `$123.45`, `$1.2M USD`, `$500 per month`
   - Prevents LaTeX from matching currency symbols
   - Replaced with: `MONETARY0END`

3. **Extract LaTeX Blocks** (after monetary protection)
   - Block equations: `$$...$$`, `\[...\]`
   - Inline equations: `$...$`, `\(...\)`
   - Advanced patterns for mathematical expressions
   - Replaced with: `LATEXBLOCK0END`, `LATEXINLINE0END`

4. **Process Citations**
   - Extracts citation links with URLs
   - Formats as: `[Title](url)`
   - Creates citation chips for display

5. **Escape Pipes in Links**
   - Prevents table cell splits in markdown links
   - `[A | B](url)` → `[A \| B](url)`

6. **Restore Protected Blocks**
   - Restores code blocks and monetary amounts
   - LaTeX placeholders remain for rendering

#### 2. **Code Block Features**

**Two Rendering Strategies:**
- **Lazy Loading** (for blocks > 5000 chars)
  - Uses React `lazy()` and `Suspense`
  - Shows loading state during render
  - Prevents UI blocking

- **Synchronous** (for smaller blocks)
  - Immediate rendering
  - Better UX for small code

**Features:**
- ✅ Syntax highlighting via `sugar-high`
- ✅ Language tag display
- ✅ Line count display
- ✅ Copy button (with toast notification)
- ✅ Wrap toggle button (wrap/unwrap long lines)
- ✅ Fallback for very large blocks (plain text)

#### 3. **Link Handling**

**Citation Links:**
- Detected during preprocessing
- Rendered as numbered chips: `[1]`, `[2]`, etc.
- Hover card shows citation title and domain

**Regular Links:**
- Hover card with domain favicon
- Link preview with title
- External link icon for external URLs

**User Messages:**
- Special handling: shows raw text to avoid accidental linkification
- Preserves user's exact input

#### 4. **Table Features**

- Enhanced table wrapper component
- CSV download button (hover to reveal)
- Proper border styling
- Responsive design

#### 5. **Performance Optimizations**

**Memoization:**
- `useProcessedContent` - Memoized content processing
- `CodeBlock` - Memoized with custom comparison
- `InlineCode` - Memoized
- `MarkdownRenderer` - Memoized with content comparison

**Stable Keys:**
- Content hash-based key generation
- Prevents unnecessary re-renders
- Better React reconciliation

**Virtual Scrolling:**
- For content > 100KB
- Splits content into chunks
- Only renders visible chunks
- Prevents browser crashes

**Performance Monitoring:**
- Warns if render takes > 100ms
- Helps identify performance issues

#### 6. **User Message Handling**

- `isUserMessage` prop
- Different styling for user vs assistant
- Prevents linkification in user messages
- Preserves exact user input

---

## 📊 Feature Comparison

| Feature | Qurse (Current) | Scira | Notes |
|---------|----------------|-------|-------|
| **Markdown Parsing** | ✅ `marked-react` | ✅ `marked-react` | Same |
| **Syntax Highlighting** | ⚠️ `react-syntax-highlighter` (heavy) | ✅ `sugar-high` (light) | Scira is lighter |
| **LaTeX Support** | ✅ `react-latex-next` | ✅ `react-latex-next` | Same |
| **Code Block Copy** | ✅ | ✅ | Both have it |
| **Code Block Wrap** | ❌ | ✅ | Scira has toggle |
| **Line Count** | ❌ | ✅ | Scira shows count |
| **Lazy Loading** | ❌ | ✅ | Scira for large blocks |
| **Monetary Protection** | ❌ | ✅ | Prevents LaTeX conflicts |
| **Citation Handling** | ❌ | ✅ | Scira extracts citations |
| **Link Previews** | ❌ | ✅ | Hover cards in Scira |
| **Table CSV Export** | ❌ | ✅ | Scira feature |
| **Virtual Scrolling** | ❌ | ✅ | For very large content |
| **User Message Handling** | ❌ | ✅ | Special handling in Scira |
| **Performance Monitoring** | ❌ | ✅ | Scira warns on slow renders |

---

## 🎯 Implementation Plan

### Phase 1: Remove Legacy Code

1. **Delete:** `components/chat/MarkdownRenderer.tsx`
2. **Update:** `components/chat/ChatMessage.tsx`
   - Remove commented import
   - Remove any references to MarkdownRenderer

### Phase 2: Install Dependencies

**New Dependencies:**
```bash
pnpm add sugar-high
pnpm add @next/font  # If not already installed (for Geist_Mono)
```

**Keep Existing:**
- `marked-react` ✅
- `react-latex-next` ✅
- `katex` ✅

**Remove:**
- `react-syntax-highlighter` (replace with sugar-high)

### Phase 3: Create New Markdown Component

**File:** `components/markdown.tsx`

**Structure:**
1. **Imports & Setup**
   - Import all required libraries
   - Set up Geist_Mono font
   - Import Shadcn UI components

2. **Helper Functions**
   - `isValidUrl()` - URL validation
   - `useProcessedContent()` - Content preprocessing hook

3. **Code Block Components**
   - `LazyCodeBlockComponent` - For large blocks
   - `SyncCodeBlock` - For small blocks
   - `CodeBlock` - Main component (auto-selects strategy)

4. **Inline Code Component**
   - `InlineCode` - Copyable inline code

5. **Table Component**
   - `MarkdownTableWithActions` - Table with CSV export

6. **Link Preview Component**
   - `LinkPreview` - Hover card content

7. **Main Renderer**
   - `MarkdownRenderer` - Main component
   - `VirtualMarkdownRenderer` - For very large content
   - `OptimizedMarkdownRenderer` - Default export (auto-selects)

### Phase 4: Integration

1. **Update `ChatMessage.tsx`**
   - Import new `MarkdownRenderer` (default export)
   - Replace raw text display with `<MarkdownRenderer content={...} />`
   - Add `isUserMessage` prop for user messages

2. **Update `ConversationThread.tsx`** (if needed)
   - Ensure markdown rendering is used for assistant messages

3. **Add CSS Styles**
   - Check if Shadcn UI table styles are needed
   - Ensure prose styles are applied correctly

### Phase 5: Testing

1. **Test Cases:**
   - ✅ Basic markdown (headings, lists, paragraphs)
   - ✅ Code blocks (small and large)
   - ✅ Inline code
   - ✅ LaTeX (block and inline)
   - ✅ Tables
   - ✅ Links (regular and citations)
   - ✅ Monetary amounts (should not be LaTeX)
   - ✅ Streaming performance
   - ✅ Very large content (virtual scrolling)

---

## 🔑 Key Differences to Implement

### 1. **Syntax Highlighting Library**

**Current:** `react-syntax-highlighter` (heavy, async)
**Scira:** `sugar-high` (light, sync)

**Why:** Better performance, smaller bundle size

### 2. **Content Preprocessing**

**Scira's Order:**
1. Code blocks (protect first)
2. Monetary amounts (protect before LaTeX)
3. LaTeX blocks (extract)
4. Citations (extract)
5. Link pipe escaping
6. Restore protected blocks

**Why:** Prevents conflicts (e.g., `$100` shouldn't be LaTeX)

### 3. **Code Block Features**

**Add:**
- Line count display
- Wrap toggle button
- Lazy loading for large blocks
- Better error handling

### 4. **Link Handling**

**Add:**
- Citation extraction and rendering
- Link previews (hover cards)
- Domain favicon display
- User message special handling

### 5. **Table Features**

**Add:**
- CSV download button
- Enhanced styling
- Hover actions

### 6. **Performance**

**Add:**
- Virtual scrolling for large content
- Performance monitoring
- Better memoization strategies

---

## 📦 Dependencies to Add

```json
{
  "sugar-high": "^latest",
  "@next/font": "^latest"  // If not already installed
}
```

**Note:** Check if `@next/font` is already in package.json (Next.js 13+ includes it)

---

## 🎨 Styling Considerations

### Shadcn UI Components Needed

1. **HoverCard** - For link previews
   ```bash
   npx shadcn@latest add hover-card
   ```

2. **Table** - For enhanced tables
   ```bash
   npx shadcn@latest add table
   ```

3. **Tooltip** - For UI feedback
   ```bash
   npx shadcn@latest add tooltip
   ```

### CSS Classes

Scira uses:
- `prose prose-neutral dark:prose-invert` - Tailwind typography
- Custom classes for code blocks, tables, links
- Shadcn UI component classes

---

## ⚠️ Potential Issues & Solutions

### Issue 1: Font Loading
**Problem:** Geist_Mono font might not be available
**Solution:** Use fallback monospace fonts or install Geist font

### Issue 2: Shadcn UI Components
**Problem:** Some components might not be installed
**Solution:** Install missing components or create simple alternatives

### Issue 3: Performance
**Problem:** Large content might still be slow
**Solution:** Virtual scrolling threshold can be adjusted

### Issue 4: Citation Detection
**Problem:** Citation regex might not match all patterns
**Solution:** Test with various citation formats, adjust regex if needed

---

## 📝 Implementation Checklist

- [ ] Delete `components/chat/MarkdownRenderer.tsx`
- [ ] Install `sugar-high` package
- [ ] Install required Shadcn UI components
- [ ] Create `components/markdown.tsx` (copy from Scira)
- [ ] Update `ChatMessage.tsx` to use new renderer
- [ ] Test basic markdown rendering
- [ ] Test code blocks (small and large)
- [ ] Test LaTeX rendering
- [ ] Test tables and CSV export
- [ ] Test link previews
- [ ] Test citation handling
- [ ] Test monetary amount protection
- [ ] Test streaming performance
- [ ] Test very large content (virtual scrolling)
- [ ] Remove `react-syntax-highlighter` if not used elsewhere
- [ ] Update any CSS if needed
- [ ] Verify dark mode support

---

## 🚀 Next Steps

1. **Review this analysis** - Confirm approach
2. **Remove legacy code** - Delete old MarkdownRenderer
3. **Install dependencies** - Add sugar-high and Shadcn components
4. **Copy Scira's implementation** - Adapt to Qurse's structure
5. **Integrate** - Update ChatMessage component
6. **Test** - Verify all features work
7. **Optimize** - Adjust for Qurse's specific needs

---

## 💡 Key Takeaways

**Scira's Implementation is Superior Because:**
1. ✅ Lighter syntax highlighting library
2. ✅ Better content preprocessing (prevents conflicts)
3. ✅ More features (citations, link previews, CSV export)
4. ✅ Better performance (lazy loading, virtual scrolling)
5. ✅ Better UX (wrap toggle, line count, hover cards)
6. ✅ Production-ready optimizations

**What to Keep from Current Implementation:**
- Nothing - Scira's is a complete replacement

**What to Adapt:**
- File location (Scira: `components/markdown.tsx`, Qurse: same)
- Import paths (adjust to Qurse's structure)
- Styling (ensure it matches Qurse's theme)

---

**Ready to implement! 🎉**


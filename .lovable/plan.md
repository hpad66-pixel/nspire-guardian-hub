

# Plan: Fix eBook Fullscreen Viewer - Complete Solution

## Problem Analysis
Based on the screenshot and code review, the eBook viewer is still displaying incorrectly because:

1. **CSS Grid Override**: The `DialogContent` base component has `grid` in its default className, which takes precedence over the `flex flex-col` we're adding. CSS specificity means both classes apply, but `grid` display property wins.

2. **Missing !important Override**: We need to ensure `flex` layout fully replaces the default grid behavior.

3. **Iframe Height Issue**: The iframe wrapper needs both `flex-1` AND explicit `h-full` with proper overflow handling for the iframe to fill the available space.

4. **Relative Container Missing**: The iframe parent needs `relative` positioning for proper layout containment.

## Solution

### File: `src/components/training/EBookCard.tsx`

Replace the fullscreen Dialog section with a properly structured layout that:
- Uses inline styles to guarantee flex layout (bypassing CSS specificity issues)
- Uses absolute positioning for the iframe to fill its container completely
- Removes the conflicting `min-h-0` approach in favor of explicit dimensions
- Ensures the close button (X) is properly positioned

```tsx
{/* Fullscreen Reader Dialog */}
<Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
  <DialogContent 
    className="max-w-[95vw] w-full h-[95vh] p-0 overflow-hidden border-0"
    style={{ display: 'flex', flexDirection: 'column' }}
  >
    {/* Compact Header */}
    <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between bg-background">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <span className="font-semibold text-base">{ebook.title}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.open(embedUrl || '', '_blank')}
        className="mr-8"
      >
        <ExternalLink className="h-4 w-4 mr-1" />
        Open in New Tab
      </Button>
    </div>
    
    {/* Fullscreen Iframe Container */}
    <div className="relative flex-1 bg-muted/20" style={{ minHeight: 0 }}>
      <iframe
        src={embedUrl || ''}
        className="absolute inset-0 w-full h-full border-0"
        allowFullScreen
        title={ebook.title}
      />
    </div>
  </DialogContent>
</Dialog>
```

### File: `src/components/training/EBookViewer.tsx`

Apply the same pattern for consistency:

```tsx
<Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
  <DialogContent 
    className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden border-0"
    style={{ display: 'flex', flexDirection: 'column' }}
  >
    <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between bg-background">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5" />
        <span className="font-semibold">{title}</span>
      </div>
    </div>
    <div className="relative flex-1" style={{ minHeight: 0 }}>
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full border-0"
        allowFullScreen
        title={title}
      />
    </div>
  </DialogContent>
</Dialog>
```

## Key Changes Explained

| Issue | Fix |
|-------|-----|
| Grid vs Flex conflict | Use inline `style={{ display: 'flex' }}` to guarantee flex layout |
| Iframe not expanding | Use `absolute inset-0` positioning instead of relying on flex |
| Container height | Parent has `relative flex-1` with `minHeight: 0` for proper shrinking |
| Header overlap with X button | Add `mr-8` margin to "Open in New Tab" button |
| React ref warning | Replace `DialogHeader` with plain `div` to avoid forwardRef warning |

## Visual Outcome
- The FlipHTML5 flipbook will fill approximately 90-95% of viewport height
- The header takes minimal space (~50px)
- Page navigation arrows will be visible on the sides
- Content will be fully readable and interactive
- Clean, immersive reading experience

## Files to Modify
1. `src/components/training/EBookCard.tsx`
2. `src/components/training/EBookViewer.tsx`


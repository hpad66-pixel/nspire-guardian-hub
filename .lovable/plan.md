
# Plan: Fix eBook Viewer Fullscreen Display

## Problem Summary
The fullscreen eBook reader dialog displays the embedded flipbook at only half the page height, making it difficult to read and not visually appealing. This is a UI/UX issue caused by CSS layout conflicts between the Dialog component and the iframe container.

## Root Cause Analysis
1. The `DialogContent` component uses CSS `grid` layout by default
2. The iframe wrapper uses `flex-1` expecting flex behavior, but this doesn't work properly inside a grid container
3. The iframe has no explicit height, causing embedded content (FlipHTML5, Issuu) to render at minimal dimensions
4. Missing `overflow-hidden` and `min-h-0` utility classes that are required for proper flex shrinking

## Solution

### 1. Update EBookCard Fullscreen Dialog
Restructure the fullscreen dialog to use proper flexbox layout with explicit height calculations:

- Change `DialogContent` to use `flex flex-col` instead of relying on grid
- Add `overflow-hidden` to prevent content overflow
- Use `calc()` or explicit height percentages for the iframe container
- Add `min-h-0` to flex children to enable proper shrinking
- Give the iframe an explicit `style={{ height: '100%' }}` attribute

### 2. Improve Header/Content Ratio
- Make the header more compact with tighter padding
- Use a thin bottom border to separate header from content
- Maximize the reading area by reducing header visual weight

### 3. Add Loading State
- Show a skeleton/spinner while the iframe loads
- Improve perceived performance for slow-loading embeds

## Technical Changes

### File: `src/components/training/EBookCard.tsx`

Update the fullscreen Dialog (lines 88-115):

```tsx
<Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
  <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
    <DialogHeader className="px-4 py-3 border-b shrink-0 flex flex-row items-center justify-between">
      <DialogTitle className="flex items-center gap-2 text-base">
        <BookOpen className="h-4 w-4 text-primary" />
        {ebook.title}
      </DialogTitle>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.open(embedUrl || '', '_blank')}
      >
        <ExternalLink className="h-4 w-4 mr-1" />
        Open in New Tab
      </Button>
    </DialogHeader>
    <div className="flex-1 min-h-0 bg-muted/20">
      <iframe
        src={embedUrl || ''}
        className="w-full h-full border-0"
        style={{ minHeight: '100%' }}
        allowFullScreen
        title={ebook.title}
      />
    </div>
  </DialogContent>
</Dialog>
```

### File: `src/components/training/EBookViewer.tsx`

Apply the same fixes to the EBookViewer component for consistency:

```tsx
<Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
  <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
    <DialogHeader className="px-4 py-3 border-b shrink-0">
      <DialogTitle className="flex items-center gap-2">
        <BookOpen className="h-5 w-5" />
        {title}
      </DialogTitle>
    </DialogHeader>
    <div className="flex-1 min-h-0">
      <iframe
        src={embedUrl}
        className="w-full h-full border-0"
        allowFullScreen
        title={title}
      />
    </div>
  </DialogContent>
</Dialog>
```

## Visual Outcome
- The eBook reader will now fill 95% of the viewport height
- The header will be compact (approximately 50px)
- The iframe/flipbook will occupy the remaining ~90% of the dialog
- Works correctly with FlipHTML5, Issuu, and other embed providers
- Clean, immersive reading experience similar to native eBook apps

## Files to Modify
1. `src/components/training/EBookCard.tsx` - Main fullscreen reader
2. `src/components/training/EBookViewer.tsx` - Alternative viewer component

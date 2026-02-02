

# Plan: Auto-Generate Beautifully Branded eBook Covers

## Problem Summary
When an eBook is added without a custom cover image, the current placeholder is just a generic BookOpen icon on a muted background. This looks unprofessional and doesn't create an inviting reading experience. You want every eBook to have a consistent, beautifully branded cover that displays the book title automatically.

## Solution Overview
Create a new `GeneratedBookCover` component that renders a professional, CSS-based book cover design featuring:
- The "Glorieta Gardens Apartments" branding
- The eBook title prominently displayed
- Category-based accent colors for visual variety
- A consistent, elegant design language

## Design Approach

### Cover Layout
```text
+---------------------------+
|     [Category Badge]      |
|                           |
|    ==================     |
|    BOOK TITLE HERE        |
|    (Multi-line if needed) |
|    ==================     |
|                           |
|   [Decorative Element]    |
|                           |
|  Glorieta Gardens Logo    |
|      TRAINING LIBRARY     |
+---------------------------+
```

### Visual Elements
- **Background**: Gradient based on category color (blue for onboarding, orange for maintenance, etc.)
- **Title**: Large, centered, white text with elegant typography
- **Decorative accent**: Subtle geometric pattern or line art
- **Footer**: "Glorieta Gardens" wordmark with "Training Library" subtitle
- **Category badge**: Small label at top indicating the content type

### Category Color Mapping
| Category | Primary Color | Gradient Direction |
|----------|---------------|-------------------|
| Onboarding | Blue (#3B82F6) | Top-left to bottom-right |
| Maintenance | Orange (#F97316) | Top-right to bottom-left |
| Safety | Red (#EF4444) | Top to bottom |
| Compliance | Purple (#8B5CF6) | Bottom-left to top-right |
| Operations | Green (#22C55E) | Radial from center |
| Emergency | Rose (#F43F5E) | Top to bottom |

## Technical Implementation

### New Component: `GeneratedBookCover.tsx`
Location: `src/components/training/GeneratedBookCover.tsx`

```tsx
interface GeneratedBookCoverProps {
  title: string;
  category: string;
  className?: string;
}
```

The component will:
1. Accept title and category as props
2. Apply category-specific gradient background
3. Render the title with proper text wrapping (max 3 lines with ellipsis)
4. Include decorative elements and Glorieta Gardens branding
5. Be fully responsive within the card's aspect ratio

### Update `EBookCard.tsx`
Modify the thumbnail area (lines 40-54) to use the new component when no `thumbnail_url` exists:

```tsx
{ebook.thumbnail_url ? (
  <img src={ebook.thumbnail_url} ... />
) : (
  <GeneratedBookCover 
    title={ebook.title} 
    category={ebook.category} 
  />
)}
```

### Update Management List Preview
Also update the small thumbnail in `TrainingPage.tsx` (lines 310-320) to show a mini version of the generated cover instead of just an icon.

## Visual Outcome
- Every eBook will have a professional, branded cover
- Visual consistency across your training library
- Category colors help users quickly identify content types
- Clean, modern design that looks intentional rather than placeholder
- Covers work in both light and dark mode

## Files to Create/Modify
1. **Create**: `src/components/training/GeneratedBookCover.tsx` - New cover component
2. **Modify**: `src/components/training/EBookCard.tsx` - Use generated cover as fallback
3. **Modify**: `src/pages/training/TrainingPage.tsx` - Update management list thumbnails


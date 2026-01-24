# PATCH 009: Card-Level Temperature Tinting
## Priority: MEDIUM — Visual enhancement
## Designer: Aria
## Architect: Logos

---

## Overview

Extend temperature signaling from left-edge strip to a subtle card-wide background tint. Users should *feel* the temperature state before reading it.

**Design Principle:**
*"Temperature should be ambient, not decorative. The card should feel gently bathed in its temperature state."*

**Visual North Star:**
*"You should sense the problem before you read it. Temperature is felt first, read second, confirmed last."*

---

## PART 1: Calculate Mixed Colors

### Color Mixing Formula

```
cardBackground = mix(baseCardColor, temperatureColor, 6-8%)
```

### Light Mode (8% mix)

| State | Base | Temperature | Result |
|-------|------|-------------|--------|
| Neutral | `#FFFFFF` | — | `#FFFFFF` |
| Pending (yellow) | `#FFFFFF` | `#F4E8B3` | `#FDFBF3` |
| Healthy (green) | `#FFFFFF` | `#D7F1D6` | `#FAFDF9` |

### Dark Mode (6% mix)

| State | Base | Temperature | Result |
|-------|------|-------------|--------|
| Neutral | `#1A1D1F` | — | `#1A1D1F` |
| Pending (yellow) | `#1A1D1F` | `#C9B56A` | `#1F1E1A` |
| Healthy (green) | `#1A1D1F` | `#7BAF86` | `#1A1F1C` |

---

## PART 2: Update CSS Custom Properties

### 2A: Update `/client/src/index.css`

**ADD** card background tokens:

```css
:root {
  /* Card backgrounds with temperature tints - Light Mode */
  --card-bg-neutral: #FFFFFF;
  --card-bg-pending: #FDFBF3;    /* 8% yellow tint */
  --card-bg-healthy: #FAFDF9;    /* 8% green tint */
  
  /* Temperature edge colors - Light Mode */
  --temp-edge-pending: #F4E8B3;
  --temp-edge-healthy: #D7F1D6;
}

.dark {
  /* Card backgrounds with temperature tints - Dark Mode */
  --card-bg-neutral: #1A1D1F;
  --card-bg-pending: #1F1E1A;    /* 6% yellow tint */
  --card-bg-healthy: #1A1F1C;    /* 6% green tint */
  
  /* Temperature edge colors - Dark Mode */
  --temp-edge-pending: #C9B56A;
  --temp-edge-healthy: #7BAF86;
}
```

---

## PART 3: Update RoleCard Component

### 3A: Update `/client/src/components/RoleCard.tsx`

**FIND** the card container className:

```tsx
<motion.div
  layout
  className={cn(
    "bg-white dark:bg-gray-800 rounded-xl transition-shadow duration-200",
    // ... shadow classes ...
    "border border-gray-200 dark:border-gray-700",
    isAccepted 
      ? "border-l-4 border-l-[#D7F1D6] dark:border-l-[#7BAF86]" 
      : hasPendingSuggestion 
        ? "border-l-4 border-l-[#F4E8B3] dark:border-l-[#C9B56A]" 
        : ""
  )}
>
```

**REPLACE WITH:**

```tsx
<motion.div
  layout
  className={cn(
    "rounded-xl transition-all duration-200",
    "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]",
    "hover:shadow-[0_4px_6px_rgba(0,0,0,0.05),0_2px_4px_rgba(0,0,0,0.04)]",
    "border border-gray-200 dark:border-gray-700",
    // Temperature-aware background + left edge
    isAccepted 
      ? "bg-[#FAFDF9] dark:bg-[#1A1F1C] border-l-4 border-l-[#D7F1D6] dark:border-l-[#7BAF86]" 
      : hasPendingSuggestion 
        ? "bg-[#FDFBF3] dark:bg-[#1F1E1A] border-l-4 border-l-[#F4E8B3] dark:border-l-[#C9B56A]" 
        : "bg-white dark:bg-[#1A1D1F]"
  )}
>
```

### Key Changes:
1. `transition-shadow` → `transition-all` (to animate background changes)
2. Added temperature-aware background colors
3. Kept left-edge strip as secondary indicator
4. Neutral cards remain pure white / dark grey

---

## PART 4: Add Smooth State Transitions

### 4A: Ensure transition covers background color

The `transition-all duration-200` handles this, but for explicit control:

```tsx
className={cn(
  "rounded-xl",
  "transition-[background-color,box-shadow,border-color] duration-200 ease-out",
  // ... rest of classes
)}
```

This ensures:
- Background color transitions smoothly (150-200ms)
- Shadow transitions on hover
- Border color transitions when state changes

---

## PART 5: Update Timeline Dot Colors (Consistency)

### 5A: Timeline dots should match the temperature tokens

**FIND:**
```tsx
isAccepted 
  ? "border-[#D7F1D6] dark:border-[#7BAF86]"
  : hasPendingSuggestion 
    ? "border-[#F4E8B3] dark:border-[#C9B56A]"
    : "border-gray-300 dark:border-gray-600"
```

**No change needed** — these already use the correct edge colors.

---

## PART 6: Verify Text Contrast

### 6A: Contrast check (non-negotiable)

| Background | Text Color | Contrast Ratio | Pass? |
|------------|------------|----------------|-------|
| `#FDFBF3` (light pending) | `#1F2937` | ~15:1 | ✅ |
| `#FAFDF9` (light healthy) | `#1F2937` | ~15:1 | ✅ |
| `#1F1E1A` (dark pending) | `#E5E7EB` | ~12:1 | ✅ |
| `#1A1F1C` (dark healthy) | `#E5E7EB` | ~12:1 | ✅ |

The 6-8% tint is subtle enough that text contrast remains well above WCAG AA requirements.

---

## Visual Hierarchy (Final)

```
┌─────────────────────────────────────┐
│▌                                    │  ← Left edge: precise indicator
│▌  Role Title                        │
│▌  Company • Dates                   │
│▌                                    │
│▌  Description text...               │  ← Card body: ambient tint
│▌                                    │
│▌  ✦ Click to view suggestion        │
│▌                                    │
└─────────────────────────────────────┘
       ↑
  Entire card has subtle temperature wash
  (warm yellow-white or cool green-white)
```

**Scanning experience:**
1. **Feel** — Card surface hints at state (warm = attention, cool = healthy)
2. **See** — Left edge confirms temperature
3. **Read** — Dot + suggestion text provides detail

---

## Interaction States

| State | Behavior |
|-------|----------|
| Hover | Elevation change (shadow), NOT stronger temperature |
| Expanded | Temperature remains constant |
| State change (yellow → green) | Smooth 200ms transition |

**No flashing. No pulsing. No glow.**

---

## Verification Checklist

**Light Mode:**
- [ ] Neutral cards: pure white background
- [ ] Pending cards: subtle warm off-white (`#FDFBF3`)
- [ ] Healthy cards: subtle cool mint-white (`#FAFDF9`)
- [ ] Left edge strip visible on temperature cards
- [ ] Text remains fully readable

**Dark Mode:**
- [ ] Neutral cards: dark grey (`#1A1D1F`)
- [ ] Pending cards: warm charcoal (`#1F1E1A`)
- [ ] Healthy cards: cool charcoal-green (`#1A1F1C`)
- [ ] Left edge strip visible on temperature cards
- [ ] Text remains fully readable

**Transitions:**
- [ ] Background color animates on state change (200ms)
- [ ] No jarring color jumps
- [ ] Hover only affects shadow, not temperature

**Contrast:**
- [ ] All text meets WCAG AA contrast requirements
- [ ] Temperature never applied to text
- [ ] Links/buttons remain neutral

---

## Files Modified

| File | Changes |
|------|---------|
| `/client/src/index.css` | Add card background tokens |
| `/client/src/components/RoleCard.tsx` | Temperature-aware background classes |

---

**END OF PATCH**

*Patch version: 009*
*Priority: MEDIUM*
*Designer: Aria*
*Architect: Logos*

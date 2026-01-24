# PATCH 008: Dark Mode Temperature Indicator Fix
## Priority: HIGH — Visual bug fix
## Designer: Aria
## Architect: Logos

---

## Overview

The left-edge temperature strips (yellow for pending, green for healthy) disappear in dark mode. This breaks the core visual metaphor.

**Root cause:** Hardcoded light-mode colors without dark variants, or insufficient contrast against dark backgrounds.

**Visual North Star:**
*"Temperature logic must remain instantly readable in any theme—subtle, calm, always visible."*

---

## PART 1: Define Theme-Aware Temperature Tokens

### 1A: Update `/client/src/index.css`

**ADD** or **UPDATE** the temperature color tokens:

```css
:root {
  /* Temperature indicators - Light Mode */
  --temp-warn: #F4E8B3;           /* Soft pastel yellow */
  --temp-warn-subtle: #FDF9E8;    /* Very light yellow tint */
  --temp-healthy: #D7F1D6;        /* Muted clean green */
  --temp-healthy-subtle: #EDF7EE; /* Very light green tint */
  
  /* Card backgrounds */
  --card-bg: #FFFFFF;
}

.dark {
  /* Temperature indicators - Dark Mode */
  --temp-warn: #C9B56A;           /* Deeper desaturated yellow */
  --temp-warn-subtle: #2A2820;    /* Dark amber tint */
  --temp-healthy: #7BAF86;        /* Desaturated green for dark */
  --temp-healthy-subtle: #1A231C; /* Dark green tint */
  
  /* Card backgrounds - slightly lifted for contrast */
  --card-bg: #1A1D1F;             /* Not pure black, allows strip visibility */
}
```

---

## PART 2: Update RoleCard Component

### 2A: Update `/client/src/components/RoleCard.tsx`

**FIND** the timeline dot border colors:

```tsx
isAccepted 
  ? "border-[#7CB386]"
  : hasPendingSuggestion 
    ? "border-[#E5C07B]"
    : "border-gray-300 dark:border-gray-600"
```

**REPLACE WITH:**

```tsx
isAccepted 
  ? "border-[var(--temp-healthy)]"
  : hasPendingSuggestion 
    ? "border-[var(--temp-warn)]"
    : "border-gray-300 dark:border-gray-600"
```

---

### 2B: **FIND** the card left-edge border colors:

```tsx
isAccepted 
  ? "border-l-2 border-l-[#7CB386]" 
  : hasPendingSuggestion 
    ? "border-l-2 border-l-[#E5C07B]" 
    : ""
```

**REPLACE WITH:**

```tsx
isAccepted 
  ? "border-l-4 border-l-[var(--temp-healthy)]" 
  : hasPendingSuggestion 
    ? "border-l-4 border-l-[var(--temp-warn)]" 
    : ""
```

**Note:** Changed from `border-l-2` to `border-l-4` for better visibility.

---

### 2C: **FIND** the card background class:

```tsx
"bg-white dark:bg-gray-800"
```

**REPLACE WITH:**

```tsx
"bg-[var(--card-bg)]"
```

---

## PART 3: Update Suggestion Preview Border

### 3A: In the suggestion preview section

**FIND:**

```tsx
border-l-2 border-l-[#7CB386]
```

**REPLACE WITH:**

```tsx
border-l-4 border-l-[var(--temp-healthy)]
```

---

## PART 4: Update Any Other Temperature Color References

### 4A: Search entire codebase for hardcoded temperature colors

**FIND** all instances of:
- `#E5C07B` 
- `#7CB386`
- `#F4E8B3`
- `#D7F1D6`
- `border-amber-*` (when used for temperature)
- `border-green-*` (when used for temperature)

**REPLACE** with CSS variable references:
- `var(--temp-warn)`
- `var(--temp-healthy)`

---

## PART 5: Tailwind Config (Optional but Recommended)

### 5A: If using Tailwind, extend theme in `tailwind.config.js`

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        temp: {
          warn: 'var(--temp-warn)',
          'warn-subtle': 'var(--temp-warn-subtle)',
          healthy: 'var(--temp-healthy)',
          'healthy-subtle': 'var(--temp-healthy-subtle)',
        }
      }
    }
  }
}
```

Then classes like `border-l-temp-warn` become available.

---

## Color Reference Table

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--temp-warn` | `#F4E8B3` | `#C9B56A` | Left edge strip, timeline dot |
| `--temp-warn-subtle` | `#FDF9E8` | `#2A2820` | Background tints (if needed) |
| `--temp-healthy` | `#D7F1D6` | `#7BAF86` | Left edge strip, timeline dot |
| `--temp-healthy-subtle` | `#EDF7EE` | `#1A231C` | Background tints (if needed) |
| `--card-bg` | `#FFFFFF` | `#1A1D1F` | Card surface |

---

## Contrast Requirements

- Temperature strip must have **≥3:1 contrast** against card background
- Dark mode card bg `#1A1D1F` + strip `#C9B56A` = sufficient contrast
- Dark mode card bg `#1A1D1F` + strip `#7BAF86` = sufficient contrast

**No neon. No high saturation. Scandinavian tones only.**

---

## Verification Checklist

**Light Mode:**
- [ ] Yellow strip visible on pending cards
- [ ] Green strip visible on accepted cards
- [ ] Timeline dots show correct colors
- [ ] Strips are 4px wide

**Dark Mode:**
- [ ] Yellow strip visible on pending cards (not blending into bg)
- [ ] Green strip visible on accepted cards (not blending into bg)
- [ ] Timeline dots show correct colors
- [ ] Card background is `#1A1D1F` (not pure black)
- [ ] Contrast ratio ≥3:1 for all temperature indicators

**Both Modes:**
- [ ] Theme toggle updates strip colors correctly
- [ ] No hardcoded hex values remain for temperature colors
- [ ] Strip width, radius, placement unchanged
- [ ] Colors used ONLY for health logic, not UI chrome

---

## Files Modified

| File | Changes |
|------|---------|
| `/client/src/index.css` | Add/update CSS custom properties for temp colors |
| `/client/src/components/RoleCard.tsx` | Use CSS variables instead of hardcoded hex |
| `/client/src/pages/home.tsx` | Update any remaining hardcoded temp colors |
| `tailwind.config.js` | (Optional) Extend theme with temp colors |

---

**END OF PATCH**

*Patch version: 008*
*Priority: HIGH*
*Designer: Aria*
*Architect: Logos*

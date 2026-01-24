# PATCH 007: Design Corrections — Color & Typography Refinement
## Priority: HIGH — Visual polish
## Designer: Aria
## Architect: Logos

---

## Overview

Refine PATCH 006 implementation to remove visual noise and enforce the temperature/UI separation.

**Core Principle:**
*"All visual warmth belongs to the temperature health logic—not to the UI chrome. The UI itself stays cool, calm, and quietly competent."*

---

## PART 1: Remove All Uppercase Text

### 1A: Search and replace in `/client/src/components/RoleCard.tsx` and `/client/src/pages/home.tsx`

**FIND ALL** instances of `uppercase` in className strings and **REMOVE** them.

Examples:
```tsx
// BEFORE
className="text-xs font-medium uppercase tracking-wide"

// AFTER
className="text-xs font-medium"
```

**FIND ALL** instances of `tracking-wider` or `tracking-wide` and **REMOVE** them (these are typically paired with uppercase).

---

## PART 2: Replace Orange/Amber Buttons with Neutral Grey

### 2A: Find all amber/orange button classes

**FIND:**
```tsx
bg-amber-500 text-white
bg-amber-600
hover:bg-amber-600
hover:bg-amber-700
ring-amber-500
```

**REPLACE WITH:**
```tsx
bg-gray-600 text-white
bg-gray-700
hover:bg-gray-700
hover:bg-gray-800
ring-gray-400
```

### 2B: Find all green buttons (Apply/Accept)

**FIND:**
```tsx
bg-green-600 text-white
bg-green-700
hover:bg-green-700
```

**REPLACE WITH:**
```tsx
bg-gray-600 text-white
bg-gray-700
hover:bg-gray-700
```

---

## PART 3: Update Temperature Colors (Softer Palette)

### 3A: Update CSS variables in `/client/src/index.css`

**FIND** any amber/green color definitions and **UPDATE**:

```css
:root {
  /* Temperature indicators - ONLY for status markers */
  --temp-pending: #E5C07B;        /* Soft pastel amber */
  --temp-pending-subtle: #FDF6E3; /* Very light amber tint */
  --temp-healthy: #7CB386;        /* Desaturated sage green */
  --temp-healthy-subtle: #EDF7EE; /* Very light green tint */
}
```

### 3B: Update Tailwind classes for temperature colors

**FIND** saturated amber/green on status indicators:
```tsx
border-amber-500
border-green-500
border-amber-200
border-green-200
bg-amber-50
bg-green-50
```

**REPLACE WITH** custom colors:
```tsx
border-[#E5C07B]
border-[#7CB386]
border-[#FDF6E3]
border-[#EDF7EE]
bg-[#FDF6E3]
bg-[#EDF7EE]
```

---

## PART 4: Fix Card Borders — Temperature on Left Edge Only

### 4A: Update card border classes

Cards should have neutral grey borders on all sides, with temperature color ONLY as a left-edge accent.

**FIND:**
```tsx
border-amber-200 dark:border-amber-800
border-green-200 dark:border-green-800
```

**REPLACE WITH:**
```tsx
border-gray-200 dark:border-gray-700 border-l-2 border-l-[#E5C07B]
border-gray-200 dark:border-gray-700 border-l-2 border-l-[#7CB386]
```

---

## PART 5: Fix Icon Colors — Neutral Grey Only

### 5A: Find colored icons

**FIND:**
```tsx
text-amber-500
text-amber-600
text-green-500
text-green-600
```

**REPLACE WITH:**
```tsx
text-gray-400
text-gray-500
text-gray-400
text-gray-500
```

Exception: Icons inside timeline dots can keep temperature colors since the dot itself is a status indicator.

---

## PART 6: Fix Suggestion Preview Background

### 6A: Update suggestion content preview

The generated content preview should be neutral with a subtle left-edge accent, not a colored background.

**FIND:**
```tsx
bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800
```

**REPLACE WITH:**
```tsx
bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-2 border-l-[#7CB386]
```

---

## PART 7: Fix Focus States

### 7A: Update focus ring colors

**FIND:**
```tsx
focus:ring-amber-500
focus:ring-green-500
```

**REPLACE WITH:**
```tsx
focus:ring-gray-400
focus:ring-gray-400
```

---

## PART 8: Update Text Colors for Interactive Elements

### 8A: Suggestion trigger link

**FIND:**
```tsx
text-amber-600 dark:text-amber-400 hover:text-amber-700
```

**REPLACE WITH:**
```tsx
text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200
```

### 8B: Accepted indicator

**FIND:**
```tsx
text-green-600 dark:text-green-400
```

**REPLACE WITH:**
```tsx
text-gray-600 dark:text-gray-400
```

---

## Summary of Color Rules

| Element | Before | After |
|---------|--------|-------|
| **Buttons** | `bg-amber-500`, `bg-green-600` | `bg-gray-600` |
| **Button hover** | `hover:bg-amber-600` | `hover:bg-gray-700` |
| **Icons** | `text-amber-500` | `text-gray-400` |
| **Card borders** | Colored all around | Grey + left-edge accent |
| **Timeline dots** | `border-amber-500` | `border-[#E5C07B]` (softer) |
| **Focus rings** | `ring-amber-500` | `ring-gray-400` |
| **Labels** | `uppercase tracking-wide` | Sentence case |
| **Preview bg** | `bg-green-50` | White + left accent |

---

## Visual Reference

**Temperature colors appear ONLY on:**
- ✅ Timeline dots (border color)
- ✅ Left-edge card accents (2px border)
- ✅ Small status badges (if added later)

**Temperature colors NEVER appear on:**
- ❌ Buttons
- ❌ Icons
- ❌ Backgrounds
- ❌ Full card borders
- ❌ Text

---

## Verification Checklist

- [ ] No `uppercase` classes remain in suggestion cards
- [ ] No `tracking-wide` or `tracking-wider` paired with uppercase
- [ ] All buttons are neutral grey (`bg-gray-600`)
- [ ] No `bg-amber-*` or `bg-green-*` on buttons
- [ ] Timeline dots use softer colors (`#E5C07B`, `#7CB386`)
- [ ] Card borders are grey with left-edge temperature accent only
- [ ] All icons are neutral grey (`text-gray-400`)
- [ ] Focus rings are grey (`ring-gray-400`)
- [ ] Suggestion preview has white bg + left accent, not green bg
- [ ] Interactive text is grey, not amber/green

---

**END OF PATCH**

*Patch version: 007*
*Priority: HIGH*
*Designer: Aria*
*Architect: Logos*

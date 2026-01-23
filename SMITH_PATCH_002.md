# PATCH 002: Popover Click Fix + Danish Character Encoding
## Priority: HIGH — Core interaction broken, display issue

---

## ISSUE 1: Section Click Doesn't Open Popover

**Symptom:** Clicking on a CV section with "Click to view suggestion" does nothing. The popover never appears.

**Root Cause:** The window-level click-outside listener fires immediately after the React click handler, setting `activeSection` back to `null` before the popover can render.

**File:** `/client/src/pages/home.tsx`

### Fix 1A: Update handleSectionClick

**FIND:**
```tsx
const handleSectionClick = (sectionId: string, e: React.MouseEvent) => {
  e.stopPropagation();
  const pending = getPendingObservation(sectionId);
  if (pending) {
    setActiveSection(activeSection === sectionId ? null : sectionId);
  }
};
```

**REPLACE WITH:**
```tsx
const handleSectionClick = (sectionId: string, e: React.MouseEvent) => {
  e.stopPropagation();
  e.nativeEvent.stopImmediatePropagation(); // Prevent window listener from firing
  const pending = getPendingObservation(sectionId);
  if (pending) {
    setActiveSection(activeSection === sectionId ? null : sectionId);
  }
};
```

### Fix 1B: Update the click-outside useEffect

**FIND:**
```tsx
// Close popover when clicking outside
useEffect(() => {
  const handleClickOutside = () => setActiveSection(null);
  window.addEventListener('click', handleClickOutside);
  return () => window.removeEventListener('click', handleClickOutside);
}, []);
```

**REPLACE WITH:**
```tsx
// Close popover when clicking outside (but not on section cards or popovers)
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't close if clicking inside a section card or the popover itself
    if (target.closest('[data-section-card]') || target.closest('[data-suggestion-popover]')) {
      return;
    }
    setActiveSection(null);
  };
  window.addEventListener('click', handleClickOutside);
  return () => window.removeEventListener('click', handleClickOutside);
}, []);
```

### Fix 1C: Add data attributes to section cards

**FIND** the renderSection function's outer div (around line 276-286):
```tsx
<div
  key={section.id}
  className={cn(
    "mb-6 p-4 rounded-lg transition-all duration-300",
    highlightClass,
    hasPending && "cursor-pointer hover:shadow-md",
    !highlightClass && "bg-white"
  )}
  onClick={(e) => hasPending && handleSectionClick(section.id, e)}
>
```

**REPLACE WITH:**
```tsx
<div
  key={section.id}
  data-section-card
  className={cn(
    "mb-6 p-4 rounded-lg transition-all duration-300",
    highlightClass,
    hasPending && "cursor-pointer hover:shadow-md",
    !highlightClass && "bg-white"
  )}
  onClick={(e) => hasPending && handleSectionClick(section.id, e)}
>
```

### Fix 1D: Add data attribute to SuggestionPopover

**FIND** the SuggestionPopover component's outer motion.div:
```tsx
<motion.div
  initial={{ opacity: 0, y: 10, scale: 0.95 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, y: 10, scale: 0.95 }}
  className="absolute left-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden text-left"
  onClick={(e) => e.stopPropagation()}
>
```

**REPLACE WITH:**
```tsx
<motion.div
  initial={{ opacity: 0, y: 10, scale: 0.95 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, y: 10, scale: 0.95 }}
  data-suggestion-popover
  className="absolute left-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden text-left"
  onClick={(e) => e.stopPropagation()}
>
```

---

## ISSUE 2: Danish Characters Display as Garbled Text

**Symptom:** "Frank Rækby Jepsen" displays as "Frank RÃ¦kby Jepsen"

**Root Cause:** The filename from the upload is being decoded with wrong encoding (likely Latin-1 instead of UTF-8).

**File:** `/client/src/pages/home.tsx`

### Fix 2A: Add filename decoder helper

**ADD** this helper function near the top of the file (after imports, before the component):

```tsx
/**
 * Decode filename that may have been incorrectly encoded
 * Handles common encoding issues with Nordic/European characters
 */
function decodeFilename(filename: string): string {
  try {
    // First, try to fix mojibake (UTF-8 interpreted as Latin-1)
    // This handles cases like "RÃ¦kby" → "Rækby"
    const fixed = filename
      .replace(/Ã¦/g, 'æ')
      .replace(/Ã¸/g, 'ø')
      .replace(/Ã¥/g, 'å')
      .replace(/Ã†/g, 'Æ')
      .replace(/Ã˜/g, 'Ø')
      .replace(/Ã…/g, 'Å')
      .replace(/Ã¼/g, 'ü')
      .replace(/Ã¶/g, 'ö')
      .replace(/Ã¤/g, 'ä')
      .replace(/ÃŸ/g, 'ß')
      .replace(/Ã©/g, 'é')
      .replace(/Ã¨/g, 'è')
      .replace(/Ã /g, 'à')
      .replace(/Ã¢/g, 'â')
      .replace(/Ã®/g, 'î')
      .replace(/Ã´/g, 'ô')
      .replace(/Ã»/g, 'û')
      .replace(/Ã§/g, 'ç')
      .replace(/Ã±/g, 'ñ');
    
    return fixed;
  } catch {
    return filename;
  }
}
```

### Fix 2B: Use the decoder in the CV header

**FIND** (in renderCVSections, around line 342-344):
```tsx
<h1 className="text-2xl font-bold text-gray-800 mb-1">
  {cvData.fileName.replace(/\.(pdf|docx?)$/i, '').replace(/_/g, ' ')}
</h1>
```

**REPLACE WITH:**
```tsx
<h1 className="text-2xl font-bold text-gray-800 mb-1">
  {decodeFilename(cvData.fileName.replace(/\.(pdf|docx?)$/i, '').replace(/_/g, ' '))}
</h1>
```

---

## OPTIONAL: Fix encoding at the server level

A more robust fix would be to handle encoding when the file is uploaded. 

**File:** `/server/routes.ts`

**FIND** (around line 134):
```tsx
fileName: req.file.originalname,
```

**REPLACE WITH:**
```tsx
fileName: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
```

This attempts to re-decode the filename properly. If the filename was already UTF-8, this might double-encode, so the client-side fix is safer as a fallback.

---

## Verification Checklist

After implementing:

1. [ ] Click on a yellow-highlighted section card
2. [ ] Popover appears with observation and proposal
3. [ ] Click "Accept Change" or "Decline" — popover closes, card updates
4. [ ] Click outside the popover — popover closes
5. [ ] Filename displays correctly: "Frank Rækby Jepsen" (not "RÃ¦kby")

---

## Summary

| Issue | File | Fix |
|-------|------|-----|
| Popover doesn't open | home.tsx | stopImmediatePropagation + data attributes |
| Danish characters garbled | home.tsx | decodeFilename helper function |

---

**END OF PATCH**

*Patch version: 002*  
*Priority: HIGH*  
*Architect: Logos*

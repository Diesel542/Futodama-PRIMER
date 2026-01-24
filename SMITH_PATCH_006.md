# PATCH 006: Left Panel UI Upgrade
## Priority: MEDIUM — Visual refinement
## Designer: Aria
## Architect: Logos

---

## Overview

Upgrade the CV preview panel (left side) to match the quality of the analysis panel. Focus on typography, card design, and inline suggestion interactions.

**Design North Star:** *"Clean, calm, Scandinavian intelligence. UI that feels deliberate, modern, and quietly competent. Never loud. Never generic."*

---

## PART 1: Install Inter Font

### 1A: Update `/client/index.html`

**ADD** in the `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

### 1B: Update `/client/src/index.css`

**ADD** or **UPDATE** the base font:

```css
:root {
  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  
  /* Font sizes */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.8125rem;  /* 13px */
  --text-base: 0.875rem; /* 14px */
  --text-md: 0.9375rem;  /* 15px */
  --text-lg: 1rem;       /* 16px */
  --text-xl: 1.125rem;   /* 18px */
  
  /* Colors - Neutral */
  --panel-bg: #F8F9FA;
  --card-bg: #FFFFFF;
  --border-subtle: #E5E7EB;
  --border-muted: #DADDE1;
  
  /* Colors - Text */
  --text-primary: #1F2937;
  --text-secondary: #6B7280;
  --text-muted: #9CA3AF;
  
  /* Colors - Semantic */
  --accent-amber: #F59E0B;
  --accent-amber-soft: #FEF3C7;
  --accent-green: #10B981;
  --accent-green-soft: #D1FAE5;
  
  /* Spacing */
  --space-xs: 0.25rem;   /* 4px */
  --space-sm: 0.5rem;    /* 8px */
  --space-md: 0.75rem;   /* 12px */
  --space-lg: 1rem;      /* 16px */
  --space-xl: 1.5rem;    /* 24px */
  
  /* Card */
  --card-radius: 0.75rem;   /* 12px */
  --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
  --card-shadow-hover: 0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.04);
  
  /* Timeline */
  --timeline-color: #DADDE1;
  --timeline-dot: #9CA3AF;
  --timeline-dot-active: #F59E0B;
}

body {
  font-family: var(--font-sans);
}
```

---

## PART 2: Create Design Tokens Component

### 2A: Create `/client/src/lib/design-tokens.ts`

```typescript
// Design tokens for consistent styling
export const tokens = {
  // Typography
  font: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.8125rem',  // 13px
    base: '0.875rem', // 14px
    md: '0.9375rem',  // 15px
    lg: '1rem',       // 16px
    xl: '1.125rem',   // 18px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
  },
  // Colors
  colors: {
    panelBg: '#F8F9FA',
    cardBg: '#FFFFFF',
    borderSubtle: '#E5E7EB',
    borderMuted: '#DADDE1',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    accentAmber: '#F59E0B',
    accentAmberSoft: '#FEF3C7',
    accentGreen: '#10B981',
    accentGreenSoft: '#D1FAE5',
  },
  // Spacing
  space: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
  },
  // Radii
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  // Shadows
  shadow: {
    card: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
    cardHover: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.04)',
    popover: '0 10px 25px rgba(0, 0, 0, 0.1), 0 6px 10px rgba(0, 0, 0, 0.08)',
  },
} as const;
```

---

## PART 3: Update Left Panel Container

### 3A: In `/client/src/pages/home.tsx`

**FIND** the left panel container and **UPDATE** its classes:

```tsx
{/* Left Panel - CV Preview */}
<div className="w-[60%] h-screen flex flex-col bg-[#F8F9FA] dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
  {/* Header stays the same */}
  
  {/* CV Content Area */}
  <div className="flex-1 overflow-y-auto">
    <div className="max-w-[680px] mx-auto py-8 px-6">
      {/* CV Header */}
      {cvData && (
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            {decodeFilename(cvData.fileName).replace(/\.[^/.]+$/, '')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('analyzed')} {new Date(cvData.uploadedAt).toLocaleDateString()}
          </p>
        </div>
      )}
      
      {/* Timeline + Cards */}
      <div className="relative">
        {/* Timeline spine */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700 ml-1.5" />
        
        {/* Section cards */}
        <div className="space-y-4 pl-8">
          {renderCVSections()}
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## PART 4: Create New RoleCard Component

### 4A: Create `/client/src/components/RoleCard.tsx`

```tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles, Check, Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleCardProps {
  section: {
    id: string;
    title: string;
    organization?: string;
    startDate?: string;
    endDate?: string;
    content: string;
  };
  observation?: {
    id: string;
    message: string;
    actionType: 'rewrite' | 'add_info';
    inputPrompt?: string;
    rewrittenContent?: string;
    status: string;
  };
  onApply: (observationId: string, newContent: string) => void;
  onLock: (observationId: string) => void;
  onSubmitInput: (observationId: string, input: string) => Promise<void>;
  t: (key: string) => string;
  language: string;
}

export function RoleCard({ 
  section, 
  observation, 
  onApply, 
  onLock, 
  onSubmitInput,
  t,
  language 
}: RoleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const hasPendingSuggestion = observation && !['accepted', 'declined', 'locked'].includes(observation.status);
  const isAccepted = observation?.status === 'accepted';
  
  const formatDate = (date?: string) => {
    if (!date) return t('date.present');
    return new Date(date).toLocaleDateString(language === 'da' ? 'da-DK' : 'en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
  };
  
  const handleSubmit = async () => {
    if (!observation || !userInput.trim()) return;
    setIsProcessing(true);
    await onSubmitInput(observation.id, userInput.trim());
    setUserInput('');
    setIsProcessing(false);
  };
  
  const handleApply = () => {
    if (!observation?.rewrittenContent) return;
    onApply(observation.id, observation.rewrittenContent);
    setIsExpanded(false);
  };
  
  const handleLock = () => {
    if (!observation) return;
    onLock(observation.id);
    setIsExpanded(false);
  };

  return (
    <div className="relative">
      {/* Timeline dot */}
      <div 
        className={cn(
          "absolute -left-8 top-6 w-3 h-3 rounded-full border-2 bg-white dark:bg-gray-900",
          isAccepted 
            ? "border-green-500" 
            : hasPendingSuggestion 
              ? "border-amber-500" 
              : "border-gray-300 dark:border-gray-600"
        )} 
      />
      
      {/* Card */}
      <motion.div
        layout
        className={cn(
          "bg-white dark:bg-gray-800 rounded-xl border transition-shadow duration-200",
          "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]",
          "hover:shadow-[0_4px_6px_rgba(0,0,0,0.05),0_2px_4px_rgba(0,0,0,0.04)]",
          isAccepted 
            ? "border-green-200 dark:border-green-800" 
            : hasPendingSuggestion 
              ? "border-amber-200 dark:border-amber-800" 
              : "border-gray-200 dark:border-gray-700"
        )}
      >
        {/* Card Header */}
        <div className="p-5">
          {/* Title Row */}
          <div className="flex items-start justify-between gap-4 mb-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">
              {section.title}
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap font-medium">
              {formatDate(section.startDate)} — {formatDate(section.endDate)}
            </span>
          </div>
          
          {/* Organization */}
          {section.organization && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {section.organization}
            </p>
          )}
          
          {/* Content */}
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
            {section.content.split('\n').filter(Boolean).map((line, i) => {
              const trimmed = line.trim();
              if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
                return (
                  <div key={i} className="flex gap-2 pl-1">
                    <span className="text-gray-400 dark:text-gray-500">•</span>
                    <span className="text-[13px]">{trimmed.replace(/^[-•]\s*/, '')}</span>
                  </div>
                );
              }
              return <p key={i}>{trimmed}</p>;
            })}
          </div>
          
          {/* Suggestion Trigger */}
          {hasPendingSuggestion && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "mt-4 flex items-center gap-2 text-sm font-medium transition-colors",
                "text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
              )}
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('complete.clickToView')}</span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                isExpanded && "rotate-180"
              )} />
            </button>
          )}
          
          {/* Accepted indicator */}
          {isAccepted && (
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
              <Check className="w-4 h-4" />
              <span>{t('suggestion.applied') || 'Change applied'}</span>
            </div>
          )}
        </div>
        
        {/* Inline Suggestion Panel */}
        <AnimatePresence>
          {isExpanded && hasPendingSuggestion && observation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5">
                {/* Observation message */}
                <div className="flex gap-3 mb-4">
                  <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {observation.message}
                  </p>
                </div>
                
                {/* Add Info: Input needed */}
                {observation.actionType === 'add_info' && !observation.rewrittenContent && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {observation.inputPrompt}
                    </label>
                    <textarea
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder={t('input.placeholder')}
                      className="w-full p-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                      rows={3}
                      disabled={isProcessing}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setIsExpanded(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        {t('complete.back')}
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={!userInput.trim() || isProcessing}
                        className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('processing')}
                          </>
                        ) : (
                          t('submit')
                        )}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Rewrite or Add Info with generated content: Show preview */}
                {observation.rewrittenContent && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {t('complete.suggestedChange')}
                    </label>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {observation.rewrittenContent}
                      </p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={handleLock}
                        className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2 border border-gray-200 dark:border-gray-600"
                      >
                        <Lock className="w-4 h-4" />
                        {t('complete.lock')}
                      </button>
                      <button
                        onClick={handleApply}
                        className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        {t('complete.apply')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
```

---

## PART 5: Update Section Rendering in home.tsx

### 5A: Replace renderSection with RoleCard usage

**IMPORT** at top:
```tsx
import { RoleCard } from '../components/RoleCard';
```

**REPLACE** the section rendering logic:

```tsx
const renderCVSections = () => {
  if (!cvData) return null;
  
  // Group sections by type
  const jobSections = cvData.sections.filter(s => s.type === 'job');
  const educationSections = cvData.sections.filter(s => s.type === 'education');
  const otherSections = cvData.sections.filter(s => !['job', 'education'].includes(s.type));
  
  const handleApply = (observationId: string, newContent: string) => {
    const obs = observations.find(o => o.id === observationId);
    if (!obs) return;
    
    // Update CV content
    setCvData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map(section =>
          section.id === obs.sectionId
            ? { ...section, content: newContent }
            : section
        ),
      };
    });
    
    // Mark as accepted
    setObservations(prev => prev.map(o =>
      o.id === observationId ? { ...o, status: 'accepted' } : o
    ));
  };
  
  const handleLock = (observationId: string) => {
    setObservations(prev => prev.map(o =>
      o.id === observationId ? { ...o, status: 'locked' } : o
    ));
  };
  
  const handleSubmitInput = async (observationId: string, input: string) => {
    const obs = observations.find(o => o.id === observationId);
    if (!obs || !cvData) return;
    
    const section = cvData.sections.find(s => s.id === obs.sectionId);
    if (!section) return;
    
    const response = await fetch('/api/cv/process-input', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Language': language,
      },
      body: JSON.stringify({
        observationId,
        sectionId: obs.sectionId,
        userInput: input,
        section,
      }),
    });
    
    if (!response.ok) return;
    
    const data = await response.json();
    
    setObservations(prev => prev.map(o =>
      o.id === observationId
        ? { ...o, rewrittenContent: data.rewrittenContent, proposal: data.proposal }
        : o
    ));
  };
  
  const renderSectionGroup = (title: string, sections: typeof cvData.sections) => {
    if (sections.length === 0) return null;
    
    return (
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 pl-1">
          {title}
        </h2>
        <div className="space-y-4">
          {sections.map(section => {
            const obs = observations.find(o => o.sectionId === section.id);
            return (
              <RoleCard
                key={section.id}
                section={section}
                observation={obs}
                onApply={handleApply}
                onLock={handleLock}
                onSubmitInput={handleSubmitInput}
                t={t}
                language={language}
              />
            );
          })}
        </div>
      </div>
    );
  };
  
  return (
    <>
      {renderSectionGroup(t('section.experience'), jobSections)}
      {renderSectionGroup(t('section.education'), educationSections)}
      {renderSectionGroup(t('section.other'), otherSections)}
    </>
  );
};
```

---

## PART 6: Add Translation Keys

### 6A: Update `/client/src/contexts/SettingsContext.tsx`

**ADD** to English translations:
```typescript
'analyzed': 'Analyzed',
'suggestion.applied': 'Change applied',
'input.placeholder': 'Enter your information...',
'processing': 'Processing...',
'submit': 'Submit',
```

**ADD** to Danish translations:
```typescript
'analyzed': 'Analyseret',
'suggestion.applied': 'Ændring anvendt',
'input.placeholder': 'Indtast dine oplysninger...',
'processing': 'Behandler...',
'submit': 'Indsend',
```

---

## PART 7: Remove Old SuggestionPopover

The inline expansion in RoleCard replaces the floating popover. 

**DELETE** the old `SuggestionPopover` component from home.tsx.

**DELETE** the `activeSection` state and related handlers (no longer needed).

---

## Verification Checklist

**Typography:**
- [ ] Inter font loads correctly
- [ ] Role titles: 16px semibold
- [ ] Company/dates: 14px medium, muted color
- [ ] Content: 14px normal
- [ ] Bullet points: 13px, lighter

**Card Design:**
- [ ] Soft shadow on cards
- [ ] 12px border radius
- [ ] 20px internal padding
- [ ] Clear visual hierarchy inside cards

**Timeline:**
- [ ] Vertical spine visible on left
- [ ] Dots connect cards to spine
- [ ] Amber dot for pending suggestions
- [ ] Green dot for accepted
- [ ] Gray dot for no suggestion

**Inline Suggestions:**
- [ ] Card expands to show suggestion (not floating popover)
- [ ] Smooth 150ms animation
- [ ] Input field for add_info type
- [ ] Preview for rewrite type
- [ ] Apply/Lock buttons work

**Colors:**
- [ ] Panel background: #F8F9FA
- [ ] Card background: white
- [ ] No harsh yellows or greens
- [ ] Muted, Scandinavian palette

---

## Summary

| File | Changes |
|------|---------|
| `/client/index.html` | Add Inter font import |
| `/client/src/index.css` | CSS custom properties for design tokens |
| `/client/src/lib/design-tokens.ts` | NEW — TypeScript design tokens |
| `/client/src/components/RoleCard.tsx` | NEW — Card component with inline suggestions |
| `/client/src/pages/home.tsx` | New section rendering, remove old popover |
| `/client/src/contexts/SettingsContext.tsx` | New translation keys |

---

**END OF PATCH**

*Patch version: 006*
*Priority: MEDIUM*
*Designer: Aria*
*Architect: Logos*
